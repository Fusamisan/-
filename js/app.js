import { LETTERS, WORDS, CATEGORIES } from './data.js';
import * as store from './store.js';
import { speak, voiceStatus, voiceName, onVoicesChanged } from './speech.js';
import { WritingPad } from './writing.js';
import {
  todayLesson, completeStep, lessonProgress, quizItems,
  letterLevel, wordLevel, weakLetters, weakWords, LEVEL_NAMES,
} from './lesson.js';

const $main = document.getElementById('main');
const $modal = document.getElementById('modal');
const BASE_LETTERS = LETTERS.filter(l => !l.final);
const letterById = id => LETTERS.find(l => l.id === id);
const wordById = id => WORDS.find(w => w.id === id);

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
  for (const kid of kids.flat(Infinity)) if (kid != null && kid !== false) el.append(kid.nodeType ? kid : String(kid));
  return el;
}
const he = (text, cls = '') => h('span', { class: `he ${cls}`, dir: 'rtl', lang: 'he' }, text);
const shuffle = a => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const sample = (a, n) => shuffle(a).slice(0, n);
const speakBtn = (text, label = '🔊') => h('button', { class: label === '🔊' ? 'icon-btn speak' : 'btn small speak', 'aria-label': '読み上げ', onclick: e => { e.stopPropagation(); speak(text); } }, label);
const minutes = sec => Math.round(sec / 60);
const fmtMin = sec => { const m = minutes(sec); return m >= 60 ? `${Math.floor(m / 60)}時間${m % 60}分` : `${m}分`; };

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

// ---------- 学習時間の自動記録 ----------
// 画面が表示されていて、直近60秒以内に操作があった間だけ15秒ずつ数える
let lastInput = Date.now();
for (const ev of ['pointerdown', 'keydown']) window.addEventListener(ev, () => { lastInput = Date.now(); }, { capture: true, passive: true });
setInterval(() => {
  if (document.visibilityState === 'visible' && Date.now() - lastInput < 60_000) store.addTime(15);
}, 15_000);

// ---------- 今日のレッスン ----------
const STEP_INFO = {
  review:  st => ({ icon: '🔁', title: '復習', desc: `単語カード ${st.ids.length}枚` }),
  letters: st => ({ icon: 'א', title: st.mode === 'new' ? '文字を学ぶ' : '苦手な文字の練習', desc: st.ids.map(id => letterById(id).char).join(' '), descHe: true }),
  words:   st => ({ icon: '🃏', title: '新しい単語', desc: `${st.ids.length}語` }),
  quiz:    st => ({ icon: '❓', title: '確認クイズ', desc: `${st.n}問` }),
};

function lessonCard() {
  const lesson = todayLesson();
  const { done, total, complete } = lessonProgress(lesson);
  const d = store.day();
  const goal = store.get().settings.dailyMinutes;
  const nextIdx = lesson.steps.findIndex(st => !st.done);
  const chip = (st, i) => {
    const info = STEP_INFO[st.type](st);
    return h('li', { class: `lesson-chip ${st.done ? 'is-done' : ''} ${i === nextIdx ? 'next' : ''}` },
      h('span', { class: 'chip-icon' }, st.done ? '✓' : info.icon),
      h('span', {}, h('span', { class: 'chip-title' }, info.title), h('span', { class: 'chip-desc' }, info.descHe ? he(info.desc) : info.desc)));
  };
  return h('section', { class: 'lesson-card' },
    h('div', { class: 'lesson-head' },
      h('div', {},
        h('div', { class: 'lesson-label' }, '今日のレッスン'),
        h('div', { class: 'lesson-sub muted' }, complete ? '完了しました 🎉' : `${done}/${total} ステップ完了`)),
      h('div', { class: 'goal' },
        h('div', { class: 'goal-num' }, `${minutes(d.sec)}`, h('small', {}, ` / ${goal}分`)),
        h('div', { class: 'progress' }, h('div', { class: 'progress-bar', style: `width:${Math.min(100, (d.sec / 60 / goal) * 100)}%` })),
        h('div', { class: 'goal-label muted' }, '今日の学習時間'))),
    h('ol', { class: 'lesson-chips' }, lesson.steps.map(chip)),
    h('a', { class: 'btn primary big', href: '#/lesson' }, complete ? '内容をふり返る' : done ? 'つづける →' : 'はじめる →'));
}

