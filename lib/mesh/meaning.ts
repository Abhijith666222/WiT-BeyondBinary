import type { Meaning } from "@/lib/types";
import type { SgSLSign } from "@/lib/types";

/** Map sign gloss (e.g. from picker) to Meaning */
export function meaningFromSign(sign: SgSLSign | { english_gloss: string; id?: string }): Meaning {
  const gloss = sign.english_gloss || "";
  const intent = gloss.toLowerCase().replace(/-/g, " ");
  return {
    intent,
    entities: { sign: gloss },
    language: "en",
    confidence: 1,
  };
}

/** Map raw transcript text to Meaning (deterministic: no LLM) */
export function meaningFromSpeech(transcript: string): Meaning {
  const t = transcript.trim();
  if (!t) {
    return { intent: "", entities: {}, confidence: 0 };
  }
  return {
    intent: t.toLowerCase(),
    entities: { raw: t },
    language: "en",
    confidence: 0.9,
  };
}

/** Map typed text to Meaning */
export function meaningFromText(text: string): Meaning {
  return meaningFromSpeech(text);
}

/** Get display text for a Meaning (for subtitles / gloss) */
export function meaningToDisplayText(m: Meaning): string {
  if (m.entities.sign) return m.entities.sign.replace(/-/g, " ");
  if (m.entities.raw) return m.entities.raw;
  return m.intent || "";
}
