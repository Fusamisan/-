import { LETTERS, WORDS, CATEGORIES } from './data.js';
import * as store from './store.js';
import { speak, voiceStatus, voiceName, onVoicesChanged } from './speech.js';
import { WritingPad } from './writing.js';

const $main = document.getElementById('main');
const $modal = document.getElementById('modal');
const BASE_LETTERS = LETTERS.filter(l => !l.final);

// ---------- 小さなヘルパー ----------
function h(tag, attrs = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'html') el.innerHTML = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat()) if (kid != null && kid !== false) el.append(kid.nodeType ? kid : String(kid));
  return el;
}
const he = (text, cls = '') => h('span', { class: `he ${cls}`, dir: 'rtl', lang: 'he' }, text);
const shuffle = a => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const sample = (a, n) => shuffle(a).slice(0, n);
const speakBtn = (text, label = '🔊') => h('button', { class: label === '🔊' ? 'icon-btn speak' : 'btn small speak', 'aria-label': '読み上げ', onclick: e => { e.stopPropagation(); speak(text); } }, label);

// 画面ごとの後片付け（書き取りパッドの監視解除など）。新しい画面を作る前に前の画面のものを呼ぶ。
let cleanup = null;
function render(makeView) {
  const old = cleanup; cleanup = null; old?.();
  $main.replaceChildren(makeView());
  $main.scrollTop = 0;
}

function openModal(content) {
  $modal.replaceChildren(h('div', { class: 'modal-card', onclick: e => e.stopPropagation() },
    h('button', { class: 'icon-btn modal-close', 'aria-label': '閉じる', onclick: closeModal }, '✕'),
    content));
  $modal.hidden = false;
}
function closeModal() { $modal.hidden = true; $modal.replaceChildren(); }
$modal.addEventListener('click', closeModal);

// ---------- ホーム ----------
function viewHome() {
  const s = store.get();
  const now = Date.now();
  const learned = WORDS.filter(w => (s.srs[w.id]?.box || 0) >= 2).length;
  const due = WORDS.filter(w => store.srsIsDue(w.id, now)).length;
  const seen = Object.keys(s.lettersSeen).length;
  const wrote = Object.values(s.writing).filter(v => v >= 70).length;

  const stat = (num, label) => h('div', { class: 'stat' }, h('div', { class: 'stat-num' }, num), h('div', { class: 'stat-label' }, label));
  const tile = (href, icon, title, desc) => h('a', { class: 'tile', href }, h('div', { class: 'tile-icon' }, icon), h('div', {}, h('div', { class: 'tile-title' }, title), h('div', { class: 'tile-desc' }, desc)));

  // 音声一覧の読み込みを待ってから、ヘブライ語音声が本当に無いときだけ案内を出す
  const voiceNote = h('p', { class: 'note', hidden: true },
    'ヘブライ語の音声が見つかりません。iPadの「設定 → アクセシビリティ → 読み上げコンテンツ → 声 → ヘブライ語」で音声を追加すると発音を聞けます。');
  const voiceLabel = h('span', { class: 'muted' });
  const updateVoiceNote = st => {
    voiceNote.hidden = st !== 'missing';
    voiceLabel.textContent = voiceName() || (st === 'loading' ? '読み込み中…' : 'なし');
  };
  updateVoiceNote(voiceStatus());
  cleanup = onVoicesChanged(updateVoiceNote);

  return h('section', { class: 'view home' },
    h('header', { class: 'hero' },
      he('שָׁלוֹם', 'hero-he'),
      h('h1', {}, 'ヘブライ語をはじめよう'),
      h('p', { class: 'muted' }, s.streak.count ? `🔥 ${s.streak.count}日連続で学習中` : '今日から学習をはじめましょう')),
    h('div', { class: 'stats' },
      stat(`${seen}/${LETTERS.length}`, '見た文字'),
      stat(`${wrote}/${LETTERS.length}`, '書けた文字'),
      stat(`${learned}/${WORDS.length}`, '覚えた単語'),
      stat(due, '今日の復習')),
    h('div', { class: 'tiles' },
      tile('#/alphabet', 'א', 'アレフベート', '22文字と語末形5文字を発音つきで'),
      tile('#/cards', '🃏', '単語カード', due ? `復習が${due}枚あります` : '基本単語を間隔反復で覚える'),
      tile('#/quiz', '❓', 'クイズ', '文字と単語の4択問題'),
      tile('#/write', '✏️', '書き取り', 'Apple Pencilで文字をなぞる')),
    voiceNote,
    h('details', { class: 'settings' },
      h('summary', {}, '設定'),
      h('label', { class: 'row' }, '読み上げ速度',
        h('input', { type: 'range', min: '0.5', max: '1.2', step: '0.1', value: s.settings.rate,
          oninput: e => { s.settings.rate = +e.target.value; store.save(); } }),
        h('button', { class: 'btn small', onclick: () => speak('שָׁלוֹם') }, '試す')),
      h('p', { class: 'row small' }, '使用中の音声：', voiceLabel),
      h('p', { class: 'muted small' }, '音が割れる・ザラつくときは、iPadの「設定 → アクセシビリティ → 読み上げコンテンツ → 声 → ヘブライ語」で「拡張」版の音声をダウンロードすると改善することがあります。'),
      h('label', { class: 'row' },
        h('input', { type: 'checkbox', checked: s.settings.showTranslit,
          onchange: e => { s.settings.showTranslit = e.target.checked; store.save(); } }),
        'ローマ字読みを表示する'),
      h('button', { class: 'btn danger small', onclick: () => {
        if (confirm('学習の記録をすべて消去しますか？')) { store.reset(); render(viewHome); }
      } }, '学習記録をリセット')));
}