function viewLesson() {
  const lesson = todayLesson();
  const wrap = h('section', { class: 'view lesson' });
  let stepCleanup = null;
  const clearStep = () => { stepCleanup?.(); stepCleanup = null; };
  cleanup = clearStep;

  function overview() {
    clearStep();
    const { complete } = lessonProgress(lesson);
    const nextIdx = lesson.steps.findIndex(st => !st.done);
    const row = (st, i) => {
      const info = STEP_INFO[st.type](st);
      return h('li', { class: `step-row ${st.done ? 'is-done' : ''}` },
        h('span', { class: 'step-num' }, st.done ? '✓' : i + 1),
        h('span', { class: 'step-text' },
          h('span', { class: 'step-title' }, info.title),
          h('span', { class: 'step-desc muted' }, info.descHe ? he(info.desc) : info.desc)),
        h('button', { class: `btn small ${i === nextIdx ? 'primary' : ''}`, onclick: () => runStep(i) }, st.done ? 'もう一度' : i === nextIdx ? 'はじめる' : 'やる'));
    };
    wrap.replaceChildren(
      h('a', { class: 'back', href: '#/' }, '← ホーム'),
      h('h2', {}, '今日のレッスン'),
      complete
        ? h('div', { class: 'done small-done' }, h('div', { class: 'done-emoji' }, '🎉'), h('h3', {}, '今日のレッスンは完了です！'),
            h('p', { class: 'muted' }, '記録は「記録」タブで見られます。明日も新しいレッスンが用意されます。'))
        : h('p', { class: 'muted' }, '上から順に進めましょう。途中でやめても、続きから再開できます。'),
      h('ol', { class: 'step-list' }, lesson.steps.map(row)),
      complete ? h('div', { class: 'row center' }, h('a', { class: 'btn', href: '#/stats' }, '📊 記録を見る')) : null);
  }

  function runStep(i) {
    clearStep();
    const st = lesson.steps[i];
    const back = h('button', { class: 'back linklike', onclick: overview }, '← レッスンの一覧');
    const onDone = () => { completeStep(i); overview(); };
    const nextLabel = lesson.steps.slice(i + 1).some(x => !x.done) ? '次のステップへ →' : 'レッスンを終える';
    let el;
    if (st.type === 'review') {
      // 途中でやめた場合は、まだ復習日が来ているものだけ
      const words = st.ids.filter(id => store.srsIsDue(id)).map(wordById);
      el = cardSession({ words, back, onDone, doneLabel: nextLabel });
    } else if (st.type === 'words') {
      el = cardSession({ words: st.ids.map(wordById), back, onDone, doneLabel: nextLabel, learnMode: true });
    } else if (st.type === 'letters') {
      const s = letterSession({ letters: st.ids.map(letterById), back, onDone, doneLabel: nextLabel });
      el = s.el; stepCleanup = s.destroy;
    } else {
      el = quizSession({ next: (() => { const items = quizItems(st); let k = 0; return () => questionFor(items[k++]); })(), n: st.n, back, onDone, doneLabel: nextLabel });
    }
    wrap.replaceChildren(el);
    $main.scrollTop = 0;
  }

  overview();
  return wrap;
}

