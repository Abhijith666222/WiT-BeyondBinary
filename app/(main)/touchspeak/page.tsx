"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, Send, MessageCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BrailleCell } from "@/components/braille-cell";
import {
  textToBrailleCells,
  dotsToVibrationPattern,
  brailleDotsToChar,
} from "@/lib/braille";
import { useStore } from "@/lib/store";
import { useToastStore } from "@/lib/toast-store";
import { useMessageStore } from "@/lib/message-store";
import { speakText, triggerVibration, playHapticFallback } from "@/lib/mesh/renderers";
import { meaningFromText } from "@/lib/mesh/meaning";
import quickPhrases from "@/data/quick_phrases.json";

const phrases = quickPhrases as { id: string; text: string; gloss: string }[];

/** Web Speech API types (not in default TS DOM lib) */
interface SpeechRecognitionResultItem {
  transcript: string;
  confidence: number;
}
interface SpeechRecognitionResult {
  length: number;
  [index: number]: SpeechRecognitionResultItem;
  isFinal: boolean;
}
interface SpeechRecognitionResultList {
  length: number;
  [index: number]: SpeechRecognitionResult;
}
interface SpeechRecognitionEventLike {
  results: SpeechRecognitionResultList;
}
interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

type WindowWithSR = Window & {
  webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  SpeechRecognition?: new () => SpeechRecognitionLike;
};

type Tab = "receive" | "send";

