/**
 * Voice Engine — core speech recognition with VAD, wake word, and push-to-talk.
 * Ported from Jarvis extension, adapted for browser-only (no WebSocket/server).
 * Uses Web Speech API for recognition (no Whisper needed).
 */

import { startVAD, stopVAD } from "./vad";
import { playStartSound, playStopSound, playSuccessSound, playErrorSound } from "./audio-feedback";
import { speak, stopSpeaking, initTTS, setOnSpeechFinished } from "./tts";

export type VoiceStatus =
  | "idle"
  | "listening"
  | "processing"
  | "speaking"
  | "error";

export interface VoiceEngineCallbacks {
  onStatusChange: (status: VoiceStatus) => void;
  onTranscript: (text: string) => void;
  onResponse: (text: string) => void;
  onAudioLevel: (level: number) => void;
  onCommand: (transcript: string) => void;
}

interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onresult: ((e: SpeechRecognitionResultEvent) => void) | null;
  onerror: ((e: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

interface SpeechRecognitionResultEvent {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent {
  error: string;
}

let recognition: SpeechRecognitionLike | null = null;
let wakeRecognition: SpeechRecognitionLike | null = null;
let mediaStream: MediaStream | null = null;
let callbacks: VoiceEngineCallbacks | null = null;
let isRecording = false;
let wakeWordEnabled = false;
let wakeListening = false;
let continuousMode = false;

const WAKE_PHRASES = [
  "hey sign bridge",
  "hey bridge",
  "sign bridge",
  "hey signbridge",
];

function getSpeechRecognition(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  return (
    (window as unknown as { SpeechRecognition?: new () => SpeechRecognitionLike }).SpeechRecognition ||
    (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognitionLike }).webkitSpeechRecognition ||
    null
  );
}

export function isSpeechRecognitionSupported(): boolean {
  return getSpeechRecognition() !== null;
}

/**
 * Initialize the voice engine.
 */
export function initVoiceEngine(cbs: VoiceEngineCallbacks): boolean {
  callbacks = cbs;
  initTTS();

  const SR = getSpeechRecognition();
  if (!SR) return false;

  // Main recognition (for commands)
  recognition = new SR();
  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.lang = "en-US";
  recognition.maxAlternatives = 1;

  recognition.onresult = (e: SpeechRecognitionResultEvent) => {
    let finalTranscript = "";
    let interimTranscript = "";

    for (let i = e.resultIndex; i < e.results.length; i++) {
      const result = e.results[i];
      const transcript = result[0]?.transcript || "";
      if (result.isFinal) {
        finalTranscript += transcript;
      } else {
        interimTranscript += transcript;
      }
    }

    // Show interim results
    if (interimTranscript) {
      callbacks?.onTranscript(interimTranscript);
    }

    // Process final result
    if (finalTranscript) {
      callbacks?.onTranscript(finalTranscript);
      callbacks?.onCommand(finalTranscript);
    }
  };

  recognition.onerror = (e: SpeechRecognitionErrorEvent) => {
    if (e.error === "no-speech" || e.error === "aborted") return;
    callbacks?.onStatusChange("error");
    playErrorSound();
  };

  recognition.onend = () => {
    if (isRecording) {
      // Recognition ended prematurely; restart if still recording
      try { recognition?.start(); } catch { /* ignore */ }
    } else {
      callbacks?.onStatusChange("idle");
      resumeWakeWord();
    }
  };

  return true;
}

/**
 * Start recording via push-to-talk or auto.
 */
export async function startRecording(): Promise<void> {
  if (isRecording) return;
  isRecording = true;

  pauseWakeWord();
  callbacks?.onStatusChange("listening");
  playStartSound();

  try {
    mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });

    // Start VAD for audio level + auto-stop
    startVAD(mediaStream, {
      onSilenceDetected: () => {
        stopRecording();
      },
      onAudioLevel: (level) => {
        callbacks?.onAudioLevel(level);
      },
    });

    // Start speech recognition
    try {
      recognition?.start();
    } catch {
      // already started
    }
  } catch {
    isRecording = false;
    callbacks?.onStatusChange("error");
    playErrorSound();
  }
}