// ---------- ホーム ----------
function viewHome() {
  const s = store.get();
  const learned = WORDS.filter(w => wordLevel(w.id) >= 2).length;
  const due = WORDS.filter(w => store.srsIsDue(w.id)).length;
  const lettersOk = LETTERS.filter(l => letterLevel(l.id) >= 3).length;
  const streak = store.currentStreak();

  const stat = (num, label) => h('div', { class: 'stat' }, h('div', { class: 'stat-num' }, num), h('div', { class: 'stat-label' }, label));
  const tile = (href, icon, title, desc) => h('a', { class: 'tile', href }, h('div', { class: 'tile-icon' }, icon), h('div', {}, h('div', { class: 'tile-title' }, title), h('div', { class: 'tile-desc' }, desc)));

  // 音声一覧の読み込みを待ってから、ヘブライ語音声が本当に無いときだけ案内を出す
  const voiceNote = h('p', { class: 'note', hidden: true },
    'ヘブライ語の音声が見つかりません。iPadの「設定 → アクセシビリティ → リーダーと読み上げ → 声 → ヘブライ語」で音声を追加すると発音を聞けます。');
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
      h('p', { class: 'muted' }, streak ? `🔥 ${streak}日連続で学習中` : '今日から学習をはじめましょう')),
    lessonCard(),
    h('div', { class: 'stats' },
      stat(`${lettersOk}/${LETTERS.length}`, '定着した文字'),
      stat(`${learned}/${WORDS.length}`, '覚えた単語'),
      stat(due, '今日の復習'),
      stat(`${store.longestStreak()}日`, '最長連続')),
    h('h3', {}, '自由に練習'),
    h('div', { class: 'tiles' },
      tile('#/alphabet', 'א', 'アレフベート', '22文字と語末形5文字を発音つきで'),
      tile('#/cards', '🃏', '単語カード', due ? `復習が${due}枚あります` : '基本単語を間隔反復で覚える'),
      tile('#/quiz', '❓', 'クイズ', '文字と単語の4択問題'),
      tile('#/write', '✏️', '書き取り', 'Apple Pencilで文字をなぞる')),
    voiceNote,
    h('details', { class: 'settings' },
      h('summary', {}, '設定'),
      h('label', { class: 'row' }, '1日の目標',
        h('select', { class: 'select', onchange: e => { s.settings.dailyMinutes = +e.target.value; store.save(); render(viewHome); } },
          [5, 10, 15, 20, 30].map(m => h('option', { value: m, selected: s.settings.dailyMinutes === m }, `${m}分`)))),
      h('label', { class: 'row' }, '読み上げ速度',
        h('input', { type: 'range', min: '0.5', max: '1.2', step: '0.1', value: s.settings.rate,
          oninput: e => { s.settings.rate = +e.target.value; store.save(); } }),
        h('button', { class: 'btn small', onclick: () => speak('שָׁלוֹם') }, '試す')),
      h('p', { class: 'row small' }, '使用中の音声：', voiceLabel),
      h('p', { class: 'muted small' }, '音が割れる・ザラつくときは、iPadの「設定 → アクセシビリティ → リーダーと読み上げ → 声 → ヘブライ語」で「拡張」版の音声をダウンロードすると改善することがあります。'),
      h('label', { class: 'row' },
        h('input', { type: 'checkbox', checked: s.settings.showTranslit,
          onchange: e => { s.settings.showTranslit = e.target.checked; store.save(); } }),
        'ローマ字読みを表示する'),
      h('button', { class: 'btn danger small', onclick: () => {
        if (confirm('学習の記録をすべて消去しますか？')) { store.reset(); render(viewHome); }
      } }, '学習記録をリセット')));
}

// ---------- 記録 ----------
const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];
function activityLevel(d) {
  if (!store.isActiveDay(d)) return 0;
  const m = d.sec / 60;
  if (m < 5) return 1;
  if (m < 10) return 2;
  if (m < 20) return 3;
  return 4;
}
function describeDay(key, d) {
  const date = new Date(key + 'T00:00:00');
  const label = `${date.getMonth() + 1}月${date.getDate()}日（${WEEKDAYS[date.getDay()]}）`;
  if (!store.isActiveDay(d)) return `${label}：記録なし`;
  const parts = [`${minutes(d.sec)}分`];
  if (d.lesson) parts.push('レッスン完了');
  if (d.cards) parts.push(`カード${d.cards}枚`);
  if (d.quizQ) parts.push(`クイズ${d.quizOk}/${d.quizQ}問正解`);
  if (d.writes) parts.push(`書き取り${d.writes}回`);
  return `${label}：${parts.join('・')}`;
}

