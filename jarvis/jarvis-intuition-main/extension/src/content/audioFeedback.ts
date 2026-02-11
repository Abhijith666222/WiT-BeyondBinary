// Audio Feedback — subtle tones for state transitions
// Helps users with visual impairments know what state the assistant is in.
// Uses Web Audio API to synthesize short beeps (no external files needed).

let audioCtx: AudioContext | null = null;

function getContext(): AudioContext {
  if (!audioCtx || audioCtx.state === 'closed') {
    audioCtx = new AudioContext();
  }
  // Resume if suspended (browser autoplay policy)
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

function playTone(
  frequency: number,
  duration: number,
  type: OscillatorType = 'sine',
  volume: number = 0.15,
  rampDown: boolean = true
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
  } catch (e) {
    // Audio feedback is non-critical, silently fail
  }
}

/** Rising two-tone: wake word detected / recording started */
export function playStartSound(): void {
  playTone(440, 0.12, 'sine', 0.12);
  setTimeout(() => playTone(587, 0.15, 'sine', 0.12), 120);
}

/** Falling tone: recording stopped / sending */
export function playStopSound(): void {
  playTone(587, 0.12, 'sine', 0.1);
  setTimeout(() => playTone(440, 0.15, 'sine', 0.1), 120);
}

/** Quick high blip: action completed successfully */
export function playSuccessSound(): void {
  playTone(880, 0.08, 'sine', 0.08);
  setTimeout(() => playTone(1100, 0.12, 'sine', 0.08), 80);
}

/** Low buzz: error occurred */
export function playErrorSound(): void {
  playTone(220, 0.2, 'square', 0.06);
}

/** Gentle ping: assistant is ready / wake word active */
export function playReadySound(): void {
  playTone(660, 0.15, 'sine', 0.06, true);
}
