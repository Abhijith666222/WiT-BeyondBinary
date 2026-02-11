// Voice Activity Detection (VAD)
// Uses AudioContext AnalyserNode to detect silence and auto-stop recording.
// This is critical for accessibility — users with motor impairments
// can just speak naturally and the recording stops when they're done.

export interface VADOptions {
  /** RMS threshold below which audio is considered silence (0-1). Default 0.015 */
  silenceThreshold?: number;
  /** How long silence must last before triggering stop, in ms. Default 1800 */
  silenceDuration?: number;
  /** Minimum recording time before silence detection kicks in, in ms. Default 600 */
  minRecordingTime?: number;
  /** Called when silence is detected after speech */
  onSilenceDetected?: () => void;
  /** Called with current audio level for UI visualization (0-1) */
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

/**
 * Start monitoring audio levels on a MediaStream.
 * Call this right after getUserMedia succeeds.
 */
export function startVAD(stream: MediaStream, opts: VADOptions = {}): void {
  const options = { ...DEFAULT_OPTS, ...opts };
  
  stopVAD(); // clean up any previous instance
  
  try {
    const audioContext = new AudioContext();
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 512;
    analyser.smoothingTimeConstant = 0.3;
    
    const source = audioContext.createMediaStreamSource(stream);
    source.connect(analyser);
    // Don't connect to destination — we don't want to hear ourselves
    
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
      
      // Calculate RMS (root mean square) for volume level
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i] * dataArray[i];
      }
      const rms = Math.sqrt(sum / dataArray.length);
      
      // Normalize to 0-1 range for UI (RMS rarely exceeds 0.5)
      const normalizedLevel = Math.min(1, rms * 4);
      options.onAudioLevel(normalizedLevel);
      
      const now = performance.now();
      const elapsed = now - state.recordingStart;
      
      // Don't check silence until minimum recording time
      if (elapsed < options.minRecordingTime) {
        state.animFrame = requestAnimationFrame(checkAudio);
        return;
      }
      
      if (rms > options.silenceThreshold) {
        // Speech detected
        state.hasSpeechStarted = true;
        state.silenceStart = null;
      } else if (state.hasSpeechStarted) {
        // Silence after speech
        if (state.silenceStart === null) {
          state.silenceStart = now;
        } else if (now - state.silenceStart >= options.silenceDuration) {
          // Silence lasted long enough — auto-stop
          console.log('[VAD] Silence detected after speech, auto-stopping');
          state.stopped = true;
          options.onSilenceDetected();
          return; // don't schedule another frame
        }
      }
      
      state.animFrame = requestAnimationFrame(checkAudio);
    }
    
    // Start the monitoring loop
    state.animFrame = requestAnimationFrame(checkAudio);
    console.log('[VAD] Started monitoring audio levels');
    
  } catch (e) {
    console.warn('[VAD] Failed to initialize:', e);
  }
}

/**
 * Stop monitoring. Call when recording ends.
 */
export function stopVAD(): void {
  state.stopped = true;
  
  if (state.animFrame !== null) {
    cancelAnimationFrame(state.animFrame);
    state.animFrame = null;
  }
  
  if (state.source) {
    try { state.source.disconnect(); } catch (_) {}
    state.source = null;
  }
  
  if (state.audioContext && state.audioContext.state !== 'closed') {
    state.audioContext.close().catch(() => {});
    state.audioContext = null;
  }
  
  state.analyser = null;
  state.silenceStart = null;
  state.hasSpeechStarted = false;
}

/**
 * Whether VAD has detected any speech at all during this recording session.
 */
export function hasDetectedSpeech(): boolean {
  return state.hasSpeechStarted;
}