function viewStats() {
  const s = store.get();
  const days = s.days;
  const today = store.day();
  const allDays = Object.values(days);
  const totalSec = allDays.reduce((a, d) => a + (d.sec || 0), 0);
  const activeDays = allDays.filter(store.isActiveDay).length;
  const lessonsDone = allDays.filter(d => d.lesson).length;
  const totalQ = allDays.reduce((a, d) => a + (d.quizQ || 0), 0);
  const totalOk = allDays.reduce((a, d) => a + (d.quizOk || 0), 0);

  const stat = (num, label) => h('div', { class: 'stat' }, h('div', { class: 'stat-num' }, num), h('div', { class: 'stat-label' }, label));
  const detail = h('p', { class: 'chart-detail', 'aria-live': 'polite' }, describeDay(store.todayKey(), today));

  // カレンダー（直近16週。列=週、行=曜日）
  const WEEKS = 16;
  const start = new Date(); start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - start.getDay() - (WEEKS - 1) * 7);
  const cells = [];
  for (let i = 0; i < WEEKS * 7; i++) {
    const d = new Date(start); d.setDate(start.getDate() + i);
    const key = store.dateKey(d);
    const future = d > new Date();
    const rec = days[key];
    cells.push(h('button', {
      class: `cal-cell lv${future ? 'x' : activityLevel(rec)} ${key === store.todayKey() ? 'today' : ''} ${rec?.lesson ? 'lesson' : ''}`,
      style: `grid-row:${d.getDay() + 1};grid-column:${Math.floor(i / 7) + 1}`,
      disabled: future, 'aria-label': describeDay(key, rec),
      onclick: () => { detail.textContent = describeDay(key, rec); },
    }));
  }
  const legend = h('div', { class: 'legend' }, '少', [0, 1, 2, 3, 4].map(l => h('span', { class: `cal-cell lv${l}`, 'aria-hidden': 'true' })), '多',
    h('span', { class: 'legend-gap' }), h('span', { class: 'cal-cell lv3 lesson', 'aria-hidden': 'true' }), 'レッスン完了');

  // 直近7日の学習時間（棒グラフ）
  const last7 = [...Array(7)].map((_, i) => { const d = new Date(); d.setDate(d.getDate() - 6 + i); return { d, key: store.dateKey(d), rec: days[store.dateKey(d)] }; });
  const maxMin = Math.max(store.get().settings.dailyMinutes, ...last7.map(x => minutes(x.rec?.sec || 0)));
  const goalPct = (store.get().settings.dailyMinutes / maxMin) * 100;
  const bars = h('div', { class: 'bars' },
    last7.map(({ d, key, rec }) => {
      const m = minutes(rec?.sec || 0);
      return h('button', { class: 'bar-col', 'aria-label': describeDay(key, rec), onclick: () => { detail.textContent = describeDay(key, rec); } },
        h('span', { class: 'bar-val' }, m ? `${m}` : ''),
        h('span', { class: 'bar-track' },
          h('span', { class: 'goal-mark', style: `bottom:${goalPct}%` }),
          h('span', { class: 'bar', style: `height:${m ? Math.max(2, (m / maxMin) * 100) : 0}%` })),
        h('span', { class: 'bar-label' }, key === store.todayKey() ? '今日' : WEEKDAYS[d.getDay()]));
    }));

  // 文字の習熟度
  const letterGrid = h('div', { class: 'mastery-grid', dir: 'rtl' }, LETTERS.map(l => {
    const lv = letterLevel(l.id);
    return h('button', { class: `mastery-cell m${lv}`, 'aria-label': `${l.name}：${LEVEL_NAMES[lv]}`,
      onclick: () => { detail.textContent = `${l.char} ${l.name}：${LEVEL_NAMES[lv]}（書き取り最高 ${s.writing[l.id] ?? '-'}点・クイズ正解 ${s.letterStats[l.id]?.ok || 0}／不正解 ${s.letterStats[l.id]?.ng || 0}）`; } },
      he(l.char));
  }));
  const levelLegend = h('div', { class: 'legend' }, LEVEL_NAMES.map((n, i) => [h('span', { class: `swatch m${i}` }), n, ' ']));

  // 単語の習熟度（積み上げ横棒）
  const counts = [0, 0, 0, 0];
  for (const w of WORDS) counts[wordLevel(w.id)]++;
  const wordBar = h('div', { class: 'stack' }, [3, 2, 1, 0].filter(i => counts[i]).map(i =>
    h('span', { class: `stack-seg m${i}`, style: `flex:${counts[i]}`, title: `${LEVEL_NAMES[i]} ${counts[i]}語` })));
  const wordLegend = h('div', { class: 'legend' }, [3, 2, 1, 0].map(i => [h('span', { class: `swatch m${i}` }), `${LEVEL_NAMES[i]} ${counts[i]}語`, ' ']));

  const weakL = weakLetters(5), weakW = weakWords(5);

  return h('section', { class: 'view stats-view' },
    h('h2', {}, '学習の記録'),
    h('div', { class: 'stats' },
      stat(`${store.currentStreak()}日`, '連続学習'),
      stat(`${activeDays}日`, '学習した日'),
      stat(fmtMin(totalSec), '合計学習時間'),
      stat(totalQ ? `${Math.round((totalOk / totalQ) * 100)}%` : '-', 'クイズ正答率')),
    h('div', { class: 'panel' },
      h('h3', {}, '学習カレンダー', h('span', { class: 'muted small' }, `　レッスン完了 ${lessonsDone}回`)),
      h('div', { class: 'cal-wrap' },
        h('div', { class: 'cal-days' }, WEEKDAYS.map((w, i) => h('span', { style: `grid-row:${i + 1}` }, i % 2 ? w : ''))),
        h('div', { class: 'cal' }, cells)),
      legend),
    h('div', { class: 'panel' },
      h('h3', {}, '直近7日の学習時間（分）'),
      bars,
      h('div', { class: 'legend' }, h('span', { class: 'goal-swatch' }), `点線 = 1日の目標（${store.get().settings.dailyMinutes}分）`)),
    detail,
    h('div', { class: 'panel' },
      h('h3', {}, '文字の習熟度'),
      h('p', { class: 'muted small' }, '書き取りで70点以上、クイズで2回以上正解すると「定着」になります。'),
      letterGrid, levelLegend),
    h('div', { class: 'panel' },
      h('h3', {}, '単語の習熟度'),
      wordBar, wordLegend),
    (weakL.length || weakW.length) ? h('div', { class: 'panel' },
      h('h3', {}, '苦手なもの'),
      h('p', { class: 'muted small' }, 'クイズで間違えたものです。毎日のレッスンの確認クイズに優先して出ます。'),
      h('ul', { class: 'weak-list' },
        weakL.map(l => h('li', {}, he(l.char, 'weak-he'), ` ${l.name}`, h('span', { class: 'muted' }, `　✕${s.letterStats[l.id].ng} ○${s.letterStats[l.id].ok}`))),
        weakW.map(w => h('li', {}, he(w.he, 'weak-he'), ` ${w.ja}`, h('span', { class: 'muted' }, `　✕${s.wordStats[w.id].ng} ○${s.wordStats[w.id].ok}`))))) : null,
    h('p', { class: 'muted small' }, '記録はこのiPadの中にだけ保存されます。Safariの「履歴とWebサイトデータを消去」を行うと消えます。'));
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

