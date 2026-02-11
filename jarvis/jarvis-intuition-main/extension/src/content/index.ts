// Voice Assistant Content Script
// Main entry point that coordinates all modules

import type { WSCommand, WSStatusData, WSSpeakData, WSExecuteToolData, WSHighlightData, ToolResult } from '../types';
import { extractPageMap } from './pageMap';
import { executeTool, highlightAction } from './tools';
import { initTTS, speak, stopSpeaking, setOnSpeechFinished } from './tts';
import { initSwitchScanning, cleanup as cleanupSwitchScanning } from './switchScanning';
import {
  createOverlay,
  updateStatus,
  setTranscript,
  setResponse,
  setRecordingCallbacks,
  showPanel,
  triggerStartRecording,
  triggerStopRecording,
  isCurrentlyRecording,
  setWakeWordActive,
  updateAudioLevel,
  setContinuousModeActive,
  isContinuousModeEnabled,
  setOnPanelVisibilityChange
} from './overlay';
import {
  initWakeWord,
  startWakeWordListening,
  stopWakeWordListening,
  pauseForRecording,
  resumeAfterRecording,
  isWakeWordActive,
  initHotkeys
} from './wakeWord';
import { startVAD, stopVAD } from './vad';
import { playStartSound, playStopSound, playErrorSound } from './audioFeedback';
import { saveState, loadState } from './persistence';

// debug flag
(window as any).__voiceAssistantLoaded = true;
console.log("[VoiceAssistant] content script loaded:", location.href);


// Configuration
const SERVER_URL = 'http://localhost:3001';

// State
let tabId: number = 0;
let mediaRecorder: MediaRecorder | null = null;
let audioChunks: Blob[] = [];
let currentStream: MediaStream | null = null;

// Initialize everything
async function init() {
  console.log('[VoiceAssistant] Initializing...');

  // Get tab ID from background script
  try {
    const response = await chrome.runtime.sendMessage({ type: 'get_tab_id' });
    tabId = response?.tabId || Date.now();
    console.log('[VoiceAssistant] Tab ID:', tabId);
  } catch (e) {
    tabId = Date.now();
    console.log('[VoiceAssistant] Using fallback Tab ID:', tabId);
  }

  // Initialize TTS
  if (!initTTS()) {
    console.error('[VoiceAssistant] TTS not available');
  }

  // Initialize switch scanning
  initSwitchScanning();

  // Create overlay UI
  createOverlay();

  // Persist panel visibility changes
  setOnPanelVisibilityChange((visible) => {
    saveState({ panelVisible: visible });
  });

  // Set recording callbacks (including wake word toggle)
  setRecordingCallbacks(startRecording, stopRecording, toggleWakeWord, toggleContinuousMode);

  // Set up continuous conversation: after TTS finishes, auto-listen if continuous mode is on
  setOnSpeechFinished(() => {
    if (isContinuousModeEnabled() && isWakeWordActive()) {
      console.log('[VoiceAssistant] Continuous mode: auto-listening after TTS');
      setTimeout(() => {
        if (!isCurrentlyRecording()) {
          showPanel();
          startToggleRecording();
        }
      }, 400); // brief pause so user knows TTS ended
    }
  });

  // Initialize wake word detection
  const wakeWordSupported = initWakeWord(
    () => {
      // Wake word detected! Start recording
      console.log('[VoiceAssistant] Wake word triggered!');
      showPanel();
      startToggleRecording();
    },
    () => {
      // Stop command detected
      console.log('[VoiceAssistant] Stop command detected');
      stopRecording();
    }
  );

  if (wakeWordSupported) {
    // Restore persisted state (wake word, continuous mode, panel)
    const saved = await loadState();
    console.log('[VoiceAssistant] Restored state:', saved);

    if (saved.wakeWordEnabled) {
      startWakeWordListening();
      setWakeWordActive(true);
      console.log('[VoiceAssistant] Wake word detection restored - say "Hey Jarvis"');
    }

    if (saved.continuousModeEnabled) {
      setContinuousModeActive(true);
      console.log('[VoiceAssistant] Continuous mode restored');
    }

    if (saved.panelVisible) {
      showPanel();
      console.log('[VoiceAssistant] Panel visibility restored');
    }

    // Auto-announce page when restored in active session
    if (saved.wakeWordEnabled && saved.panelVisible) {
      setTimeout(() => {
        const title = document.title || 'unknown page';
        speak(`Navigated to ${title}`, 'normal');
      }, 1500);
    }
  } else {
    // Even without wake word, try to restore panel and continuous mode
    const saved = await loadState();
    if (saved.continuousModeEnabled) setContinuousModeActive(true);
    if (saved.panelVisible) showPanel();
  }

  // Initialize global hotkeys
  initHotkeys((action) => {
    if (action === 'toggle_record') {
      showPanel();
      if (isCurrentlyRecording()) {
        stopRecording();
      } else {
        startToggleRecording();
      }
    } else if (action === 'toggle_panel') {
      showPanel();
    }
  });

  // Send initial page map
  setTimeout(sendPageMap, 800);

  // Set up page map updates on DOM changes
  setupPageMapObserver();

  // Listen for URL changes — auto-announce new pages when wake word is active
  let lastUrl = window.location.href;
  setInterval(() => {
    if (window.location.href !== lastUrl) {
      const previousUrl = lastUrl;
      lastUrl = window.location.href;
      console.log('[VoiceAssistant] URL changed, updating page map');
      setTimeout(sendPageMap, 500);
      
      // Auto-announce page change if wake word is active (user is actively using the assistant)
      if (isWakeWordActive()) {
        setTimeout(() => {
          const title = document.title || 'unknown page';
          speak(`Navigated to ${title}`, 'normal');
        }, 1200);
      }
    }
  }, 500);

  console.log('[VoiceAssistant] Initialized');
}

