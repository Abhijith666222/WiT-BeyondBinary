import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { PersonaMode, UserPreferences } from "./types";

interface AppState {
  preferences: UserPreferences;
  setPersona: (p: PersonaMode) => void;
  setPreferences: (p: Partial<UserPreferences>) => void;
  onboardingComplete: boolean;
  setOnboardingComplete: (v: boolean) => void;
}

const defaultPrefs: UserPreferences = {
  persona: "deaf",
  primaryOutput: "text",
  secondaryOutputs: ["speech"],
  highContrast: false,
  reducedMotion: false,
  dyslexiaFriendlyFont: false,
  ttsRate: 1,
  ttsVoicePreset: "neutral",
};

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      preferences: defaultPrefs,
      onboardingComplete: false,
      setPersona: (persona) =>
        set((s) => ({
          preferences: {
            ...s.preferences,
            persona,
            primaryOutput:
              persona === "blind"
                ? "speech"
                : persona === "deafblind"
                  ? "haptic"
                  : "text",
            secondaryOutputs:
              persona === "deafblind"
                ? ["text"]
                : persona === "blind"
                  ? ["text", "haptic"]
                  : ["speech", "sign"],
          },
        })),
      setPreferences: (p) =>
        set((s) => ({ preferences: { ...s.preferences, ...p } })),
      setOnboardingComplete: (v) => set({ onboardingComplete: v }),
    }),
    { name: "signbridge-preferences", skipHydration: true }
  )
);