function letterInfo(l) {
  return h('div', { class: 'letter-detail' },
    he(l.char, 'letter-big'),
    h('div', { class: 'letter-title' }, l.name, ' ', h('span', { class: 'muted' }, l.latin), ' ', speakBtn(l.nameHe)),
    he(l.nameHe, 'letter-he-name'),
    h('dl', { class: 'facts' },
      h('dt', {}, '音'), h('dd', {}, l.sound),
      l.final ? [h('dt', {}, '通常形'), h('dd', {}, he(l.final, 'inline-glyph'))] : null,
      h('dt', {}, '例'), h('dd', {}, he(l.example.he, 'inline-word'), ' ', speakBtn(l.example.he), ' ', `${l.example.tr}（${l.example.ja}）`)));
}

function markLetterSeen(l) {
  store.get().lettersSeen[l.id] = true;
  store.logDay('letters');
}

function showLetter(l) {
  markLetterSeen(l);
  speak(l.nameHe);
  const idx = LETTERS.indexOf(l);
  const nav = (d) => () => showLetter(LETTERS[(idx + d + LETTERS.length) % LETTERS.length]);
  const info = letterInfo(l);
  info.append(h('div', { class: 'row gap' },
    h('button', { class: 'btn', onclick: nav(1) }, '← 次の文字'),
    h('a', { class: 'btn primary', href: `#/write/${l.id}`, onclick: closeModal }, '✏️ 書いてみる'),
    h('button', { class: 'btn', onclick: nav(-1) }, '前の文字 →')));
  openModal(info);
  // 一覧の「見た」表示を更新
  if (location.hash.startsWith('#/alphabet')) render(viewAlphabet);
}

