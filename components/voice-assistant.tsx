"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, X, Volume2, VolumeX, ChevronDown } from "lucide-react";
import {
  initVoiceEngine,
  initWakeWord,
  startRecording,
  stopRecording,
  getIsRecording,
  speakResponse,
  stopAssistant,
  startWakeWord,
  stopWakeWord,
  isWakeWordActive,
  setContinuousMode,
  isContinuousModeEnabled,
  destroyVoiceEngine,
  isSpeechRecognitionSupported,
  type VoiceStatus,
} from "@/lib/voice/engine";
import {
  parseVoiceCommand,
  describeCurrentPage,
  listAvailablePages,
  executePageAction,
  getPageName,
  getPageContextForLLM,
  getAvailableInputsForPage,
  type VoiceAction,
} from "@/lib/voice/navigator";
import {
  clickByLabel,
  typeIntoField,
  listInteractiveElements,
} from "@/lib/voice/dom-agent";
import { useAssistantStore } from "@/lib/voice/assistant-store";
import { useStore } from "@/lib/store";

export function VoiceAssistant() {
  const router = useRouter();
  const pathname = usePathname();
  const { preferences } = useStore();

  /* ---- Persistent panel state (survives navigation) ---- */
  const panelOpen = useAssistantStore((s) => s.panelOpen);
  const setPanelOpen = useAssistantStore((s) => s.setPanelOpen);
  const togglePanel = useAssistantStore((s) => s.togglePanel);

  const [supported, setSupported] = useState(false);
  const [status, setStatus] = useState<VoiceStatus>("idle");
  const [transcript, setTranscript] = useState("");
  const [response, setResponse] = useState("");
  const [audioLevel, setAudioLevel] = useState(0);
  const [wakeActive, setWakeActive] = useState(false);
  const [continuous, setContinuous] = useState(false);
  const [currentPageName, setCurrentPageName] = useState("");
  const pathnameRef = useRef(pathname);
  const prevPathnameRef = useRef(pathname);
  const isDeaf =
    preferences.persona === "deaf" || preferences.persona === "deafblind";
  const isBlind = preferences.persona === "blind";

  /* ---- Keep pathname ref current ---- */
  useEffect(() => {
    pathnameRef.current = pathname;
    setCurrentPageName(getPageName(pathname));
  }, [pathname]);

  /* ---- Blind mode: auto-announce page on navigation ---- */
  useEffect(() => {
    if (prevPathnameRef.current === pathname) return;
    prevPathnameRef.current = pathname;

    if (isBlind) {
      // Short delay to let the page render
      const timer = setTimeout(() => {
        const name = getPageName(pathname);
        speakResponse(`Now on ${name}.`, { mute: isDeaf });
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [pathname, isBlind, isDeaf]);

  /* ---- Resolve action (keyword first, then LLM for unknown) ---- */
  const resolveAction = useCallback(
    async (text: string): Promise<VoiceAction> => {
      const action = parseVoiceCommand(text, pathnameRef.current);
      if (action.type !== "unknown") return action;

      // Fall back to LLM for natural language
      try {
        const res = await fetch("/api/voice-command", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            transcript: text,
            pathname: pathnameRef.current,
            pageContext: getPageContextForLLM(pathnameRef.current),
            availableInputs: getAvailableInputsForPage(pathnameRef.current),
          }),
        });
        if (!res.ok) return action;
        const data = (await res.json()) as { action?: VoiceAction };
        return data.action ?? action;
      } catch {
        return action;
      }
    },
    []
  );

  /* ---- Handle commands (agentic) ---- */
  const handleCommand = useCallback(
    async (text: string) => {
      setStatus("processing");
      const action = await resolveAction(text);
      const mute = isDeaf;

      switch (action.type) {
        case "navigate":
          speakResponse(`Going to ${action.label}.`, { mute });
          router.push(action.path);
          break;

        case "go_back":
          speakResponse("Going back.", { mute });
          router.back();
          break;

        case "scroll":
          if (action.direction === "top")
            window.scrollTo({ top: 0, behavior: "smooth" });
          else if (action.direction === "bottom")
            window.scrollTo({
              top: document.body.scrollHeight,
              behavior: "smooth",
            });
          else if (action.direction === "up")
            window.scrollBy({ top: -400, behavior: "smooth" });
          else window.scrollBy({ top: 400, behavior: "smooth" });
          speakResponse(`Scrolling ${action.direction}.`, { mute });
          break;

        case "stop_speaking":
          stopAssistant();
          break;

        case "repeat":
          speakResponse("repeat_last", { mute });
          break;

        case "read_page":
          speakResponse(describeCurrentPage(pathnameRef.current), { mute });
          break;

        case "page_action":
          if (executePageAction(action.actionId)) {
            speakResponse("Done.", { mute });
          } else {
            // Try clicking by label as fallback
            const result = clickByLabel(action.actionId.replace(/-/g, " "));
            speakResponse(
              result.success
                ? result.message
                : "That action is not available on this page.",
              { mute }
            );
          }
          break;

        case "click_element": {
          const result = clickByLabel(action.label);
          speakResponse(result.message, { mute });
          break;
        }

        case "type_text": {
          const result = typeIntoField(action.field, action.text);
          speakResponse(result.message, { mute });
          break;
        }

        case "list_elements": {
          const listing = listInteractiveElements();
          speakResponse(listing, { mute });
          break;
        }

        case "unknown": {
          const msg =
            "message" in action && typeof action.message === "string"
              ? action.message
              : `I didn't catch a command. ${listAvailablePages()} You can also say "click" followed by a button name, or "where am I".`;
          speakResponse(msg, { mute });
          break;
        }
      }
    },
    [router, isDeaf]
  );

  /* ---- Toggle recording ---- */
  const toggleRecording = useCallback(() => {
    if (getIsRecording()) {
      stopRecording();
    } else {
      setPanelOpen(true);
      startRecording();
    }
  }, [setPanelOpen]);

  /* ---- Init engine ---- */
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!isSpeechRecognitionSupported()) return;

    setSupported(true);

    const ok = initVoiceEngine({
      onStatusChange: setStatus,
      onTranscript: setTranscript,
      onResponse: setResponse,
      onAudioLevel: setAudioLevel,
      onCommand: handleCommand,
    });

    if (ok) {
      initWakeWord();
    }

    // Keyboard shortcut: Ctrl+Shift+J
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && (e.key === "J" || e.key === "j")) {
        e.preventDefault();
        e.stopPropagation();
        toggleRecording();
      }
    };
    document.addEventListener("keydown", onKeyDown, true);

    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      destroyVoiceEngine();
    };
  }, [handleCommand, toggleRecording]);

  /* ---- Wake word ---- */
  const toggleWake = useCallback(() => {
    if (isWakeWordActive()) {
      stopWakeWord();
      setWakeActive(false);
    } else {
      startWakeWord();
      setWakeActive(true);
    }
  }, []);

  const toggleContinuous = useCallback(() => {
    const next = !isContinuousModeEnabled();
    setContinuousMode(next);
    setContinuous(next);
  }, []);

  if (!supported) return null;

  const isListening = status === "listening";
  const isSpeaking = status === "speaking";

  return (
    <>
      {/* FAB — always visible */}
      <button
        type="button"
        onClick={togglePanel}
        className="fixed bottom-24 right-4 md:bottom-6 md:right-6 z-50 w-14 h-14 rounded-full flex items-center justify-center shadow-soft transition-all duration-250 hover:scale-110 hover:shadow-glow"
        style={{
          background: isListening
            ? "linear-gradient(135deg, #ff6b6b, #ee5a5a)"
            : isSpeaking
            ? "linear-gradient(135deg, #4ecdc4, #44b8b0)"
            : "linear-gradient(135deg, #F0BFCF, #E8A3B5)",
        }}
        aria-label="Voice assistant"
      >
        {isListening ? (
          <Mic className="h-6 w-6 text-white animate-pulse" />
        ) : isSpeaking ? (
          <Volume2 className="h-6 w-6 text-white animate-pulse" />
        ) : (
          <Mic className="h-6 w-6 text-white" />
        )}
        {/* Notification dot when panel is closed and there's a response */}
        {!panelOpen && response && (
          <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-brand-rose ring-2 ring-white" />
        )}
      </button>

      {/* Panel */}
      <AnimatePresence>
        {panelOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.25 }}
            className="fixed bottom-40 right-4 md:bottom-24 md:right-6 z-50 w-[360px] max-w-[calc(100vw-2rem)]"
          >
            <div
              className="rounded-[22px] border border-[rgba(230,180,200,0.35)] overflow-hidden"
              style={{
                background:
                  "linear-gradient(180deg, rgba(250,244,247,0.97) 0%, rgba(244,238,246,0.95) 100%)",
                backdropFilter: "blur(16px)",
                boxShadow:
                  "0 10px 30px rgba(180,120,150,0.18), 0 2px 8px rgba(200,150,170,0.10)",
              }}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-[rgba(230,180,200,0.35)] bg-gradient-to-r from-[#FAF4F7] to-[#F4EEF6]">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-lg shrink-0">🎙️</span>
                  <div className="min-w-0">
                    <span className="font-semibold text-[#2A2433] text-sm block truncate">
                      Voice Assistant
                    </span>
                    {currentPageName && (
                      <span className="text-[10px] text-[#6B6B6B] block truncate">
                        {currentPageName}
                      </span>
                    )}
                  </div>
                  {wakeActive && (
                    <span className="text-[10px] bg-brand-pink/30 text-brand-rose px-1.5 py-0.5 rounded-full shrink-0">
                      Listening
                    </span>
                  )}
                  {isDeaf && (
                    <span className="text-[10px] bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded-full shrink-0">
                      Muted
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={togglePanel}
                  className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-brand-pink/20 transition-colors shrink-0"
                  aria-label="Minimise panel"
                >
                  <ChevronDown className="h-4 w-4 text-[#6B6B6B]" />
                </button>
              </div>

              {/* Content */}
              <div className="px-5 py-4 space-y-3 max-h-[55vh] overflow-y-auto">
                {/* Status */}
                <div className="flex items-center gap-3 px-3 py-2 bg-[#FAF4F7] rounded-2xl">
                  <span
                    className="w-3 h-3 rounded-full shrink-0 transition-colors"
                    style={{
                      backgroundColor:
                        status === "listening"
                          ? "#ff6b6b"
                          : status === "processing"
                          ? "#ffd93d"
                          : status === "speaking"
                          ? "#4ecdc4"
                          : status === "error"
                          ? "#ff6b6b"
                          : "#ccc",
                      animation:
                        status === "listening" || status === "speaking"
                          ? "pulse 1s infinite"
                          : status === "processing"
                          ? "pulse 0.5s infinite"
                          : "none",
                    }}
                  />
                  <span className="text-sm font-medium text-[#2A2433]">
                    {status === "idle" &&
                      'Ready — hold mic or say "Hey Sign Bridge"'}
                    {status === "listening" && "Listening..."}
                    {status === "processing" && "Processing..."}
                    {status === "speaking" && "Speaking..."}
                    {status === "error" && "Error — try again"}
                  </span>
                </div>

                {/* Transcript */}
                {transcript && (
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-[#6B6B6B] mb-1">
                      You said
                    </p>
                    <div
                      className="px-3 py-2 bg-[#FAF4F7] rounded-2xl text-sm text-[#2A2433]"
                      style={{ borderLeft: "3px solid #E9A7B8" }}
                    >
                      {transcript}
                    </div>
                  </div>
                )}

                {/* Response */}
                {response && (
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-[#6B6B6B] mb-1">
                      Assistant
                    </p>
                    <div
                      className="px-3 py-2 bg-[#F4EEF6] rounded-2xl text-sm text-[#2A2433]"
                      style={{ borderLeft: "3px solid #D8C7F0" }}
                    >
                      {response}
                    </div>
                  </div>
                )}

                {/* Audio level */}
                {status === "listening" && (
                  <div className="h-1 bg-[#F5F1FF] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-75"
                      style={{
                        width: `${Math.min(100, audioLevel * 100)}%`,
                        backgroundColor:
                          audioLevel > 0.05 ? "#4ecdc4" : "#ddd",
                      }}
                    />
                  </div>
                )}

                {/* Main button */}
                <button
                  type="button"
                  onMouseDown={() => !getIsRecording() && startRecording()}
                  onMouseUp={() => getIsRecording() && stopRecording()}
                  onMouseLeave={() => getIsRecording() && stopRecording()}
                  onTouchStart={(e) => {
                    e.preventDefault();
                    if (!getIsRecording()) startRecording();
                  }}
                  onTouchEnd={(e) => {
                    e.preventDefault();
                    if (getIsRecording()) stopRecording();
                  }}
                  className="w-full py-3 rounded-full font-semibold text-sm flex items-center justify-center gap-2 transition-all duration-200 min-h-[48px]"
                  style={{
                    background: getIsRecording()
                      ? "linear-gradient(90deg, #ff6b6b, #ee5a5a)"
                      : "linear-gradient(90deg, #F6C6D8, #E9A7B8)",
                    color: getIsRecording() ? "#fff" : "#2B2B2B",
                  }}
                >
                  {getIsRecording() ? (
                    <>
                      <MicOff className="h-5 w-5" />
                      Release to Send
                    </>
                  ) : (
                    <>
                      <Mic className="h-5 w-5" />
                      Hold to Talk
                    </>
                  )}
                </button>

                {/* Secondary controls */}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={toggleWake}
                    className="flex-1 py-2 px-3 rounded-full text-xs font-medium border transition-all min-h-[40px]"
                    style={{
                      background: wakeActive ? "#E9A7B8" : "transparent",
                      color: wakeActive ? "#fff" : "#6B6B6B",
                      borderColor: wakeActive
                        ? "#E9A7B8"
                        : "rgba(246,198,216,0.4)",
                    }}
                  >
                    👂 Wake Word
                  </button>
                  <button
                    type="button"
                    onClick={toggleContinuous}
                    className="flex-1 py-2 px-3 rounded-full text-xs font-medium border transition-all min-h-[40px]"
                    style={{
                      background: continuous ? "#4ecdc4" : "transparent",
                      color: continuous ? "#fff" : "#6B6B6B",
                      borderColor: continuous
                        ? "#4ecdc4"
                        : "rgba(246,198,216,0.4)",
                    }}
                  >
                    🔄 Continuous
                  </button>
                  {isSpeaking && (
                    <button
                      type="button"
                      onClick={() => stopAssistant()}
                      className="py-2 px-3 rounded-full text-xs font-medium border border-red-300 text-red-500 hover:bg-red-50 transition-all min-h-[40px]"
                    >
                      <VolumeX className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {/* Keyboard shortcut hint */}
                <p className="text-[10px] text-center text-[#6B6B6B]">
                  🔑 Ctrl+Shift+J to toggle • 🗣️ &quot;Hey Sign Bridge&quot; to
                  activate
                </p>

                {/* Voice commands help — expanded */}
                <details className="rounded-2xl bg-[#FAF4F7] overflow-hidden">
                  <summary className="px-4 py-2.5 text-xs font-semibold text-[#6B6B6B] cursor-pointer hover:bg-brand-pink/10 transition-colors">
                    Voice Commands
                  </summary>
                  <ul className="px-4 pb-3 text-[11px] text-[#6B6B6B] space-y-1 list-disc list-inside">
                    <li>
                      <strong className="text-[#2A2433]">
                        &quot;Where am I?&quot;
                      </strong>{" "}
                      — describe page &amp; available actions
                    </li>
                    <li>
                      <strong className="text-[#2A2433]">
                        &quot;Go to Bridge&quot;
                      </strong>{" "}
                      — navigate to any page
                    </li>
                    <li>
                      <strong className="text-[#2A2433]">
                        &quot;Click [button name]&quot;
                      </strong>{" "}
                      — press any button or link
                    </li>
                    <li>
                      <strong className="text-[#2A2433]">
                        &quot;Type hello in message&quot;
                      </strong>{" "}
                      — type into an input field
                    </li>
                    <li>
                      <strong className="text-[#2A2433]">
                        &quot;What can I click?&quot;
                      </strong>{" "}
                      — list all interactive elements
                    </li>
                    <li>
                      <strong className="text-[#2A2433]">
                        &quot;Create room&quot;
                      </strong>{" "}
                      — on Relay page
                    </li>
                    <li>
                      <strong className="text-[#2A2433]">
                        &quot;Select deaf&quot; / &quot;Select blind&quot;
                      </strong>{" "}
                      — on Settings page
                    </li>
                    <li>
                      <strong className="text-[#2A2433]">
                        &quot;Call police&quot;
                      </strong>{" "}
                      — on SafetyAssist
                    </li>
                    <li>
                      <strong className="text-[#2A2433]">
                        &quot;Start camera&quot;
                      </strong>
                      ,{" "}
                      <strong className="text-[#2A2433]">&quot;Scan&quot;</strong>{" "}
                      — on ContextAI / SignWave
                    </li>
                    <li>
                      <strong className="text-[#2A2433]">
                        &quot;Go back&quot;
                      </strong>
                      ,{" "}
                      <strong className="text-[#2A2433]">
                        &quot;Scroll down&quot;
                      </strong>
                      ,{" "}
                      <strong className="text-[#2A2433]">
                        &quot;Stop&quot;
                      </strong>
                    </li>
                  </ul>
                </details>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
