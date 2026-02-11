// Overlay UI for voice assistant
import type { OverlayState, WSStatusData } from '../types';
import { setEnabled as setSwitchScanEnabled, isEnabledState, next as scanNext, select as scanSelect } from './switchScanning';

let overlayContainer: HTMLElement | null = null;
let state: OverlayState = {
  status: 'idle',
  transcript: '',
  assistantResponse: '',
  currentPlan: '',
  currentStep: '',
  errorMessage: '',
  isRecording: false,
  switchScanningEnabled: false,
  currentScanIndex: -1
};

// Callbacks
let onStartRecording: (() => void) | null = null;
let onStopRecording: (() => void) | null = null;
let onToggleWakeWord: (() => void) | null = null;
let onToggleContinuousMode: (() => void) | null = null;
let onPanelVisibilityChange: ((visible: boolean) => void) | null = null;
let continuousModeEnabled = false;

export function setRecordingCallbacks(
  start: () => void,
  stop: () => void,
  toggleWake?: () => void,
  toggleContinuous?: () => void
): void {
  onStartRecording = start;
  onStopRecording = stop;
  onToggleWakeWord = toggleWake || null;
  onToggleContinuousMode = toggleContinuous || null;
}

// Expose start/stop for external callers (wake word, hotkey)
export function triggerStartRecording(): void {
  startRecording();
}

export function triggerStopRecording(): void {
  stopRecording();
}

export function isCurrentlyRecording(): boolean {
  return state.isRecording;
}

// Update wake word indicator
export function setWakeWordActive(active: boolean): void {
  if (!overlayContainer) return;
  const indicator = overlayContainer.querySelector('.va-wake-indicator');
  const toggleBtn = overlayContainer.querySelector('.va-wake-toggle');
  if (active) {
    indicator?.classList.add('va-wake-active');
    toggleBtn?.classList.add('va-active');
  } else {
    indicator?.classList.remove('va-wake-active');
    toggleBtn?.classList.remove('va-active');
  }
}