// ---------- アレフベート ----------
function viewAlphabet() {
  const s = store.get();
  const cell = l => h('button', { class: `letter-cell ${s.lettersSeen[l.id] ? 'seen' : ''}`, onclick: () => showLetter(l) },
    he(l.char, 'letter-glyph'),
    h('span', { class: 'letter-name' }, l.name));
  return h('section', { class: 'view' },
    h('h2', {}, 'アレフベート'),
    h('p', { class: 'muted' }, 'ヘブライ語は右から左へ書きます。文字をタップすると発音と例が見られます。'),
    h('div', { class: 'letter-grid', dir: 'rtl' }, BASE_LETTERS.map(cell)),
    h('h3', {}, '語末形（ソフィート）'),
    h('p', { class: 'muted' }, '5つの文字は単語の最後に来ると形が変わります。'),
    h('div', { class: 'letter-grid', dir: 'rtl' }, LETTERS.filter(l => l.final).map(cell)));
}

function showLetter(l) {
  const s = store.get();
  s.lettersSeen[l.id] = true; store.touchStreak(); store.save();
  speak(l.nameHe);
  const idx = LETTERS.indexOf(l);
  const nav = (d) => () => showLetter(LETTERS[(idx + d + LETTERS.length) % LETTERS.length]);
  openModal(h('div', { class: 'letter-detail' },
    he(l.char, 'letter-big'),
    h('div', { class: 'letter-title' }, l.name, ' ', h('span', { class: 'muted' }, l.latin), ' ', speakBtn(l.nameHe)),
    he(l.nameHe, 'letter-he-name'),
    h('dl', { class: 'facts' },
      h('dt', {}, '音'), h('dd', {}, l.sound),
      l.final ? [h('dt', {}, '通常形'), h('dd', {}, he(l.final, 'inline-glyph'))] : null,
      h('dt', {}, '例'), h('dd', {}, he(l.example.he, 'inline-word'), ' ', speakBtn(l.example.he), ' ', `${l.example.tr}（${l.example.ja}）`)),
    h('div', { class: 'row gap' },
      h('button', { class: 'btn', onclick: nav(1) }, '← 次の文字'),
      h('a', { class: 'btn primary', href: `#/write/${l.id}`, onclick: closeModal }, '✏️ 書いてみる'),
      h('button', { class: 'btn', onclick: nav(-1) }, '前の文字 →'))));
  // 一覧の「見た」表示を更新
  if (location.hash.startsWith('#/alphabet')) render(viewAlphabet);
}

