// Persistence module — saves assistant state to chrome.storage.local
// so it survives page navigations and reloads.

export interface PersistedState {
  wakeWordEnabled: boolean;
  continuousModeEnabled: boolean;
  panelVisible: boolean;
}

const STORAGE_KEY = 'va_assistant_state';

const DEFAULT_STATE: PersistedState = {
  wakeWordEnabled: true,
  continuousModeEnabled: false,
  panelVisible: false,
};

export async function saveState(state: Partial<PersistedState>): Promise<void> {
  try {
    const current = await loadState();
    const merged = { ...current, ...state };
    await chrome.storage.local.set({ [STORAGE_KEY]: merged });
  } catch (e) {
    console.warn('[VoiceAssistant] Failed to save state:', e);
  }
}

export async function loadState(): Promise<PersistedState> {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEY);
    return { ...DEFAULT_STATE, ...(result[STORAGE_KEY] || {}) };
  } catch (e) {
    console.warn('[VoiceAssistant] Failed to load state:', e);
    return { ...DEFAULT_STATE };
  }
}