// Create the overlay UI
export function createOverlay(): void {
  if (overlayContainer) return;
  
  overlayContainer = document.createElement('div');
  overlayContainer.id = 'voice-assistant-overlay';
  overlayContainer.setAttribute('role', 'application');
  overlayContainer.setAttribute('aria-label', 'Voice Assistant');
  
  overlayContainer.innerHTML = `
    <div class="va-panel">
      <div class="va-header">
        <div class="va-title">
          <span class="va-icon">🎙️</span>
          <span>Voice Assistant</span>
        </div>
        <div class="va-header-controls">
          <span class="va-wake-indicator" title="Wake word: Say 'Hey Jarvis'">👂</span>
          <button class="va-minimize" aria-label="Minimize panel" title="Minimize">−</button>
        </div>
      </div>
      
      <div class="va-content">
        <div class="va-status" role="status" aria-live="polite">
          <span class="va-status-indicator"></span>
          <span class="va-status-text">Ready</span>
        </div>
        
        <div class="va-section">
          <div class="va-label">You said:</div>
          <div class="va-transcript" aria-live="polite"></div>
        </div>
        
        <div class="va-section">
          <div class="va-label">Assistant:</div>
          <div class="va-response" aria-live="assertive"></div>
        </div>
        
        <div class="va-section va-plan-section" style="display: none;">
          <div class="va-label">Current step:</div>
          <div class="va-current-step"></div>
        </div>
        
        <div class="va-controls">
          <button class="va-btn va-btn-primary va-ptt-btn" aria-label="Push to talk - Hold to speak">
            <span class="va-btn-icon">🎤</span>
            <span class="va-btn-text">Hold to Talk</span>
          </button>
          
          <div class="va-audio-level-bar" aria-hidden="true">
            <div class="va-audio-level-fill"></div>
          </div>
          
          <div class="va-activation-info">
            <small>🔑 Ctrl+Shift+J to toggle • 🗣️ "Hey Jarvis" to activate</small>
          </div>
          
          <div class="va-secondary-controls">
            <button class="va-btn va-btn-secondary va-wake-toggle" aria-label="Toggle wake word detection">
              <span>👂 Wake Word</span>
            </button>
            <button class="va-btn va-btn-secondary va-continuous-toggle" aria-label="Toggle continuous conversation mode">
              <span>🔄 Continuous</span>
            </button>
            <button class="va-btn va-btn-secondary va-scan-toggle" aria-label="Toggle switch scanning">
              <span>Switch Scan</span>
            </button>
            <button class="va-btn va-btn-secondary va-scan-next" aria-label="Next action" style="display: none;">
              <span>Next</span>
            </button>
            <button class="va-btn va-btn-secondary va-scan-select" aria-label="Select action" style="display: none;">
              <span>Select</span>
            </button>
          </div>
        </div>
        
        <div class="va-help">
          <details>
            <summary>Voice Commands</summary>
            <ul>
              <li><strong>"Hey Jarvis"</strong> - Wake word activation</li>
              <li><strong>Ctrl+Shift+J</strong> - Keyboard shortcut</li>
              <li><strong>"Where am I?"</strong> - Describe current page</li>
              <li><strong>"Make text bigger"</strong> - Increase font size</li>
              <li><strong>"High contrast"</strong> - Toggle high contrast</li>
              <li><strong>"Simplify page"</strong> - Remove clutter</li>
              <li><strong>"Dyslexia font"</strong> - Easier reading font</li>
              <li><strong>"Go back"</strong> - Previous page</li>
              <li><strong>"Stop"</strong> - Stop speaking</li>
            </ul>
          </details>
        </div>
      </div>
    </div>
    
    <button class="va-fab" aria-label="Open voice assistant" title="Voice Assistant">
      <span>🎙️</span>
    </button>
  `;
  
  document.body.appendChild(overlayContainer);
  
  // Set up event listeners
  setupEventListeners();
  
  // Start minimized
  const panel = overlayContainer.querySelector('.va-panel') as HTMLElement;
  panel.classList.add('va-minimized');
}

function setupEventListeners(): void {
  if (!overlayContainer) return;
  
  // Minimize button
  const minimizeBtn = overlayContainer.querySelector('.va-minimize');
  minimizeBtn?.addEventListener('click', toggleMinimize);
  
  // FAB button
  const fabBtn = overlayContainer.querySelector('.va-fab');
  fabBtn?.addEventListener('click', toggleMinimize);
  
  // Push-to-talk button
  const pttBtn = overlayContainer.querySelector('.va-ptt-btn');
  pttBtn?.addEventListener('mousedown', startRecording);
  pttBtn?.addEventListener('mouseup', stopRecording);
  pttBtn?.addEventListener('mouseleave', stopRecording);
  pttBtn?.addEventListener('touchstart', (e) => {
    e.preventDefault();
    startRecording();
  });
  pttBtn?.addEventListener('touchend', (e) => {
    e.preventDefault();
    stopRecording();
  });
  
  // Switch scanning toggle
  const scanToggle = overlayContainer.querySelector('.va-scan-toggle');
  scanToggle?.addEventListener('click', toggleSwitchScanning);
  
  // Wake word toggle
  const wakeToggle = overlayContainer.querySelector('.va-wake-toggle');
  wakeToggle?.addEventListener('click', () => {
    onToggleWakeWord?.();
  });
  
  // Continuous mode toggle
  const continuousToggle = overlayContainer.querySelector('.va-continuous-toggle');
  continuousToggle?.addEventListener('click', () => {
    onToggleContinuousMode?.();
  });
  
  // Switch scanning next/select
  const scanNextBtn = overlayContainer.querySelector('.va-scan-next');
  scanNextBtn?.addEventListener('click', () => scanNext());
  
  const scanSelectBtn = overlayContainer.querySelector('.va-scan-select');
  scanSelectBtn?.addEventListener('click', () => scanSelect());
  
  // Keyboard shortcut (Ctrl+Shift+V to toggle)
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.key === 'V') {
      e.preventDefault();
      toggleMinimize();
    }
    // Space bar for push-to-talk when focused
    if (e.key === ' ' && document.activeElement === pttBtn) {
      e.preventDefault();
      if (!state.isRecording) {
        startRecording();
      }
    }
  });
  
  document.addEventListener('keyup', (e) => {
    const pttBtn = overlayContainer?.querySelector('.va-ptt-btn');
    if (e.key === ' ' && document.activeElement === pttBtn) {
      e.preventDefault();
      stopRecording();
    }
  });
}

