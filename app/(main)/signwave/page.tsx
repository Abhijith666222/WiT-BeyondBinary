"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Type, Waves, Volume2, Hand, Zap, Search, Video, VideoOff, Send, MessageCircle, Scan, Loader2 } from "lucide-react";
import Link from "next/link";
import { useMessageStore } from "@/lib/message-store";
import { SignHandShape } from "@/components/sign-hand-shape";
import { useStore } from "@/lib/store";
import { useToastStore } from "@/lib/toast-store";
import type { Meaning } from "@/lib/types";
import type { SgSLSign } from "@/lib/types";
import { meaningFromSign, meaningFromSpeech } from "@/lib/mesh/meaning";
import {
  renderText,
  speakText,
  renderSignGloss,
  getHapticPattern,
  triggerVibration,
  isVibrationSupported,
  playHapticFallback,
} from "@/lib/mesh/renderers";
import { detectSignFromVideo } from "@/lib/sign-detection";
import sgslSigns from "@/data/sgsl_signs.json";
import quickPhrases from "@/data/quick_phrases.json";
import lettersData from "@/data/letters.json";
import bslSigns from "@/data/bsl_signs.json";

const signs = sgslSigns as SgSLSign[];
const phrases = quickPhrases as { id: string; text: string; gloss: string }[];
const letters = lettersData as { id: string; letter: string }[];
const bsl = bslSigns as SgSLSign[];

type SignTab = "letters" | "asl" | "bsl";

/** Map ASL word labels (Roboflow ASL Dataset) to SgSL gloss for matching */
const ASL_WORD_TO_SGSL: Record<string, string> = {
  "thank-you": "THANK",
  "thank you": "THANK",
  yes: "YES",
  no: "NO",
  help: "HELP",
  sorry: "SORRY",
  good: "GOOD",
  want: "WANT",
  can: "CAN",
  have: "HAVE",
  how: "HOW-MUCH",
  my: "MY",
  your: "YOUR",
  you: "YOU",
  like: "LIKE",
  love: "LOVE",
  get: "GET",
  apple: "FOOD",
};

/** Web Speech API (not in default TS DOM lib) */
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