/**
 * Stop recording.
 */
export function stopRecording(): void {
  if (!isRecording) return;
  isRecording = false;

  playStopSound();
  stopVAD();

  if (mediaStream) {
    mediaStream.getTracks().forEach((t) => t.stop());
    mediaStream = null;
  }

  try {
    recognition?.stop();
  } catch {
    // ignore
  }

  callbacks?.onStatusChange("processing");
}

export function getIsRecording(): boolean {
  return isRecording;
}

/**
 * Speak a response and update status.
 * Pass `mute: true` to show the text without TTS (deaf mode).
 */
export function speakResponse(
  text: string,
  options?: { mute?: boolean }
): void {
  callbacks?.onResponse(text);

  if (options?.mute) {
    // Deaf mode — show text, skip TTS, stay idle
    callbacks?.onStatusChange("idle");
    if (continuousMode) {
      setTimeout(() => {
        if (!isRecording) startRecording();
      }, 400);
    }
    resumeWakeWord();
    return;
  }

  callbacks?.onStatusChange("speaking");

  setOnSpeechFinished(() => {
    callbacks?.onStatusChange("idle");
    if (continuousMode) {
      // Auto-listen after speaking
      setTimeout(() => {
        if (!isRecording) startRecording();
      }, 400);
    }
    resumeWakeWord();
  });

  speak(text, "high");
  playSuccessSound();
}

/**
 * Stop the assistant from speaking.
 */
export function stopAssistant(): void {
  stopSpeaking();
  callbacks?.onStatusChange("idle");
}

// ===== Wake word =====

export function initWakeWord(): boolean {
  const SR = getSpeechRecognition();
  if (!SR) return false;

  wakeRecognition = new SR();
  wakeRecognition.continuous = true;
  wakeRecognition.interimResults = true;
  wakeRecognition.lang = "en-US";
  wakeRecognition.maxAlternatives = 3;

  wakeRecognition.onresult = (e: SpeechRecognitionResultEvent) => {
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const result = e.results[i];
      for (let j = 0; j < result.length; j++) {
        const transcript = (result[j]?.transcript || "").toLowerCase().trim();
        for (const phrase of WAKE_PHRASES) {
          if (transcript.includes(phrase)) {
            startRecording();
            return;
          }
        }
      }
    }
  };

  wakeRecognition.onerror = () => {};
  wakeRecognition.onend = () => {
    if (wakeWordEnabled && wakeListening && !isRecording) {
      setTimeout(() => {
        try { wakeRecognition?.start(); } catch { /* ignore */ }
      }, 500);
    }
  };

  return true;
}

export function startWakeWord(): void {
  wakeWordEnabled = true;
  wakeListening = true;
  try { wakeRecognition?.start(); } catch { /* ignore */ }
}

export function stopWakeWord(): void {
  wakeWordEnabled = false;
  wakeListening = false;
  try { wakeRecognition?.stop(); } catch { /* ignore */ }
}

function pauseWakeWord(): void {
  wakeListening = false;
  try { wakeRecognition?.stop(); } catch { /* ignore */ }
}

function resumeWakeWord(): void {
  if (wakeWordEnabled && !isRecording) {
    wakeListening = true;
    setTimeout(() => {
      try { wakeRecognition?.start(); } catch { /* ignore */ }
    }, 300);
  }
}

export function isWakeWordActive(): boolean {
  return wakeWordEnabled;
}

// ===== Continuous mode =====

export function setContinuousMode(enabled: boolean): void {
  continuousMode = enabled;
}

export function isContinuousModeEnabled(): boolean {
  return continuousMode;
}

// ===== Cleanup =====

export function destroyVoiceEngine(): void {
  isRecording = false;
  wakeWordEnabled = false;
  wakeListening = false;
  continuousMode = false;

  stopVAD();
  stopSpeaking();

  if (mediaStream) {
    mediaStream.getTracks().forEach((t) => t.stop());
    mediaStream = null;
  }
  try { recognition?.abort(); } catch { /* ignore */ }
  try { wakeRecognition?.abort(); } catch { /* ignore */ }
  recognition = null;
  wakeRecognition = null;
  callbacks = null;
}