// ---------- 単語カード（SRS） ----------
function viewCardsMenu() {
  const s = store.get();
  const deckInfo = (words) => {
    const due = words.filter(w => store.srsIsDue(w.id)).length;
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
  const words = deckId === 'all' ? WORDS : WORDS.filter(w => w.cat === deckId);
  let reverse = false;
  try { reverse = sessionStorage.getItem('cards-reverse') === '1'; } catch {}
  const due = shuffle(words.filter(w => store.srsIsDue(w.id)));
  const fresh = words.filter(w => !s.srs[w.id]).slice(0, 10);
  return cardSession({
    words: [...due, ...fresh], reverse,
    back: h('a', { class: 'back', href: '#/cards' }, '← デッキ一覧'),
    practicePool: words,
  });
}

// words を順にめくるセッション。onDone があればレッスンの1ステップとして終わる。
// learnMode: 新しい単語用。最初から答えを見せて、発音を聞いて覚える。
function cardSession({ words, reverse = false, back, onDone, doneLabel = '次へ', learnMode = false, practicePool }) {
  const s = store.get();
  let queue = [...words];
  let done = 0;
  let total = queue.length;
  const wrap = h('section', { class: 'view cards' });

  function finish() {
    wrap.replaceChildren(back, h('div', { class: 'done' },
      h('div', { class: 'done-emoji' }, '🎉'),
      h('h2', {}, total ? 'おつかれさまでした！' : '今は復習するカードがありません'),
      h('p', { class: 'muted' }, total ? `${done}枚を学習しました。` : 'また明日来てください。'),
      onDone ? h('button', { class: 'btn primary', onclick: onDone }, doneLabel) : null,
      !onDone && !total && practicePool ? h('button', { class: 'btn primary', onclick: () => { queue = sample(practicePool, 10); total = queue.length; next(); } }, '練習として10枚やる') : null,
      onDone ? null : h('a', { class: 'btn', href: '#/' }, 'ホームへ')));
  }

  function next() {
    if (!queue.length) return finish();
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
    wrap.replaceChildren(back,
      h('div', { class: 'progress' }, h('div', { class: 'progress-bar', style: `width:${total ? (done / total) * 100 : 0}%` })),
      h('p', { class: 'muted center' }, learnMode ? `新しい単語 ・ 残り ${queue.length} 語` : `残り ${queue.length} 枚`),
      card,
      h('div', { class: 'row center' }, speakBtn(w.he, '🔊 発音')),
      grades);
    if (learnMode) flip();
    else if (!reverse) speak(w.he);
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

// ans を省略するとランダムに出題する
function makeQuestion(mode, ans) {
  if (mode === 'letter-name' || mode === 'name-letter') {
    ans = ans || sample(LETTERS, 1)[0];
    // 名前が同じ選択肢（通常形と語末形の名前は別）は避ける
    const wrong = sample(LETTERS.filter(l => l !== ans && l.name !== ans.name), 3);
    const opts = shuffle([ans, ...wrong]);
    const item = { kind: 'letter', id: ans.id };
    if (mode === 'letter-name') {
      return { item, prompt: he(ans.char, 'quiz-glyph'), say: ans.nameHe, sayOnAnswer: true,
        options: opts.map(o => ({ label: o.name, correct: o === ans })) };
    }
    return { item, prompt: h('div', { class: 'quiz-text' }, ans.name), say: ans.nameHe, autoplay: true,
      options: opts.map(o => ({ label: he(o.char, 'option-glyph'), correct: o === ans })) };
  }
  ans = ans || sample(WORDS, 1)[0];
  const wrong = sample(WORDS.filter(w => w !== ans && w.ja !== ans.ja), 3);
  const opts = shuffle([ans, ...wrong]);
  const tr = store.get().settings.showTranslit;
  const item = { kind: 'word', id: ans.id };
  if (mode === 'word-ja') {
    return { item, prompt: h('div', {}, he(ans.he, 'quiz-word'), tr ? h('div', { class: 'card-tr' }, ans.tr) : null), say: ans.he, sayOnAnswer: true,
      options: opts.map(o => ({ label: o.ja, correct: o === ans })) };
  }
  if (mode === 'ja-word') {
    return { item, prompt: h('div', { class: 'quiz-text' }, ans.ja), say: ans.he, sayOnAnswer: true,
      options: opts.map(o => ({ label: he(o.he, 'option-word'), correct: o === ans })) };
  }
  // listen
  return { item, prompt: h('div', { class: 'quiz-text' }, '🎧 聞こえた単語は？'), say: ans.he, autoplay: true,
    options: opts.map(o => ({ label: he(o.he, 'option-word'), sub: o.ja, correct: o === ans })) };
}

// レッスン用：文字・単語から出題形式をランダムに選ぶ
function questionFor(item) {
  if (item.kind === 'letter') return makeQuestion(Math.random() < 0.5 ? 'letter-name' : 'name-letter', letterById(item.id));
  return makeQuestion(sample(['word-ja', 'ja-word', 'listen'], 1)[0], wordById(item.id));
}

function viewQuiz(mode) {
  return quizSession({
    next: () => makeQuestion(mode), n: 10,
    back: h('a', { class: 'back', href: '#/quiz' }, '← モード選択'),
    onFinish: score => {
      const best = store.get().quizBest;
      const isBest = best[mode] == null || score > best[mode];
      if (isBest) { best[mode] = score; store.save(); }
      return isBest;
    },
  });
}

// next() で問題を作って n 問出すセッション
function quizSession({ next: nextQuestion, n, back, onDone, doneLabel = '次へ', onFinish }) {
  let i = 0, score = 0;
  const wrap = h('section', { class: 'view quiz' });

  function next() {
    if (i >= n) {
      const isBest = onFinish?.(score);
      wrap.replaceChildren(back, h('div', { class: 'done' },
        h('div', { class: 'done-emoji' }, score >= n * 0.8 ? '🏆' : score >= n * 0.5 ? '👍' : '💪'),
        h('h2', {}, `${score} / ${n} 問正解`),
        isBest ? h('p', {}, '自己ベスト更新！') : null,
        h('div', { class: 'row gap center' },
          onDone
            ? h('button', { class: 'btn primary', onclick: onDone }, doneLabel)
            : [h('button', { class: 'btn primary', onclick: () => { i = 0; score = 0; next(); } }, 'もう一度'),
               h('a', { class: 'btn', href: '#/quiz' }, '別のモード')])));
      return;
    }
    const q = nextQuestion();
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
        store.recordAnswer(q.item.kind, q.item.id, o.correct);
        if (q.sayOnAnswer) speak(q.say);
        optionsEl.querySelectorAll('.option-sub').forEach(e => { e.hidden = false; });
        nextBtn.hidden = false;
      } }, o.label, o.sub ? h('span', { class: 'option-sub', hidden: true }, o.sub) : null);
      return b;
    }));
    const nextBtn = h('button', { class: 'btn primary', hidden: true, onclick: () => { i++; next(); } }, i === n - 1 ? '結果を見る' : '次へ →');
    wrap.replaceChildren(back,
      h('div', { class: 'progress' }, h('div', { class: 'progress-bar', style: `width:${(i / n) * 100}%` })),
      h('p', { class: 'muted center' }, `第 ${i + 1} 問 / ${n} ・ 正解 ${score}`),
      h('div', { class: 'quiz-prompt' }, q.prompt, (!q.sayOnAnswer || q.autoplay) ? speakBtn(q.say) : null),
      optionsEl,
      h('div', { class: 'row center' }, nextBtn));
    if (q.autoplay) setTimeout(() => speak(q.say), 250);
  }
  next();
  return wrap;
}