function toggleMinimize(): void {
  const panel = overlayContainer?.querySelector('.va-panel');
  const fab = overlayContainer?.querySelector('.va-fab');
  
  if (panel?.classList.contains('va-minimized')) {
    panel.classList.remove('va-minimized');
    fab?.setAttribute('aria-expanded', 'true');
    onPanelVisibilityChange?.(true);
  } else {
    panel?.classList.add('va-minimized');
    fab?.setAttribute('aria-expanded', 'false');
    onPanelVisibilityChange?.(false);
  }
}

function startRecording(): void {
  if (state.isRecording) return;
  
  state.isRecording = true;
  updateUI();
  
  const pttBtn = overlayContainer?.querySelector('.va-ptt-btn');
  pttBtn?.classList.add('va-recording');
  
  onStartRecording?.();
}

function stopRecording(): void {
  if (!state.isRecording) return;
  
  state.isRecording = false;
  updateUI();
  
  const pttBtn = overlayContainer?.querySelector('.va-ptt-btn');
  pttBtn?.classList.remove('va-recording');
  
  onStopRecording?.();
}

function toggleSwitchScanning(): void {
  state.switchScanningEnabled = !state.switchScanningEnabled;
  setSwitchScanEnabled(state.switchScanningEnabled);
  updateScanningUI();
}

function updateScanningUI(): void {
  const scanToggle = overlayContainer?.querySelector('.va-scan-toggle');
  const scanNext = overlayContainer?.querySelector('.va-scan-next');
  const scanSelect = overlayContainer?.querySelector('.va-scan-select');
  
  if (state.switchScanningEnabled) {
    scanToggle?.classList.add('va-active');
    (scanNext as HTMLElement).style.display = 'inline-flex';
    (scanSelect as HTMLElement).style.display = 'inline-flex';
  } else {
    scanToggle?.classList.remove('va-active');
    (scanNext as HTMLElement).style.display = 'none';
    (scanSelect as HTMLElement).style.display = 'none';
  }
}

// Update state
export function updateState(updates: Partial<OverlayState>): void {
  state = { ...state, ...updates };
  updateUI();
}

// Update status from server
export function updateStatus(statusData: WSStatusData): void {
  state.status = statusData.status;
  if (statusData.plan) state.currentPlan = statusData.plan;
  if (statusData.currentStep) state.currentStep = statusData.currentStep;
  if (statusData.message) state.errorMessage = statusData.message;
  updateUI();
}

// Set transcript
export function setTranscript(text: string): void {
  state.transcript = text;
  updateUI();
}

// Set assistant response
export function setResponse(text: string): void {
  state.assistantResponse = text;
  updateUI();
}

