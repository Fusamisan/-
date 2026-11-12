// 音声読み上げ（Web Speech API）。iPadには標準でヘブライ語音声が入っている。
import { get } from './store.js';

let voice = null;
let voiceCount = 0;
const listeners = new Set();
let current = null;   // 再生中の発話（参照を持っておかないと途中で切れるブラウザがある）
let pendingTimer = null;

// 高品質版（拡張・プレミアム）の音声があれば優先する
const isHebrew = v => /^(he|iw)\b/i.test(v.lang);
const isEnhanced = v => /enhanced|premium|拡張|プレミアム/i.test(`${v.name} ${v.voiceURI}`);

function pickVoice() {
  if (!('speechSynthesis' in window)) return;
  const voices = speechSynthesis.getVoices();
  voiceCount = voices.length;
  const he = voices.filter(isHebrew);
  voice = he.find(isEnhanced) || he.find(v => /^he[-_]IL$/i.test(v.lang)) || he[0] || null;
}

function notify() { pickVoice(); listeners.forEach(fn => fn(voiceStatus())); }

if ('speechSynthesis' in window) {
  pickVoice();
  speechSynthesis.addEventListener?.('voiceschanged', notify);
  // iPadのSafariは voiceschanged を出さないことがあるので、少し待って再確認する
  setTimeout(notify, 1000);
  setTimeout(notify, 3000);
  // 最初のタップで無音の発話を1回流し、音声出力を起こしておく（1回目の頭切れ対策）
  window.addEventListener('pointerdown', () => {
    const u = new SpeechSynthesisUtterance(' ');
    u.volume = 0;
    speechSynthesis.speak(u);
  }, { once: true, capture: true });
}

export function canSpeak() { return 'speechSynthesis' in window; }

// 'ok' = ヘブライ語音声あり / 'missing' = 音声一覧はあるがヘブライ語が無い / 'loading' = まだ一覧が読めていない
export function voiceStatus() {
  if (!canSpeak()) return 'missing';
  pickVoice();
  if (voice) return 'ok';
  return voiceCount ? 'missing' : 'loading';
}

export function voiceName() { pickVoice(); return voice ? voice.name : null; }

// 音声一覧が読み込まれたときに呼ばれる。戻り値の関数で登録解除。
export function onVoicesChanged(fn) { listeners.add(fn); return () => listeners.delete(fn); }

export function speak(text) {
  if (!canSpeak() || !text) return;
  clearTimeout(pendingTimer);
  const play = () => {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'he-IL';
    if (voice) u.voice = voice;
    u.rate = get().settings.rate;
    u.onend = u.onerror = () => { if (current === u) current = null; };
    current = u;
    speechSynthesis.resume(); // 一時停止状態で固まっていることがあるので解除
    speechSynthesis.speak(u);
  };
  if (speechSynthesis.speaking || speechSynthesis.pending) {
    // 止めた直後に再生すると頭切れ・雑音が出やすいので、少し間を置く
    speechSynthesis.cancel();
    pendingTimer = setTimeout(play, 150);
  } else {
    play();
  }
}
