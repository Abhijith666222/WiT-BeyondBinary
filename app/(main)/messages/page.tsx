"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  MessageCircle,
  Send,
  Plus,
  Volume2,
  Hand,
  User,
  Bot,
  ChevronRight,
  Sparkles,
  Loader2,
  Repeat,
} from "lucide-react";
import { BridgeRelayView } from "@/components/bridge-relay-view";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useMessageStore } from "@/lib/message-store";
import { useStore } from "@/lib/store";
import { useToastStore } from "@/lib/toast-store";
import { SignDetectionInsert } from "@/components/sign-detection-insert";
import { speakText, renderText } from "@/lib/mesh/renderers";
import { meaningFromText, meaningFromSign } from "@/lib/mesh/meaning";
import type { SgSLSign } from "@/lib/types";
import sgslSigns from "@/data/sgsl_signs.json";

const signs = sgslSigns as SgSLSign[];

type BridgeTab = "chat" | "relay";

function MessagesContent() {
  const searchParams = useSearchParams();
  const { preferences } = useStore();
  const addToast = useToastStore((s) => s.addToast);
  const [tab, setTab] = useState<BridgeTab>(() => (searchParams.get("view") === "chat" ? "chat" : "relay"));
  const [input, setInput] = useState("");
  const [simulateText, setSimulateText] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const listEndRef = useRef<HTMLDivElement>(null);

  const {
    activeConversationId,
    setActiveConversation,
    getConversations,
    getMessages,
    sendMessage,
    addConversation,
    simulateReply,
    getUnreadTotal,
  } = useMessageStore();

  const conversations = getConversations();
  const messages = activeConversationId ? getMessages(activeConversationId) : [];
  const unreadTotal = getUnreadTotal();

  useEffect(() => {
    listEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text || !activeConversationId) return;
    sendMessage(activeConversationId, { text });
    setInput("");
  }, [input, activeConversationId, sendMessage]);

  const handleSpeak = useCallback(
    (text: string) => {
      speakText(meaningFromText(text), { rate: preferences.ttsRate ?? 1, voicePreset: preferences.ttsVoicePreset });
    },
    [preferences.ttsRate]
  );

  const handleSimulateReply = useCallback(() => {
    const text = simulateText.trim();
    if (!text || !activeConversationId) return;
    simulateReply(activeConversationId, text);
    setSimulateText("");
  }, [simulateText, activeConversationId, simulateReply]);

  const handleAiReply = useCallback(async () => {
    if (!activeConversationId) return;
    const lastFromMe = [...messages].reverse().find((m) => m.sender === "me");
    const lastMessage = lastFromMe?.text?.trim() || input.trim();
    if (!lastMessage) {
      addToast("Send a message first, or type one above", "default");
      return;
    }
    setAiLoading(true);
    try {
      const res = await fetch("/api/ai-reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lastMessage }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        addToast((data as { error?: string }).error || "AI reply failed", "error");
        return;
      }
      const reply = (data as { reply?: string }).reply;
      if (reply) {
        simulateReply(activeConversationId, reply);
        addToast("AI replied", "success");
      }
    } finally {
      setAiLoading(false);
    }
  }, [activeConversationId, messages, input, simulateReply, addToast]);

  if (tab === "relay") {
    return (
      <div className="flex flex-col h-[calc(100vh-4rem)]">
        <div className="flex items-center gap-2 p-4 border-b border-brand-pink/20">
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-brand-rose" strokeWidth={1.5} />
            Bridge
          </h1>
          <div className="flex rounded-full bg-white/60 p-1 border border-brand-pink/20">
            <button
              type="button"
              onClick={() => setTab("chat")}
              className="rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground"
              data-voice-action="tab-chat"
            >
              Chat
            </button>
            <button
              type="button"
              onClick={() => setTab("relay")}
              className="rounded-full px-3 py-1.5 text-sm bg-brand-pink/30 text-brand-rose font-medium"
              data-voice-action="tab-relay"
            >
              Relay
            </button>
          </div>
        </div>
        <BridgeRelayView />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col md:h-[calc(100vh-2rem)] md:flex-row md:overflow-hidden">
      {/* Conversation list */}
      <aside className="w-full border-b border-brand-pink/20 md:w-72 md:border-b-0 md:border-r md:flex-shrink-0 flex flex-col bg-white/40">
        <div className="flex items-center justify-between gap-2 p-4 border-b border-brand-pink/20">
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-brand-rose" strokeWidth={1.5} />
            Bridge
          </h1>
          <div className="flex items-center gap-2">
            <div className="flex rounded-full bg-white/60 p-1 border border-brand-pink/20">
              <button
                type="button"
                onClick={() => setTab("chat")}
                className="rounded-full px-2 py-1 text-xs bg-brand-pink/30 text-brand-rose font-medium"
                data-voice-action="tab-chat"
              >
                Chat
              </button>
              <button
                type="button"
                onClick={() => setTab("relay")}
                className="rounded-md px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
                data-voice-action="tab-relay"
              >
                Relay
              </button>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => addConversation("New chat")}
              aria-label="New conversation"
            >
              <Plus className="h-5 w-5" />
            </Button>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto p-2">
          {conversations.map((c) => {
            const isActive = c.id === activeConversationId;
            const hasUnread = c.unreadCount > 0;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setActiveConversation(c.id)}
                className={`w-full text-left rounded-xl px-3 py-2.5 flex items-center gap-2 transition-colors ${
                  isActive
                    ? "bg-brand-pink/25 text-brand-rose"
                    : "text-[#6B6B6B] hover:bg-brand-pink/15 hover:text-[#2B2B2B]"
                }`}
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{c.title}</p>
                  {c.lastMessagePreview && (
                    <p className="text-xs truncate opacity-80">{c.lastMessagePreview}</p>
                  )}
                </div>
                {hasUnread && (
                  <span className="flex h-2 w-2 rounded-full bg-brand-rose shrink-0" aria-hidden />
                )}
                <ChevronRight className="h-4 w-4 shrink-0 opacity-50" />
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Thread view */}
      <main className="flex-1 flex flex-col min-h-0 bg-background">
        {activeConversationId ? (
          <>
            <div className="flex-1 overflow-y-auto px-4 py-4">
              <AnimatePresence initial={false}>
                {messages.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center justify-center py-16 text-center"
                  >
                    <MessageCircle className="h-14 w-14 text-muted-foreground/50 mb-4" />
                    <p className="text-muted-foreground font-medium">No messages yet</p>
                    <p className="text-sm text-muted-foreground mt-1 max-w-xs">
                      Send from here, or from SignWave / TouchSpeak — everything appears in this thread.
                    </p>
                    <div className="flex gap-2 mt-4">
                      <Link href="/signwave">
                        <Button variant="secondary" size="sm">
                          <Hand className="mr-2 h-4 w-4" /> SignWave
                        </Button>
                      </Link>
                      <Link href="/touchspeak">
                        <Button variant="secondary" size="sm">
                          TouchSpeak
                        </Button>
                      </Link>
                    </div>
                  </motion.div>
                ) : (
                  <div className="space-y-3">
                    {messages.map((m) => (
                      <motion.div
                        key={m.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex ${m.sender === "me" ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${
                            m.sender === "me"
                              ? "bg-brand-cyan/25 text-foreground rounded-br-md"
                              : "bg-white/10 text-foreground rounded-bl-md"
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-0.5">
                            {m.sender === "me" ? (
                              <User className="h-3.5 w-3.5 text-brand-cyan" />
                            ) : (
                              <Bot className="h-3.5 w-3.5 text-muted-foreground" />
                            )}
                            <span className="text-xs opacity-70">
                              {m.sender === "me" ? "You" : "Other"}
                            </span>
                          </div>
                          <p className="text-sm whitespace-pre-wrap break-words">{m.text}</p>
                          {m.signGloss && (
                            <p className="text-xs font-mono text-muted-foreground mt-1">
                              [Sign: {m.signGloss}]
                            </p>
                          )}
                          {m.sender === "other" && (
                            <div className="flex gap-2 mt-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs"
                                onClick={() => handleSpeak(m.text)}
                              >
                                <Volume2 className="mr-1 h-3 w-3" /> Speak
                              </Button>
                              <Link href={`/touchspeak?receive=${encodeURIComponent(m.text)}`}>
                                <Button variant="ghost" size="sm" className="h-7 text-xs">
                                  <Hand className="mr-1 h-3 w-3" /> Receive in TouchSpeak
                                </Button>
                              </Link>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    ))}
                    <div ref={listEndRef} />
                  </div>
                )}
              </AnimatePresence>
            </div>

            {/* Compose + Simulate */}
            <Card className="rounded-t-2xl border-t border-white/10 rounded-b-none border-b-0 bg-brand-navy/50">
              <CardContent className="p-4 space-y-3">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Type a message…"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                    className="flex-1 rounded-xl border border-white/20 bg-white/5 px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-brand-cyan/50 focus:outline-none"
                    aria-label="Message text"
                    data-voice-field="message"
                  />
                  <Button onClick={handleSend} disabled={!input.trim()} size="default" className="shrink-0" aria-label="Send message">
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span className="shrink-0">Insert sign:</span>
                  {signs.slice(0, 10).map((s) => (
                    <Button
                      key={s.id}
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() =>
                        setInput((prev) =>
                          (prev ? prev + " " : "") + renderText(meaningFromSign(s))
                        )
                      }
                    >
                      {s.english_gloss}
                    </Button>
                  ))}
                  <SignDetectionInsert
                    onInsert={(text) => setInput((prev) => (prev ? prev + " " : "") + text)}
                    label="Detect sign"
                    onError={(msg) => addToast(msg, "error")}
                  />
                  <span className="shrink-0">Quick send from:</span>
                  <Link href="/signwave">
                    <Button variant="ghost" size="sm" className="h-7 text-xs">
                      SignWave
                    </Button>
                  </Link>
                  <Link href="/touchspeak">
                    <Button variant="ghost" size="sm" className="h-7 text-xs">
                      TouchSpeak
                    </Button>
                  </Link>
                  <span className="ml-auto flex items-center gap-2 flex-wrap">
                    <Button
                      variant="secondary"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={handleAiReply}
                      disabled={aiLoading}
                    >
                      {aiLoading ? (
                        <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                      ) : (
                        <Sparkles className="h-3.5 w-3.5 mr-1" />
                      )}
                      AI reply
                    </Button>
                    <input
                      type="text"
                      placeholder="Simulate reply…"
                      value={simulateText}
                      onChange={(e) => setSimulateText(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSimulateReply()}
                      className="w-32 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs"
                    />
                    <Button variant="secondary" size="sm" className="h-7 text-xs" onClick={handleSimulateReply}>
                      Simulate reply
                    </Button>
                  </span>
                </div>
              </CardContent>
            </Card>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            Select a conversation or create one.
          </div>
        )}
      </main>
    </div>
  );
}

export default function MessagesPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[200px] text-muted-foreground">Loading…</div>}>
      <MessagesContent />
    </Suspense>
  );
}
