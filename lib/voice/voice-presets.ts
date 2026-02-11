/**
 * Maps voice style presets to SpeechSynthesis voices.
 * Clear = crisp/en-US; Neutral = default; Soft = gentle.
 */

export type VoicePreset = "clear" | "neutral" | "soft";

/** Prime voices (Chrome loads them async; first TTS may use default until loaded). */
export function ensureVoicesLoaded(): void {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  speechSynthesis.getVoices();
}

export function getVoiceForPreset(preset: VoicePreset | undefined): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !window.speechSynthesis) return null;
  ensureVoicesLoaded();
  const voices = speechSynthesis.getVoices();
  const en = voices.filter((v) => v.lang.startsWith("en"));

  if (!preset || preset === "neutral") {
    const preferred = en.find(
      (v) =>
        v.name.includes("Google") ||
        v.name.includes("Microsoft") ||
        v.name.includes("Natural")
    );
    return preferred || en[0] || voices[0] || null;
  }

  if (preset === "clear") {
    const clear = en.find(
      (v) =>
        v.name.toLowerCase().includes("enhanced") ||
        v.name.toLowerCase().includes("samantha") ||
        v.name.toLowerCase().includes("daniel")
    );
    return clear || en[0] || voices[0] || null;
  }

  if (preset === "soft") {
    const soft = en.find(
      (v) =>
        v.name.toLowerCase().includes("karen") ||
        v.name.toLowerCase().includes("victoria") ||
        v.name.toLowerCase().includes("female")
    );
    return soft || en[0] || voices[0] || null;
  }

  return en[0] || voices[0] || null;
}
