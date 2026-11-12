// 今日のおすすめレッスンの組み立てと、文字・単語の習熟度の判定
import { LETTERS, WORDS } from './data.js';
import * as store from './store.js';

const NEW_LETTERS = 3;   // 1日に新しく学ぶ文字の数
const NEW_WORDS = 5;     // 1日に新しく学ぶ単語の数
const MAX_REVIEW = 20;   // 1日の復習カードの上限
const QUIZ_N = 10;       // 確認クイズの問題数

const CHAR_TO_LETTER = Object.fromEntries(LETTERS.map(l => [l.char, l]));
export const lettersOf = word => [...word.he].map(c => CHAR_TO_LETTER[c]?.id).filter(Boolean);

// ---- 習熟度（0=未学習 1=学習中 2=もう少し 3=定着）----
export const LEVEL_NAMES = ['未学習', '学習中', 'もう少し', '定着'];

export function letterLevel(id) {
  const s = store.get();
  const st = s.letterStats[id] || { ok: 0, ng: 0 };
  const wrote = (s.writing[id] || 0) >= 70;
  const quizGood = st.ok >= 2 && st.ok >= st.ng * 2;
  if (wrote && quizGood) return 3;
  if (wrote || quizGood) return 2;
  if (s.lettersSeen[id] || st.ok || st.ng || s.writing[id] != null) return 1;
  return 0;
}

export function wordLevel(id) {
  const c = store.get().srs[id];
  if (!c) return 0;
  if (c.box >= 4) return 3;
  if (c.box >= 2) return 2;
  return 1;
}

// 間違いが多い順。1回でも間違えたものだけ。
export function weakLetters(n = 5) {
  const st = store.get().letterStats;
  return LETTERS.filter(l => (st[l.id]?.ng || 0) > 0 && st[l.id].ng >= st[l.id].ok / 2)
    .sort((a, b) => (st[b.id].ng - st[b.id].ok) - (st[a.id].ng - st[a.id].ok)).slice(0, n);
}

export function weakWords(n = 5) {
  const st = store.get().wordStats;
  return WORDS.filter(w => (st[w.id]?.ng || 0) > 0 && st[w.id].ng >= st[w.id].ok / 2)
    .sort((a, b) => (st[b.id].ng - st[b.id].ok) - (st[a.id].ng - st[a.id].ok)).slice(0, n);
}

// ---- 今日のレッスン ----
// steps: { type: 'review'|'letters'|'words'|'quiz', ..., done }
function buildPlan() {
  const s = store.get();
  const steps = [];

  // 1. 復習（今日が復習日の単語）
  const due = WORDS.filter(w => store.srsIsDue(w.id)).slice(0, MAX_REVIEW).map(w => w.id);
  if (due.length) steps.push({ type: 'review', ids: due, done: false });

  // 2. 文字（まだ定着していない文字を順番に。全部定着したら書き取りの点が低い文字を練習）
  let letters = LETTERS.filter(l => letterLevel(l.id) < 3).slice(0, NEW_LETTERS);
  let mode = 'new';
  if (!letters.length) {
    mode = 'practice';
    letters = [...LETTERS].sort((a, b) => (s.writing[a.id] || 0) - (s.writing[b.id] || 0)).slice(0, NEW_LETTERS);
  }
  steps.push({ type: 'letters', mode, ids: letters.map(l => l.id), done: false });

  // 3. 新しい単語（読める文字だけでできている単語を優先）
  const known = new Set([...LETTERS.filter(l => letterLevel(l.id) >= 2).map(l => l.id), ...letters.map(l => l.id)]);
  const fresh = WORDS.filter(w => !s.srs[w.id])
    .map((w, i) => ({ w, i, unknown: lettersOf(w).filter(id => !known.has(id)).length }))
    .sort((a, b) => a.unknown - b.unknown || a.i - b.i)
    .slice(0, NEW_WORDS).map(x => x.w.id);
  if (fresh.length) steps.push({ type: 'words', ids: fresh, done: false });

  // 4. 確認クイズ（今日の文字・単語＋苦手なもの）
  const quizLetters = [...new Set([...letters.map(l => l.id), ...weakLetters(2).map(l => l.id)])];
  const quizWords = [...new Set([...fresh, ...weakWords(3).map(w => w.id), ...due.slice(0, 3)])];
  steps.push({ type: 'quiz', letters: quizLetters, words: quizWords, n: QUIZ_N, done: false });

  return { date: store.todayKey(), steps };
}

// 日付が変わったら新しいレッスンを作る（同じ日の間は内容を固定）
export function todayLesson() {
  const s = store.get();
  if (!s.lesson || s.lesson.date !== store.todayKey()) {
    s.lesson = buildPlan();
    store.save();
  }
  return s.lesson;
}

export function completeStep(i) {
  const lesson = todayLesson();
  lesson.steps[i].done = true;
  if (lesson.steps.every(st => st.done)) store.day().lesson = true;
  store.touchStreak();
  store.save();
}

export function lessonProgress(lesson = todayLesson()) {
  const done = lesson.steps.filter(st => st.done).length;
  return { done, total: lesson.steps.length, complete: done === lesson.steps.length };
}

// クイズの出題リスト（文字と単語を混ぜて n 問）
export function quizItems(step) {
  const items = [
    ...step.letters.map(id => ({ kind: 'letter', id })),
    ...step.words.map(id => ({ kind: 'word', id })),
  ];
  if (!items.length) return [];
  const out = [];
  while (out.length < step.n) out.push(...shuffle(items));
  return out.slice(0, step.n);
}

function shuffle(a) {
  a = [...a];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