// ---------- 単語カード（SRS） ----------
function viewCardsMenu() {
  const s = store.get();
  const now = Date.now();
  const deckInfo = (words) => {
    const due = words.filter(w => store.srsIsDue(w.id, now)).length;
    const fresh = words.filter(w => !s.srs[w.id]).length;
    return { due, fresh };
  };
  const deckBtn = (id, icon, name, words) => {
    const { due, fresh } = deckInfo(words);
    return h('a', { class: 'deck', href: `#/cards/${id}` },
      h('span', { class: 'deck-icon' }, icon),
      h('span', { class: 'deck-name' }, name),
      h('span', { class: 'deck-meta' }, `復習 ${due} ・ 新規 ${fresh} ・ 全${words.length}`));
  };
  return h('section', { class: 'view' },
    h('h2', {}, '単語カード'),
    h('p', { class: 'muted' }, '覚えた単語ほど次に出てくるまでの間隔が延びます（1日→2日→4日…）。'),
    h('div', { class: 'decks' },
      deckBtn('all', '📚', 'すべて', WORDS),
      CATEGORIES.map(c => deckBtn(c.id, c.icon, c.name, WORDS.filter(w => w.cat === c.id)))),
    h('label', { class: 'row' },
      h('input', { type: 'checkbox', id: 'reverse', checked: sessionStorage.getItem('cards-reverse') === '1',
        onchange: e => { try { sessionStorage.setItem('cards-reverse', e.target.checked ? '1' : '0'); } catch {} } }),
      '日本語 → ヘブライ語 で出題する'));
}

function viewCards(deckId) {
  const s = store.get();
  const now = Date.now();
  const words = deckId === 'all' ? WORDS : WORDS.filter(w => w.cat === deckId);
  let reverse = false;
  try { reverse = sessionStorage.getItem('cards-reverse') === '1'; } catch {}
  const due = shuffle(words.filter(w => store.srsIsDue(w.id, now)));
  const fresh = words.filter(w => !s.srs[w.id]).slice(0, 10);
  let queue = [...due, ...fresh];
  let done = 0;
  const total = queue.length;

  const wrap = h('section', { class: 'view cards' });
  const back = h('a', { class: 'back', href: '#/cards' }, '← デッキ一覧');

  function next() {
    if (!queue.length) {
      wrap.replaceChildren(back, h('div', { class: 'done' },
        h('div', { class: 'done-emoji' }, '🎉'),
        h('h2', {}, total ? 'おつかれさまでした！' : '今は復習するカードがありません'),
        h('p', { class: 'muted' }, total ? `${done}枚を学習しました。` : 'また明日来てください。'),
        total ? null : h('button', { class: 'btn primary', onclick: () => { queue = shuffle(words).slice(0, 10); next(); } }, '練習として10枚やる'),
        h('a', { class: 'btn', href: '#/' }, 'ホームへ')));
      return;
    }
    const w = queue[0];
    const st = s.settings;
    let flipped = false;
    const front = reverse
      ? h('div', { class: 'card-face' }, h('div', { class: 'card-ja' }, w.ja))
      : h('div', { class: 'card-face' }, he(w.he, 'card-he'));
    const backFace = h('div', { class: 'card-face card-back' },
      he(w.he, 'card-he'),
      st.showTranslit ? h('div', { class: 'card-tr' }, w.tr) : null,
      h('div', { class: 'card-ja' }, w.ja));
    const card = h('button', { class: 'flashcard', onclick: flip }, front, h('div', { class: 'card-hint muted' }, 'タップでめくる'));
    const grades = h('div', { class: 'grades', hidden: true },
      h('button', { class: 'btn grade-0', onclick: () => grade(0) }, 'もう一度'),
      h('button', { class: 'btn grade-1', onclick: () => grade(1) }, '難しい'),
      h('button', { class: 'btn grade-2 primary', onclick: () => grade(2) }, '覚えた'));

    function flip() {
      if (flipped) return;
      flipped = true;
      card.replaceChildren(backFace);
      card.classList.add('flipped');
      grades.hidden = false;
      speak(w.he);
    }
    function grade(g) {
      store.srsGrade(w.id, g);
      queue.shift();
      if (g === 0) queue.splice(Math.min(queue.length, 3), 0, w); // 少し後にもう一度
      else done++;
      next();
    }
    if (!reverse) speak(w.he);
    wrap.replaceChildren(back,
      h('div', { class: 'progress' }, h('div', { class: 'progress-bar', style: `width:${total ? (done / total) * 100 : 0}%` })),
      h('p', { class: 'muted center' }, `残り ${queue.length} 枚`),
      card,
      h('div', { class: 'row center' }, speakBtn(w.he, '🔊 発音')),
      grades);
  }
  next();
  return wrap;
}

