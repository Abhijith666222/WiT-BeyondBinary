// Wake word detection using Web Speech API
// Listens continuously for "hey jarvis" wake phrase
// Also handles global keyboard shortcut (Ctrl+Shift+J)

type WakeWordCallback = () => void;

let recognition: any = null;
let isListening = false;
let onWakeWord: WakeWordCallback | null = null;
let onStopCommand: WakeWordCallback | null = null;
let restartTimeout: ReturnType<typeof setTimeout> | null = null;
let isRecordingActive = false; // true when main recording is active (pause wake detection)

// Wake phrases to detect (lowercase)
const WAKE_PHRASES = [
  'hey jarvis',
  'hey jarvis',
  'hay jarvis',
  'hey jarves',
  'a jarvis',
  'hey javis',
  'jarvis',
];

// Stop command phrases
const STOP_PHRASES = [
  'stop',
  'jarvis stop',
  'hey jarvis stop',
  'stop jarvis',
  'cancel',
  'shut up',
  'be quiet',
  'quiet',
];

export function initWakeWord(
  onWake: WakeWordCallback,
  onStop: WakeWordCallback
): boolean {
  const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

  if (!SpeechRecognition) {
    console.warn('[WakeWord] Web Speech API not supported');
    return false;
  }

  onWakeWord = onWake;
  onStopCommand = onStop;

  recognition = new SpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = 'en-US';
  recognition.maxAlternatives = 3;

  recognition.onresult = (event: any) => {
    // Check all results for wake phrase
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i];
      
      // Check all alternatives
      for (let j = 0; j < result.length; j++) {
        const transcript = result[j].transcript.toLowerCase().trim();
        
        // Check for stop commands first
        if (isRecordingActive) {
          for (const phrase of STOP_PHRASES) {
            if (transcript.includes(phrase)) {
              console.log('[WakeWord] Stop command detected:', transcript);
              onStopCommand?.();
              return;
            }
          }
        }
        
        // Check for wake phrase
        if (!isRecordingActive) {
          for (const phrase of WAKE_PHRASES) {
            if (transcript.includes(phrase)) {
              console.log('[WakeWord] Wake word detected:', transcript);
              onWakeWord?.();
              return;
            }
          }
        }
      }
    }
  };

  recognition.onerror = (event: any) => {
    // 'no-speech' and 'aborted' are expected in continuous mode
    if (event.error === 'no-speech' || event.error === 'aborted') {
      return;
    }
    console.warn('[WakeWord] Recognition error:', event.error);
    
    // Auto-restart on recoverable errors
    if (event.error === 'network' || event.error === 'audio-capture') {
      scheduleRestart();
    }
  };

  recognition.onend = () => {
    // Auto-restart if we should still be listening
    if (isListening && !isRecordingActive) {
      scheduleRestart();
    }
  };

  return true;
}

function scheduleRestart() {
  if (restartTimeout) clearTimeout(restartTimeout);
  restartTimeout = setTimeout(() => {
    if (isListening && !isRecordingActive) {
      try {
        recognition?.start();
      } catch (e) {
        // Already started, ignore
      }
    }
  }, 500);
}

export function startWakeWordListening(): void {
  if (!recognition) return;
  isListening = true;
  isRecordingActive = false;
  
  try {
    recognition.start();
    console.log('[WakeWord] Started listening for wake word');
  } catch (e) {
    // May already be running
    console.log('[WakeWord] Recognition already active');
  }
}

export function stopWakeWordListening(): void {
  isListening = false;
  if (restartTimeout) {
    clearTimeout(restartTimeout);
    restartTimeout = null;
  }
  
  try {
    recognition?.stop();
  } catch (e) {
    // Ignore
  }
  console.log('[WakeWord] Stopped listening');
}

// Pause wake word detection while main recording is active
export function pauseForRecording(): void {
  isRecordingActive = true;
  try {
    recognition?.stop();
  } catch (e) {
    // Ignore
  }
}

// Resume wake word detection after recording ends
export function resumeAfterRecording(): void {
  isRecordingActive = false;
  if (isListening) {
    scheduleRestart();
  }
}

export function isWakeWordActive(): boolean {
  return isListening;
}

// ==========================================
// Global Keyboard Shortcut Handler
// ==========================================

type HotkeyCallback = (action: 'toggle_record' | 'toggle_panel') => void;
let hotkeyCallback: HotkeyCallback | null = null;

export function initHotkeys(callback: HotkeyCallback): void {
  hotkeyCallback = callback;
  
  document.addEventListener('keydown', (e: KeyboardEvent) => {
    // Ctrl+Shift+J — Toggle recording (start/stop)
    if (e.ctrlKey && e.shiftKey && (e.key === 'J' || e.key === 'j')) {
      e.preventDefault();
      e.stopPropagation();
      hotkeyCallback?.('toggle_record');
      return;
    }
    
    // Ctrl+Shift+V — Toggle panel visibility (existing)
    // Already handled in overlay.ts, but we also capture it here
    // for toggle_panel if needed
  }, true); // useCapture = true to intercept before page handlers
}
