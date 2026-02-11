/** Meaning Layer — central representation for translation mesh */
export type Meaning = {
  intent: string;
  entities: Record<string, string>;
  tone?: string;
  language?: string;
  confidence: number;
};

/** Persona modes for adaptive UI */
export type PersonaMode = "deaf" | "blind" | "deafblind" | "helper";

/** Output renderer types */
export type OutputMode = "text" | "speech" | "sign" | "haptic";

export interface EmergencyContact {
  name?: string;
  phone?: string;
}

export interface UserPreferences {
  persona: PersonaMode;
  primaryOutput: OutputMode;
  secondaryOutputs: OutputMode[];
  highContrast: boolean;
  reducedMotion: boolean;
  /** Use dyslexia-friendly fonts app-wide (OpenDyslexic) */
  dyslexiaFriendlyFont: boolean;
  ttsVoice?: string;
  ttsRate?: number;
  /** Voice style: Clear, Neutral, Soft — maps to SpeechSynthesis voices */
  ttsVoicePreset?: "clear" | "neutral" | "soft";
  /** Emergency contact for SafetyAssist */
  emergencyContact?: EmergencyContact;
}

export interface SgSLSign {
  id: string;
  english_gloss: string;
  sg_context_tags: string[];
  difficulty: 1 | 2 | 3;
  dialect_variants?: string[];
  example_sentence?: string;
}

/** Bridge: in-app messaging */
export type MessageSender = "me" | "other";

export interface BridgeMessage {
  id: string;
  conversationId: string;
  sender: MessageSender;
  text: string;
  signGloss?: string;
  createdAt: number;
  readAt?: number;
}

export interface BridgeConversation {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  lastMessagePreview?: string;
  lastMessageAt?: number;
  unreadCount: number;
}
