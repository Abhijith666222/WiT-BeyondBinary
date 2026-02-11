/**
 * Audio Feedback — subtle tones for voice assistant state transitions.
 * Ported from Jarvis extension. Uses Web Audio API (no external files).
 */

let audioCtx: AudioContext | null = null;

function getContext(): AudioContext {
  if (!audioCtx || audioCtx.state === "closed") {
    audioCtx = new AudioContext();
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

function playTone(
  frequency: number,
  duration: number,
  type: OscillatorType = "sine",
  volume = 0.15,
  rampDown = true
): void {
  try {
    const ctx = getContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, ctx.currentTime);
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    if (rampDown) {
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    }
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  } catch {
    // non-critical
  }
}

/** Rising two-tone: recording started */
export function playStartSound(): void {
  playTone(440, 0.12, "sine", 0.12);
  setTimeout(() => playTone(587, 0.15, "sine", 0.12), 120);
}

/** Falling tone: recording stopped */
export function playStopSound(): void {
  playTone(587, 0.12, "sine", 0.1);
  setTimeout(() => playTone(440, 0.15, "sine", 0.1), 120);
}

/** Quick high blip: action success */
export function playSuccessSound(): void {
  playTone(880, 0.08, "sine", 0.08);
  setTimeout(() => playTone(1100, 0.12, "sine", 0.08), 80);
}

/** Low buzz: error */
export function playErrorSound(): void {
  playTone(220, 0.2, "square", 0.06);
}

/** Gentle ping: ready */
export function playReadySound(): void {
  playTone(660, 0.15, "sine", 0.06, true);
}
