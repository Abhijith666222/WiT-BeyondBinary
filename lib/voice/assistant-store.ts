/**
 * Zustand store for Voice Assistant UI state.
 * Module-level singleton — survives Next.js client navigations.
 * NOT persisted to localStorage (panel should start closed on refresh).
 */
import { create } from "zustand";

interface AssistantUIState {
  /** Whether the voice assistant panel is open */
  panelOpen: boolean;
  setPanelOpen: (v: boolean) => void;
  togglePanel: () => void;
}

export const useAssistantStore = create<AssistantUIState>((set) => ({
  panelOpen: false,
  setPanelOpen: (panelOpen) => set({ panelOpen }),
  togglePanel: () => set((s) => ({ panelOpen: !s.panelOpen })),
}));