// ---------- クイズ ----------
const QUIZ_MODES = [
  { id: 'letter-name', title: '文字 → 名前', desc: '文字を見て名前を選ぶ' },
  { id: 'name-letter', title: '名前 → 文字', desc: '名前（と発音）から文字を選ぶ' },
  { id: 'word-ja',     title: '単語 → 意味', desc: 'ヘブライ語の意味を選ぶ' },
  { id: 'ja-word',     title: '意味 → 単語', desc: '日本語からヘブライ語を選ぶ' },
  { id: 'listen',      title: '聞き取り',    desc: '音声を聞いて単語を選ぶ' },
];

function viewQuizMenu() {
  const best = store.get().quizBest;
  return h('section', { class: 'view' },
    h('h2', {}, 'クイズ'),
    h('p', { class: 'muted' }, '1回10問の4択です。'),
    h('div', { class: 'decks' }, QUIZ_MODES.map(m => h('a', { class: 'deck', href: `#/quiz/${m.id}` },
      h('span', { class: 'deck-name' }, m.title),
      h('span', { class: 'deck-meta' }, m.desc + (best[m.id] != null ? ` ・ 最高 ${best[m.id]}/10` : ''))))));
}

function makeQuestion(mode) {
  if (mode === 'letter-name' || mode === 'name-letter') {
    const pool = LETTERS;
    const ans = sample(pool, 1)[0];
    // 見た目が似ている文字・同じ文字の語末形はまぎらわしいので除外しない（学習になる）。ただし名前の重複は避ける。
    const wrong = sample(pool.filter(l => l !== ans && l.name !== ans.name), 3);
    const opts = shuffle([ans, ...wrong]);
    if (mode === 'letter-name') {
      return { prompt: he(ans.char, 'quiz-glyph'), say: ans.nameHe, sayOnAnswer: true,
        options: opts.map(o => ({ label: o.name, correct: o === ans })) };
    }
    return { prompt: h('div', { class: 'quiz-text' }, ans.name), say: ans.nameHe,
      options: opts.map(o => ({ label: he(o.char, 'option-glyph'), correct: o === ans })) };
  }
  const ans = sample(WORDS, 1)[0];
  const wrong = sample(WORDS.filter(w => w !== ans && w.ja !== ans.ja), 3);
  const opts = shuffle([ans, ...wrong]);
  const tr = store.get().settings.showTranslit;
  if (mode === 'word-ja') {
    return { prompt: h('div', {}, he(ans.he, 'quiz-word'), tr ? h('div', { class: 'card-tr' }, ans.tr) : null), say: ans.he, sayOnAnswer: true,
      options: opts.map(o => ({ label: o.ja, correct: o === ans })) };
  }
  if (mode === 'ja-word') {
    return { prompt: h('div', { class: 'quiz-text' }, ans.ja), say: ans.he, sayOnAnswer: true,
      options: opts.map(o => ({ label: he(o.he, 'option-word'), correct: o === ans })) };
  }
  // listen
  return { prompt: h('div', { class: 'quiz-text' }, '🎧 聞こえた単語は？'), say: ans.he, autoplay: true,
    options: opts.map(o => ({ label: he(o.he, 'option-word'), sub: o.ja, correct: o === ans })) };
}

