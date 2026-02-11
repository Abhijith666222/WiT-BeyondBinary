/**
 * Voice Navigator — parses voice commands, page descriptions, and page actions.
 * Enhanced with agentic commands (click, type, list) and full PAGE_INFO.
 * No LLM needed: uses fuzzy keyword matching for fast, offline navigation.
 */

/* ================================================================== */
/*  Routes                                                             */
/* ================================================================== */

export interface VoiceRoute {
  path: string;
  label: string;
  aliases: string[];
}

export const APP_ROUTES: VoiceRoute[] = [
  {
    path: "/dashboard",
    label: "Home",
    aliases: [
      "home", "dashboard", "main page", "start", "universe home",
      "go home", "go to home", "take me home",
    ],
  },
  {
    path: "/messages",
    label: "Bridge",
    aliases: [
      "bridge", "messages", "chat", "messaging",
      "go to bridge", "open bridge", "open messages",
    ],
  },
  {
    path: "/accessible-places",
    label: "Places",
    aliases: [
      "places", "accessible places", "nearby places", "find places",
      "go to places", "open places", "accessibility map",
    ],
  },
  {
    path: "/relay",
    label: "Relay",
    aliases: [
      "relay", "open relay", "go to relay", "dual channel",
      "relay mode", "conversation relay",
    ],
  },
  {
    path: "/signwave",
    label: "SignWave",
    aliases: [
      "sign wave", "signwave", "sign language", "sign", "camera",
      "go to signwave", "open signwave",
    ],
  },
  {
    path: "/touchspeak",
    label: "TouchSpeak",
    aliases: [
      "touch speak", "touchspeak", "braille", "haptic",
      "go to touchspeak", "open touchspeak",
    ],
  },
  {
    path: "/contextai",
    label: "ContextAI",
    aliases: [
      "context ai", "contextai", "context", "daily assistant", "assistant",
      "go to contextai", "open contextai",
    ],
  },
  {
    path: "/contextai/shopping",
    label: "Shopping Assist",
    aliases: ["shopping", "shopping assist", "store", "go shopping"],
  },
  {
    path: "/contextai/hawker",
    label: "Hawker Assist",
    aliases: ["hawker", "hawker center", "food", "hawker assist", "eating"],
  },
  {
    path: "/contextai/mrt",
    label: "MRT Assist",
    aliases: ["mrt", "train", "mrt assist", "transport", "mrt help"],
  },
  {
    path: "/learning",
    label: "Learning",
    aliases: [
      "learning", "learn", "classroom", "sign quest", "learning bridge",
      "go to learning", "open learning", "baby signs",
    ],
  },
  {
    path: "/safetyassist",
    label: "SafetyAssist",
    aliases: [
      "safety", "safety assist", "emergency", "help me", "police",
      "go to safety", "open safety",
    ],
  },
  {
    path: "/publicassist",
    label: "PublicAssist",
    aliases: [
      "public assist", "publicassist", "public", "kiosk", "hospital",
      "government", "go to publicassist", "open publicassist",
      "women's health", "caregiving", "meeting assist",
    ],
  },
  {
    path: "/onboarding",
    label: "Settings",
    aliases: [
      "settings", "onboarding", "preferences", "mode", "change mode",
      "persona", "go to settings", "open settings", "personalisation",
      "personalization", "accessibility settings",
    ],
  },
  {
    path: "/simulator",
    label: "Simulator",
    aliases: ["simulator", "simulate", "test", "go to simulator", "open simulator"],
  },
  {
    path: "/how-to-use",
    label: "How to use",
    aliases: ["how to use", "help", "guide", "instructions", "tutorial"],
  },
  {
    path: "/connectors",
    label: "Connectors",
    aliases: ["connectors", "integrations", "connect", "go to connectors"],
  },
  {
    path: "/pitch",
    label: "Pitch",
    aliases: ["pitch", "presentation", "go to pitch"],
  },
];

/* ================================================================== */
/*  Page info & voice-triggerable actions                              */
/* ================================================================== */

export interface PageAction {
  phrases: string[];
  actionId: string;
  label: string;
}

