// 音声読み上げ（Web Speech API）。iPadには標準でヘブライ語音声が入っている。
import { get } from './store.js';

let voice = null;

function pickVoice() {
  if (!('speechSynthesis' in window)) return;
  const voices = speechSynthesis.getVoices();
  voice = voices.find(v => v.lang === 'he-IL') || voices.find(v => /^he|^iw/i.test(v.lang)) || null;
}

if ('speechSynthesis' in window) {
  pickVoice();
  speechSynthesis.addEventListener?.('voiceschanged', pickVoice);
}

export function canSpeak() { return 'speechSynthesis' in window; }
export function hasHebrewVoice() { pickVoice(); return !!voice; }

export function speak(text) {
  if (!canSpeak() || !text) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'he-IL';
  if (voice) u.voice = voice;
  u.rate = get().settings.rate;
  speechSynthesis.speak(u);
}