// Update the UI
function updateUI(): void {
  if (!overlayContainer) return;
  
  // Status indicator
  const statusIndicator = overlayContainer.querySelector('.va-status-indicator');
  const statusText = overlayContainer.querySelector('.va-status-text');
  
  statusIndicator?.classList.remove('va-listening', 'va-thinking', 'va-executing', 'va-speaking', 'va-idle', 'va-awaiting');
  
  let statusLabel = 'Ready';
  switch (state.status) {
    case 'listening':
      statusIndicator?.classList.add('va-listening');
      statusLabel = 'Listening...';
      break;
    case 'transcribing':
      statusIndicator?.classList.add('va-thinking');
      statusLabel = 'Transcribing...';
      break;
    case 'thinking':
      statusIndicator?.classList.add('va-thinking');
      statusLabel = 'Thinking...';
      break;
    case 'executing':
      statusIndicator?.classList.add('va-executing');
      statusLabel = 'Executing...';
      break;
    case 'speaking':
      statusIndicator?.classList.add('va-speaking');
      statusLabel = 'Speaking...';
      break;
    case 'awaiting_confirmation':
      statusIndicator?.classList.add('va-awaiting');
      statusLabel = 'Awaiting Confirmation';
      break;
    case 'error':
      statusIndicator?.classList.add('va-idle');
      statusLabel = state.errorMessage ? `Error: ${state.errorMessage}` : 'Error';
      break;
    default:
      statusIndicator?.classList.add('va-idle');
      statusLabel = 'Ready';
  }
  
  if (state.isRecording) {
    statusIndicator?.classList.remove('va-idle');
    statusIndicator?.classList.add('va-listening');
    statusLabel = 'Recording...';
  }
  
  if (statusText) statusText.textContent = statusLabel;
  
  // Transcript
  const transcriptEl = overlayContainer.querySelector('.va-transcript');
  if (transcriptEl) {
    transcriptEl.textContent = state.transcript || '(waiting for speech...)';
  }
  
  // Response
  const responseEl = overlayContainer.querySelector('.va-response');
  if (responseEl) {
    responseEl.textContent = state.assistantResponse || '(ready to help)';
  }
  
  // Current step
  const planSection = overlayContainer.querySelector('.va-plan-section') as HTMLElement;
  const stepEl = overlayContainer.querySelector('.va-current-step');
  
  if (state.currentStep) {
    planSection.style.display = 'block';
    if (stepEl) stepEl.textContent = state.currentStep;
  } else {
    planSection.style.display = 'none';
  }
  
  // PTT button state
  const pttBtn = overlayContainer.querySelector('.va-ptt-btn');
  const pttText = pttBtn?.querySelector('.va-btn-text');
  
  if (state.isRecording) {
    if (pttText) pttText.textContent = 'Release to Send';
  } else if (state.status === 'awaiting_confirmation') {
    if (pttText) pttText.textContent = 'Confirm or Cancel';
  } else {
    if (pttText) pttText.textContent = 'Hold to Talk';
  }
}

// Show the panel
export function showPanel(): void {
  const panel = overlayContainer?.querySelector('.va-panel');
  panel?.classList.remove('va-minimized');
  onPanelVisibilityChange?.(true);
}

export function setOnPanelVisibilityChange(callback: (visible: boolean) => void): void {
  onPanelVisibilityChange = callback;
}

// Update audio level visualization (0-1)
export function updateAudioLevel(level: number): void {
  if (!overlayContainer) return;
  const fill = overlayContainer.querySelector('.va-audio-level-fill') as HTMLElement;
  if (fill) {
    fill.style.width = `${Math.min(100, level * 100)}%`;
    // Color: green for speech, dim for silence
    fill.style.backgroundColor = level > 0.05 ? '#4caf50' : '#666';
  }
}

// Set continuous mode state for UI
export function setContinuousModeActive(active: boolean): void {
  continuousModeEnabled = active;
  if (!overlayContainer) return;
  const toggleBtn = overlayContainer.querySelector('.va-continuous-toggle');
  if (active) {
    toggleBtn?.classList.add('va-active');
  } else {
    toggleBtn?.classList.remove('va-active');
  }
}

export function isContinuousModeEnabled(): boolean {
  return continuousModeEnabled;
}

// Destroy overlay
export function destroyOverlay(): void {
  if (overlayContainer && overlayContainer.parentNode) {
    overlayContainer.parentNode.removeChild(overlayContainer);
    overlayContainer = null;
  }
}
