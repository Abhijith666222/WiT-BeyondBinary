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
  boundingBox: BoundingBox | null;
  isRisky: boolean;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
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

// Tool execution
export interface ToolResult {
  success: boolean;
  message: string;
  data?: Record<string, unknown>;
}

// WebSocket messages
export interface WSCommand {
  type: 'execute_tool' | 'speak' | 'highlight_action' | 'status_update';
  tabId: number;
  data: unknown;
}

export interface WSSpeakData {
  text: string;
  priority?: 'high' | 'normal';
}

export interface WSExecuteToolData {
  tool: string;
  args: Record<string, unknown>;
}

export interface WSHighlightData {
  actionId: string | null;
}

export interface WSStatusData {
  status: 'listening' | 'thinking' | 'transcribing' | 'executing' | 'speaking' | 'idle' | 'awaiting_confirmation' | 'error';
  plan?: string;
  currentStep?: string;
  message?: string;
}

// Overlay state
export interface OverlayState {
  status: WSStatusData['status'];
  transcript: string;
  assistantResponse: string;
  currentPlan: string;
  currentStep: string;
  errorMessage: string;
  isRecording: boolean;
  switchScanningEnabled: boolean;
  currentScanIndex: number;
}
