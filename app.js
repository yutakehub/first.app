import { emptyState, restoreState, saveProfile, saveAnswer, countAnswers, interviewQuestions, answerExportText, answerExportFilename, chapters, SUPPLEMENT_LIMIT, nextSupplementBatch, memoirMaterial } from './model.js';
const KEY='tsuzuri.life.v1', CURSOR=KEY+'.simple-cursor', questions=interviewQuestions(), TOTAL=questions.length;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let state=emptyState();try{state=restoreState(localStorage.getItem(KEY));}catch{}
let index=questions.findIndex(q=>!state.answers[q.key]&&!state.skipped[q.key]);
let screen=!state.profileComplete?'profile':index<0?'finish':'talk';if(index<0)index=TOTAL-1;
let error='',returnToFinish=false,extraIndex=0;
try{const c=JSON.parse(localStorage.getItem(CURSOR));if(state.profileComplete&&c&&Number.isInteger(c.index)&&c.index>=0&&c.index<TOTAL&&['talk','finish','book','extra'].includes(c.screen)){index=c.index;screen=c.screen==='book'?'finish':c.screen;returnToFinish=Boolean(c.returnToFinish);extraIndex=Number.isInteger(c.extraIndex)?Math.max(0,Math.min(SUPPLEMENT_LIMIT-1,c.extraIndex)):0;if(screen==='extra'&&!state.optionalInterview?.questions[extraIndex])screen='finish';}}catch{}
const bookIcon='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M12 5v16M12 5C9 3 5 3 2 4v15c4-1 7 0 10 2 3-2 6-3 10-2V4c-3-1-7-1-10 1Z"/></svg>';
function notify(text){const e=document.querySelector('#toast');e.textContent=text;e.classList.add('show');setTimeout(()=>e.classList.remove('show'),3500);}
function persist(next){try{localStorage.setItem(KEY,JSON.stringify(next));state=next;return true;}catch{error='保存できませんでした。ブラウザの保存設定を確認してください。';return false;}}
function draftKey(){if(screen==='extra')return KEY+'.optional-draft.'+extraIndex;const q=questions[index];return `${KEY}.interview.${q.chapter}.${q.index}.answer`;}
function readDraft(){try{return localStorage.getItem(draftKey())??(screen==='extra'?state.optionalInterview?.answers[extraIndex]:state.answers[questions[index].key])??'';}catch{return (screen==='extra'?state.optionalInterview?.answers[extraIndex]:state.answers[questions[index].key])||'';}}
function saveDraft(){const f=document.querySelector('#answer');if(!f)return;try{localStorage.setItem(draftKey(),f.value);document.querySelector('#draft-status').textContent='入力途中も保存しました';return true;}catch{error='入力途中の保存ができませんでした。';return false;}}
function nav(to){saveDraft();screen=to;error='';render();window.scrollTo({top:0,behavior:'smooth'});}
function commitCurrentAnswer(){
 const field=document.querySelector('#answer');if(!field||!field.value.trim())return true;
 let next;
 if(screen==='extra'){next=structuredClone(state);next.optionalInterview.answers[extraIndex]=field.value.trim();delete next.optionalInterview.skipped[extraIndex];}
 else{const q=questions[index];next=saveAnswer(state,q.chapter,q.index,field.value);next.skipped={...next.skipped};delete next.skipped[q.key];}
 if(!persist(next)){document.querySelector('.error').textContent=error;return false;}return true;
}
function stepper(){const step=screen==='profile'?0:screen==='talk'||screen==='extra'?1:2;return `<ol class="flow-steps" aria-label="本ができるまで">${['お名前を教える','36問に答える','回答を保存して家族へ'].map((t,i)=>`<li class="${i===step?'current':i<step?'finished':''}" ${i===step?'aria-current="step"':''}><span>${i<step?'✓':i+1}</span>${t}</li>`).join('')}</ol>`;}
function talkView(){const q=questions[index];return `<section class="single-question"><div class="finite-progress"><strong>質問 ${index+1} / ${TOTAL}</strong><span>この質問のあと、残り${TOTAL-index-1}問</span></div><progress max="${TOTAL}" value="${index+1}" aria-label="質問の進み具合"></progress><span class="eyebrow">${chapters[q.chapter].sub}</span><h1 id="question-title">${esc(q.question)}</h1><p class="answer-hint">短い言葉で大丈夫。思い出したことを、そのまま教えてください。</p><form id="answer-form"><label class="sr-only" for="answer">回答</label><textarea id="answer" maxlength="10000" placeholder="ここに回答を入力">${esc(readDraft())}</textarea><div class="save-status" id="draft-status">入力途中も自動保存。途中で閉じても再開できます。</div><p class="error" role="alert">${esc(error)}</p><div class="finite-actions"><button type="button" class="quiet" id="back" ${index===0?'disabled':''}>← 前の質問</button><button class="primary" type="submit">${returnToFinish?'保存して一覧に戻る':index===TOTAL-1?'保存して、回答を終える':'保存して次へ'} →</button></div><button type="button" class="quiet skip-question" id="skip">${returnToFinish?'変更せずに一覧へ戻る':'分からない・答えたくないのでスキップ'}</button></form><p class="finite-promise">基本は${TOTAL}問で終わります。2万字の本を目指す方は、終了後に任意で5問ずつ、合計30問までお話を補足できます。</p></section>`;}
function finishView(){
 const answered=countAnswers(state),optionalAnswered=Object.keys(state.optionalInterview?.answers || {}).length;
 const complete=questions.every(q=>state.answers[q.key]||state.skipped[q.key]);
 return `<section class="finish-screen"><span class="eyebrow">お話を、ご家族へ。</span><h1>${complete?'おつかれさまでした。<br><span class="finish-direction">回答を保存して、ご家族へ。</span>':'ここまでのお話を、<br>ご家族へ届けましょう。'}</h1><p>基本${answered}問${optionalAnswered?'・追加'+optionalAnswered+'問':''}のお話を残しました。<br>回答をまとめたファイルを保存して、ご家族へ送ってください。</p><div class="finish-cta"><button class="primary" id="export-answers" ${answered+optionalAnswered?'':'disabled'}>回答ファイルを保存 ↓</button><p>${answered+optionalAnswered?'日本語のテキストファイル（.txt）として保存します。':'まだ回答がありません。下の回答一覧から一問入力すると、保存できるようになります。'}</p><div id="export-status" class="export-status" role="status" aria-live="polite"></div><button class="quiet recovery-button" id="recover-answers">保存できないとき：全文を表示・コピー</button>${canShareFile()?'<button class="secondary" id="share-answers">回答ファイルを家族に送る ↗</button>':''}</div><section class="handoff-guide"><h2>保存したら、あと一歩。</h2><ol><li><strong>保存したファイルを見つける</strong><span>ブラウザのダウンロード一覧や、スマートフォンの「ファイル」アプリで確認できます。保存できない場合は、上の「全文を表示・コピー」から回答を取り出せます。</span></li><li><strong>LINEやメールで、ご家族へ送る</strong><span>「${esc(answerExportFilename(state))}」を添付して送ってください。</span></li><li><strong>本づくりは、ご家族にお任せ</strong><span>ご家族がファイルをChatGPTに添付し、約20,000字の自分史への編集を依頼します。</span></li></ol><p>このサイトでは回答ファイルまでを作ります。本の文章に整えるのは、そのあとのステップです。</p></section><p class="error" role="alert">${esc(error)}</p>${optionalOffer()}<details class="answer-list"><summary>回答を確認・修正する（${answered} / ${TOTAL}問）</summary>${questions.map((q,i)=>`<article><div><span>質問 ${i+1}</span><h2>${esc(q.question)}</h2><p>${esc(state.answers[q.key]||'スキップ・未回答')}</p></div><button class="quiet" data-edit="${i}">修正</button></article>`).join('')}</details><details class="family-instructions"><summary>ご家族へ：ファイルを本にする方法</summary><p>受け取った回答ファイルを、この作業を進めているChatGPTのチャットに添付し、「この回答をもとに約20,000字の自分史に編集してください」と送ってください。詳しい編集の依頼文は、ファイルにも入っています。</p><p>出来上がった原稿は、親御さんと一緒に事実や言い回しを確認して仕上げます。</p></details><p class="save-status">回答はこの端末のブラウザ内に保存されます。続きは同じ端末・ブラウザから再開できます。</p></section>`;
}
function exportFile(){return new File(['\uFEFF'+answerExportText(state)],answerExportFilename(state),{type:'text/plain;charset=utf-8'});}
function canShareFile(){try{return typeof navigator.share==='function' && typeof navigator.canShare==='function' && navigator.canShare({files:[exportFile()]});}catch{return false;}}
function downloadAnswers(){
 try{
  const blob=new Blob(['\uFEFF'+answerExportText(state)],{type:'text/plain;charset=utf-8'}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=answerExportFilename(state);document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
  document.querySelector('#export-status').textContent='保存の操作を開始しました。ファイルを開き、回答が入っているか確認してください。保存できないときは、下の「全文を表示・コピー」を使えます。回答はこのブラウザにも残っています。';
 }catch{
  document.querySelector('#export-status').textContent='ファイル保存を開始できませんでした。回答は消していません。表示された全文をコピーして、ご家族へ送れます。';
  showAnswerRecovery();
 }
}
function showAnswerRecovery(){
 const dialog=document.querySelector('#book-dialog');
 dialog.innerHTML=`<div class="access-dialog answer-recovery"><button class="dialog-close" aria-label="閉じる">×</button><span class="eyebrow">ファイル保存ができなくても。</span><h2 id="book-title">回答の全文を取り出す</h2><p>下の文章には、基本情報と回答がすべて入っています。コピーしてメールやメモなどに貼り付けて保存できます。この操作で回答は消えません。</p><label for="recovery-text">基本情報・質問と回答・本づくりの依頼文</label><textarea id="recovery-text" class="recovery-text" readonly>${esc(answerExportText(state))}</textarea><button class="primary" id="copy-answers">回答の全文をコピー</button><button class="quiet" id="select-answers">全文を選択する</button><p id="recovery-status" role="status" aria-live="polite"></p></div>`;
 dialog.querySelector('.dialog-close').onclick=()=>dialog.close();
 const select=()=>{const field=dialog.querySelector('#recovery-text');field.focus();field.select();field.setSelectionRange(0,field.value.length);};
 dialog.querySelector('#select-answers').onclick=()=>{select();dialog.querySelector('#recovery-status').textContent='全文を選択しました。端末の「コピー」を選んで、LINEやメモに貼り付けてください。';};
 dialog.querySelector('#copy-answers').onclick=async()=>{try{await navigator.clipboard.writeText(dialog.querySelector('#recovery-text').value);dialog.querySelector('#recovery-status').textContent='回答の全文をコピーしました。LINE・メール・メモなどに貼り付けて、内容を確認してください。';}catch{select();dialog.querySelector('#recovery-status').textContent='自動コピーを使えないため、全文を選択しました。端末の「コピー」を選んでください。';}};
 if(!dialog.open)dialog.showModal();
}
async function shareAnswers(){try{await navigator.share({files:[exportFile()],title:'人生の回答をまとめました',text:'人生の回答をまとめました。このファイルで本づくりをお願いします。'});}catch(e){if(e.name!=='AbortError')document.querySelector('#export-status').textContent='共有を開けませんでした。「回答ファイルを保存」から保存し、LINEやメールに添付してください。';}}
function render(){try{localStorage.setItem(CURSOR,JSON.stringify({screen,index,returnToFinish,extraIndex}));}catch{}document.querySelector('#app').innerHTML=`<div class="v2"><header class="v2-header"><a href="#" id="brand">${bookIcon}<span>つづり<small>人生を、家族の一冊に。</small></span></a><nav aria-label="メイン"><button data-action="talk">回答する</button><button data-action="finish">回答を保存・送る</button></nav></header><main class="v2-main">${stepper()}${screen==='profile'?profileView():screen==='talk'?talkView():screen==='extra'?extraView():finishView()}<footer class="v2-footer"><span>回答はこのブラウザに保存されます。ファイルを保存し、ご家族へ送ってください。</span><button class="quiet" id="family-help">ご家族向けの案内・サイトを送る</button></footer></main></div>`;
 document.querySelector('#brand').onclick=e=>{e.preventDefault();nav(state.profileComplete?'talk':'profile');};
 document.querySelectorAll('[data-action]').forEach(el=>el.onclick=()=>{const to=el.dataset.action==='talk'&&!state.profileComplete?'profile':el.dataset.action;if(to==='finish'&&!commitCurrentAnswer())return;nav(to);});
 document.querySelector('#family-help').onclick=openFamilyHelp;
 const form=document.querySelector('#profile-form');if(form)form.onsubmit=e=>{e.preventDefault();try{if(persist(saveProfile(state,Object.fromEntries(new FormData(form)))))nav('talk');}catch(e){form.querySelector('.error').textContent=e.message;}};
 document.querySelector('#answer')?.addEventListener('input',saveDraft);
 document.querySelector('#answer-form')?.addEventListener('submit',e=>{e.preventDefault();const value=document.querySelector('#answer').value.trim();if(!value){document.querySelector('.error').textContent='ひとこと入力するか、スキップを選んでください。';return;}if(screen==='extra'){const next=structuredClone(state);next.optionalInterview.answers[extraIndex]=value;delete next.optionalInterview.skipped[extraIndex];if(!persist(next)){render();return;}try{localStorage.removeItem(draftKey());}catch{}advanceExtra();return;}const q=questions[index],next=saveAnswer(state,q.chapter,q.index,value);next.skipped={...next.skipped};delete next.skipped[q.key];if(!persist(next)){render();return;}try{localStorage.removeItem(draftKey());}catch{}advance();});
 document.querySelector('#skip')?.addEventListener('click',()=>{saveDraft();if(screen==='extra'){const next=structuredClone(state);next.optionalInterview.skipped[extraIndex]=true;if(persist(next))advanceExtra();else render();return;}if(returnToFinish){returnToFinish=false;nav('finish');return;}const next=structuredClone(state);next.skipped[questions[index].key]=true;if(persist(next))advance();else render();});
 document.querySelector('#back')?.addEventListener('click',()=>{saveDraft();index=Math.max(0,index-1);error='';render();});
 document.querySelectorAll('[data-edit]').forEach(el=>el.onclick=()=>{index=Number(el.dataset.edit);returnToFinish=true;nav('talk');document.querySelector('#answer').focus();});
 document.querySelector('#export-answers')?.addEventListener('click',downloadAnswers);
 document.querySelector('#recover-answers')?.addEventListener('click',showAnswerRecovery);
 document.querySelector('#share-answers')?.addEventListener('click',shareAnswers);
 document.querySelector('#optional-start')?.addEventListener('click',startOptional);
 document.querySelector('#stop-extra')?.addEventListener('click',()=>{saveDraft();const next=structuredClone(state);next.optionalInterview.done=true;if(persist(next)){returnToFinish=false;nav('finish');}});
 document.querySelectorAll('[data-extra-edit]').forEach(el=>el.onclick=()=>{extraIndex=Number(el.dataset.extraEdit);returnToFinish=true;nav('extra');document.querySelector('#answer').focus();});

}
function advance(){returnToFinish?(returnToFinish=false,screen='finish'):index===TOTAL-1?screen='finish':(index++,screen='talk');error='';render();window.scrollTo({top:0,behavior:'smooth'});if(screen==='talk')document.querySelector('#answer').focus();}
function optionalOffer(){
 const plan=state.optionalInterview,remaining=plan?.questions.filter((_,i)=>!plan.answers[i]&&!plan.skipped[i]).length||0;
 const available=nextSupplementBatch(state).length,characters=memoirMaterial(state).characters;
 return `<section class="optional-offer"><h2>2万字の一冊に向けて、お話を補足する。</h2><p>現在の回答資料：約${characters.toLocaleString('ja-JP')}文字（完成原稿の文字数ではありません）。具体的な出来事が増えるほど、詳しい本にできます。</p><p>追加は任意で5問ずつ、合計${SUPPLEMENT_LIMIT}問まで。用意された質問から、回答量の少ない章を優先して選びます。AIが内容を判定する機能ではなく、2万字の完成を保証するものではありません。</p>${remaining||available?`<button class="secondary" id="optional-start" ${!countAnswers(state)?'disabled':''}>${remaining?'追加質問を再開する（残り'+remaining+'問）':'あと'+available+'問だけ答える（任意）'}</button>`:'<p class="save-status">サイトの追加質問はここまでです。資料をChatGPTに渡し、内容に応じて必要なことだけ追加で確認できます。</p>'}<p>いつでもここで終えて、回答ファイルを保存できます。資料が足りなければ、ご家族がChatGPTで追加の質問を受け取れます。</p>${plan?.questions.length?`<details class="answer-list"><summary>追加のお話を確認する（${Object.keys(plan.answers).length}件）</summary>${plan.questions.map((q,i)=>`<article><div><span>任意の追加質問 ${i+1}</span><h2>${esc(q.question)}</h2><p>${esc(plan.answers[i]||'未回答・スキップ')}</p></div><button class="quiet" data-extra-edit="${i}">修正</button></article>`).join('')}</details>`:''}</section>`;
}
function extraView(){const plan=state.optionalInterview,q=plan.questions[extraIndex];return `<section class="single-question"><div class="finite-progress"><strong>任意の追加質問 ${extraIndex+1} / ${plan.questions.length}</strong><span>残り${plan.questions.length-extraIndex-1}問</span></div><progress max="${plan.questions.length}" value="${extraIndex+1}" aria-label="任意の追加質問の進み具合"></progress><span class="eyebrow">${chapters[q.chapterIndex].sub}</span><h1>${esc(q.question)}</h1><p class="answer-hint">いつ・どこで・誰と・何があったか、覚えている範囲で。分からないことは飛ばして大丈夫。</p><form id="answer-form"><label class="sr-only" for="answer">追加のお話</label><textarea id="answer" maxlength="10000" placeholder="ここに回答を入力">${esc(readDraft())}</textarea><div class="save-status" id="draft-status">入力途中も自動保存します</div><p class="error" role="alert">${esc(error)}</p><div class="finite-actions"><button type="button" class="quiet" id="skip">この質問をスキップ</button><button class="primary" type="submit">${returnToFinish?'保存して一覧へ':extraIndex===plan.questions.length-1?'保存して、追加質問を終える':'保存して次へ'} →</button></div></form><button class="quiet skip-question" id="stop-extra">追加はここまでにして、回答を保存する画面へ</button><p class="finite-promise">この組が終わると保存画面に戻ります。続けるかは自分で選べます。追加は合計${SUPPLEMENT_LIMIT}問まで。</p></section>`;}
function advanceExtra(){
 if(returnToFinish){returnToFinish=false;nav('finish');return;}
 const plan=state.optionalInterview;
 const next=plan.questions.findIndex((_,i)=>i>extraIndex&&!plan.answers[i]&&!plan.skipped[i]);
 if(next<0){const updated=structuredClone(state);updated.optionalInterview.done=true;if(!persist(updated)){render();return;}nav('finish');return;}
 extraIndex=next;error='';render();document.querySelector('#answer').focus();window.scrollTo({top:0,behavior:'smooth'});
}
function startOptional(){
 error='';returnToFinish=false;
 const pending=state.optionalInterview?.questions.some((_,i)=>!state.optionalInterview.answers[i]&&!state.optionalInterview.skipped[i]);
 if(!pending){const batch=nextSupplementBatch(state);const next=structuredClone(state);const old=next.optionalInterview||{questions:[],answers:{},skipped:{}};next.optionalInterview={...old,questions:[...old.questions,...batch],done:!batch.length};if(!persist(next)){render();return;}}
 const plan=state.optionalInterview,next=plan.questions.findIndex((_,i)=>!plan.answers[i]&&!plan.skipped[i]);
 if(next>=0){extraIndex=next;screen='extra';}else{screen='finish';notify('追加質問はありません。このまま回答を保存できます。');}
 render();window.scrollTo({top:0,behavior:'smooth'});
}
function profileView(){return `<section class="welcome"><div><span class="eyebrow">あなたの言葉から、家族の一冊へ。</span><h1>うまく書かなくて、<br>大丈夫です。</h1><p>全36問に、一問ずつ答えるだけ。<br>最後に回答ファイルを保存して、ご家族へ。<br>2万字の本を目指す方は、任意でお話を補足できます。<br>本の文章にするところは、ご家族にお任せください。</p><div class="welcome-note">基本36問 → 任意の補足 → 回答ファイルを保存 → ご家族に送る。</div></div><img src="/public/memoir-hero.png" alt="布張りの本と昔の家族写真のイメージ"></section><section class="profile-step"><div><span class="eyebrow">はじめに</span><h2>どなたの人生を残しますか？</h2><p>ご自身のお名前を教えてください。<br>生まれた年や場所は、分かる範囲で大丈夫です。</p></div><form id="profile-form"><label>お名前 <small>必須</small><input name="name" required maxlength="40" autocomplete="name" placeholder="例：山田 さちこ" value="${state.name==='あなた'?'':esc(state.name)}"></label><div class="form-row"><label>生まれた年 <small>任意</small><input name="birthYear" inputmode="numeric" maxlength="4" pattern="[0-9]{4}" placeholder="1960（西暦）" value="${esc(state.profile.birthYear)}"></label><label>生まれた場所 <small>任意</small><input name="birthplace" maxlength="200" placeholder="例：広島県尾道市" value="${esc(state.profile.birthplace)}"></label></div><label>幼い頃の家族 <small>任意</small><input name="childhoodFamily" maxlength="500" placeholder="例：父、母、兄" value="${esc(state.profile.childhoodFamily)}"></label><p class="error" role="alert">${esc(error)}</p><button class="primary" type="submit">保存して、最初の質問へ <span>→</span></button></form></section>`;}

function openFamilyHelp(){
 const message='人生の思い出を一冊の本に残したくて、このサイトを用意しました。質問に一つずつ答えて、最後に「回答ファイルを保存」を押して、保存したファイルをLINEやメールで私に送ってください。短く答えても、分からない質問は飛ばしても大丈夫です。本の文章にするところは私が進めます。\nhttps://first-app-89fp.vercel.app/';
 const dialog=document.querySelector('#name-dialog');dialog.innerHTML=`<div class="access-dialog"><button class="dialog-close" aria-label="閉じる">×</button><span class="eyebrow">ご家族へ</span><h2 id="name-title">親御さんに送る案内</h2><p>下の案内とURLをコピーし、LINEやメールなどで親御さんへ送ってください。</p><label for="invite-text" class="sr-only">親御さんへの案内文</label><textarea id="invite-text" class="invite-text" readonly>${esc(message)}</textarea><button class="primary" id="copy-invite">案内文とURLをコピー</button><p id="copy-status" role="status"></p><p>回答を受け取ったら、ファイルをこのChatGPTのチャットに添付して、本への編集を依頼します。サイトではAPIキーや合言葉の設定は必要ありません。</p></div>`;
 dialog.querySelector('.dialog-close').onclick=()=>dialog.close();
 dialog.querySelector('#copy-invite').onclick=async()=>{try{await navigator.clipboard.writeText(message);dialog.querySelector('#copy-status').textContent='コピーしました。LINEやメールに貼り付けて送れます。';}catch{dialog.querySelector('#invite-text').focus();dialog.querySelector('#invite-text').select();dialog.querySelector('#copy-status').textContent='案内文を選択しました。コピーして送ってください。';}};
 if(!dialog.open)dialog.showModal();
}
window.addEventListener('pagehide',saveDraft);
render();