// ---------- 書き取り ----------
const GOOD = 70;
function gradeText(sc) {
  const stars = sc >= 85 ? '★★★' : sc >= GOOD ? '★★☆' : sc >= 50 ? '★☆☆' : '☆☆☆';
  const msg = sc >= 85 ? 'すばらしい！' : sc >= GOOD ? 'よく書けました' : sc >= 50 ? 'もう少し！' : 'お手本をよく見て、もう一度';
  return [h('span', { class: 'stars' }, stars), ` ${sc}点 — ${msg}`];
}
function saveWritingScore(id, sc) {
  const s = store.get();
  if (sc > (s.writing[id] ?? -1)) s.writing[id] = sc;
  store.logDay('writes');
}

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
      b.classList.toggle('cleared', (s.writing[b.dataset.id] || 0) >= GOOD);
    });
    strip.querySelector('.active')?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
  }

  function grade() {
    if (pad.isEmpty) { result.textContent = 'まずは文字を書いてみましょう'; return; }
    const sc = pad.score();
    result.replaceChildren(...gradeText(sc));
    saveWritingScore(letter.id, sc);
    renderTitle();
    strip.querySelector(`[data-id="${letter.id}"]`)?.classList.toggle('cleared', (s.writing[letter.id] || 0) >= GOOD);
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
      pencilToggle(pad),
      h('button', { class: 'btn', onclick: step(-1) }, '前の文字 →')),
    h('p', { class: 'muted small center' }, '採点は、お手本の形をどれだけなぞれたかで自動判定します（書き順は判定しません）。'));

  cleanup = () => pad.destroy();
  requestAnimationFrame(() => select(letter));
  return view;
}

