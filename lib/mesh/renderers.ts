import type { Meaning } from "@/lib/types";
import { meaningToDisplayText } from "./meaning";
import { getVoiceForPreset, type VoicePreset } from "@/lib/voice/voice-presets";
import { useStore } from "@/lib/store";

/** Text renderer: returns subtitle/transcript text */
export function renderText(meaning: Meaning): string {
  return meaningToDisplayText(meaning);
}

/**
 * Speech (TTS) renderer — call from browser with rate and voice preset.
 * Automatically muted when persona is "deaf" or "deafblind" (app-wide mute).
 */
export function speakText(
  meaning: Meaning,
  options: { rate?: number; onEnd?: () => void; voicePreset?: VoicePreset } = {}
): void {
  if (typeof window === "undefined" || !window.speechSynthesis) return;

  // Deaf mode: all app TTS is muted
  const persona = useStore.getState().preferences.persona;
  if (persona === "deaf" || persona === "deafblind") {
    // Still call onEnd so callers don't hang
    if (options.onEnd) options.onEnd();
    return;
  }

  const text = meaningToDisplayText(meaning);
  if (!text) return;
  window.speechSynthesis.cancel();
  // Some browsers (Chrome) suspend synthesis until resumed; needed for Relay EventSource etc.
  if (typeof window.speechSynthesis.resume === "function") {
    window.speechSynthesis.resume();
  }
  const u = new SpeechSynthesisUtterance(text);
  u.rate = options.rate ?? 1;
  u.lang = "en-SG";
  const voice = getVoiceForPreset(options.voicePreset);
  if (voice) u.voice = voice;
  if (options.onEnd) u.onend = options.onEnd;
  window.speechSynthesis.speak(u);
}

/** Sign renderer: returns gloss for UI (card label) */
export function renderSignGloss(meaning: Meaning): string {
  return meaning.entities.sign
    ? meaning.entities.sign.replace(/-/g, " ")
    : meaningToDisplayText(meaning);
}

/** Haptic: returns a short vibration pattern (ms) for "braille-ish" feedback. No real braille encoding here — just a pulse pattern. */
export function getHapticPattern(_meaning: Meaning): number[] {
  return [50, 30, 50];
}

/** True if the Web Vibration API is available (typically Android Chrome). Not supported on iOS Safari or most desktops. */
export function isVibrationSupported(): boolean {
  if (typeof navigator === "undefined") return false;
  return typeof navigator.vibrate === "function";
}

/** Trigger vibration if available (mobile). Returns whether it was triggered. */
export function triggerVibration(pattern: number[]): boolean {
  if (!isVibrationSupported()) return false;
  navigator.vibrate(pattern);
  return true;
}

/** Fallback when vibration isn't supported: play a short low tone so user gets tangible feedback (desktop / iOS). */
export function playHapticFallback(): void {
  if (typeof window === "undefined") return;
  const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return;
  try {
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 80;
    osc.type = "sine";
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.08);
  } catch {
    // ignore
  }
}
