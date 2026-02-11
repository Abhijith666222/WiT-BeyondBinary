"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, Gamepad2, Mic, MicOff, Baby } from "lucide-react";
import { useStore } from "@/lib/store";
import { meaningFromSpeech, meaningFromSign } from "@/lib/mesh/meaning";
import { renderText, renderSignGloss, speakText } from "@/lib/mesh/renderers";
import sgslSigns from "@/data/sgsl_signs.json";
import sgslImages from "@/data/sgsl_images.json";
import type { SgSLSign } from "@/lib/types";

const signs = sgslSigns as SgSLSign[];

interface SgSLImageSign {
  id: string;
  english_gloss: string;
  text: string;
  image: string;
}
const sgslImageSigns = sgslImages as SgSLImageSign[];

/** Extra wrong-answer options for Sign Quest (caregiving/baby-adjacent words) */
const SIGN_QUEST_DISTRACTORS = [
  "More", "Eat", "Help", "Thank you", "Water", "Food", "Yes", "No", "Hot", "Cold",
  "Mom", "Dad", "Done", "Again", "Up", "Down", "Open", "Close", "Stop", "Go",
  "Wait", "Come", "Want", "Need", "Happy", "Sad", "Tired", "Hungry", "Thirsty",
];

/** Web Speech API types (not in default TS DOM lib) */
interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}
interface SpeechRecognitionResult {
  length: number;
  item(index: number): SpeechRecognitionResultItem;
  [index: number]: SpeechRecognitionResultItem;
  isFinal: boolean;
}
interface SpeechRecognitionResultItem {
  transcript: string;
  confidence: number;
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

export default function LearningPage() {
  const [mode, setMode] = useState<"menu" | "classroom" | "quest" | "baby">("menu");
  return (
    <div className="px-4 py-8 md:px-8">
      <motion.h1
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-2xl font-bold text-foreground"
      >
        Learning Bridge
      </motion.h1>
      <p className="mt-1 text-muted-foreground">
        Classroom mode + Sign Quest.
      </p>

      <AnimatePresence mode="wait">
        {mode === "menu" && (
          <motion.div
            key="menu"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="mt-8 grid gap-6 md:grid-cols-2"
          >
            <Card
              className="cursor-pointer transition-all hover:border-brand-cyan/30"
              onClick={() => setMode("classroom")}
              data-voice-action="enter-classroom"
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-brand-cyan" /> Classroom mode
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Teacher speaks → subtitles + sign gloss. Student signs → TTS.
                </p>
                <Button variant="secondary" size="sm">Enter classroom</Button>
              </CardContent>
            </Card>
            <Card
              className="cursor-pointer transition-all hover:border-brand-cyan/30"
              onClick={() => setMode("quest")}
              data-voice-action="start-quiz"
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gamepad2 className="h-5 w-5 text-brand-cyan" /> Sign Quest
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  See a sign image and guess the word. Score and streak.
                </p>
                <Button variant="secondary" size="sm" className="mt-4">Play</Button>
              </CardContent>
            </Card>
            <Card
              className="cursor-pointer transition-all hover:border-brand-pink/30"
              onClick={() => setMode("baby")}
              data-voice-action="baby-signs"
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Baby className="h-5 w-5 text-brand-rose" /> Baby Signs
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Milk, sleep, please, good, bad. Tap a word to see the SgSL sign image.
                </p>
                <Button variant="secondary" size="sm" className="mt-4">Learn baby signs</Button>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {mode === "classroom" && (
          <ClassroomView onBack={() => setMode("menu")} />
        )}

        {mode === "quest" && (
          <SignQuestView onBack={() => setMode("menu")} />
        )}

        {mode === "baby" && (
          <BabySignsView onBack={() => setMode("menu")} />
        )}
      </AnimatePresence>
    </div>
  );
}

function ClassroomView({ onBack }: { onBack: () => void }) {
  const { preferences } = useStore();
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [lastMeaning, setLastMeaning] = useState<{ text: string; gloss: string } | null>(null);
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const ttsRate = preferences.ttsRate ?? 1;

  useEffect(() => {
    if (typeof window === "undefined") return;
    const Win = window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognitionLike; SpeechRecognition?: new () => SpeechRecognitionLike };
    const SR = Win.webkitSpeechRecognition || Win.SpeechRecognition;
    if (SR) {
      recRef.current = new SR();
      recRef.current.continuous = true;
      recRef.current.interimResults = true;
      recRef.current.lang = "en-SG";
      recRef.current.onresult = (e: SpeechRecognitionEventLike) => {
        const last = e.results.length - 1;
        setTranscript(e.results[last][0].transcript);
      };
    }
    return () => { recRef.current?.abort?.(); };
  }, []);

  const toggleMic = () => {
    const rec = recRef.current;
    if (!rec) return;
    if (isListening) {
      rec.stop();
      setIsListening(false);
      if (transcript.trim()) {
        const m = meaningFromSpeech(transcript);
        setLastMeaning({
          text: renderText(m),
          gloss: renderSignGloss(m),
        });
      }
    } else {
      setTranscript("");
      rec.start();
      setIsListening(true);
    }
  };

  return (
    <motion.div
      key="classroom"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="mt-8 space-y-6"
    >
      <Button variant="ghost" size="sm" onClick={onBack}>← Back</Button>
      <Card>
        <CardHeader>
          <CardTitle>Teacher: speak → subtitles + sign gloss</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            variant={isListening ? "default" : "secondary"}
            size="sm"
            onClick={toggleMic}
          >
            {isListening ? <MicOff className="mr-2 h-4 w-4" /> : <Mic className="mr-2 h-4 w-4" />}
            {isListening ? "Stop" : "Start"} mic
          </Button>
          {transcript ? <p className="text-foreground">Heard: {transcript}</p> : null}
          {lastMeaning && (
            <div className="rounded-xl bg-white/10 p-4 space-y-2">
              <p className="text-lg text-foreground">{lastMeaning.text}</p>
              <p className="text-sm font-mono text-brand-cyan">Gloss: {lastMeaning.gloss}</p>
            </div>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Student: pick sign → TTS</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">
            Tap a sign to speak it aloud (teacher hears TTS).
          </p>
          <div className="flex flex-wrap gap-2">
            {signs.slice(0, 14).map((s) => (
              <Button
                key={s.id}
                variant="secondary"
                size="sm"
                onClick={() => speakText(meaningFromSign(s), { rate: ttsRate, voicePreset: preferences.ttsVoicePreset })}
              >
                {s.english_gloss}
              </Button>
            ))}
          </div>
          <Link href="/signwave" className="inline-block mt-3 text-sm text-brand-cyan hover:underline">
            Open full SignWave picker →
          </Link>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function BabySignsView({ onBack }: { onBack: () => void }) {
  const { preferences } = useStore();
  const [selected, setSelected] = useState<SgSLImageSign | null>(null);
  const ttsRate = preferences.ttsRate ?? 1;

  const handleSelect = (s: SgSLImageSign) => {
    setSelected(s);
    speakText(meaningFromSpeech(s.text), { rate: ttsRate, voicePreset: preferences.ttsVoicePreset });
  };

  return (
    <motion.div
      key="baby"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="mt-8 space-y-6"
    >
      <Button variant="ghost" size="sm" onClick={onBack}>← Back</Button>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Baby className="h-5 w-5 text-brand-rose" /> Baby Signs
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Tap a word to see the SgSL sign image and hear it spoken.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {sgslImageSigns.map((s) => (
              <Button
                key={s.id}
                variant={selected?.id === s.id ? "default" : "secondary"}
                size="sm"
                className="h-auto py-2 px-3"
                onClick={() => handleSelect(s)}
              >
                {s.text}
              </Button>
            ))}
          </div>
          {selected && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-xl bg-white/5 p-4 flex flex-col items-center gap-2"
            >
              <p className="font-mono font-bold text-foreground">{selected.english_gloss}</p>
              <div className="relative w-48 h-48 rounded-lg overflow-hidden border border-white/10">
                <Image
                  src={selected.image}
                  alt={`SgSL sign for ${selected.text}`}
                  fill
                  className="object-contain"
                  sizes="192px"
                />
              </div>
            </motion.div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

function SignQuestView({ onBack }: { onBack: () => void }) {
  const [step, setStep] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [results, setResults] = useState<{ sign: SgSLImageSign; userAnswer: string; correct: boolean }[]>([]);
  const quizSigns = [...sgslImageSigns];
  const current = quizSigns[step];
  const correctText = current?.text ?? "";
  const otherQuizWords = sgslImageSigns.filter((s) => s.text !== correctText).map((s) => s.text);
  const distractorPool = [...new Set([...otherQuizWords, ...SIGN_QUEST_DISTRACTORS])]
    .filter((w) => w !== correctText)
    .sort(() => Math.random() - 0.5)
    .slice(0, 3);
  const options = current
    ? [current.text, ...distractorPool].sort(() => Math.random() - 0.5)
    : [];

  const choose = (text: string) => {
    if (answered || !current) return;
    setAnswered(true);
    const correct = text === current.text;
    setResults((r) => [...r, { sign: current, userAnswer: text, correct }]);
    if (correct) {
      setScore((s) => s + 1);
      setStreak((s) => s + 1);
    } else setStreak(0);
  };

  const next = () => {
    setAnswered(false);
    if (step + 1 >= quizSigns.length) setStep(-1);
    else setStep((s) => s + 1);
  };

  const reset = () => {
    setStep(0);
    setScore(0);
    setStreak(0);
    setAnswered(false);
    setResults([]);
  };

  if (!current) {
    return (
      <motion.div
        key="quest-done"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="mt-8 space-y-6"
      >
        <Button variant="ghost" size="sm" onClick={onBack}>← Back</Button>
        <Card>
          <CardContent className="pt-6 space-y-4">
            <p className="text-xl font-bold text-foreground">Quiz complete!</p>
            <p className="text-muted-foreground">
              Score: {score} / {quizSigns.length}. Streak: {streak}.
            </p>
            <div className="space-y-2 pt-2 border-t border-white/10">
              <p className="text-sm font-medium text-foreground">What you got right and wrong:</p>
              {results.map((r, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-2 text-sm py-1.5 px-2 rounded-lg ${
                    r.correct ? "bg-green-500/20 text-green-200" : "bg-red-500/20 text-red-200"
                  }`}
                >
                  <span className="font-mono font-medium">{r.sign.text}</span>
                  {r.correct ? (
                    <span>✓ Correct</span>
                  ) : (
                    <span>✗ You said &quot;{r.userAnswer}&quot; — correct was &quot;{r.sign.text}&quot;</span>
                  )}
                </div>
              ))}
            </div>
            <Button variant="default" className="mt-4" onClick={reset}>
              Play again
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div
      key="quest"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="mt-8 space-y-6"
    >
      <Button variant="ghost" size="sm" onClick={onBack}>← Back</Button>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gamepad2 className="h-5 w-5 text-brand-cyan" /> Sign Quest
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Question {step + 1} of {quizSigns.length} · Score: {score} · Streak: {streak}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-lg text-foreground">
            What word does this SgSL sign mean?
          </p>
          <div className="relative w-full max-w-xs h-48 mx-auto rounded-xl overflow-hidden bg-white/5 border border-white/10">
            <Image
              src={current.image}
              alt="SgSL sign — guess the word"
              fill
              className="object-contain"
              sizes="(max-width: 384px) 100vw, 384px"
            />
          </div>
          <p className="text-xs text-muted-foreground mt-2">Choose the correct word:</p>
          <div className="flex flex-wrap gap-2">
            {options.map((opt) => (
              <Button
                key={opt}
                variant="secondary"
                size="sm"
                onClick={() => choose(opt)}
                disabled={answered}
              >
                {opt}
              </Button>
            ))}
          </div>
          {answered && (
            <Button variant="default" size="sm" onClick={next}>
              Next
            </Button>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
