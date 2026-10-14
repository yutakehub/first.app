import { chapters, emptyState, saveAnswer, countAnswers, nextQuestion, answerKey, bookText, restoreState, saveProfile, lifeStages, timelineEntries } from './model.js';
const KEY = 'tsuzuri.life.v1';
let storageAvailable = true;
let state;
try { state = restoreState(localStorage.getItem(KEY)); } catch { state = emptyState(); storageAvailable = false; }
let selected = 0, currentChapter = 0, currentQuestion = 0;
let draftTimer;
let editingProfile = false;
const icons = {
 book: '<path d="M12 6v15m0-15C9 4 5 4 2 5v14c4-1 7 0 10 2 3-2 6-3 10-2V5c-3-1-7-1-10 1Z"/>',
 grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
 chat: '<path d="M21 11a9 9 0 0 1-9 9H4l-3 2 1-7a9 9 0 1 1 19-4Z"/><path d="M7 10h10M7 14h6"/>',
 sun: '<circle cx="12" cy="12" r="4"/><path d="M12 1v2m0 18v2M1 12h2m18 0h2M4 4l2 2m12 12 2 2M4 20l2-2M18 6l2-2"/>',
 home: '<path d="m3 10 9-7 9 7v11H3Zm6 11v-8h6v8"/>',
 spark: '<path d="m12 2 2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5Z"/>',
 path: '<path d="M4 21V9a3 3 0 0 1 6 0v7a3 3 0 0 0 6 0V3m-4 4 4-4 4 4"/>',
 heart: '<path d="M20 4c-3-3-7-1-8 1-1-2-5-4-8-1-6 6 8 16 8 16S26 10 20 4Z"/>',
 leaf: '<path d="M20 3C8 1 1 9 5 16s16 3 15-13ZM4 21 16 9"/>',
 arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
 check: '<path d="m5 12 4 4L19 6"/>',
 close: '<path d="m6 6 12 12M6 18 18 6"/>',
 download: '<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',
 settings: '<circle cx="12" cy="8" r="4"/><path d="M4 22v-3a8 8 0 0 1 16 0v3"/>',
 lock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
 clock: '<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/>',
 chevron: '<path d="m9 5 7 7-7 7"/>',
 pen: '<path d="m4 16-1 5 5-1L21 7l-4-4ZM14 6l4 4"/>',
 headphones: '<path d="M3 14v-3a9 9 0 0 1 18 0v3M3 12h4v8H3zm14 0h4v8h-4z"/>'
};
const icon = (name, cls = '') => `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] || icons.book}</svg>`;
const escape = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
function toast(text) { const el = document.querySelector('#toast'); el.textContent = text; el.classList.add('show'); setTimeout(() => el.classList.remove('show'), 4200); }
function persist() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); return true; }
  catch { storageAvailable = false; toast('このブラウザに保存できませんでした。本をダウンロードして保管してください。'); return false; }
}
function titleForBook() { return state.name === 'あなた' ? '私の人生の物語' : `${state.name}の人生の物語`; }
function profileForm() {
  return `<section class="basic-section" id="basic-information" aria-labelledby="basic-title"><div class="basic-intro"><span class="eyebrow">STEP 01 · ABOUT YOU</span><h2 id="basic-title">まずは、あなたの<br>基本情報から。</h2><p>いつ、どこで生まれ、どんな家族と暮らしたのか。<br>人生のはじまりを教えてください。</p><div class="basic-steps"><span class="current">01 基本情報</span><span>02 人生をたどる</span><span>03 一冊の本に</span></div><small>分からないことは空欄で大丈夫。あとから直せます。</small></div><form id="profile-form"><div class="profile-form-grid"><label>お名前 <span class="required">必須</span><input name="name" autocomplete="name" maxlength="40" required placeholder="例：山田 さちこ" value="${state.name === 'あなた' ? '' : escape(state.name)}"></label><label>生まれた年 <span>任意</span><input name="birthYear" inputmode="numeric" pattern="[0-9]{4}" maxlength="4" placeholder="例：1960（西暦）" value="${escape(state.profile.birthYear)}"></label><label class="full">生まれた場所 <span>任意</span><input name="birthplace" maxlength="200" placeholder="例：広島県尾道市" value="${escape(state.profile.birthplace)}"></label><label class="full">幼い頃、一緒に暮らしていた家族 <span>任意</span><input name="childhoodFamily" maxlength="500" placeholder="例：父、母、祖母、2歳上の兄" value="${escape(state.profile.childhoodFamily)}"></label></div><p id="profile-error" role="alert"></p><button class="button primary" type="submit">基本情報を保存して、生い立ちへ${icon('arrow')}</button>${state.profileComplete ? '<button type="button" class="text-button" id="profile-cancel">編集をやめる</button>' : ''}</form></section>`;
}
function timelineSection() {
  if (!state.profileComplete) return '';
  const entries = timelineEntries(state);
  return `<section class="life-timeline" aria-labelledby="timeline-title"><div class="section-heading"><div><span class="eyebrow">LIFE HISTORY</span><h2 id="timeline-title">${escape(state.name)}さんの歩んできた歴史</h2></div><span class="section-hint">年代が分からないお話は、人生の時期ごとに。</span></div><div class="timeline-list">${entries.map(entry => `<article class="timeline-entry"><div class="timeline-date"><strong>${escape(entry.year || '年代未記入')}</strong><span>${entry.stage}</span></div><div class="timeline-memory"><h3>${entry.key === 'birth' ? escape(entry.title) : escape(chapters[entry.chapter].title)}</h3><p>${escape(entry.text).replaceAll('\n', '<br>')}</p>${entry.chapter !== null ? `<button class="text-button" data-timeline-edit="${entry.key}">このお話を編集${icon('pen')}</button>` : ''}</div></article>`).join('')}</div>${entries.length === 1 ? '<p class="timeline-empty">生まれた場所から、幼い頃、学校、仕事へ。お話するたびに、人生の年表がつながります。</p>' : ''}</section>`;
}
function render() {
  const count = countAnswers(state), percent = Math.round(count / 18 * 100), completed = chapters.filter((_, i) => countAnswers(state, i) === 3).length;
  const c = chapters[selected];
  const answers = c.questions.map((_, q) => state.answers[answerKey(selected, q)]).filter(Boolean);
  document.querySelector('#app').innerHTML = `
    <aside class="sidebar">
      <a class="brand" href="/" aria-label="つづり ホーム"><span class="brand-mark">${icon('book')}</span><span>つづり<small>TSUZURI</small></span></a>
      <div class="nav-label">あなたの物語</div>
      <nav aria-label="メインメニュー">
        <button class="nav-item active" data-action="home">${icon('grid')}マイストーリー<span class="nav-dot"></span></button>
        <button class="nav-item" data-action="interview">${icon('chat')}お話をつづる</button>
        <button class="nav-item" data-action="book">${icon('book')}本を読む</button>
      </nav>
      <div class="sidebar-note"><span class="small-flower">✳</span><p>何気ない思い出が、<br>誰かの宝物になる。</p><span>あなたのペースで、少しずつ。</span></div>
      <div class="sidebar-bottom"><button class="nav-item" data-action="about">${icon('heart')}つづりについて</button><button class="profile" data-action="name"><span class="avatar">${escape(state.name === 'あなた' ? '私' : state.name.slice(0, 1))}</span><span>${state.name === 'あなた' ? '本に残すお名前' : escape(state.name)}<small>この端末に保存</small></span>${icon('chevron')}</button></div>
    </aside>
    <main>
      <header class="topbar"><div class="breadcrumbs">あなたの物語 <span>/</span> <strong>マイストーリー</strong></div><span class="save-badge"><span></span>${storageAvailable ? 'この端末に自動保存' : '保存が利用できません'}</span></header>
      <div class="main-content">
        <div class="page-heading"><div><div class="eyebrow">MY STORY</div><h1>人生を、はじめから。</h1><p>いつ、どこで、何があったのか。あなたの歴史を一冊に。</p></div><button class="button secondary book-top" data-action="book">${icon('book')}本のプレビュー</button></div>
        <section class="memoir-banner" aria-labelledby="memoir-heading"><img class="memoir-image" src="/public/memoir-hero.png" alt="布張りの本、懐かしい家族写真、手紙が陽の差す机に並ぶ、GPT Imageで制作したイメージ" fetchpriority="high"><div class="memoir-wash"></div><div class="memoir-copy"><span class="eyebrow">A LIFE, LOVINGLY PRESERVED</span><h2 id="memoir-heading">人生の記憶を、<br><em>一冊の本に。</em></h2><p>生まれた日のこと。夢中になった日々。<br>あなたが歩んだ歴史は、家族の宝物になる。</p><button class="button primary" data-action="interview">${state.profileComplete ? 'お話の続きをつづる' : '基本情報からはじめる'}${icon('arrow')}</button><div class="memoir-caption">YOUR LIFE. YOUR WORDS. YOUR STORY.</div></div><div class="memoir-image-note">記憶を、未来へつなぐ。</div></section>
        ${!state.profileComplete || editingProfile ? profileForm() : `<div class="profile-summary"><div>${icon('settings')}<strong>${escape(state.name)}さん</strong><span>${escape(state.profile.birthYear ? state.profile.birthYear + '年生まれ' : '生年未記入')} ・ ${escape(state.profile.birthplace || '出生地未記入')}</span></div><button class="text-button" data-action="profile">基本情報を編集</button></div>`}
        <section class="hero ${!state.profileComplete ? 'hero-after-profile' : ''}" aria-labelledby="hero-title"><div class="hero-copy"><span class="hero-kicker"><span></span>人生を、言葉にする時間。</span><h2 id="hero-title">生まれた場所から、<br>いまのあなたまで。<br><em>人生をたどろう。</em></h2><p>子どもの頃、学生時代、初めての仕事。<br>いつ、どこで、どんな日々を過ごしたのか。<br>ひとつずつ聞きながら、人生の歴史をつなぎます。</p><button class="button primary" data-action="interview">${icon('pen')}${!state.profileComplete ? '基本情報からはじめる' : state.started ? 'お話の続きをつづる' : '生い立ちのお話をはじめる'}${icon('arrow')}</button><span class="hero-foot">${icon('clock')}1回5分から。いつでも続きから。</span></div><div class="hero-art"><div class="art-frame"><img src="/public/memory.svg" alt="山あいの小さな家へ続く道を描いた、懐かしい風景のイラスト"><span class="art-caption">あの日の景色を、もう一度。</span></div><span class="art-side">EVERY LIFE IS A STORY WORTH TELLING</span><span class="art-seal">記憶を<br>つなぐ</span></div></section>
        <section class="progress-strip" aria-label="執筆の進み具合"><div class="progress-main"><div class="progress-symbol">${icon('leaf')}</div><div><strong>物語は、少しずつ育っています。</strong><span>${count ? `${count}の思い出が、言葉になりました。` : 'まずは、ひとつの思い出から始めましょう。'}</span></div></div><div class="progress-metric"><strong>${count}<small> / 18</small></strong><span>答えた質問</span></div><div class="progress-metric"><strong>${completed}<small> / 6</small></strong><span>つづった章</span></div><div class="progress-bar-wrap"><div><span>本のできあがり</span><strong>${percent}%</strong></div><div class="progress-track" role="progressbar" aria-label="本のできあがり" aria-valuenow="${percent}" aria-valuemin="0" aria-valuemax="100"><span style="width:${percent}%"></span></div></div></section>
        ${timelineSection()}
        <div class="story-layout"><section class="chapters-section"><div class="section-heading"><div><span class="eyebrow">CHAPTERS</span><h2>人生を、順番にたどる</h2></div><span class="section-hint">幼い頃から、今に向かって。</span></div><div class="chapter-grid">${chapters.map((ch, i) => {
          const n = countAnswers(state, i);
          return `<button class="chapter-card ${selected === i ? 'selected' : ''}" data-chapter="${i}" aria-pressed="${selected === i}"><div class="card-top"><span class="chapter-icon ${ch.icon}">${icon(ch.icon)}</span><span class="chapter-status ${n === 3 ? 'done' : n ? 'writing' : ''}">${n === 3 ? 'つづりました' : n ? 'お話し中' : 'これから'}</span></div><span class="chapter-number">CHAPTER ${String(i + 1).padStart(2,'0')}</span><h3>${ch.title}</h3><p>${lifeStages[i]} · ${ch.sub}</p><div class="card-bottom"><span>${n} / 3 のお話</span>${icon(n === 3 ? 'check' : 'arrow')}</div></button>`;
        }).join('')}</div><div class="gentle-note">${icon('heart')}うまく話そうとしなくて大丈夫。あなたの言葉が、いちばんです。</div></section>
        <aside class="book-preview"><div class="section-heading"><div><span class="eyebrow">YOUR BOOK</span><h2>できあがっていく、一冊。</h2></div></div><button class="book-object" data-action="book" aria-label="本のプレビューを開く"><div class="book-spine"></div><div class="book-cover"><span class="cover-tag">THE STORY OF MY LIFE</span><span class="cover-rule"></span><span class="cover-title">私という、<br>ひとつの物語。</span><div class="cover-plant">${icon('leaf')}</div><span class="cover-author">${state.name === 'あなた' ? 'あなた' : escape(state.name)} 著</span><span class="cover-brand">つ づ り</span></div></button><div class="preview-excerpt"><span>第${selected + 1}章　${c.title}</span><p>${answers.length ? escape(answers[0].slice(0, 75)) + (answers[0].length > 75 ? '…' : '') : 'ここに、あなたの言葉が並びます。<br>思い出をひとつ話すたびに、<br>本のページが増えていきます。'}</p></div><button class="preview-link" data-action="${answers.length ? 'book' : 'selected-interview'}">${answers.length ? '本をひらいてみる' : 'この章のお話を始める'}${icon('arrow')}</button></aside></div>
        <footer><span>つづり <span class="footer-divider">|</span> 何気ない人生に、かけがえのない一冊を。</span><span>${icon('lock')}お話はこのブラウザの中に保存されます</span></footer>
      </div>
    </main>`;
  document.querySelectorAll('[data-action]').forEach(el => el.addEventListener('click', () => action(el.dataset.action)));
  const form = document.querySelector('#profile-form');
  if (form) form.onsubmit = e => {
    e.preventDefault();
    try {
      const wasComplete = state.profileComplete;
      const next = saveProfile(state, Object.fromEntries(new FormData(form)));
      const previous = state; state = next;
      if (!persist()) { state = previous; return; }
      editingProfile = false; render();
      if (!wasComplete) openInterview(0); else toast('基本情報を更新しました。');
    } catch (error) { document.querySelector('#profile-error').textContent = error.message; }
  };
  document.querySelector('#profile-cancel')?.addEventListener('click', () => { editingProfile = false; render(); });
  document.querySelectorAll('[data-timeline-edit]').forEach(el => el.onclick = () => {
    const [chapter, question] = el.dataset.timelineEdit.split(':').map(Number);
    openInterview(chapter, question);
  });
  document.querySelectorAll('[data-chapter]').forEach(el => el.addEventListener('click', () => { selected = Number(el.dataset.chapter); render(); }));
}
function action(name) {
  if (name === 'profile') { editingProfile = true; render(); document.querySelector('#basic-information').scrollIntoView({behavior:'smooth'}); }
  if (name === 'interview') {
    const available = chapters.findIndex((_, i) => nextQuestion(state, i) !== -1);
    openInterview(available === -1 ? selected : available);
  }
  if (name === 'selected-interview') openInterview(selected);
  if (name === 'book') openBook();
  if (name === 'name') openName();
  if (name === 'home') window.scrollTo({top:0,behavior:'smooth'});
  if (name === 'about') {
    const dialog = document.querySelector('#name-dialog');
    dialog.innerHTML = `<button class="close-button" aria-label="閉じる">${icon('close')}</button><div class="eyebrow">ABOUT TSUZURI</div><h2 id="name-title">その人生を、未来へ。</h2><p class="about-text">子どもがまだ知らない、親の物語。<br>親がもう一度出会う、自分の人生。<br><br>つづりは、問いにひとつずつ答えながら、思い出を一冊に残すための場所です。話したくないことは飛ばして、あなたのペースで続けてください。<br><br>現在は試作品です。用意された質問でお話を集め、回答をそのまま章にまとめます。AIによる追加質問・文章編集は今後対応予定です。回答は外部に送信されません。<br><br>保存先はこのブラウザです。共有端末での利用にはご注意ください。大切なお話は「本を読む」からダウンロードして保管できます。</p>`;
    dialog.querySelector('button').onclick = () => dialog.close(); dialog.showModal();
  }
}
function draftKey() { return `${KEY}.draft.${currentChapter}.${currentQuestion}`; }
function openInterview(chapter, question) {
  if (!state.profileComplete) {
    editingProfile = true; render(); document.querySelector('#basic-information').scrollIntoView({behavior:'smooth'});
    document.querySelector('#profile-form input').focus();
    return;
  }
  currentChapter = chapter; currentQuestion = question ?? nextQuestion(state, chapter);
  if (currentQuestion === -1) currentQuestion = 0;
  showQuestion(); document.querySelector('#interview-dialog').showModal();
}
function showQuestion() {
  clearTimeout(draftTimer);
  const c = chapters[currentChapter], dialog = document.querySelector('#interview-dialog');
  let draft = state.answers[answerKey(currentChapter, currentQuestion)] || '';
  try { draft = localStorage.getItem(draftKey()) ?? draft; } catch {}
  dialog.innerHTML = `<div class="interview-header"><span class="interview-logo">${icon('book')}つづり</span><button class="close-button" aria-label="お話を中断して閉じる">${icon('close')}</button></div><div class="interview-body"><div class="eyebrow">CHAPTER ${String(currentChapter+1).padStart(2,'0')} · ${currentQuestion+1} / 3</div><h2 id="interview-title">${c.title}</h2><div class="question-dots">${c.questions.map((_, i)=>`<span class="${i === currentQuestion ? 'current' : state.answers[answerKey(currentChapter,i)] ? 'filled' : ''}"></span>`).join('')}</div><div class="question-label">${icon(c.icon)}${lifeStages[currentChapter]}の問いかけ</div><h3>${c.questions[currentQuestion]}</h3><p class="question-help">浮かんできたことから、自由に。短い言葉でも大丈夫です。</p><label for="answer" class="sr-only">あなたの回答</label><div class="event-date-field"><label for="event-year">いつ頃のお話ですか？ <span>任意・だいたいで大丈夫</span></label><input id="event-year" maxlength="40" placeholder="例：1975年ごろ、15歳のとき" value="${escape(state.eventYears[answerKey(currentChapter,currentQuestion)] || '')}"></div><textarea id="answer" placeholder="思い出を、あなたの言葉でつづってください。" maxlength="10000">${escape(draft)}</textarea><div class="answer-meta"><span id="draft-status">${storageAvailable ? '入力した文章もこの端末に自動保存されます' : '端末保存を利用できません'}</span><span id="char-count">${draft.length}文字</span></div><p id="answer-error" class="answer-error" role="alert"></p><div class="interview-actions"><button class="text-button" id="skip">あとで答える</button><button class="button primary" id="save-answer">お話を残して、次へ${icon('arrow')}</button></div><div class="interview-note">${icon('lock')}回答を外部に送信することはありません</div></div>`;
  const field = dialog.querySelector('textarea');
  const dateField = dialog.querySelector('#event-year');
  try { dateField.value = localStorage.getItem(draftKey() + '.year') ?? dateField.value; } catch {}
  const saveDraft = () => {
    clearTimeout(draftTimer);
    try { localStorage.setItem(draftKey(), field.value); localStorage.setItem(draftKey() + '.year', dateField.value); dialog.querySelector('#draft-status').textContent = '下書きを保存しました'; }
    catch { storageAvailable = false; dialog.querySelector('#draft-status').textContent = '下書きを保存できませんでした'; }
  };
  dateField.oninput = () => { clearTimeout(draftTimer); draftTimer = setTimeout(saveDraft, 350); };
  field.oninput = () => { dialog.querySelector('#char-count').textContent = `${field.value.length}文字`; draftTimer = setTimeout(saveDraft, 350); };
  dialog.querySelector('.close-button').onclick = () => { saveDraft(); dialog.close(); render(); toast(storageAvailable ? '続きは、いつでも。下書きを保存しました。' : '保存できませんでした。ブラウザの保存設定をご確認ください。'); };
  dialog.oncancel = () => { saveDraft(); render(); };
  dialog.querySelector('#save-answer').onclick = () => {
    if (!field.value.trim()) { dialog.querySelector('#answer-error').textContent = 'ひとこと入力するか、「あとで答える」を選んでください。'; field.focus(); return; }
    clearTimeout(draftTimer);
    state = saveAnswer(state, currentChapter, currentQuestion, field.value);
    state.eventYears[answerKey(currentChapter, currentQuestion)] = dateField.value.trim();
    if (!persist()) return;
    try { localStorage.removeItem(draftKey()); localStorage.removeItem(draftKey() + '.year'); } catch {}
    render(); moveNext(false);
  };
  dialog.querySelector('#skip').onclick = () => { saveDraft(); moveNext(true); };
  field.focus();
}
function moveNext(skipped) {
  if (currentQuestion < 2) { currentQuestion++; showQuestion(); return; }
  const dialog = document.querySelector('#interview-dialog'), chapter = currentChapter;
  const complete = countAnswers(state, chapter) === 3;
  dialog.innerHTML = `<div class="finished"><div class="finished-icon">${icon(complete ? 'check' : 'leaf')}</div><span class="eyebrow">A PAGE OF YOUR LIFE</span><h2 id="interview-title">${complete ? 'ひとつの章が、できました。' : '今日は、ここまで。'}</h2><p>${countAnswers(state, chapter)}のお話を本に残しました。<br>思い出を聞かせてくださって、ありがとうございます。<br>${skipped || !complete ? '答えていない質問には、いつでも戻れます。' : 'またひとつ、あなたの物語が増えました。'}</p><button class="button primary" id="read-chapter">本をひらいてみる${icon('arrow')}</button><button class="text-button" id="finish">マイストーリーへ戻る</button></div>`;
  dialog.oncancel = null;
  dialog.querySelector('#read-chapter').onclick = () => { dialog.close(); openBook(); };
  dialog.querySelector('#finish').onclick = () => { selected = chapter; dialog.close(); render(); };
}
function openName() {
  const dialog = document.querySelector('#name-dialog');
  dialog.innerHTML = `<button class="close-button" aria-label="閉じる">${icon('close')}</button><span class="eyebrow">YOUR NAME</span><h2 id="name-title">本に残す、お名前。</h2><p>本の著者として表示されます。ニックネームでも大丈夫。</p><form><label for="author">お名前</label><input id="author" maxlength="40" required value="${state.name === 'あなた' ? '' : escape(state.name)}" placeholder="例：さちこ"><button class="button primary" type="submit">名前を保存する${icon('check')}</button></form>`;
  dialog.querySelector('.close-button').onclick = () => dialog.close();
  dialog.querySelector('form').onsubmit = e => { e.preventDefault(); const name = dialog.querySelector('input').value.trim(); if (!name) return; state.name = name; if (!persist()) return; render(); dialog.close(); toast('本の著者名を保存しました。'); };
  dialog.showModal();
}
function openBook() {
  const dialog = document.querySelector('#book-dialog');
  const count = countAnswers(state);
  dialog.innerHTML = `<div class="book-dialog-header"><div><span class="eyebrow">YOUR BOOK · ${count} のお話</span><h2 id="book-title">${escape(titleForBook())}</h2></div><button class="close-button" aria-label="本を閉じる">${icon('close')}</button></div><div class="book-dialog-body">${state.profileComplete ? `<section class="book-chapter"><span class="eyebrow">ABOUT THE AUTHOR</span><h3>人生のはじまり</h3><p>${escape(state.name)}<br>${escape(state.profile.birthYear ? state.profile.birthYear + '年生まれ' : '')}<br>${escape(state.profile.birthplace)}<br>${escape(state.profile.childhoodFamily)}</p></section>` : ''}${count ? chapters.map((c,i) => {
    const answers = c.questions.map((_,q) => { const key = answerKey(i,q); return state.answers[key] ? {text: state.answers[key], year: state.eventYears[key]} : null; }).filter(Boolean);
    return answers.length ? `<section class="book-chapter"><span class="eyebrow">CHAPTER ${String(i+1).padStart(2,'0')}</span><h3>${c.title}</h3>${answers.map(a => `${a.year ? `<span class="book-event-year">${escape(a.year)}</span>` : ''}<p>${escape(a.text).replaceAll('\n','<br>')}</p>`).join('')}<button class="text-button chapter-edit" data-edit="${i}">${icon('pen')}この章をつづる</button></section>` : '';
  }).join('') : `<div class="empty-book">${icon('book')}<h3>最初の一ページは、<br>あなたの言葉から。</h3><p>お話をひとつ残すと、ここに本のページが生まれます。</p><button class="button primary" id="first-page">最初のお話をつづる${icon('arrow')}</button></div>`}</div><div class="book-dialog-footer"><span>あなたの回答をそのまま大切に残しています。</span><button class="button secondary" id="download" ${!count && !state.profileComplete ? 'disabled' : ''}>${icon('download')}本をダウンロード</button></div>`;
  dialog.querySelector('.close-button').onclick = () => dialog.close();
  dialog.querySelector('#first-page')?.addEventListener('click', () => { dialog.close(); openInterview(0); });
  dialog.querySelectorAll('[data-edit]').forEach(el => el.onclick = () => { dialog.close(); openInterview(Number(el.dataset.edit)); });
  dialog.querySelector('#download').onclick = () => {
    const blob = new Blob(['\uFEFF' + bookText(state)], {type:'text/plain;charset=utf-8'}), url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = '私の人生の物語.txt'; a.click(); setTimeout(()=>URL.revokeObjectURL(url),1000); toast('本をテキストファイルでダウンロードしました。');
  };
  dialog.showModal();
}
render();
