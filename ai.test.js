import test from 'node:test';
import assert from 'node:assert/strict';
import { handleAI } from './ai.js';
const env = { MEMOIR_AI_KEY: 'test-not-a-real-key', MEMOIR_ACCESS_CODE: 'test-family' };
const body = { chapter: 0, name: '母', profile: {}, items: [{ question: 'どこで育ちましたか？', answer: '尾道。兄と海へ。', followups: [] }] };
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