function viewQuiz(mode) {
  const N = 10;
  let i = 0, score = 0;
  const wrap = h('section', { class: 'view quiz' });
  const back = h('a', { class: 'back', href: '#/quiz' }, '← モード選択');

  function next() {
    if (i >= N) {
      const best = store.get().quizBest;
      const isBest = best[mode] == null || score > best[mode];
      if (isBest) { best[mode] = score; store.save(); }
      store.touchStreak();
      wrap.replaceChildren(back, h('div', { class: 'done' },
        h('div', { class: 'done-emoji' }, score >= 8 ? '🏆' : score >= 5 ? '👍' : '💪'),
        h('h2', {}, `${score} / ${N} 問正解`),
        isBest ? h('p', {}, '自己ベスト更新！') : null,
        h('div', { class: 'row gap center' },
          h('button', { class: 'btn primary', onclick: () => { i = 0; score = 0; next(); } }, 'もう一度'),
          h('a', { class: 'btn', href: '#/quiz' }, '別のモード'))));
      return;
    }
    const q = makeQuestion(mode);
    let answered = false;
    const optionsEl = h('div', { class: 'options' }, q.options.map(o => {
      const b = h('button', { class: 'option', onclick: () => {
        if (answered) return;
        answered = true;
        if (o.correct) { score++; b.classList.add('correct'); }
        else {
          b.classList.add('wrong');
          optionsEl.querySelectorAll('.option')[q.options.findIndex(x => x.correct)].classList.add('correct');
        }
        if (q.sayOnAnswer) speak(q.say);
        optionsEl.querySelectorAll('.option-sub').forEach(e => { e.hidden = false; });
        nextBtn.hidden = false;
      } }, o.label, o.sub ? h('span', { class: 'option-sub', hidden: true }, o.sub) : null);
      return b;
    }));
    const nextBtn = h('button', { class: 'btn primary', hidden: true, onclick: () => { i++; next(); } }, i === N - 1 ? '結果を見る' : '次へ →');
    wrap.replaceChildren(back,
      h('div', { class: 'progress' }, h('div', { class: 'progress-bar', style: `width:${(i / N) * 100}%` })),
      h('p', { class: 'muted center' }, `第 ${i + 1} 問 / ${N} ・ 正解 ${score}`),
      h('div', { class: 'quiz-prompt' }, q.prompt, (!q.sayOnAnswer || q.autoplay) ? speakBtn(q.say) : null),
      optionsEl,
      h('div', { class: 'row center' }, nextBtn));
    if (q.autoplay || mode === 'name-letter') setTimeout(() => speak(q.say), 250);
  }
  next();
  return wrap;
}