function pencilToggle(pad) {
  const s = store.get();
  return h('label', { class: 'row' },
    h('input', { type: 'checkbox', checked: s.settings.pencilOnly, onchange: e => {
      s.settings.pencilOnly = e.target.checked; store.save(); pad.set({ pencilOnly: e.target.checked });
    } }),
    'Apple Pencilだけで書く');
}

// レッスン用：文字ごとに「説明を見る → 書いてみる」を順に進める
function letterSession({ letters, back, onDone, doneLabel }) {
  const s = store.get();
  const wrap = h('section', { class: 'view write' });
  let k = 0;
  let pad = null;
  const destroyPad = () => { pad?.destroy(); pad = null; };

  function intro() {
    destroyPad();
    const l = letters[k];
    markLetterSeen(l);
    speak(l.nameHe);
    wrap.replaceChildren(back,
      h('p', { class: 'muted center' }, `文字 ${k + 1} / ${letters.length}`),
      h('div', { class: 'panel' }, letterInfo(l)),
      h('div', { class: 'row center' }, h('button', { class: 'btn primary big', onclick: write }, '✏️ 書いてみる →')));
  }

  function write() {
    const l = letters[k];
    const padHost = h('div', { class: 'pad' });
    destroyPad();
    pad = new WritingPad(padHost, { pencilOnly: s.settings.pencilOnly });
    pad.setLetter(l.char);
    const result = h('div', { class: 'write-result', 'aria-live': 'polite' }, 'お手本をなぞって「採点する」を押しましょう');
    const nextBtn = h('button', { class: 'btn', disabled: true, onclick: () => {
      k++;
      if (k < letters.length) intro();
      else { destroyPad(); onDone(); }
    } }, k < letters.length - 1 ? '次の文字へ →' : doneLabel);
    wrap.replaceChildren(back,
      h('p', { class: 'muted center' }, `文字 ${k + 1} / ${letters.length}`),
      h('div', { class: 'write-title' }, he(l.char, 'write-glyph'), ' ', l.name, ' ', speakBtn(l.nameHe)),
      padHost, result,
      h('div', { class: 'row gap center wrap' },
        h('button', { class: 'btn', onclick: () => pad.undo() }, '↶ 1画もどす'),
        h('button', { class: 'btn', onclick: () => { pad.clear(); } }, '消す'),
        h('button', { class: 'btn primary', onclick: () => {
          if (pad.isEmpty) { result.textContent = 'まずは文字を書いてみましょう'; return; }
          const sc = pad.score();
          saveWritingScore(l.id, sc);
          result.replaceChildren(...gradeText(sc), sc < GOOD ? '（何度でも書き直せます）' : '');
          nextBtn.disabled = false;
          nextBtn.classList.toggle('primary', sc >= GOOD);
        } }, '採点する'),
        nextBtn),
      h('div', { class: 'row center' }, pencilToggle(pad)));
  }

  intro();
  return { el: wrap, destroy: destroyPad };
}

// ---------- ルーティング ----------
function route() {
  closeModal();
  const [, page = '', arg] = location.hash.split('/');
  const tab = page === 'lesson' ? 'home' : (page || 'home');
  document.querySelectorAll('.tabbar a').forEach(a => a.classList.toggle('active', a.dataset.page === tab));
  const views = {
    '': () => viewHome(),
    lesson: () => viewLesson(),
    stats: () => viewStats(),
    alphabet: () => viewAlphabet(),
    cards: () => arg ? viewCards(arg) : viewCardsMenu(),
    quiz: () => arg && QUIZ_MODES.some(m => m.id === arg) ? viewQuiz(arg) : viewQuizMenu(),
    write: () => viewWrite(arg),
  };
  render(views[page] || views['']);
}

window.addEventListener('hashchange', route);
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
// 日付をまたいでアプリを開きっぱなしにしていた場合、戻ってきたときにホームを作り直す
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && (location.hash === '' || location.hash === '#/')) render(viewHome);
});
route();

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}
