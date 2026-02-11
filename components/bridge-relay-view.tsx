"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Send, MessageCircle, User, Users, Smartphone, Copy, Check } from "lucide-react";
import { startVAD, stopVAD } from "@/lib/voice/vad";
import { useMessageStore } from "@/lib/message-store";
import { useStore } from "@/lib/store";
import { useToastStore } from "@/lib/toast-store";
import { SignDetectionInsert } from "@/components/sign-detection-insert";
import type { Meaning } from "@/lib/types";
import type { SgSLSign } from "@/lib/types";
import { meaningFromText, meaningFromSpeech, meaningFromSign } from "@/lib/mesh/meaning";
import {
  renderText,
  speakText,
  renderSignGloss,
  getHapticPattern,
  triggerVibration,
  playHapticFallback,
} from "@/lib/mesh/renderers";
import sgslSigns from "@/data/sgsl_signs.json";

const signs = sgslSigns as SgSLSign[];

interface RelayMessage {
  id: string;
  from: "A" | "B";
  meaning: Meaning;
  at: number;
}

interface SyncedMessage {
  id: string;
  from: "A" | "B";
  text: string;
  signGloss?: string;
  at: number;
}

interface SpeechResultItem {
  transcript: string;
  confidence: number;
}
interface SpeechResult {
  length: number;
  [j: number]: SpeechResultItem;
  isFinal: boolean;
}
interface SpeechResultEvent {
  results: Array<{ length: number; [j: number]: SpeechResult; isFinal?: boolean }>;
  resultIndex: number;
}

interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((e: SpeechResultEvent) => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

type WindowWithSR = Window & {
  webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  SpeechRecognition?: new () => SpeechRecognitionLike;
};

function genId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

type RelayMode = "local" | "room";
type RoomView = "lobby" | "chat";

export function BridgeRelayView() {
  const { preferences } = useStore();
  const addToast = useToastStore((s) => s.addToast);
  const activeConversationId = useMessageStore((s) => s.activeConversationId);
  const sendMessage = useMessageStore((s) => s.sendMessage);

  const [mode, setMode] = useState<RelayMode>("local");
  const [roomView, setRoomView] = useState<RoomView>("lobby");
  const [roomId, setRoomId] = useState<string | null>(null);
  const [roomCode, setRoomCode] = useState("");
  const [joinCodeInput, setJoinCodeInput] = useState("");
  const [mySide, setMySide] = useState<"A" | "B" | null>(null);

  const [messages, setMessages] = useState<RelayMessage[]>([]);
  const [syncedMessages, setSyncedMessages] = useState<SyncedMessage[]>([]);
  const [inputA, setInputA] = useState("");
  const [inputB, setInputB] = useState("");
  const [listeningA, setListeningA] = useState(false);
  const [listeningB, setListeningB] = useState(false);
  const recA = useRef<SpeechRecognitionLike | null>(null);
  const recB = useRef<SpeechRecognitionLike | null>(null);
  const mediaStreamA = useRef<MediaStream | null>(null);
  const mediaStreamB = useRef<MediaStream | null>(null);
  const listEndRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const ttsRate = preferences.ttsRate ?? 1;
  const [codeCopied, setCodeCopied] = useState(false);

  useEffect(() => {
    listEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, syncedMessages.length]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const SR = (window as unknown as WindowWithSR).SpeechRecognition || (window as unknown as WindowWithSR).webkitSpeechRecognition;
    if (SR) {
      recA.current = new SR();
      recA.current.continuous = true;
      recA.current.interimResults = true;
      recA.current.lang = "en-SG";
      recB.current = new SR();
      recB.current.continuous = true;
      recB.current.interimResults = true;
      recB.current.lang = "en-SG";
    }
    return () => {
      stopVAD();
      mediaStreamA.current?.getTracks().forEach((t) => t.stop());
      mediaStreamB.current?.getTracks().forEach((t) => t.stop());
      recA.current?.abort?.();
      recB.current?.abort?.();
      eventSourceRef.current?.close();
    };
  }, []);

  const renderToOther = useCallback(
    (meaning: Meaning, side: "A" | "B") => {
      const text = renderText(meaning);
      speakText(meaning, { rate: ttsRate, voicePreset: preferences.ttsVoicePreset });
      const pattern = getHapticPattern(meaning);
      if (!triggerVibration(pattern)) playHapticFallback();
      setMessages((prev) => [...prev, { id: genId(), from: side, meaning, at: Date.now() }]);
    },
    [ttsRate, preferences.ttsVoicePreset]
  );

  const createRoom = useCallback(async () => {
    try {
      const res = await fetch("/api/relay/rooms", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create room");
      setRoomId(data.roomId);
      setRoomCode(data.code);
      setMySide("A");
      setRoomView("chat");
      setSyncedMessages([]);
      addToast("Room created. Share the code with the other device.", "success");
    } catch (e) {
      addToast(e instanceof Error ? e.message : "Failed to create room", "error");
    }
  }, [addToast]);

  const joinRoom = useCallback(async () => {
    const code = joinCodeInput.trim().toUpperCase();
    if (!code) {
      addToast("Enter the 6-letter code", "default");
      return;
    }
    try {
      const res = await fetch("/api/relay/rooms/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Invalid code");
      setRoomId(data.roomId);
      setMySide(data.side);
      setRoomCode(data.code || joinCodeInput.trim().toUpperCase());
      setRoomView("chat");
      setSyncedMessages([]);
      addToast(`Joined as User ${data.side}`, "success");
    } catch (e) {
      addToast(e instanceof Error ? e.message : "Invalid code", "error");
    }
  }, [joinCodeInput, addToast]);

  useEffect(() => {
    if (mode !== "room" || !roomId || roomView !== "chat") return;
    const url = `${window.location.origin}/api/relay/rooms/${roomId}/events`;
    const es = new EventSource(url);
    eventSourceRef.current = es;
    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === "connected") return;
        const msg = data as SyncedMessage;
        if (msg.from === mySide) return;
        setSyncedMessages((prev) => [...prev, msg]);
        const meaning = meaningFromText(msg.text);
        speakText(meaning, { rate: ttsRate, voicePreset: preferences.ttsVoicePreset });
        const pattern = getHapticPattern(meaning);
        if (!triggerVibration(pattern)) playHapticFallback();
      } catch {
        // ignore
      }
    };
    es.onerror = () => es.close();
    return () => {
      es.close();
      eventSourceRef.current = null;
    };
  }, [mode, roomId, roomView, mySide, ttsRate, preferences.ttsVoicePreset]);

  useEffect(() => {
    if (mode !== "room" || !roomId || roomView !== "chat") return;
    fetch(`/api/relay/rooms/${roomId}/messages`)
      .then((r) => r.json())
      .then((data) => {
        if (data.messages?.length) setSyncedMessages(data.messages);
      })
      .catch(() => {});
  }, [mode, roomId, roomView]);

  const sendInRoom = useCallback(
    async (text: string) => {
      if (!roomId || !mySide || !text.trim()) return;
      try {
        const res = await fetch(`/api/relay/rooms/${roomId}/send`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ from: mySide, text: text.trim() }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Send failed");
        setSyncedMessages((prev) => [...prev, data]);
      } catch (e) {
        addToast(e instanceof Error ? e.message : "Send failed", "error");
      }
    },
    [roomId, mySide, addToast]
  );

  const sendFromA = useCallback(
    (meaning: Meaning) => {
      renderToOther(meaning, "A");
      if (activeConversationId) {
        sendMessage(activeConversationId, {
          text: renderText(meaning),
          signGloss: renderSignGloss(meaning),
        });
      }
    },
    [renderToOther, activeConversationId, sendMessage]
  );

  const sendFromB = useCallback(
    (meaning: Meaning) => {
      renderToOther(meaning, "B");
      if (activeConversationId) {
        sendMessage(activeConversationId, {
          text: renderText(meaning),
          signGloss: renderSignGloss(meaning),
        });
      }
    },
    [renderToOther, activeConversationId, sendMessage]
  );

  const handleTextSubmitA = useCallback(() => {
    const t = inputA.trim();
    if (!t) return;
    const m = meaningFromText(t);
    if (mode === "room" && mySide === "A") {
      sendInRoom(t);
      setInputA("");
      return;
    }
    sendFromA(m);
    setInputA("");
  }, [inputA, mode, mySide, sendFromA, sendInRoom]);

  const handleTextSubmitB = useCallback(() => {
    const t = inputB.trim();
    if (!t) return;
    const m = meaningFromText(t);
    if (mode === "room" && mySide === "B") {
      sendInRoom(t);
      setInputB("");
      return;
    }
    sendFromB(m);
    setInputB("");
  }, [inputB, mode, mySide, sendFromB, sendInRoom]);

  const transcriptRef = useRef("");
  const finishMicA = useCallback(() => {
    stopVAD();
    mediaStreamA.current?.getTracks().forEach((t) => t.stop());
    mediaStreamA.current = null;
    try { recA.current?.stop(); } catch { /* ignore */ }
    setListeningA(false);
    const t = transcriptRef.current.trim();
    if (t) setInputA((prev) => (prev ? prev + " " : "") + t);
  }, []);

  const finishMicB = useCallback(() => {
    stopVAD();
    mediaStreamB.current?.getTracks().forEach((t) => t.stop());
    mediaStreamB.current = null;
    try { recB.current?.stop(); } catch { /* ignore */ }
    setListeningB(false);
    const t = transcriptRef.current.trim();
    if (t) setInputB((prev) => (prev ? prev + " " : "") + t);
  }, []);

  const startMicA = useCallback(async () => {
    if (!recA.current) return;
    transcriptRef.current = "";
    recA.current.onresult = (e: SpeechResultEvent) => {
      for (let i = e.resultIndex ?? 0; i < e.results.length; i++) {
        const r = e.results[i] as unknown as { isFinal?: boolean; 0?: { transcript?: string } };
        if (r?.isFinal && r[0]?.transcript) {
          transcriptRef.current = (transcriptRef.current ? transcriptRef.current + " " : "") + r[0].transcript;
        }
      }
    };
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamA.current = stream;
      startVAD(stream, { onSilenceDetected: finishMicA });
      recA.current.start();
      setListeningA(true);
    } catch {
      addToast("Microphone access denied", "error");
    }
  }, [finishMicA, addToast]);

  const startMicB = useCallback(async () => {
    if (!recB.current) return;
    transcriptRef.current = "";
    recB.current.onresult = (e: SpeechResultEvent) => {
      for (let i = e.resultIndex ?? 0; i < e.results.length; i++) {
        const r = e.results[i] as unknown as { isFinal?: boolean; 0?: { transcript?: string } };
        if (r?.isFinal && r[0]?.transcript) {
          transcriptRef.current = (transcriptRef.current ? transcriptRef.current + " " : "") + r[0].transcript;
        }
      }
    };
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamB.current = stream;
      startVAD(stream, { onSilenceDetected: finishMicB });
      recB.current.start();
      setListeningB(true);
    } catch {
      addToast("Microphone access denied", "error");
    }
  }, [finishMicB, addToast]);

  const toggleMicA = useCallback(() => {
    if (listeningA) finishMicA();
    else startMicA();
  }, [listeningA, finishMicA, startMicA]);

  const toggleMicB = useCallback(() => {
    if (listeningB) finishMicB();
    else startMicB();
  }, [listeningB, finishMicB, startMicB]);

  const copyCode = useCallback(() => {
    if (!roomCode) return;
    navigator.clipboard.writeText(roomCode);
    setCodeCopied(true);
    addToast("Code copied", "success");
    setTimeout(() => setCodeCopied(false), 2000);
  }, [roomCode, addToast]);

  if (mode === "room" && roomView === "lobby") {
    return (
      <div className="flex flex-col min-h-[calc(100vh-5rem)] px-4 py-6 md:px-8">
        <h2 className="text-xl font-bold text-foreground">Connect devices</h2>
        <p className="mt-1 text-sm text-muted-foreground mb-6">
          Create a room on one device and join with the code on the other (same Wi‑Fi).
        </p>
        <Button onClick={() => setMode("local")} variant="ghost" size="sm" className="self-start">
          ← Back to local
        </Button>
        <div className="grid gap-6 md:grid-cols-2 mt-6">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="h-5 w-5 text-brand-rose" strokeWidth={1.5} /> Create room
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Start a room and share the code with the other device.
              </p>
              <Button onClick={createRoom} className="w-full" data-voice-action="create-room">Create room</Button>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Smartphone className="h-5 w-5 text-brand-rose" strokeWidth={1.5} /> Join room
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">Enter the 6-letter code.</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. ABC123"
                  value={joinCodeInput}
                  onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase().slice(0, 6))}
                  className="flex-1 rounded-xl border border-brand-pink/30 bg-white/70 px-3 py-2 text-sm font-mono uppercase text-[#2B2B2B]"
                  maxLength={6}
                  aria-label="Room code"
                  data-voice-field="room-code"
                />
                <Button onClick={joinRoom} disabled={!joinCodeInput.trim()} data-voice-action="join-room">Join</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (mode === "room" && roomView === "chat" && roomId && mySide) {
    const myInput = mySide === "A" ? inputA : inputB;
    const setMyInput = mySide === "A" ? setInputA : setInputB;
    const handleMySubmit = mySide === "A" ? handleTextSubmitA : handleTextSubmitB;
    const listening = mySide === "A" ? listeningA : listeningB;
    const toggleMic = mySide === "A" ? toggleMicA : toggleMicB;

    return (
      <div className="flex flex-col h-[calc(100vh-8rem)] px-4 py-4 md:px-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-foreground">User {mySide}</h2>
            <p className="text-sm text-muted-foreground">
              Code: <span className="font-mono">{roomCode || "—"}</span>
              {roomCode && (
                <button type="button" onClick={copyCode} className="ml-2 text-brand-cyan hover:underline">
                  {codeCopied ? "Copied" : "Copy"}
                </button>
              )}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => { setRoomView("lobby"); setRoomId(null); setMySide(null); setRoomCode(""); }}>
            Leave room
          </Button>
        </div>
        <Card className="glass-card flex-1 flex flex-col min-h-0">
          <CardContent className="flex flex-col flex-1 min-h-0 gap-3 pt-6">
            <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
              <AnimatePresence initial={false}>
                {syncedMessages.map((m) => {
                  const isMe = m.from === mySide;
                  return (
                    <motion.div key={m.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={isMe ? "flex justify-end" : "flex justify-start"}>
                      <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${isMe ? "bg-brand-cyan/25 rounded-br-md" : "bg-white/10 rounded-bl-md"}`}>
                        <p className="text-xs font-medium text-muted-foreground mb-0.5">{isMe ? "You" : "Other"}</p>
                        <p className="text-sm text-foreground">{m.text}</p>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
              <div ref={listEndRef} />
            </div>
            <div className="space-y-2 flex-shrink-0">
              <div className="flex gap-2">
                <input type="text" placeholder="Type…" value={myInput} onChange={(e) => setMyInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleMySubmit()} className="flex-1 rounded-xl border border-white/20 bg-white/5 px-3 py-2 text-sm" aria-label="Relay message" data-voice-field="message" />
                <Button size="icon" onClick={handleMySubmit} disabled={!myInput.trim()}><Send className="h-4 w-4" /></Button>
              </div>
              <div className="flex flex-wrap gap-1">
                <Button variant={listening ? "default" : "secondary"} size="sm" onClick={toggleMic}>{listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}{listening ? "Stop" : "Mic"}</Button>
                {signs.slice(0, 8).map((s) => (
                  <Button key={s.id} variant="ghost" size="sm" className="text-xs" onClick={() => setMyInput((prev) => (prev ? prev + " " : "") + renderText(meaningFromSign(s)))}>{s.english_gloss}</Button>
                ))}
                <SignDetectionInsert onInsert={(text) => setMyInput((prev) => (prev ? prev + " " : "") + text)} label="Detect sign" onError={(msg) => addToast(msg, "error")} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] px-4 py-4 md:px-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-foreground">Dual-channel (User A & B)</h2>
        <Button variant="secondary" size="sm" onClick={() => { setMode("room"); setRoomView("lobby"); }} data-voice-action="connect-another-device">
          <Users className="h-4 w-4 mr-2" /> Connect another device
        </Button>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1 min-h-0">
        <Card className="glass-card flex flex-col min-h-0">
          <CardHeader className="flex-shrink-0">
            <CardTitle className="text-base flex items-center gap-2"><User className="h-4 w-4 text-brand-cyan" /> User A</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col flex-1 min-h-0 gap-3">
            <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
              {messages.filter((m) => m.from === "B").map((m) => (
                <motion.div key={m.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} className="flex justify-start">
                  <div className="max-w-[85%] rounded-2xl px-4 py-2.5 bg-white/10 rounded-bl-md">
                    <p className="text-sm">{renderText(m.meaning)}</p>
                  </div>
                </motion.div>
              ))}
              <div ref={listEndRef} />
            </div>
            <div className="space-y-2 flex-shrink-0">
              <div className="flex gap-2">
                <input type="text" placeholder="Type…" value={inputA} onChange={(e) => setInputA(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleTextSubmitA()} className="flex-1 rounded-xl border border-white/20 bg-white/5 px-3 py-2 text-sm" aria-label="User A message" data-voice-field="message-a" />
                <Button size="icon" onClick={handleTextSubmitA} disabled={!inputA.trim()}><Send className="h-4 w-4" /></Button>
              </div>
              <div className="flex flex-wrap gap-1">
                <Button variant={listeningA ? "default" : "secondary"} size="sm" onClick={toggleMicA}>{listeningA ? "Stop" : "Mic"}</Button>
                {signs.slice(0, 8).map((s) => (
                  <Button key={s.id} variant="ghost" size="sm" className="text-xs" onClick={() => setInputA((prev) => (prev ? prev + " " : "") + renderText(meaningFromSign(s)))}>{s.english_gloss}</Button>
                ))}
                <SignDetectionInsert onInsert={(text) => setInputA((prev) => (prev ? prev + " " : "") + text)} label="Detect sign" onError={(msg) => addToast(msg, "error")} />
                {activeConversationId && (
                  <Button variant="secondary" size="sm" className="w-full" onClick={() => { if (inputA.trim()) { sendFromA(meaningFromText(inputA)); setInputA(""); } }}>
                    <MessageCircle className="mr-2 h-4 w-4" /> Send to chat
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card flex flex-col min-h-0">
          <CardHeader className="flex-shrink-0">
            <CardTitle className="text-base flex items-center gap-2"><User className="h-4 w-4 text-brand-cyan" /> User B</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col flex-1 min-h-0 gap-3">
            <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
              {messages.filter((m) => m.from === "A").map((m) => (
                <motion.div key={m.id} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} className="flex justify-end">
                  <div className="max-w-[85%] rounded-2xl px-4 py-2.5 bg-brand-cyan/25 rounded-br-md">
                    <p className="text-sm">{renderText(m.meaning)}</p>
                  </div>
                </motion.div>
              ))}
              <div ref={listEndRef} />
            </div>
            <div className="space-y-2 flex-shrink-0">
              <div className="flex gap-2">
                <input type="text" placeholder="Type…" value={inputB} onChange={(e) => setInputB(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleTextSubmitB()} className="flex-1 rounded-xl border border-white/20 bg-white/5 px-3 py-2 text-sm" aria-label="User B message" data-voice-field="message-b" />
                <Button size="icon" onClick={handleTextSubmitB} disabled={!inputB.trim()}><Send className="h-4 w-4" /></Button>
              </div>
              <div className="flex flex-wrap gap-1">
                <Button variant={listeningB ? "default" : "secondary"} size="sm" onClick={toggleMicB}>{listeningB ? "Stop" : "Mic"}</Button>
                {signs.slice(0, 8).map((s) => (
                  <Button key={s.id} variant="ghost" size="sm" className="text-xs" onClick={() => setInputB((prev) => (prev ? prev + " " : "") + renderText(meaningFromSign(s)))}>{s.english_gloss}</Button>
                ))}
                <SignDetectionInsert onInsert={(text) => setInputB((prev) => (prev ? prev + " " : "") + text)} label="Detect sign" onError={(msg) => addToast(msg, "error")} />
                {activeConversationId && (
                  <Button variant="secondary" size="sm" className="w-full" onClick={() => { if (inputB.trim()) { sendFromB(meaningFromText(inputB)); setInputB(""); } }}>
                    <MessageCircle className="mr-2 h-4 w-4" /> Send to chat
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