export interface PageInfo {
  /** Friendly page name spoken to the user */
  name: string;
  /** Rich description read aloud on "where am I" */
  description: string;
  /** Voice-triggerable actions via data-voice-action */
  actions: PageAction[];
}

export const PAGE_INFO: Record<string, PageInfo> = {
  "/dashboard": {
    name: "Home",
    description:
      "Universe Home. You can navigate to any module: Bridge for messaging, SignWave for sign language, TouchSpeak for braille, ContextAI for daily assistance, Learning for sign language lessons, SafetyAssist for emergencies, PublicAssist for healthcare and services, and Places for accessible locations. Say \"go to\" followed by a module name, or say \"click\" and a card name.",
    actions: [],
  },
  "/accessible-places": {
    name: "Accessible Places",
    description:
      "Accessible Places. Browse wheelchair-accessible and women-focused locations near you. Say \"read all\" to hear the list, \"refresh\" to reload. For women-focused services, say \"filter women-owned\", \"filter women's health\", \"filter support\", or \"filter all\". Say \"click\" a place name to hear details.",
    actions: [
      { phrases: ["read all", "read all aloud", "read places", "read list"], actionId: "read-all-places", label: "Read all places aloud" },
      { phrases: ["stop", "stop reading", "stop read"], actionId: "stop-read-places", label: "Stop reading" },
      { phrases: ["refresh", "refresh places", "find places"], actionId: "refresh-places", label: "Refresh places" },
      { phrases: ["filter women-owned", "women-owned", "women owned"], actionId: "womens-filter-women-owned", label: "Filter: Women-owned" },
      { phrases: ["filter women's health", "women's health", "womens health", "women health"], actionId: "womens-filter-womens-health", label: "Filter: Women's health" },
      { phrases: ["filter support", "support services"], actionId: "womens-filter-support", label: "Filter: Support" },
      { phrases: ["filter all", "show all", "all services"], actionId: "womens-filter-all", label: "Filter: All" },
    ],
  },
  "/messages": {
    name: "Bridge",
    description:
      "Bridge messaging. You have Chat and Relay tabs. Chat is direct messaging. Relay is dual-channel conversation between two people with text, speech, and sign support. Say \"switch to chat\" or \"switch to relay\". On Relay, say \"connect another device\" to create or join a room. You can also say \"type\" followed by your message to compose.",
    actions: [
      { phrases: ["switch to chat", "show chat", "open chat", "chat tab"], actionId: "tab-chat", label: "Switch to Chat" },
      { phrases: ["switch to relay", "show relay", "open relay", "relay tab"], actionId: "tab-relay", label: "Switch to Relay" },
      { phrases: ["connect another device", "connect other device", "connect a device", "connect device", "link another device"], actionId: "connect-another-device", label: "Connect another device (Relay)" },
      { phrases: ["send", "send message"], actionId: "send-message", label: "Send message" },
    ],
  },
  "/relay": {
    name: "Relay",
    description:
      "Relay page. Create or join conversation rooms for dual-channel communication. Say \"create room\" to make a new room, \"join room\" to join an existing one, or \"click\" a room name to enter it.",
    actions: [
      { phrases: ["create room", "new room", "create a room", "make room", "start room"], actionId: "create-room", label: "Create room" },
      { phrases: ["join room", "join a room", "enter room"], actionId: "join-room", label: "Join room" },
    ],
  },
  "/signwave": {
    name: "SignWave",
    description:
      "SignWave — sign language to speech and text. Start the camera to detect signs, or use the sign picker to select a sign manually. Say \"start camera\" to begin detection, \"detect sign\" to capture, or say \"click\" and a sign name to pick it.",
    actions: [
      { phrases: ["start camera", "turn on camera", "open camera"], actionId: "start-camera", label: "Start camera" },
      { phrases: ["stop camera", "turn off camera", "close camera"], actionId: "stop-camera", label: "Stop camera" },
      { phrases: ["detect sign", "scan sign", "recognize sign", "capture"], actionId: "detect-sign", label: "Detect sign" },
    ],
  },
  "/touchspeak": {
    name: "TouchSpeak",
    description:
      "TouchSpeak — braille and haptic communication. Receive text as vibration patterns, or send via braille dot input. Say \"speak\" to hear the current buffer, \"start dictation\" for voice input, or tap braille dots to compose.",
    actions: [
      { phrases: ["play receive", "play text", "hear message", "speak"], actionId: "play-receive", label: "Play received text" },
      { phrases: ["start dictation", "start voice", "dictate"], actionId: "start-dictation", label: "Start dictation" },
      { phrases: ["clear", "clear buffer"], actionId: "clear-buffer", label: "Clear buffer" },
    ],
  },
  "/contextai": {
    name: "ContextAI",
    description:
      "ContextAI — daily life assistant with three scenarios. Say \"go to shopping\" for Shopping Assist, \"go to hawker\" for Hawker menu scanning, or \"go to MRT\" for train navigation.",
    actions: [],
  },
  "/contextai/shopping": {
    name: "Shopping Assist",
    description:
      "Shopping Assist. Use your camera to scan product labels and prices with OCR. Say \"start camera\" then \"scan\" to read items aloud.",
    actions: [
      { phrases: ["start camera", "turn on camera", "open camera"], actionId: "start-camera", label: "Start camera" },
      { phrases: ["scan", "scan item", "run ocr", "read text"], actionId: "scan-ocr", label: "Scan with OCR" },
    ],
  },
  "/contextai/hawker": {
    name: "Hawker Assist",
    description:
      "Hawker Centre Assist. Point your camera at a menu, then scan to read it aloud. Say \"start camera\" then \"scan\" to capture the menu.",
    actions: [
      { phrases: ["start camera", "turn on camera", "open camera"], actionId: "start-camera", label: "Start camera" },
      { phrases: ["scan", "scan menu", "run ocr"], actionId: "scan-ocr", label: "Scan menu" },
    ],
  },
  "/contextai/mrt": {
    name: "MRT Assist",
    description:
      "MRT Assist. Train arrival times and haptic turn cues. Say \"turn left\" or \"turn right\" for haptic direction cues, or tap an arrival to hear it.",
    actions: [
      { phrases: ["turn left", "left turn", "left"], actionId: "turn-left", label: "Turn left (haptic)" },
      { phrases: ["turn right", "right turn", "right"], actionId: "turn-right", label: "Turn right (haptic)" },
    ],
  },
  "/learning": {
    name: "Learning Bridge",
    description:
      "Learning Bridge. Three modes: Classroom for teacher-student sign language practice, Sign Quest for a quiz game, and Baby Signs for caregivers. Say \"click classroom\" to enter Classroom mode, \"click sign quest\" to start the quiz, or \"click baby signs\" to learn simple signs.",
    actions: [
      { phrases: ["start quiz", "begin quiz", "quiz", "sign quest"], actionId: "start-quiz", label: "Start quiz" },
      { phrases: ["classroom", "enter classroom"], actionId: "enter-classroom", label: "Enter classroom" },
      { phrases: ["baby signs", "baby sign"], actionId: "baby-signs", label: "Baby signs" },
    ],
  },
  "/safetyassist": {
    name: "SafetyAssist",
    description:
      "SafetyAssist — emergency help. You can call police, call your emergency contact, request nearby help, send a silent SOS, or do a buddy check-in. Say the action name, or long-press the SOS button. Keyboard shortcut: Ctrl+Shift+S for silent SOS.",
    actions: [
      { phrases: ["call police", "emergency", "police"], actionId: "call-police", label: "Call Police" },
      { phrases: ["call emergency contact", "call contact", "emergency contact"], actionId: "call-contact", label: "Call Emergency Contact" },
      { phrases: ["nearby help", "request nearby help", "help nearby"], actionId: "nearby-help", label: "Request Nearby Help" },
      { phrases: ["silent sos", "silent alert", "sos"], actionId: "silent-sos", label: "Silent SOS" },
      { phrases: ["buddy check in", "check in", "buddy"], actionId: "buddy-checkin", label: "Buddy Check-In" },
    ],
  },
  "/publicassist": {
    name: "PublicAssist",
    description:
      "PublicAssist — structured assistance for healthcare, caregiving, meetings, and public services. Choose a task: Hospital for medical visits, MRT Station for navigation, Government Services for forms, Women's Health for OB-GYN flows, Caregiving for carer phrases, or Meeting Assist for workplace self-advocacy. Say \"click\" and the task name, or use specific phrases.",
    actions: [
      { phrases: ["hospital", "medical"], actionId: "task-hospital", label: "Hospital task" },
      { phrases: ["women's health", "womens health", "ob gyn", "prenatal", "postnatal"], actionId: "task-womens-health", label: "Women's Health" },
      { phrases: ["caregiving", "caregiver"], actionId: "task-caregiving", label: "Caregiving" },
      { phrases: ["meeting", "meeting assist", "workplace"], actionId: "task-meeting", label: "Meeting Assist" },
      { phrases: ["clear drawing", "clear board", "erase"], actionId: "clear-drawing", label: "Clear drawing board" },
    ],
  },
  "/onboarding": {
    name: "Settings & Personalisation",
    description:
      "Settings and Personalisation. Choose your accessibility mode: Deaf, Blind, or Helper. You can also enable dyslexia-friendly fonts, and pick a voice style preset (Neutral, Clear, or Soft). Say \"select deaf\", \"select blind\", or \"select helper\" to choose a mode. Say \"continue\" when you are ready.",
    actions: [
      { phrases: ["select deaf", "deaf mode", "choose deaf", "deaf"], actionId: "select-deaf", label: "Select Deaf mode" },
      { phrases: ["select blind", "blind mode", "choose blind", "blind"], actionId: "select-blind", label: "Select Blind mode" },
      { phrases: ["select helper", "helper mode", "choose helper", "helper"], actionId: "select-helper", label: "Select Helper mode" },
      { phrases: ["continue", "done", "finish", "go to home", "start"], actionId: "continue", label: "Continue to app" },
      { phrases: ["dyslexia font", "dyslexia", "toggle dyslexia", "dyslexia fonts"], actionId: "toggle-dyslexia", label: "Toggle dyslexia-friendly fonts" },
      { phrases: ["voice clear", "clear voice", "preset clear"], actionId: "voice-clear", label: "Voice preset: Clear" },
      { phrases: ["voice neutral", "neutral voice", "preset neutral"], actionId: "voice-neutral", label: "Voice preset: Neutral" },
      { phrases: ["voice soft", "soft voice", "preset soft"], actionId: "voice-soft", label: "Voice preset: Soft" },
    ],
  },
  "/simulator": {
    name: "Simulator",
    description:
      "Persona Simulator. Test how the app behaves under each persona. Switch persona and voice preset, then interact with demo content. Say \"select deaf\", \"select blind\", or choose a voice preset.",
    actions: [],
  },
  "/how-to-use": {
    name: "How to Use",
    description:
      "How to Use guide. Read about each module and how to navigate SignBridge Universe. Scroll down for more, or say \"go to\" a module name to jump there.",
    actions: [],
  },
  "/connectors": {
    name: "Connectors",
    description:
      "Connectors hub. Integrations with external services: Government, Zoom, and LTA. Say \"click\" a connector name to open it.",
    actions: [],
  },
  "/connectors/gov": {
    name: "Government Connector",
    description: "Government connector. Submit accessibility requests to government services.",
    actions: [],
  },
  "/connectors/zoom": {
    name: "Zoom Connector",
    description: "Zoom connector. Bridge sign language and captions into Zoom meetings.",
    actions: [],
  },
  "/connectors/lta": {
    name: "LTA Connector",
    description: "LTA transport connector. Real-time bus and MRT data with accessible output.",
    actions: [],
  },
  "/pitch": {
    name: "Pitch",
    description: "Pitch presentation page. View the SignBridge Universe pitch deck.",
    actions: [],
  },
  "/rules": {
    name: "Rules",
    description: "Rules page. View the community and accessibility guidelines.",
    actions: [],
  },
};

