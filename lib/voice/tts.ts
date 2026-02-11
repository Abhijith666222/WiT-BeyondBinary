/**
 * Text-to-speech module for voice assistant.
 * Ported from Jarvis extension, adapted for Next.js app.
 */

let lastSpokenText = "";
let speechRate = 1.0;
let onSpeechFinished: (() => void) | null = null;

export function setOnSpeechFinished(cb: (() => void) | null): (() => void) | null {
  const prev = onSpeechFinished;
  onSpeechFinished = cb;
  return prev;
}

export function initTTS(): boolean {
  if (typeof window === "undefined") return false;
  if (!("speechSynthesis" in window)) return false;
  speechSynthesis.getVoices();
  return true;
}

function getBestVoice(): SpeechSynthesisVoice | null {
  const voices = speechSynthesis.getVoices();
  const en = voices.filter((v) => v.lang.startsWith("en"));
  const preferred = en.find(
    (v) =>
      v.name.includes("Google") ||
      v.name.includes("Microsoft") ||
      v.name.includes("Natural")
  );
  return preferred || en[0] || voices[0] || null;
}

export function speak(
  text: string,
  priority: "high" | "normal" = "normal"
): void {
  if (typeof window === "undefined") return;
  if (text === "stop_speaking") {
    stopSpeaking();
    return;
  }
  if (text === "repeat_last") {
    if (lastSpokenText) speak(lastSpokenText, priority);
    return;
  }
  if (priority === "high" || speechSynthesis.speaking) {
    speechSynthesis.cancel();
  }
  const utterance = new SpeechSynthesisUtterance(text);
  const voice = getBestVoice();
  if (voice) utterance.voice = voice;
  utterance.rate = speechRate;
  utterance.pitch = 1.0;
  utterance.volume = 1.0;
  lastSpokenText = text;
  utterance.onend = () => {
    onSpeechFinished?.();
  };
  utterance.onerror = () => {};
  speechSynthesis.speak(utterance);
}

export function stopSpeaking(): void {
  if (typeof window === "undefined") return;
  speechSynthesis.cancel();
}

export function isSpeaking(): boolean {
  if (typeof window === "undefined") return false;
  return speechSynthesis.speaking;
}

export function setSpeechRate(rate: number): void {
  speechRate = Math.max(0.5, Math.min(2.0, rate));
}
