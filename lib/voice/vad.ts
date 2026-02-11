/**
 * Voice Activity Detection (VAD) — auto-stop recording on silence.
 * Ported from Jarvis extension.
 */

export interface VADOptions {
  silenceThreshold?: number;
  silenceDuration?: number;
  minRecordingTime?: number;
  onSilenceDetected?: () => void;
  onAudioLevel?: (level: number) => void;
}

interface VADState {
  audioContext: AudioContext | null;
  analyser: AnalyserNode | null;
  source: MediaStreamAudioSourceNode | null;
  animFrame: number | null;
  silenceStart: number | null;
  hasSpeechStarted: boolean;
  recordingStart: number;
  stopped: boolean;
}

const DEFAULT_OPTS: Required<VADOptions> = {
  silenceThreshold: 0.015,
  silenceDuration: 1800,
  minRecordingTime: 600,
  onSilenceDetected: () => {},
  onAudioLevel: () => {},
};

let state: VADState = {
  audioContext: null,
  analyser: null,
  source: null,
  animFrame: null,
  silenceStart: null,
  hasSpeechStarted: false,
  recordingStart: 0,
  stopped: false,
};

export function startVAD(stream: MediaStream, opts: VADOptions = {}): void {
  const options = { ...DEFAULT_OPTS, ...opts };
  stopVAD();

  try {
    const audioContext = new AudioContext();
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 512;
    analyser.smoothingTimeConstant = 0.3;

    const source = audioContext.createMediaStreamSource(stream);
    source.connect(analyser);

    state = {
      audioContext,
      analyser,
      source,
      animFrame: null,
      silenceStart: null,
      hasSpeechStarted: false,
      recordingStart: performance.now(),
      stopped: false,
    };

    const dataArray = new Float32Array(analyser.fftSize);

    function checkAudio() {
      if (state.stopped) return;
      analyser.getFloatTimeDomainData(dataArray);

      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i] * dataArray[i];
      }
      const rms = Math.sqrt(sum / dataArray.length);
      const normalizedLevel = Math.min(1, rms * 4);
      options.onAudioLevel(normalizedLevel);

      const now = performance.now();
      const elapsed = now - state.recordingStart;

      if (elapsed < options.minRecordingTime) {
        state.animFrame = requestAnimationFrame(checkAudio);
        return;
      }

      if (rms > options.silenceThreshold) {
        state.hasSpeechStarted = true;
        state.silenceStart = null;
      } else if (state.hasSpeechStarted) {
        if (state.silenceStart === null) {
          state.silenceStart = now;
        } else if (now - state.silenceStart >= options.silenceDuration) {
          state.stopped = true;
          options.onSilenceDetected();
          return;
        }
      }

      state.animFrame = requestAnimationFrame(checkAudio);
    }

    state.animFrame = requestAnimationFrame(checkAudio);
  } catch {
    // VAD init failed silently
  }
}

export function stopVAD(): void {
  state.stopped = true;
  if (state.animFrame !== null) {
    cancelAnimationFrame(state.animFrame);
    state.animFrame = null;
  }
  if (state.source) {
    try { state.source.disconnect(); } catch { /* ignore */ }
    state.source = null;
  }
  if (state.audioContext && state.audioContext.state !== "closed") {
    state.audioContext.close().catch(() => {});
    state.audioContext = null;
  }
  state.analyser = null;
  state.silenceStart = null;
  state.hasSpeechStarted = false;
}
