// 進捗の保存（端末内 localStorage）。読み書きに失敗してもアプリは動くようにする。
const KEY = 'hebrew-app-v1';

const defaults = () => ({
  srs: {},            // wordId -> { box, due }
  lettersSeen: {},    // letterId -> true
  writing: {},        // letterId -> best score (0-100)
  quizBest: {},       // mode -> best score (0-10)
  settings: { pencilOnly: false, showTranslit: true, rate: 0.8 },
  streak: { last: null, count: 0 },
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

// 学習した日を記録して連続日数を更新
export function touchStreak() {
  const today = new Date().toDateString();
  const s = state.streak;
  if (s.last === today) return;
  const yesterday = new Date(Date.now() - 864e5).toDateString();
  s.count = s.last === yesterday ? s.count + 1 : 1;
  s.last = today;
  save();
}

// ---- SRS（ライトナー方式）----
// box 0..6。正解で1段上がり、次の復習日が延びる。
const INTERVAL_DAYS = [0, 1, 2, 4, 8, 16, 32];
const DAY = 864e5;

export function srsCard(id) { return state.srs[id]; }

export function srsIsDue(id, now = Date.now()) {
  const c = state.srs[id];
  return c && c.due <= now;
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
    c.due = now + Math.max(0.5, INTERVAL_DAYS[c.box] / 2) * DAY;
  } else {
    c.box = Math.min(INTERVAL_DAYS.length - 1, c.box + 1);
    c.due = now + INTERVAL_DAYS[c.box] * DAY;
  }
  state.srs[id] = c;
  touchStreak();
  save();
}
