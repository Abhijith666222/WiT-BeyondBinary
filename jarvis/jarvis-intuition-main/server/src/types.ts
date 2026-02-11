// Page Map Types - Version 1.0
export interface PageMap {
  version: string;
  tabId: number;
  url: string;
  title: string;
  timestamp: number;
  headings: HeadingInfo[];
  sections: SectionInfo[];
  actions: ActionInfo[];
  formFields: FormFieldInfo[];
  focus: FocusInfo | null;
  alerts: string[];
  isLoginPage: boolean;
  isCaptchaPage: boolean;
  isCheckoutPage: boolean;
}

export interface HeadingInfo {
  level: number;
  text: string;
  sectionId: string;
}

export interface SectionInfo {
  id: string;
  headingText: string;
  snippet: string;
}

export interface ActionInfo {
  actionId: string;
  role: string;
  label: string;
  type: string;
  state: {
    disabled: boolean;
    checked?: boolean;
    expanded?: boolean;
    selected?: boolean;
  };
  selector: string;
  boundingBox: { x: number; y: number; width: number; height: number } | null;
  isRisky: boolean;
}

export interface FormFieldInfo {
  fieldId: string;
  label: string;
  type: string;
  required: boolean;
  currentValue: string;
  validationError: string | null;
  selector: string;
  placeholder: string;
}

export interface FocusInfo {
  actionId: string | null;
  fieldId: string | null;
  label: string;
}

// Tool definitions for OpenAI
export interface ToolResult {
  success: boolean;
  message: string;
  data?: Record<string, unknown>;
}

// Tab state management
export interface TabState {
  tabId: number;
  pageMap: PageMap | null;
  conversationHistory: ConversationMessage[];
  confirmationPending: boolean;
  pendingAction: PendingAction | null;
  lastPlan: string | null;
  lastToolCallId: string | null;
  /** When true, tool results are silently consumed without triggering LLM follow-up */
  batchMode: boolean;
  /** Track last tool sent so we can skip LLM follow-up after navigate_to */
  lastExecutedTool: string | null;
}

export interface PendingAction {
  tool: string;
  args: Record<string, unknown>;
  description: string;
}

export interface ConversationMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  toolCallId?: string;
  toolCalls?: ToolCall[];
}

export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

// WebSocket message types
export interface WSMessage {
  type: string;
  tabId: number;
  data?: unknown;
}

export interface WSPageMapUpdate extends WSMessage {
  type: 'page_map_update';
  data: PageMap;
}

export interface WSUserTranscript extends WSMessage {
  type: 'user_transcript';
  data: { transcript: string };
}

export interface WSToolResult extends WSMessage {
  type: 'tool_result';
  data: ToolResult;
}

export interface WSCommand {
  type: 'execute_tool' | 'speak' | 'highlight_action' | 'status_update';
  tabId: number;
  data: unknown;
}

export interface WSSpeakCommand extends WSCommand {
  type: 'speak';
  data: { text: string; priority?: 'high' | 'normal' };
}

export interface WSExecuteToolCommand extends WSCommand {
  type: 'execute_tool';
  data: {
    tool: string;
    args: Record<string, unknown>;
  };
}

export interface WSHighlightCommand extends WSCommand {
  type: 'highlight_action';
  data: { actionId: string | null };
}

export interface WSStatusUpdate extends WSCommand {
  type: 'status_update';
  data: {
    status: 'listening' | 'thinking' | 'transcribing' | 'executing' | 'speaking' | 'idle' | 'awaiting_confirmation' | 'error';
    plan?: string;
    currentStep?: string;
    message?: string;
  };
}

// Profile for form filling
export interface UserProfile {
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone: string;
  address: {
    street: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };
  dateOfBirth: string;
  company: string;
  jobTitle: string;
}
