// 音声読み上げ（Web Speech API）。iPadには標準でヘブライ語音声が入っている。
import { get } from './store.js';

let voice = null;
let voiceCount = 0;
const listeners = new Set();

function pickVoice() {
  if (!('speechSynthesis' in window)) return;
  const voices = speechSynthesis.getVoices();
  voiceCount = voices.length;
  voice = voices.find(v => /^he[-_]IL$/i.test(v.lang)) || voices.find(v => /^(he|iw)\b/i.test(v.lang)) || null;
}

function notify() { pickVoice(); listeners.forEach(fn => fn(voiceStatus())); }

if ('speechSynthesis' in window) {
  pickVoice();
  speechSynthesis.addEventListener?.('voiceschanged', notify);
  // iPadのSafariは voiceschanged を出さないことがあるので、少し待って再確認する
  setTimeout(notify, 1000);
  setTimeout(notify, 3000);
}

export function canSpeak() { return 'speechSynthesis' in window; }

// 'ok' = ヘブライ語音声あり / 'missing' = 音声一覧はあるがヘブライ語が無い / 'loading' = まだ一覧が読めていない
export function voiceStatus() {
  if (!canSpeak()) return 'missing';
  pickVoice();
  if (voice) return 'ok';
  return voiceCount ? 'missing' : 'loading';
}

// 音声一覧が読み込まれたときに呼ばれる。戻り値の関数で登録解除。
export function onVoicesChanged(fn) { listeners.add(fn); return () => listeners.delete(fn); }

export function speak(text) {
  if (!canSpeak() || !text) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'he-IL';
  if (voice) u.voice = voice;
  u.rate = get().settings.rate;
  speechSynthesis.speak(u);
}
