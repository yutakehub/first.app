export const chapters = [
  { title: 'はじまりの風景', sub: '幼い頃のこと', icon: 'sun', questions: ['子どもの頃、どんな場所で育ちましたか？', 'その場所で、いちばん好きだった景色を教えてください。', '小さい頃のあなたは、どんな子どもでしたか？'] },
  { title: '家族という居場所', sub: '家族との思い出', icon: 'home', questions: ['子どもの頃の食卓は、どんな様子でしたか？', 'ご両親から教わって、今も大切にしていることはありますか？', '家族との忘れられない思い出を教えてください。'] },
  { title: '夢を追いかけた日々', sub: '青春と挑戦', icon: 'spark', questions: ['学生時代、夢中になっていたことは何ですか？', 'その頃に出会った、大切な人について教えてください。', '若い頃の夢は、どんなものでしたか？'] },
  { title: '私が選んだ道', sub: '仕事と人生の転機', icon: 'path', questions: ['最初に選んだ仕事と、その理由を教えてください。', '人生の大きな転機になった出来事はありますか？', '難しい時期を、どう乗り越えましたか？'] },
  { title: '大切なあなたへ', sub: '子どもに伝えたいこと', icon: 'heart', questions: ['親になった日の気持ちを覚えていますか？', '子どもと過ごした日々で、心に残っていることは何ですか？', 'これからの子どもに、伝えておきたい言葉はありますか？'] },
  { title: 'これからの物語', sub: '今とこれから', icon: 'leaf', questions: ['今、幸せを感じるのはどんなときですか？', 'これからやってみたいことはありますか？', 'あなたにとって、よい人生とはどんな人生でしょうか？'] }
];
// Existing question indexes remain stable so earlier answers stay attached to the same question.
const additionalQuestions = [
  ['幼い頃、よく一緒に過ごした人は誰ですか？心に残る出来事を教えてください。', '子どもの頃、うれしかったことや、つらかったことをひとつ教えてください。', '生まれ育った場所を離れたり、暮らしが変わったりしたときのことを覚えていますか？'],
  ['ご家族は、どんな仕事や毎日の暮らしをしていましたか？', '家族の中で、特に影響を受けた人は誰ですか？具体的な出来事も教えてください。', '大人になってから、ご家族の見え方が変わった経験はありますか？'],
  ['進学や進路は、どのように決めましたか？', '学生時代の失敗や挫折で、今も覚えている出来事はありますか？', '学校を離れて次の人生へ進む頃、どんな気持ちでしたか？'],
  ['仕事で特に心に残る出来事を、出会った人や当時の状況と一緒に教えてください。', '働き方や住む場所を変えた経験があれば、何をきっかけに決めましたか？', '仕事や暮らしを通して、若い頃と考え方が変わったことはありますか？'],
  ['家族が増える前は、どんな暮らしをしていましたか？大切な出会いも教えてください。', '子育てで悩んだ時期はありましたか？どう向き合いましたか？', 'お子さんにはまだ話したことのない、家族との思い出はありますか？'],
  ['人生を振り返って、ご自身らしい選択だったと思う出来事はありますか？', '今、感謝を伝えたい人は誰ですか？その理由を教えてください。', 'この本を読む家族に、最後にどんな言葉を残したいですか？']
];
export const BOOK_TARGET = 5000;
export const CHAPTER_TARGETS = [900, 900, 900, 1000, 900, 400];
chapters.forEach((c, i) => { c.questions.push(...additionalQuestions[i]); });
export const textLength = text => Array.from(String(text || '').replace(/\s/g, '')).length;
export function materialStats(state, chapter) {
  const items = chapterSource(state, chapter);
  const characters = items.reduce((n, item) => n + textLength(item.answer) + item.followups.reduce((m, f) => m + textLength(f.answer), 0), 0);
  const target = CHAPTER_TARGETS[chapter];
  return { characters, target, minimum: Math.ceil(target * 0.35), answered: items.length };
}
export function approvedCharacters(state) {
  return chapters.reduce((n, _, i) => {
    const d = state.manuscripts?.[i];
    return n + (d?.approved && d.source === sourceFingerprint(state, i) ? textLength(d.text) : 0);
  }, 0);
}
export const emptyState = (name = 'あなた') => ({ name, answers: {}, started: false, profile: { birthYear: '', birthplace: '', childhoodFamily: '' }, profileComplete: false, eventYears: {}, followups: {}, manuscripts: {} });
export function saveProfile(state, values) {
  const name = String(values.name || '').trim();
  const birthYear = String(values.birthYear || '').trim();
  if (!name) throw new Error('お名前を入力してください。');
  if (birthYear && (!/^\d{4}$/.test(birthYear) || Number(birthYear) < 1850 || Number(birthYear) > Number(new Intl.DateTimeFormat('en', { timeZone: 'Asia/Tokyo', year: 'numeric' }).format(new Date())))) throw new Error('生まれた年を西暦4桁で入力してください。');
  return { ...state, name: name.slice(0, 40), profile: { birthYear, birthplace: String(values.birthplace || '').trim().slice(0, 200), childhoodFamily: String(values.childhoodFamily || '').trim().slice(0, 500) }, profileComplete: true };
}
export const lifeStages = ['幼少期', '幼少期・家族', '学生時代', '社会人時代', '子育ての日々', '今・これから'];
export function timelineEntries(state) {
  const entries = [];
  if (state.profileComplete) entries.push({ key: 'birth', year: state.profile.birthYear, stage: '誕生', title: `${state.name}さんが生まれる`, text: state.profile.birthplace ? `${state.profile.birthplace}で生まれました。` : '生まれた場所は、これから聞いていきましょう。', chapter: null });
  chapters.forEach((c, i) => c.questions.forEach((question, q) => {
    const key = answerKey(i, q), answer = state.answers[key];
    if (answer) entries.push({ key, year: state.eventYears?.[key] || '', stage: lifeStages[i], title: question, text: answer, chapter: i });
  }));
  // Only dates supplied by the author become dated historical entries.
  return entries.sort((a, b) => {
    if (a.key === 'birth') return -1;
    if (b.key === 'birth') return 1;
    const ay = a.year.match(/\d{4}/)?.[0], by = b.year.match(/\d{4}/)?.[0];
    if (ay && by) return Number(ay) - Number(by);
    if (ay) return -1;
    if (by) return 1;
    return 0;
  });
}
export const answerKey = (chapter, question) => `${chapter}:${question}`;
export function saveAnswer(state, chapter, question, answer) {
  if (!chapters[chapter]?.questions[question] || !answer.trim()) throw new Error('有効な回答を入力してください');
  const next = { ...state, started: true, answers: { ...state.answers, [answerKey(chapter, question)]: answer.trim() } };
  return next;
}
export function chapterSource(state, chapter) {
  return chapters[chapter].questions.map((question, q) => {
    const key = answerKey(chapter, q);
    return { question, answer: state.answers[key] || '', year: state.eventYears[key] || '', followups: state.followups?.[key] || [] };
  }).filter(item => item.answer);
}
export function sourceFingerprint(state, chapter) {
  return JSON.stringify({ name: state.name, profile: state.profile, items: chapterSource(state, chapter) });
}
export function saveManuscript(state, chapter, text, origin = 'manual') {
  if (!text.trim()) throw new Error('章の文章を入力してください。');
  return { ...state, manuscripts: { ...state.manuscripts, [chapter]: { text: text.trim(), source: sourceFingerprint(state, chapter), origin, approved: false } } };
}
export function approvedChapters(state) {
  return chapters.filter((_, i) => state.manuscripts?.[i]?.approved && state.manuscripts[i].source === sourceFingerprint(state, i)).length;
}
export function manuscriptText(state) {
  return `${state.name}の人生の物語\n\n` + chapters.map((c, i) => {
    const draft = state.manuscripts?.[i];
    return draft?.approved && draft.source === sourceFingerprint(state, i) ? `第${i + 1}章　${c.title}\n\n${draft.text}` : '';
  }).filter(Boolean).join('\n\n──────────\n\n');
}
export function countAnswers(state, chapter) {
  return chapters.reduce((total, c, i) => total + (chapter === undefined || chapter === i ? c.questions.filter((_, q) => Boolean(state.answers[answerKey(i, q)])).length : 0), 0);
}
export function nextQuestion(state, chapter) {
  return chapters[chapter].questions.findIndex((_, q) => !state.answers[answerKey(chapter, q)]);
}
export function bookText(state) {
  const profile = state.profileComplete ? `基本情報\nお名前：${state.name}\n生まれた年：${state.profile.birthYear || '未記入'}\n生まれた場所：${state.profile.birthplace || '未記入'}\n幼い頃の家族：${state.profile.childhoodFamily || '未記入'}\n\n` : '';
  return `${state.name}の人生の物語\n\n` + profile + chapters.map((c, i) => {
    const text = c.questions.map((_, q) => {
      const key = answerKey(i, q), answer = state.answers[key];
      return answer ? `${state.eventYears?.[key] ? `【${state.eventYears[key]}】\n` : ''}${answer}` : '';
    }).filter(Boolean).join('\n\n');
    return text ? `第${i + 1}章　${c.title}\n\n${text}` : '';
  }).filter(Boolean).join('\n\n──────────\n\n');
}
export function restoreState(raw) {
  try {
    const data = JSON.parse(raw);
    if (!data || typeof data.name !== 'string' || !data.answers || typeof data.answers !== 'object') return emptyState();
    const answers = {};
    chapters.forEach((c, i) => c.questions.forEach((_, q) => {
      const key = answerKey(i, q);
      if (typeof data.answers[key] === 'string' && data.answers[key].trim()) answers[key] = data.answers[key];
    }));
    const eventYears = {};
    Object.keys(answers).forEach(key => { if (typeof data.eventYears?.[key] === 'string') eventYears[key] = data.eventYears[key].slice(0, 40); });
    const profile = {};
    for (const key of ['birthYear', 'birthplace', 'childhoodFamily']) profile[key] = typeof data.profile?.[key] === 'string' ? data.profile[key].slice(0, 500) : '';
    const followups = {}, manuscripts = {};
    for (const key of Object.keys(answers)) {
      if (Array.isArray(data.followups?.[key])) followups[key] = data.followups[key].filter(x => typeof x?.question === 'string' && typeof x?.answer === 'string').slice(0, 5).map(x => ({ question: x.question.slice(0, 1000), answer: x.answer.slice(0, 10000) }));
    }
    chapters.forEach((_, i) => {
      const draft = data.manuscripts?.[i];
      if (typeof draft?.text === 'string' && typeof draft?.source === 'string') manuscripts[i] = {text: draft.text.slice(0, 30000), source: draft.source, origin: draft.origin === 'ai' ? 'ai' : 'manual', approved: Boolean(draft.approved)};
    });
    return { name: data.name.slice(0, 40), answers, started: Boolean(data.started), profile, profileComplete: Boolean(data.profileComplete), eventYears, followups, manuscripts };
  } catch { return emptyState(); }
}