// ---------- 書き取り ----------
function viewWrite(letterId) {
  const s = store.get();
  let letter = LETTERS.find(l => l.id === letterId) || LETTERS[0];
  let showGuide = true;

  const padHost = h('div', { class: 'pad' });
  const result = h('div', { class: 'write-result', 'aria-live': 'polite' });
  const title = h('div', { class: 'write-title' });
  const strip = h('div', { class: 'letter-strip', dir: 'rtl' }, LETTERS.map(l =>
    h('button', { class: 'strip-btn', 'data-id': l.id, onclick: () => select(l) }, he(l.char))));

  const pad = new WritingPad(padHost, { pencilOnly: s.settings.pencilOnly, onStroke: () => { result.textContent = ''; } });

  function renderTitle() {
    const best = s.writing[letter.id];
    title.replaceChildren(he(letter.char, 'write-glyph'), ' ', letter.name, ' ', speakBtn(letter.nameHe),
      ...(best != null ? [h('span', { class: 'muted' }, ` 最高 ${best}点`)] : []));
  }

  function select(l) {
    letter = l;
    history.replaceState(null, '', `#/write/${l.id}`);
    pad.setLetter(l.char);
    result.replaceChildren();
    renderTitle();
    strip.querySelectorAll('.strip-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.id === l.id);
      b.classList.toggle('cleared', (s.writing[b.dataset.id] || 0) >= 70);
    });
    strip.querySelector('.active')?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
  }

  function grade() {
    if (pad.isEmpty) { result.textContent = 'まずは文字を書いてみましょう'; return; }
    const sc = pad.score();
    const stars = sc >= 85 ? '★★★' : sc >= 70 ? '★★☆' : sc >= 50 ? '★☆☆' : '☆☆☆';
    const msg = sc >= 85 ? 'すばらしい！' : sc >= 70 ? 'よく書けました' : sc >= 50 ? 'もう少し！' : 'お手本をよく見て、もう一度';
    result.replaceChildren(h('span', { class: 'stars' }, stars), ` ${sc}点 — ${msg}`);
    if (sc > (s.writing[letter.id] ?? -1)) { s.writing[letter.id] = sc; }
    store.touchStreak(); store.save();
    renderTitle();
    strip.querySelector(`[data-id="${letter.id}"]`)?.classList.toggle('cleared', (s.writing[letter.id] || 0) >= 70);
  }

  const guideBtn = h('button', { class: 'btn', onclick: () => {
    showGuide = !showGuide; pad.set({ showGuide }); guideBtn.textContent = showGuide ? 'お手本を隠す' : 'お手本を表示';
  } }, 'お手本を隠す');

  const step = d => () => select(LETTERS[(LETTERS.indexOf(letter) + d + LETTERS.length) % LETTERS.length]);

  const view = h('section', { class: 'view write' },
    strip,
    title,
    padHost,
    result,
    h('div', { class: 'row gap center wrap' },
      h('button', { class: 'btn', onclick: () => pad.undo() }, '↶ 1画もどす'),
      h('button', { class: 'btn', onclick: () => { pad.clear(); result.replaceChildren(); } }, '消す'),
      guideBtn,
      h('button', { class: 'btn primary', onclick: grade }, '採点する')),
    h('div', { class: 'row gap center wrap' },
      h('button', { class: 'btn', onclick: step(1) }, '← 次の文字'),
      h('label', { class: 'row' },
        h('input', { type: 'checkbox', checked: s.settings.pencilOnly, onchange: e => {
          s.settings.pencilOnly = e.target.checked; store.save(); pad.set({ pencilOnly: e.target.checked });
        } }),
        'Apple Pencilだけで書く（手のひらで誤って書かない）'),
      h('button', { class: 'btn', onclick: step(-1) }, '前の文字 →')),
    h('p', { class: 'muted small center' }, '採点は、お手本の形をどれだけなぞれたかで自動判定します（書き順は判定しません）。'));

  cleanup = () => pad.destroy();
  requestAnimationFrame(() => select(letter));
  return view;
}

// ---------- ルーティング ----------
function route() {
  closeModal();
  const [, page = '', arg] = location.hash.split('/');
  document.querySelectorAll('.tabbar a').forEach(a => a.classList.toggle('active', a.dataset.page === (page || 'home')));
  const views = {
    '': () => viewHome(),
    alphabet: () => viewAlphabet(),
    cards: () => arg ? viewCards(arg) : viewCardsMenu(),
    quiz: () => arg && QUIZ_MODES.some(m => m.id === arg) ? viewQuiz(arg) : viewQuizMenu(),
    write: () => viewWrite(arg),
  };
  render(views[page] || views['']);
}

window.addEventListener('hashchange', route);
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
route();

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}
