// 進捗の保存（端末内 localStorage）。読み書きに失敗してもアプリは動くようにする。
const KEY = 'hebrew-app-v1';

const defaults = () => ({
  srs: {},            // wordId -> { box, due }
  lettersSeen: {},    // letterId -> true
  writing: {},        // letterId -> best score (0-100)
  quizBest: {},       // mode -> best score (0-10)
  settings: { pencilOnly: false, showTranslit: true, rate: 0.8, dailyMinutes: 10 },
  streak: { last: null, count: 0 },
  // ---- 学習記録 ----
  days: {},           // 'YYYY-MM-DD' -> 1日の記録（dayRecord を参照）
  letterStats: {},    // letterId -> { ok, ng }（クイズの正誤）
  wordStats: {},      // wordId -> { ok, ng }（クイズの正誤）
  lesson: null,       // 今日のレッスン { date, steps: [...] }
});

const dayRecord = () => ({
  sec: 0,          // 学習時間（秒）
  cards: 0,        // 単語カードをめくった枚数
  quizQ: 0,        // クイズの解答数
  quizOk: 0,       // クイズの正解数
  writes: 0,       // 書き取りの採点回数
  letters: 0,      // 文字の詳細を見た回数
  lesson: false,   // 今日のレッスンを完了したか
});

let state = load();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaults();
    const d = defaults();
    const s = JSON.parse(raw);
    return { ...d, ...s, settings: { ...d.settings, ...(s.settings || {}) } };
  } catch {
    return defaults();
  }
}

export function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* 保存できない環境では無視 */ }
}

export function get() { return state; }

export function reset() { state = defaults(); save(); }

// ---- 日付 ----
const DAY = 864e5;
const pad2 = n => String(n).padStart(2, '0');
export function dateKey(d = new Date()) { return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`; }
export function todayKey() { return dateKey(); }
export function endOfToday() { const d = new Date(); d.setHours(23, 59, 59, 999); return d.getTime(); }

export function day(key = todayKey()) {
  if (!state.days[key]) state.days[key] = dayRecord();
  return state.days[key];
}

// 今日の記録を増やす（例: logDay('cards')）。学習した日として連続日数も更新する。
export function logDay(field, n = 1) {
  const d = day();
  d[field] = (d[field] || 0) + n;
  touchStreak();
  save();
}

// 学習時間を加算（操作している間だけ数える。app.js から呼ぶ）
export function addTime(sec) {
  day().sec += sec;
  save();
}

// クイズの正誤を文字・単語ごとに記録（苦手の判定に使う）
export function recordAnswer(kind, id, correct) {
  const table = kind === 'letter' ? state.letterStats : state.wordStats;
  const s = table[id] || (table[id] = { ok: 0, ng: 0 });
  correct ? s.ok++ : s.ng++;
  const d = day();
  d.quizQ++;
  if (correct) d.quizOk++;
  touchStreak();
  save();
}

// 学習した日を記録して連続日数を更新
export function touchStreak() {
  const today = new Date().toDateString();
  const s = state.streak;
  if (s.last === today) return;
  const yesterday = new Date(Date.now() - DAY).toDateString();
  s.count = s.last === yesterday ? s.count + 1 : 1;
  s.last = today;
  save();
}

// 今日も昨日も学習していなければ連続日数は途切れている
export function currentStreak() {
  const s = state.streak;
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - DAY).toDateString();
  return s.last === today || s.last === yesterday ? s.count : 0;
}

// 学習した日（何か記録がある日）の連続の最長
export function longestStreak() {
  const keys = Object.keys(state.days).filter(k => isActiveDay(state.days[k])).sort();
  let best = 0, run = 0, prev = null;
  for (const k of keys) {
    const t = new Date(k + 'T00:00:00').getTime();
    run = prev != null && Math.round((t - prev) / DAY) === 1 ? run + 1 : 1;
    best = Math.max(best, run);
    prev = t;
  }
  return Math.max(best, currentStreak());
}

export function isActiveDay(d) {
  return !!d && (d.sec >= 60 || d.cards || d.quizQ || d.writes || d.letters || d.lesson);
}

// ---- SRS（ライトナー方式）----
// box 0..6。正解で1段上がり、次の復習日が延びる。
const INTERVAL_DAYS = [0, 1, 2, 4, 8, 16, 32];

export function srsCard(id) { return state.srs[id]; }

// 既定では「今日中に復習日が来るか」で判定する（朝でも前日夜の分が出るように）
export function srsIsDue(id, by = endOfToday()) {
  const c = state.srs[id];
  return !!c && c.due <= by;
}

// grade: 0=もう一度, 1=難しい, 2=覚えた
export function srsGrade(id, grade) {
  const now = Date.now();
  const c = state.srs[id] || { box: 0, due: now };
  if (grade === 0) {
    c.box = 0;
    c.due = now + 60 * 1000; // 1分後（同じセッション内でもう一度）
  } else if (grade === 1) {
    c.box = Math.max(1, c.box);
    c.due = now + Math.max(1, INTERVAL_DAYS[c.box] / 2) * DAY;
  } else {
    c.box = Math.min(INTERVAL_DAYS.length - 1, c.box + 1);
    c.due = now + INTERVAL_DAYS[c.box] * DAY;
  }
  state.srs[id] = c;
  day().cards++;
  touchStreak();
  save();
}
