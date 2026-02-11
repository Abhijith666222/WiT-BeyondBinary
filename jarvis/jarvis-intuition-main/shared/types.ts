// Shared types between extension and server
// page_map.version = "1.0"

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface InteractiveElement {
  action_id: string;
  role: string;
  label: string;
  type?: string;
  state: {
    disabled: boolean;
    checked?: boolean;
    expanded?: boolean;
    selected?: boolean;
  };
  required: boolean;
  selector: string;
  boundingBox: BoundingBox | null;
  isRisky: boolean; // submit, pay, delete, etc.
}

export interface FormField {
  field_id: string;
  label: string;
  required: boolean;
  currentValue: string;
  validationError: string | null;
  type: string;
  selector: string;
  options?: string[]; // For select elements
}

export interface HeadingOutline {
  level: number;
  text: string;
  sectionId: string;
}

export interface PageSection {
  sectionId: string;
  headingText: string;
  textSnippet: string; // Truncated content
}

export interface FocusInfo {
  action_id: string | null;
  selector: string | null;
  label: string | null;
}

export interface PageMap {
  version: "1.0";
  timestamp: number;
  page: {
    title: string;
    url: string;
  };
  headings: HeadingOutline[];
  sections: PageSection[];
  interactiveElements: InteractiveElement[];
  formFields: FormField[];
  focusInfo: FocusInfo;
  detectedPatterns: {
    hasLoginForm: boolean;
    hasCaptcha: boolean;
    has2FA: boolean;
    hasPaymentForm: boolean;
    isErrorPage: boolean;
  };
}

// Tool definitions for LLM
export type ToolName = 
  | 'click'
  | 'type'
  | 'select'
  | 'scroll'
  | 'read_section'
  | 'focus_action'
  | 'request_confirmation'
  | 'fill_form_with_profile';

export interface ToolCall {
  tool: ToolName;
  args: Record<string, unknown>;
}

export interface ToolResult {
  success: boolean;
  message: string;
  data?: unknown;
}

// WebSocket message types
export interface WSMessage {
  type: 'page_map_update' | 'transcript' | 'tool_command' | 'say' | 'tool_result' | 'state_update' | 'error';
  tabId: number;
  payload: unknown;
}

export interface PageMapUpdate extends WSMessage {
  type: 'page_map_update';
  payload: PageMap;
}

export interface TranscriptMessage extends WSMessage {
  type: 'transcript';
  payload: {
    text: string;
    isConfirmation?: boolean;
  };
}

export interface ToolCommandMessage extends WSMessage {
  type: 'tool_command';
  payload: ToolCall;
}

export interface SayMessage extends WSMessage {
  type: 'say';
  payload: {
    text: string;
    priority?: 'normal' | 'high';
  };
}

export interface ToolResultMessage extends WSMessage {
  type: 'tool_result';
  payload: ToolResult;
}

export interface StateUpdateMessage extends WSMessage {
  type: 'state_update';
  payload: {
    isListening: boolean;
    currentPlanStep: string | null;
    lastAction: string | null;
    confirmationPending: boolean;
    pendingAction: ToolCall | null;
  };
}

// Agent state per tab
export interface TabState {
  tabId: number;
  pageMap: PageMap | null;
  lastPlan: string | null;
  currentStep: number;
  confirmationPending: boolean;
  pendingAction: ToolCall | null;
  conversationHistory: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
  }>;
}

// User profile for form filling
export interface UserProfile {
  personalInfo: {
    firstName: string;
    lastName: string;
    fullName: string;
    email: string;
    phone: string;
    dateOfBirth: string;
  };
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  preferences: {
    preferredLanguage: string;
    timezone: string;
  };
}

// Risky action keywords
export const RISKY_ACTION_KEYWORDS = [
  'submit', 'pay', 'purchase', 'buy', 'send', 'delete', 'remove',
  'checkout', 'confirm', 'place order', 'complete', 'finalize',
  'book', 'reserve', 'cancel', 'unsubscribe', 'terminate'
];

// Confirmation phrases
export const CONFIRM_PHRASES = [
  'confirm', 'yes', 'proceed', 'go ahead', 'do it', 'okay', 'ok', 'sure', 'yep', 'yeah'
];

export const CANCEL_PHRASES = [
  'cancel', 'no', 'stop', 'wait', 'nevermind', 'never mind', 'abort', 'don\'t', 'nope'
];