export default function SignWavePage() {
  const { preferences } = useStore();
  const addToast = useToastStore((s) => s.addToast);
  const activeConversationId = useMessageStore((s) => s.activeConversationId);
  const sendMessage = useMessageStore((s) => s.sendMessage);
  const [search, setSearch] = useState("");
  const [currentMeaning, setCurrentMeaning] = useState<Meaning | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [hapticPlaying, setHapticPlaying] = useState(false);
  const [vibrationSupported, setVibrationSupported] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [liveDetectionOn, setLiveDetectionOn] = useState(true);
  const [activeTab, setActiveTab] = useState<SignTab>("asl");
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const liveDetectionIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const detectingRef = useRef(false);
  detectingRef.current = isDetecting;

  useEffect(() => {
    setVibrationSupported(isVibrationSupported());
  }, []);

  const toggleCamera = useCallback(() => {
    if (cameraOn && streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      if (videoRef.current) videoRef.current.srcObject = null;
      setCameraOn(false);
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      addToast("Camera not supported in this browser", "error");
      return;
    }
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "user", width: 640, height: 480 }, audio: false })
      .then((stream) => {
        streamRef.current = stream;
        setCameraOn(true);
        addToast("Camera on — show your hands, then tap the sign you made below", "default");
      })
      .catch((err) => {
        addToast("Camera access denied or unavailable", "error");
        console.warn("getUserMedia error:", err);
      });
  }, [cameraOn, addToast]);

  // Once camera is on and we have a stream, attach to video (video element is always mounted so ref is set after this state update)
  useEffect(() => {
    if (!cameraOn || !streamRef.current || !videoRef.current) return;
    videoRef.current.srcObject = streamRef.current;
    videoRef.current.play().catch(() => {});
  }, [cameraOn]);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, []);

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
        setTranscript(result[0].transcript);
      };
    }
    return () => {
      if (recognitionRef.current?.abort) recognitionRef.current.abort();
    };
  }, []);

  const filteredSigns = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return signs.slice(0, 24);
    return signs.filter(
      (s) =>
        s.english_gloss.toLowerCase().includes(q) ||
        s.sg_context_tags.some((t) => t.toLowerCase().includes(q))
    ).slice(0, 24);
  }, [search]);

  const filteredLetters = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return letters;
    return letters.filter((l) => l.letter.toLowerCase().includes(q));
  }, [search]);

  const filteredBsl = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return bsl;
    return bsl.filter(
      (s) =>
        s.english_gloss.toLowerCase().includes(q) ||
        s.sg_context_tags.some((t) => t.toLowerCase().includes(q))
    );
  }, [search]);

  const filteredPhrases = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return phrases.slice(0, 8);
    return phrases.filter(
      (p) => p.text.toLowerCase().includes(q) || p.gloss.toLowerCase().includes(q)
    ).slice(0, 8);
  }, [search]);

  const applyMeaning = useCallback(
    (meaning: Meaning) => {
      setCurrentMeaning(meaning);
      const text = renderText(meaning);
      if (text) addToast(`Translated: ${text}`, "success");

      const rate = preferences.ttsRate ?? 1;
      speakText(meaning, { rate, voicePreset: preferences.ttsVoicePreset });

      const pattern = getHapticPattern(meaning);
      if (triggerVibration(pattern)) {
        setHapticPlaying(true);
        setTimeout(() => setHapticPlaying(false), pattern.reduce((a, b) => a + b, 0) + 50);
      } else {
        playHapticFallback();
        setHapticPlaying(true);
        setTimeout(() => setHapticPlaying(false), 200);
      }
    },
    [preferences.ttsRate, addToast]
  );

  const onSelectSign = useCallback(
    (sign: SgSLSign) => {
      applyMeaning(meaningFromSign(sign));
    },
    [applyMeaning]
  );

  const onSelectPhrase = useCallback(
    (p: { text: string; gloss: string }) => {
      const meaning = meaningFromSpeech(p.text);
      meaning.entities.sign = p.gloss;
      applyMeaning(meaning);
    },
    [applyMeaning]
  );

  const onSelectLetter = useCallback(
    (letter: string) => {
      const meaning = meaningFromSpeech(letter);
      meaning.entities.sign = letter;
      applyMeaning(meaning);
    },
    [applyMeaning]
  );

  const toggleMic = useCallback(() => {
    const rec = recognitionRef.current;
    if (!rec) {
      addToast("Speech recognition not supported in this browser", "error");
      return;
    }
    if (isListening) {
      rec.stop();
      setIsListening(false);
      if (transcript.trim()) {
        const meaning = meaningFromSpeech(transcript);
        applyMeaning(meaning);
      }
      return;
    }
    setTranscript("");
    rec.start();
    setIsListening(true);
  }, [isListening, transcript, applyMeaning, addToast]);

  /** Map API class (e.g. "hello", "how much") to SgSL sign or create meaning from text */
  const runSignDetection = useCallback(async () => {
    if (detectingRef.current) return;
    const video = videoRef.current;
    if (!video || !cameraOn || video.readyState < 2) {
      if (!cameraOn) addToast("Camera not ready. Start the camera first.", "error");
      return;
    }
    setIsDetecting(true);
    try {
      const result = await detectSignFromVideo(video);
      if (!result.detectedSign) {
        addToast("No sign detected. Try again with your hand clearly in frame.", "default");
        setIsDetecting(false);
        return;
      }
      const label = result.detectedSign.trim();
      // Auto-switch tab based on detected sign type: single letter → Letters, word → ASL
      if (/^[a-zA-Z]$/.test(label)) setActiveTab("letters");
      else setActiveTab("asl");

      const normalizedGloss = label.toUpperCase().replace(/\s+/g, "-");
      const glossForMatch = ASL_WORD_TO_SGSL[label.toLowerCase().replace(/-/g, " ")] ?? normalizedGloss;
      const matchedSign = signs.find(
        (s) =>
          s.english_gloss === glossForMatch ||
          s.english_gloss === normalizedGloss ||
          s.english_gloss.replace(/-/g, " ") === label.toUpperCase()
      );
      if (matchedSign) {
        applyMeaning(meaningFromSign(matchedSign));
      } else {
        const meaning = meaningFromSpeech(label);
        meaning.entities.sign = label;
        applyMeaning(meaning);
      }
      addToast(`Detected: ${label}${result.confidence ? ` (${Math.round(result.confidence * 100)}%)` : ""}`, "success");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      addToast(msg.includes("not configured") ? "Set ROBOFLOW_API_KEY in .env.local to enable sign detection." : msg, "error");
    } finally {
      setIsDetecting(false);
    }
  }, [cameraOn, addToast, applyMeaning]);

  // Live detection: run every 2s when camera + live detection on
  useEffect(() => {
    if (!cameraOn || !liveDetectionOn) {
      if (liveDetectionIntervalRef.current) {
        clearInterval(liveDetectionIntervalRef.current);
        liveDetectionIntervalRef.current = null;
      }
      return;
    }
    const id = setInterval(() => runSignDetection(), 2000);
    liveDetectionIntervalRef.current = id;
    return () => {
      if (liveDetectionIntervalRef.current) clearInterval(liveDetectionIntervalRef.current);
      liveDetectionIntervalRef.current = null;
    };
  }, [cameraOn, liveDetectionOn, runSignDetection]);

  return (
    <div className="px-4 py-8 md:px-8">
      <motion.h1
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-2xl font-bold text-foreground"
      >
        SignWave
      </motion.h1>
      <p className="mt-1 text-muted-foreground">
        Live translation: Sign ↔ Speech ↔ Text ↔ Haptic
      </p>

      {/* Camera + Hand sign */}
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Video className="h-4 w-4 text-brand-cyan" /> Your camera
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Turn on the camera, then use &quot;Detect sign now&quot; or live detection. Detected letters switch to Letters tab; words switch to ASL tab.
            </p>
          </CardHeader>
          <CardContent>
            <div className="aspect-video rounded-xl bg-black border border-white/10 overflow-hidden relative">
              <video
                ref={videoRef}
                playsInline
                muted
                autoPlay
                className="w-full h-full object-cover"
                style={{ transform: "scaleX(-1)" }}
                aria-label="Camera preview for signing"
              />
              {!cameraOn && (
                <div className="absolute inset-0 flex items-center justify-center bg-brand-navy/95 text-muted-foreground text-sm p-4">
                  Camera off. Click Start camera below to see yourself and practice signs.
                </div>
              )}
            </div>
            <Button
              variant={cameraOn ? "secondary" : "default"}
              size="sm"
              className="mt-3 w-full"
              onClick={toggleCamera}
              data-voice-action={cameraOn ? "stop-camera" : "start-camera"}
            >
              {cameraOn ? <VideoOff className="mr-2 h-4 w-4" /> : <Video className="mr-2 h-4 w-4" />}
              {cameraOn ? "Stop camera" : "Start camera"}
            </Button>
            {cameraOn && (
              <div className="mt-3 space-y-2">
                <Button
                  variant="default"
                  size="sm"
                  className="w-full bg-brand-cyan hover:bg-brand-cyan/90"
                  onClick={() => runSignDetection()}
                  data-voice-action="detect-sign"
                  disabled={isDetecting}
                >
                  {isDetecting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Scan className="mr-2 h-4 w-4" />
                  )}
                  {isDetecting ? "Detecting…" : "Detect sign now"}
                </Button>
                <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={liveDetectionOn}
                    onChange={(e) => setLiveDetectionOn(e.target.checked)}
                    className="rounded border-white/20"
                  />
                  Live detection (every 2s)
                </label>
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Hand className="h-4 w-4 text-brand-cyan" /> Hand sign
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Show your sign in the camera, then tap the sign you made below to get translation (text + speech + haptic). Or use the mic to speak.
            </p>
          </CardHeader>
          <CardContent>
            {currentMeaning ? (
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex flex-col items-center justify-center py-6"
              >
                <div className="mb-4">
                  <SignHandShape gloss={renderSignGloss(currentMeaning)} size={56} />
                </div>
                <p className="text-2xl font-mono font-bold text-foreground">
                  {renderSignGloss(currentMeaning)}
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Practice this sign in your camera view
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Tap &quot;Haptic ready&quot; to feel the pattern; tap &quot;Speak again&quot; to hear it.
                </p>
              </motion.div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground text-sm">
                <Hand className="h-12 w-12 mb-3 opacity-50" />
                <p>Select a sign or phrase from the list, or use the mic.</p>
                <p className="mt-2 text-xs">The sign gloss and hand cue will appear here.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        {/* Input: Sign picker + Mic */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Waves className="h-5 w-5 text-brand-cyan" /> Input
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Tap the sign you made (or a phrase) to translate it. Mic = speak to translate.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-1 p-0.5 rounded-lg bg-white/5 border border-white/10">
              {(["letters", "asl", "bsl"] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-1.5 px-2 rounded-md text-xs font-medium transition-colors ${
                    activeTab === tab
                      ? "bg-brand-cyan text-brand-navy"
                      : "text-muted-foreground hover:text-foreground hover:bg-white/10"
                  }`}
                  aria-pressed={activeTab === tab}
                  aria-label={`${tab === "letters" ? "Letters" : tab === "asl" ? "ASL" : "BSL"} tab`}
                >
                  {tab === "letters" ? "Letters" : tab === "asl" ? "ASL" : "BSL"}
                </button>
              ))}
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder={activeTab === "letters" ? "Search letters..." : "Search signs..."}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-white/20 bg-white/5 py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-brand-cyan/50 focus:outline-none"
                aria-label="Search signs"
              />
            </div>
            {activeTab === "letters" && (
              <div>
                <p className="mb-2 text-xs font-medium text-muted-foreground">Fingerspelling A–Z</p>
                <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
                  {filteredLetters.map((l) => (
                    <Button
                      key={l.id}
                      variant="ghost"
                      size="sm"
                      onClick={() => onSelectLetter(l.letter)}
                      className="text-xs font-mono min-w-[2rem]"
                    >
                      {l.letter}
                    </Button>
                  ))}
                </div>
              </div>
            )}
            {activeTab === "asl" && (
              <>
                <div>
                  <p className="mb-2 text-xs font-medium text-muted-foreground">Quick phrases</p>
                  <div className="flex flex-wrap gap-2">
                    {filteredPhrases.map((p) => (
                      <Button
                        key={p.id}
                        variant="secondary"
                        size="sm"
                        onClick={() => onSelectPhrase(p)}
                        className="text-xs"
                      >
                        {p.text}
                      </Button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="mb-2 text-xs font-medium text-muted-foreground">ASL / SgSL signs</p>
                  <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
                    {filteredSigns.map((s) => (
                      <Button
                        key={s.id}
                        variant="ghost"
                        size="sm"
                        onClick={() => onSelectSign(s)}
                        className="text-xs font-mono"
                      >
                        {s.english_gloss}
                      </Button>
                    ))}
                  </div>
                </div>
              </>
            )}
            {activeTab === "bsl" && (
              <div>
                <p className="mb-2 text-xs font-medium text-muted-foreground">BSL signs</p>
                <p className="text-xs text-muted-foreground mb-2">
                  British Sign Language. Camera detection uses ASL model — tap to translate.
                </p>
                <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
                  {filteredBsl.map((s) => (
                    <Button
                      key={s.id}
                      variant="ghost"
                      size="sm"
                      onClick={() => onSelectSign(s)}
                      className="text-xs font-mono"
                    >
                      {s.english_gloss}
                    </Button>
                  ))}
                </div>
              </div>
            )}
            <Button
              variant={isListening ? "default" : "secondary"}
              size="sm"
              onClick={toggleMic}
              className="w-full"
            >
              {isListening ? (
                <>
                  <MicOff className="mr-2 h-4 w-4" /> Stop mic
                </>
              ) : (
                <>
                  <Mic className="mr-2 h-4 w-4" /> Start mic
                </>
              )}
            </Button>
            {transcript ? (
              <p className="text-sm text-muted-foreground truncate" title={transcript}>
                Heard: {transcript}
              </p>
            ) : null}
          </CardContent>
        </Card>

        {/* Output: Text, Speech, Sign gloss, Haptic */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Type className="h-5 w-5 text-brand-cyan" /> Output
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <AnimatePresence mode="wait">
              {currentMeaning ? (
                <motion.div
                  key="output"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="space-y-4"
                >
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Text / Subtitles</p>
                    <p className="text-lg text-foreground font-medium">
                      {renderText(currentMeaning)}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => speakText(currentMeaning, { rate: preferences.ttsRate ?? 1, voicePreset: preferences.ttsVoicePreset })}
                    >
                      <Volume2 className="mr-2 h-4 w-4" /> Speak again
                    </Button>
                    <button
                      type="button"
                      onClick={() => speakText(currentMeaning, { rate: preferences.ttsRate ?? 1, voicePreset: preferences.ttsVoicePreset })}
                      className="flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 hover:bg-white/20 transition-colors text-left"
                      aria-label={`Speak sign gloss: ${renderSignGloss(currentMeaning)}`}
                    >
                      <Hand className="h-4 w-4 text-brand-cyan shrink-0" />
                      <span className="text-sm font-mono">Gloss: {renderSignGloss(currentMeaning)}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const pattern = getHapticPattern(currentMeaning);
                        if (triggerVibration(pattern)) {
                          setHapticPlaying(true);
                          setTimeout(() => setHapticPlaying(false), pattern.reduce((a, b) => a + b, 0) + 50);
                        } else {
                          playHapticFallback();
                          setHapticPlaying(true);
                          setTimeout(() => setHapticPlaying(false), 200);
                        }
                      }}
                      className={`flex items-center gap-2 rounded-xl px-3 py-2 transition-colors text-left ${
                        hapticPlaying ? "bg-brand-cyan/20" : "bg-white/10 hover:bg-white/20"
                      }`}
                      aria-label="Play haptic pattern again"
                    >
                      <Zap className="h-4 w-4 text-brand-cyan shrink-0" />
                      <span className="text-sm">{hapticPlaying ? "Haptic playing…" : "Haptic ready"}</span>
                    </button>
                    {activeConversationId && (
                      <Button
                        variant="default"
                        size="sm"
                        className="bg-brand-cyan hover:bg-brand-cyan/90"
                        onClick={() => {
                          const text = renderText(currentMeaning);
                          const signGloss = renderSignGloss(currentMeaning);
                          sendMessage(activeConversationId, { text, signGloss });
                          addToast("Sent to Bridge", "success");
                        }}
                      >
                        <Send className="mr-2 h-4 w-4" /> Send to Bridge
                      </Button>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {vibrationSupported
                        ? "Device vibration supported (Chrome on Android)."
                        : "Simulated here (short tone). For real vibration use Chrome on an Android phone."}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      <Link href="/messages" className="text-brand-cyan hover:underline inline-flex items-center gap-1">
                        <MessageCircle className="h-3.5 w-3.5" /> Open Bridge
                      </Link>
                      {" "}to see the thread and get replies.
                    </p>
                  </div>
                </motion.div>
              ) : (
                <motion.p
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-muted-foreground text-sm"
                >
                  Pick a sign or phrase, or use the mic. Output will appear here.
                </motion.p>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