function TouchSpeakContent() {
  const searchParams = useSearchParams();
  const { preferences } = useStore();
  const addToast = useToastStore((s) => s.addToast);
  const activeConversationId = useMessageStore((s) => s.activeConversationId);
  const getMessages = useMessageStore((s) => s.getMessages);
  const sendMessage = useMessageStore((s) => s.sendMessage);

  const [tab, setTab] = useState<Tab>("receive");
  const [receiveText, setReceiveText] = useState("Hello");
  const [receivePlaying, setReceivePlaying] = useState(false);
  const [sendDots, setSendDots] = useState<number[]>([]);
  const [sendBuffer, setSendBuffer] = useState("");
  const [playingCellIndex, setPlayingCellIndex] = useState<number | null>(null);
  const [isDictating, setIsDictating] = useState(false);
  const [dictationTranscript, setDictationTranscript] = useState("");
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  // URL ?receive=... (e.g. from Bridge "Receive in TouchSpeak")
  useEffect(() => {
    const q = searchParams.get("receive");
    if (q) {
      setReceiveText(decodeURIComponent(q));
      setTab("receive");
      addToast("Loaded message from Bridge", "default");
    }
  }, [searchParams, addToast]);

  const bridgeMessages = activeConversationId ? getMessages(activeConversationId) : [];
  const lastFromOther = bridgeMessages.filter((m) => m.sender === "other").pop();

  const cells = textToBrailleCells(receiveText);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const SR = (window as unknown as WindowWithSR).SpeechRecognition || (window as unknown as WindowWithSR).webkitSpeechRecognition;
    if (SR) {
      recognitionRef.current = new SR();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = "en-SG";
      recognitionRef.current.onresult = (e: SpeechRecognitionEventLike) => {
        const last = e.results.length - 1;
        const result = e.results[last];
        setDictationTranscript(result[0].transcript);
      };
    }
    return () => {
      if (recognitionRef.current?.abort) recognitionRef.current.abort();
    };
  }, []);

  const playReceive = useCallback(() => {
    if (receivePlaying) return;
    setReceivePlaying(true);
    let i = 0;
    const run = () => {
      if (i >= cells.length) {
        setReceivePlaying(false);
        setPlayingCellIndex(null);
        const fullPattern = cells.flatMap((d) => [...dotsToVibrationPattern(d), 80]).slice(0, 20);
        if (fullPattern.length > 0 && !triggerVibration(fullPattern)) {
          playHapticFallback();
        }
        return;
      }
      setPlayingCellIndex(i);
      const pattern = dotsToVibrationPattern(cells[i]);
      if (pattern.length > 0) {
        if (!triggerVibration(pattern)) playHapticFallback();
      }
      i++;
      setTimeout(run, 400);
    };
    run();
  }, [cells, receivePlaying]);

  const addSendChar = useCallback(() => {
    const char = brailleDotsToChar(sendDots);
    if (char) {
      setSendBuffer((prev) => prev + char);
      setSendDots([]);
    }
  }, [sendDots]);

  const speakSendBuffer = useCallback(() => {
    let text = sendBuffer.trim();
    if (!text && sendDots.length > 0) {
      const char = brailleDotsToChar(sendDots);
      if (char) {
        text = char;
        setSendBuffer(char);
        setSendDots([]);
      }
    }
    if (!text) {
      addToast("Tap dots to form a letter, then Add letter, then Speak", "default");
      return;
    }
    const meaning = meaningFromText(text);
    speakText(meaning, { rate: preferences.ttsRate ?? 1, voicePreset: preferences.ttsVoicePreset });
    addToast(`Speaking: ${text}`, "success");
  }, [sendBuffer, sendDots, preferences.ttsRate, addToast]);

  const onDotClick = useCallback((dot: number, active: boolean) => {
    setSendDots((prev) => {
      const next = active ? prev.filter((d) => d !== dot) : [...prev, dot].sort((a, b) => a - b);
      return next;
    });
  }, []);

  const toggleDictate = useCallback(() => {
    const rec = recognitionRef.current;
    if (!rec) {
      addToast("Voice input not supported in this browser", "error");
      return;
    }
    if (isDictating) {
      rec.stop();
      const toAppend = dictationTranscript.trim();
      if (toAppend) {
        setSendBuffer((prev) => (prev ? `${prev} ${toAppend}` : toAppend));
        addToast(`Added: "${toAppend}"`, "success");
      }
      setDictationTranscript("");
      setIsDictating(false);
      return;
    }
    setDictationTranscript("");
    rec.start();
    setIsDictating(true);
    addToast("Listening — speak your message, then tap Stop dictating", "default");
  }, [isDictating, dictationTranscript, addToast]);

  const sendToBridge = useCallback(() => {
    const text = sendBuffer.trim();
    if (!text) {
      addToast("Type or dictate a message first", "default");
      return;
    }
    if (!activeConversationId) {
      addToast("Open Bridge and select a conversation first", "error");
      return;
    }
    sendMessage(activeConversationId, { text });
    setSendBuffer("");
    setSendDots([]);
    addToast("Sent to Bridge", "success");
  }, [sendBuffer, activeConversationId, sendMessage, addToast]);

  return (
    <div className="px-4 py-8 md:px-8">
      <p className="sr-only" aria-live="polite">
        TouchSpeak. Send mode: use Dictate to speak your message, or tap six dots for braille. Add letter confirms a letter. Speak reads your message aloud. Clear resets. Receive mode: type text and play to feel or hear the pattern.
      </p>
      <motion.h1
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-2xl font-bold text-foreground"
      >
        TouchSpeak
      </motion.h1>
      <p className="mt-1 text-muted-foreground">
        Haptic braille matrix: receive text as patterns, send by tapping dots. Fully usable with screen reader and keyboard.
      </p>

      <div className="mt-4 p-3 rounded-xl bg-white/5 border border-white/10 text-sm text-muted-foreground">
        <strong className="text-foreground">Using a screen reader?</strong> All controls are labeled. Send: use <strong>Dictate</strong> to speak your message, or tap the six dots (Dot 1 top left to Dot 6 bottom right); Add letter, Speak, Clear. Your message is announced when it changes.
      </div>
      <div className="mt-6 flex gap-2" role="tablist" aria-label="TouchSpeak mode">
        <Button
          variant={tab === "receive" ? "default" : "secondary"}
          size="sm"
          onClick={() => setTab("receive")}
          role="tab"
          aria-selected={tab === "receive"}
          aria-label="Receive mode: text to braille pattern"
        >
          Receive
        </Button>
        <Button
          variant={tab === "send" ? "default" : "secondary"}
          size="sm"
          onClick={() => setTab("send")}
          role="tab"
          aria-selected={tab === "send"}
          aria-label="Send mode: braille dots to text"
        >
          Send
        </Button>
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>
              {tab === "receive" ? "Receive: text → braille" : "Send: braille → text"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {tab === "receive" ? (
              <>
                {lastFromOther && (
                  <div className="rounded-xl bg-brand-cyan/10 border border-brand-cyan/20 p-3">
                    <p className="text-xs font-medium text-brand-cyan mb-1">Latest from Bridge</p>
                    <p className="text-sm text-foreground truncate" title={lastFromOther.text}>
                      {lastFromOther.text}
                    </p>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="mt-2"
                      onClick={() => {
                        setReceiveText(lastFromOther.text);
                        addToast("Loaded into text to feel", "success");
                      }}
                    >
                      Load into &quot;Text to feel&quot;
                    </Button>
                  </div>
                )}
                <div>
                  <label id="receive-label" className="text-xs font-medium text-muted-foreground">Text to feel</label>
                  <input
                    type="text"
                    value={receiveText}
                    onChange={(e) => setReceiveText(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-white/20 bg-white/5 px-3 py-2 text-foreground focus:border-brand-cyan/50 focus:outline-none"
                    aria-label="Text to convert to braille. Type then press Play to feel or hear the pattern."
                    aria-describedby="receive-label"
                  />
                </div>
                <Button
                  variant="default"
                  size="sm"
                  onClick={playReceive}
                  disabled={receivePlaying}
                  aria-label={receivePlaying ? "Playing braille pattern" : "Play braille pattern and vibrate or play tone"}
                  data-voice-action="play-receive"
                >
                  {receivePlaying ? "Playing…" : "Play braille + vibrate"}
                </Button>
                <p className="text-xs text-muted-foreground">
                  On Android Chrome: device vibrates. On other devices: short tone per character.
                </p>
                <div className="flex flex-wrap gap-4">
                  <AnimatePresence mode="popLayout">
                    {cells.map((dots, i) => (
                      <motion.div
                        key={`${i}-${dots.join(",")}`}
                        layout
                        className={
                          playingCellIndex === i
                            ? "rounded-lg ring-2 ring-brand-cyan p-1"
                            : "p-1"
                        }
                      >
                        <BrailleCell
                          dots={dots}
                          size="md"
                          animate={playingCellIndex === i}
                        />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground" id="send-instructions">
                  Use <strong>Dictate</strong> to speak your message, or tap dots to form a letter, then Add. Then Speak or Clear. With a screen reader: Dictate, or focus each dot (Dot 1 top left to Dot 6 bottom right). Your message is announced when it changes.
                </p>
                <BrailleCell
                  dots={[]}
                  size="lg"
                  onDotClick={onDotClick}
                  selectedDots={sendDots}
                  className="mt-2"
                />
                <div className="flex flex-wrap gap-2 mt-4" role="group" aria-label="Send actions">
                  <Button
                    variant={isDictating ? "default" : "secondary"}
                    size="sm"
                    onClick={toggleDictate}
                    aria-label={isDictating ? "Stop dictating and add to message" : "Dictate: speak to add to message"}
                    data-voice-action="start-dictation"
                  >
                    {isDictating ? <MicOff className="h-4 w-4 mr-1" /> : <Mic className="h-4 w-4 mr-1" />}
                    {isDictating ? "Stop dictating" : "Dictate"}
                  </Button>
                  <Button variant="secondary" size="sm" onClick={addSendChar} aria-label="Add current letter to message">
                    Add letter
                  </Button>
                  <Button variant="default" size="sm" onClick={speakSendBuffer} aria-label="Speak message aloud">
                    Speak
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSendBuffer("");
                      setSendDots([]);
                    }}
                    aria-label="Clear message and dots"
                  >
                    Clear
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={sendToBridge}
                    disabled={!sendBuffer.trim()}
                    className="bg-brand-cyan hover:bg-brand-cyan/90"
                    aria-label="Send message to Bridge"
                  >
                    <Send className="h-4 w-4 mr-1" />
                    Send to Bridge
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  <Link href="/messages" className="text-brand-cyan hover:underline inline-flex items-center gap-1">
                    <MessageCircle className="h-3.5 w-3.5" /> Open Bridge
                  </Link>
                  {" "}to see the thread and get replies.
                </p>
                <div
                  className="min-h-[2rem] rounded-lg bg-white/5 px-3 py-2 mt-3"
                  role="status"
                  aria-live="polite"
                  aria-atomic="true"
                  aria-label="Your message"
                >
                  <p className="text-xs text-muted-foreground mb-0.5">Your message</p>
                  <p className="text-lg font-mono text-foreground">
                    {isDictating && dictationTranscript
                      ? `"${[sendBuffer, dictationTranscript].filter(Boolean).join(" ")}". Listening…`
                      : sendBuffer
                        ? `"${sendBuffer}"`
                        : isDictating
                          ? "Listening… speak your message"
                          : <span className="text-muted-foreground">(none — Dictate or tap dots, then Add letter)</span>}
                  </p>
                  <p className="sr-only">
                    {isDictating
                      ? dictationTranscript
                        ? `Listening. So far: ${sendBuffer} ${dictationTranscript}`
                        : "Listening. Speak your message."
                      : sendBuffer
                        ? `Message: ${sendBuffer}`
                        : "Message is empty."}
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick responses</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              Tap to speak the phrase (TTS).
            </p>
            <div className="flex flex-wrap gap-2">
              {phrases.map((p) => (
                <Button
                  key={p.id}
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    const meaning = meaningFromText(p.text);
                    speakText(meaning, { rate: preferences.ttsRate ?? 1, voicePreset: preferences.ttsVoicePreset });
                    addToast(p.text, "success");
                  }}
                >
                  {p.text}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function TouchSpeakPage() {
  return (
    <Suspense fallback={<div className="px-4 py-8 text-muted-foreground">Loading TouchSpeak…</div>}>
      <TouchSpeakContent />
    </Suspense>
  );
}