// Receive messages from background (which owns the WS)
chrome.runtime.onMessage.addListener((message) => {
  if (message?.type === 'toggle_overlay') {
    showPanel();
    return;
  }

  // Back-compat: older builds forwarded WS commands directly as message.type
  // instead of wrapping them as { type: 'server_command', command }.
  // Keeping this handler prevents "seeing thinking forever" if the background
  // script is out of sync with the content script.
  if (
    message?.type === 'status_update' ||
    message?.type === 'speak' ||
    message?.type === 'assistant_response' ||
    message?.type === 'tool_command'
  ) {
    // Normalize to the new WSCommand shape and reuse the same handler.
    void handleServerCommand({ type: message.type, data: message.data || message });
    return;
  }

  if (message?.type === 'server_command') {
    const cmd = message.command as WSCommand;
    handleServerCommand(cmd);
    return;
  }
});

// Handle commands from server
async function handleServerCommand(command: WSCommand) {
  console.log('[VoiceAssistant] Received command:', command.type);

  switch (command.type) {
    case 'speak': {
      const speakData = command.data as WSSpeakData;
      speak(speakData.text, speakData.priority);
      setResponse(speakData.text);
      break;
    }

    // Back-compat: some servers used assistant_response as the name
    // for a plain text response.
    case 'assistant_response': {
      // Accept either { text } or the raw payload.
      const text = (command as any)?.data?.text ?? (command as any)?.text ?? '';
      if (text) {
        speak(text, 'normal');
        setResponse(text);
      }
      // If the server didn't send a follow-up status_update, don't leave UI stuck.
      updateStatus({ status: 'idle' });
      break;
    }

    // Back-compat: some servers sent a combined tool command payload
    // as { type: 'tool_command', data: { tool, args } }.
    case 'tool_command': {
      const toolData = (command as any).data as WSExecuteToolData | { tool: string; args: any };
      if (!toolData?.tool) {
        updateStatus({ status: 'error', message: 'Invalid tool_command payload' });
        break;
      }
      updateStatus({ status: 'executing', currentStep: toolData.tool });
      try {
        const result = await executeTool(toolData.tool, toolData.args || {});
        sendToolResult(result);
        setTimeout(sendPageMap, 300);
        updateStatus({ status: 'idle' });
      } catch (e) {
        console.error('[VoiceAssistant] tool_command failed', e);
        updateStatus({ status: 'error', message: 'Tool execution failed' });
      }
      break;
    }

    case 'execute_tool': {
      const toolData = command.data as WSExecuteToolData;
      updateStatus({ status: 'executing', currentStep: toolData.tool });

      try {
        const result = await executeTool(toolData.tool, toolData.args);

        // Send result back (via background -> server)
        sendToolResult(result);

        // Update page map after action
        setTimeout(sendPageMap, 300);
      } catch (e) {
        const errorResult: ToolResult = {
          success: false,
          message: `Error executing ${toolData.tool}: ${e}`
        };
        sendToolResult(errorResult);
      }
      break;
    }

    case 'highlight_action': {
      const highlightData = command.data as WSHighlightData;
      highlightAction(highlightData.actionId);
      break;
    }

    case 'status_update': {
      const statusData = command.data as WSStatusData;
      updateStatus(statusData);
      break;
    }
  }
}

// Send page map to background (which forwards to server)
function sendPageMap() {
  const pageMap = extractPageMap(tabId);

  chrome.runtime.sendMessage({
    type: 'page_map_update',
    tabId,
    data: pageMap
  });

  console.log('[VoiceAssistant] Sent page map:', pageMap.actions.length, 'actions,', pageMap.formFields.length, 'fields');
}

// Send tool result to background (which forwards to server)
function sendToolResult(result: ToolResult) {
  chrome.runtime.sendMessage({
    type: 'tool_result',
    tabId,
    data: result
  });
}

// Set up MutationObserver for page changes
function setupPageMapObserver() {
  const observer = new MutationObserver(() => {
    // Debounce updates
    if ((window as any).__vaUpdateTimeout) clearTimeout((window as any).__vaUpdateTimeout);
    (window as any).__vaUpdateTimeout = setTimeout(sendPageMap, 500);
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true
  });
}