/* ================================================================== */
/*  Voice action types                                                 */
/* ================================================================== */

export type VoiceAction =
  | { type: "navigate"; path: string; label: string }
  | { type: "go_back" }
  | { type: "scroll"; direction: "up" | "down" | "top" | "bottom" }
  | { type: "stop_speaking" }
  | { type: "repeat" }
  | { type: "read_page" }
  | { type: "page_action"; actionId: string }
  | { type: "click_element"; label: string }
  | { type: "type_text"; text: string; field: string }
  | { type: "list_elements" }
  | { type: "unknown"; transcript: string; message?: string };

/* ================================================================== */
/*  Parse                                                              */
/* ================================================================== */

/**
 * Parse a voice transcript into a VoiceAction.
 * Priority: stop → repeat → back → scroll → read → page actions → navigation → agentic → unknown
 */
export function parseVoiceCommand(raw: string, pathname: string): VoiceAction {
  const t = raw.toLowerCase().trim();

  // ---- Stop ----
  if (/^(stop|shut up|quiet|be quiet|cancel|stop speaking|mute|silence)$/.test(t)) {
    return { type: "stop_speaking" };
  }

  // ---- Repeat ----
  if (/^(repeat|say again|say that again|repeat that|what did you say)$/.test(t)) {
    return { type: "repeat" };
  }

  // ---- Go back ----
  if (/^(go back|back|previous page|go to previous)$/.test(t)) {
    return { type: "go_back" };
  }

  // ---- Scroll ----
  if (/scroll\s+(down|up|to top|to bottom)|^(scroll down|scroll up)$/i.test(t)) {
    if (t.includes("top")) return { type: "scroll", direction: "top" };
    if (t.includes("bottom")) return { type: "scroll", direction: "bottom" };
    if (t.includes("up")) return { type: "scroll", direction: "up" };
    return { type: "scroll", direction: "down" };
  }

  // ---- Read page / where am I ----
  if (
    /^(read|read page|where am i|what page|what is this|describe|what can i do|what's on this page|describe page|help me|what can i say)$/.test(
      t
    )
  ) {
    return { type: "read_page" };
  }

  // ---- List interactive elements ----
  if (
    /^(what can i click|list buttons|list elements|show buttons|list actions|what buttons|what links|what's clickable|show actions)$/.test(
      t
    )
  ) {
    return { type: "list_elements" };
  }

  // ---- Page actions (current page) ----
  const basePath = pathname.split("?")[0];
  const pageInfo = PAGE_INFO[basePath] ?? PAGE_INFO[pathname];
  if (pageInfo?.actions) {
    for (const a of pageInfo.actions) {
      for (const phrase of a.phrases) {
        if (t === phrase || t.includes(phrase)) {
          return { type: "page_action", actionId: a.actionId };
        }
      }
    }
  }

  // ---- Navigation: best matching route ----
  let bestMatch: VoiceRoute | null = null;
  let bestScore = 0;

  for (const route of APP_ROUTES) {
    for (const alias of route.aliases) {
      if (t === alias) {
        return { type: "navigate", path: route.path, label: route.label };
      }
      if (t.includes(alias) && alias.length > bestScore) {
        bestMatch = route;
        bestScore = alias.length;
      }
    }
  }

  // "go to X", "open X", "take me to X", "navigate to X"
  const goToMatch = t.match(
    /(?:go to|open|take me to|navigate to|show me|bring me to|switch to)\s+(.+)/
  );
  if (goToMatch) {
    const target = goToMatch[1].trim();
    for (const route of APP_ROUTES) {
      for (const alias of route.aliases) {
        if (alias.includes(target) || target.includes(alias)) {
          if (alias.length > bestScore) {
            bestMatch = route;
            bestScore = alias.length;
          }
        }
      }
      if (
        route.label.toLowerCase().includes(target) ||
        target.includes(route.label.toLowerCase())
      ) {
        if (route.label.length > bestScore) {
          bestMatch = route;
          bestScore = route.label.length;
        }
      }
    }
  }

  if (bestMatch) {
    return { type: "navigate", path: bestMatch.path, label: bestMatch.label };
  }

  // ---- Agentic: click / press / tap / select ----
  const clickMatch = t.match(
    /^(?:click|press|tap|hit|select|choose|pick|activate)\s+(?:the\s+|on\s+)?(.+)/
  );
  if (clickMatch) {
    return { type: "click_element", label: clickMatch[1].trim() };
  }

  // ---- Agentic: type / write / enter ----
  const typeMatchWithField = t.match(
    /^(?:type|write|enter|input)\s+["""]?(.+?)["""]?\s+(?:in|into|on|in the|into the)\s+(.+)/
  );
  if (typeMatchWithField) {
    return {
      type: "type_text",
      text: typeMatchWithField[1].trim(),
      field: typeMatchWithField[2].trim(),
    };
  }
  const typeMatch = t.match(/^(?:type|write|enter|input)\s+["""]?(.+?)["""]?\s*$/);
  if (typeMatch) {
    return { type: "type_text", text: typeMatch[1].trim(), field: "" };
  }

  // ---- Unknown ----
  return { type: "unknown", transcript: raw };
}

