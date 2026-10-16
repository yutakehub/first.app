import test from 'node:test';
import assert from 'node:assert/strict';
import { handleAI } from './ai.js';
const env = { MEMOIR_AI_KEY: 'test-not-a-real-key', MEMOIR_ACCESS_CODE: 'test-family' };
const body = { chapter: 0, name: '母', profile: {}, items: [{ question: 'どこで育ちましたか？', answer: '尾道で育ち、兄と海へ走って行った。小学生の頃は、休日になると石を投げて遊んでいた。'.repeat(10), followups: [] }] };
test('AI status exposes availability only; unconfigured and unauthenticated calls cannot contact the provider', async () => {
  const opts = {env,fetcher:()=>{throw new Error('must not call');}};
  assert.deepEqual((await handleAI('status',{},'',opts)).body,{configured:true});
  assert.equal((await handleAI('draft',body,'',{env:{}})).status,503);
  assert.equal((await handleAI('draft',body,'Bearer wrong',opts)).status,401);
  assert.equal((await handleAI('draft',null,'Bearer test-family',opts)).status,400);
});
test('AI draft sends the provided facts with editorial constraints and returns the generated prose', async () => {
  const result = await handleAI('draft',body,'Bearer test-family',{env,fetcher:async(url,options)=>{
    assert.equal(url,'https://api.openai.com/v1/chat/completions');
    const request=JSON.parse(options.body);
    assert.match(request.messages[0].content,/感情.*創作しない/);
    assert.match(request.messages[0].content,/一人称/);
    assert.match(request.messages[0].content,/約900字/);
    assert.match(request.messages[0].content,/水増ししない/);
    assert.match(request.messages[1].content,/尾道/);
    return new Response(JSON.stringify({choices:[{message:{content:JSON.stringify({text:'私の幼い日々は、尾道にあった。兄と海へ向かったことを覚えている。'})}}]}),{status:200});
  }});
  assert.equal(result.status,200);
  assert.match(result.body.text,/私の幼い日々/);
  assert.notEqual(result.body.text,body.items[0].answer);
});
test('provider failures and malformed output return actionable errors without leaking secrets', async () => {
  for(const response of [new Response('provider error',{status:401}),new Response(JSON.stringify({choices:[{message:{content:'not JSON'}}]}),{status:200})]){
    const result=await handleAI('draft',body,'Bearer test-family',{env,fetcher:async()=>response});
    assert.equal(result.status,502);
    assert.doesNotMatch(JSON.stringify(result),/test-not-a-real-key|test-family/);
  }
});
test('short source requests more information instead of inventing a chapter, without spending an AI request', async () => {
  const result=await handleAI('draft',{...body,items:[{question:'どこで？',answer:'尾道'}]},'Bearer test-family',{env,fetcher:()=>{throw new Error('must not request');}});
  assert.equal(result.status,422);
  assert.equal(result.body.needsMore,true);
  assert.match(result.body.error,/900字/);
  assert.equal(result.body.text,undefined);
  assert.ok(result.body.question);
});
test('the editor can request missing details even when source length meets the heuristic', async () => {
  const result=await handleAI('draft',body,'Bearer test-family',{env,fetcher:async()=>new Response(JSON.stringify({choices:[{message:{content:JSON.stringify({needsMore:true,question:'そのとき何歳で、どなたと一緒でしたか？'})}}]}))});
  assert.equal(result.status,422);
  assert.equal(result.body.needsMore,true);
  assert.equal(result.body.text,undefined);
});
test('final book generation accepts short answers and never requests more questions', async () => {
  const result=await handleAI('book',{name:'母',profile:{},part:0,items:[{chapterIndex:0,question:'どこで育ちましたか？',answer:'尾道。'}]},'Bearer test-family-book',{env:{...env,MEMOIR_ACCESS_CODE:'test-family-book'},fetcher:async(_,options)=>{
    const request=JSON.parse(options.body);
    assert.match(request.messages[0].content,/追加質問を返したり/);
    assert.match(request.messages[0].content,/素材が少なければ5000字未満/);
    assert.equal(request.max_tokens,2600);
    return new Response(JSON.stringify({choices:[{message:{content:JSON.stringify({text:'私が育ったのは尾道だった。'})}}]}));
  }});
  assert.equal(result.status,200);
  assert.equal(result.body.text,'私が育ったのは尾道だった。');
  assert.equal(result.body.needsMore,undefined);
});
test('optional AI plan uses skipped-topic context, validates questions and enforces the global ten-question limit', async () => {
  const result=await handleAI('supplement',{name:'母',profile:{},items:[{chapterIndex:0,question:'出生地',answer:'尾道'}],skippedQuestions:['話したくない話題']},'Bearer optional-test',{env:{...env,MEMOIR_ACCESS_CODE:'optional-test'},fetcher:async(_,options)=>{
    const request=JSON.parse(options.body);
    assert.match(request.messages[0].content,/0〜10問/);
    assert.match(request.messages[0].content,/答えたくない可能性/);
    assert.match(request.messages[1].content,/話したくない話題/);
    return new Response(JSON.stringify({choices:[{message:{content:JSON.stringify({questions:Array.from({length:15},(_,i)=>({chapterIndex:0,question:`追加の場面${i}を教えてください。`}))})}}]}));
  }});
  assert.equal(result.status,200);
  assert.equal(result.body.questions.length,10);
});
test('AI may decide zero additional questions are necessary', async () => {
  const result=await handleAI('supplement',{items:[{chapterIndex:0,question:'場所',answer:'尾道'}]},'Bearer optional-zero',{env:{...env,MEMOIR_ACCESS_CODE:'optional-zero'},fetcher:async()=>new Response(JSON.stringify({choices:[{message:{content:JSON.stringify({questions:[]})}}]}))});
  assert.equal(result.status,200);
  assert.deepEqual(result.body.questions,[]);
});