// Toggle wake word on/off
function toggleWakeWord() {
  if (isWakeWordActive()) {
    stopWakeWordListening();
    setWakeWordActive(false);
    saveState({ wakeWordEnabled: false });
    console.log('[VoiceAssistant] Wake word disabled');
  } else {
    startWakeWordListening();
    setWakeWordActive(true);
    saveState({ wakeWordEnabled: true });
    console.log('[VoiceAssistant] Wake word enabled');
  }
}

// Toggle continuous conversation mode
function toggleContinuousMode() {
  const newState = !isContinuousModeEnabled();
  setContinuousModeActive(newState);
  saveState({ continuousModeEnabled: newState });
  console.log('[VoiceAssistant] Continuous mode:', newState ? 'ON' : 'OFF');
  
  // Announce the change
  speak(newState 
    ? 'Continuous conversation mode on. I will keep listening after each response.' 
    : 'Continuous conversation mode off.', 'high');
}

// Start recording in toggle mode (for wake word / hotkey activation)
// Records for up to 10 seconds, or until stopped
let toggleRecordingTimeout: ReturnType<typeof setTimeout> | null = null;

async function startToggleRecording() {
  if (isCurrentlyRecording()) return;
  
  // Clear any existing timeout
  if (toggleRecordingTimeout) {
    clearTimeout(toggleRecordingTimeout);
    toggleRecordingTimeout = null;
  }
  
  await startRecording();
  
  // Auto-stop after 30 seconds (safety net — VAD handles normal silence detection)
  toggleRecordingTimeout = setTimeout(() => {
    if (isCurrentlyRecording()) {
      console.log('[VoiceAssistant] Safety auto-stop after 30s');
      stopRecording();
    }
  }, 30000);
}

// Start recording audio
async function startRecording() {
  try {
    // Pause wake word detection while recording
    pauseForRecording();
    
    // Play audio feedback
    playStartSound();
    
    updateStatus({ status: 'listening' });
    setTranscript('');
    setResponse('');

    audioChunks = [];

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    
    // Start Voice Activity Detection for auto-stop on silence
    startVAD(stream, {
      silenceThreshold: 0.012,
      silenceDuration: 1800,
      minRecordingTime: 600,
      onSilenceDetected: () => {
        console.log('[VoiceAssistant] VAD: silence detected, auto-stopping');
        stopRecording();
      },
      onAudioLevel: (level) => {
        updateAudioLevel(level);
      }
    });

    // Keep a reference to the stream so VAD and recorder use the same one
    currentStream = stream;

    const preferredTypes = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/mp4",
];

let chosen: string | undefined = undefined;
for (const t of preferredTypes) {
  if ((MediaRecorder as any).isTypeSupported?.(t)) {
    chosen = t;
    break;
  }
}

mediaRecorder = chosen
  ? new MediaRecorder(stream, { mimeType: chosen })
  : new MediaRecorder(stream);

console.log("[VA] MediaRecorder mimeType:", (mediaRecorder as any).mimeType || chosen || "default");


    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunks.push(event.data);
      }
    };

    mediaRecorder.onstop = async () => {
      // Stop VAD monitoring
      stopVAD();
      updateAudioLevel(0);
      
      stream.getTracks().forEach(track => track.stop());
      currentStream = null;
      
      // Play stop feedback
      playStopSound();

      const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
      await sendAudioForTranscription(audioBlob);
      
      // Resume wake word detection after transcription is sent
      resumeAfterRecording();
    };

    mediaRecorder.start();

  } catch (e) {
    console.error('[VoiceAssistant] Recording error:', e);
    playErrorSound();
    updateStatus({ status: 'error', message: 'Could not access microphone' });
    resumeAfterRecording();
  }
}

// Stop recording
function stopRecording() {
  // Clear auto-stop timeout
  if (toggleRecordingTimeout) {
    clearTimeout(toggleRecordingTimeout);
    toggleRecordingTimeout = null;
  }
  
  // Stop VAD monitoring
  stopVAD();
  updateAudioLevel(0);
  
  stopSpeaking();
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
  }
}

// Send audio to server for transcription
async function sendAudioForTranscription(audioBlob: Blob) {
  try {
    updateStatus({ status: 'transcribing' });

    const formData = new FormData();
    formData.append('audio', audioBlob, 'audio.webm');
    formData.append('tabId', String(tabId));

    const response = await fetch(`${SERVER_URL}/api/audio`, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      throw new Error(`Transcription failed: ${response.statusText}`);
    }

    const data = await response.json();
    const transcript = data.transcript || '';

    setTranscript(transcript);

    // Send transcript to background (which forwards to server)
    chrome.runtime.sendMessage({
      type: 'user_transcript',
      tabId,
      transcript
    });

    updateStatus({ status: 'thinking' });
  } catch (e) {
    console.error('[VoiceAssistant] Transcription error:', e);
    updateStatus({ status: 'error', message: `Transcription error: ${e}` });
  }
}

// Cleanup on unload
window.addEventListener('beforeunload', () => {
  cleanupSwitchScanning();
});

init();