/* ================================================================== */
/*  Describe                                                           */
/* ================================================================== */

/**
 * Spoken description of the current page including available actions.
 */
export function describeCurrentPage(pathname: string): string {
  const basePath = pathname.split("?")[0];
  const pageInfo = PAGE_INFO[basePath] ?? PAGE_INFO[pathname];

  if (pageInfo) {
    let out = pageInfo.description;
    if (pageInfo.actions.length > 0) {
      const labels = pageInfo.actions.map((a) => `"${a.phrases[0]}"`).join(", ");
      out += ` You can say: ${labels}.`;
    }
    out +=
      ' You can also say "click" followed by any button name, or "what can I click" to list all interactive elements.';
    return out;
  }

  if (pathname.startsWith("/contextai/")) {
    return 'You are in ContextAI. Say the scenario name to open Shopping, Hawker, or MRT assist.';
  }
  if (pathname.startsWith("/connectors/")) {
    return "You are in the Connectors section.";
  }

  return `You are on ${pathname}. Say "where am I" on a main page for a fuller description, or "what can I click" to list interactive elements.`;
}

/**
 * Get the friendly page name for the current route.
 */
export function getPageName(pathname: string): string {
  const basePath = pathname.split("?")[0];
  const pageInfo = PAGE_INFO[basePath] ?? PAGE_INFO[pathname];
  return (pageInfo?.name) ?? (pathname.replace(/^\//, "").replace(/-/g, " ") || "Home");
}

/**
 * Spoken list of navigable destinations.
 */
export function listAvailablePages(): string {
  const main = APP_ROUTES.filter(
    (r) =>
      !["/simulator", "/how-to-use", "/connectors", "/onboarding", "/pitch", "/rules"].includes(
        r.path
      ) && !r.path.startsWith("/contextai/")
  );
  const names = main.map((r) => r.label).join(", ");
  return `You can go to: ${names}. Say "go to" followed by any page name, or "click" followed by a button name.`;
}

/**
 * Build context string for LLM (page description + actions).
 */
export function getPageContextForLLM(pathname: string): string {
  const basePath = pathname.split("?")[0];
  const pageInfo = PAGE_INFO[basePath] ?? PAGE_INFO[pathname];
  if (!pageInfo) return "";
  let ctx = pageInfo.description;
  if (pageInfo.actions?.length) {
    ctx += ` Actions: ${pageInfo.actions.map((a) => a.phrases[0]).join(", ")}.`;
  }
  return ctx;
}

/**
 * Get list of input field identifiers for the current page (for type_text).
 */
export function getAvailableInputsForPage(pathname: string): string[] {
  const basePath = pathname.split("?")[0];
  const inputs: string[] = ["message"];
  if (basePath === "/messages") {
    inputs.push("message", "message a", "message b", "room code", "join code");
  }
  if (basePath === "/accessible-places") {
    inputs.push("search", "search women", "search women-focused services");
  }
  return [...new Set(inputs)];
}

/**
 * Execute a page action by clicking the element with data-voice-action.
 * Returns true if found and clicked.
 */
export function executePageAction(actionId: string): boolean {
  if (typeof document === "undefined") return false;
  const el = document.querySelector(
    `[data-voice-action="${actionId}"]`
  );
  if (el instanceof HTMLElement) {
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.click();
    return true;
  }
  return false;
}
