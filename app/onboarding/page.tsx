"use client";

import { useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useStore } from "@/lib/store";
import type { PersonaMode } from "@/lib/types";
import { Ear, Eye, Users, Check, Type, VolumeX, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { VoiceAssistant } from "@/components/voice-assistant";

const personas: {
  id: PersonaMode;
  label: string;
  sub: string;
  icon: typeof Ear;
  voiceHint: string;
}[] = [
  {
    id: "deaf",
    label: "Deaf user",
    sub: "Camera-first, visual focus. All sound will be muted.",
    icon: Eye,
    voiceHint: "Deaf mode selected. All sound is now muted. You will see text and sign output.",
  },
  {
    id: "blind",
    label: "Blind user",
    sub: "Voice-first, verbal feedback on every action.",
    icon: Ear,
    voiceHint: "Blind mode selected. You will receive verbal feedback for every action. The voice assistant will announce pages as you navigate.",
  },
  {
    id: "helper",
    label: "Helper",
    sub: "Hearing/sighted companion to a disabled user.",
    icon: Users,
    voiceHint: "Helper mode selected. Standard interface with full accessibility features.",
  },
];

/** Speak a short announcement (skipped in deaf mode). */
function announce(text: string, persona: PersonaMode) {
  if (persona === "deaf" || persona === "deafblind") return;
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.rate = 1.1;
  u.lang = "en-SG";
  window.speechSynthesis.speak(u);
}

export default function OnboardingPage() {
  const router = useRouter();
  const { preferences, setPersona, setPreferences, setOnboardingComplete } =
    useStore();
  const hasAnnouncedRef = useRef(false);

  const isDeaf =
    preferences.persona === "deaf" || preferences.persona === "deafblind";
  const isBlind = preferences.persona === "blind";

  /* Announce welcome on mount (blind / helper only) */
  useEffect(() => {
    if (hasAnnouncedRef.current) return;
    hasAnnouncedRef.current = true;
    const timer = setTimeout(() => {
      if (preferences.persona !== "deaf" && preferences.persona !== "deafblind") {
        announce(
          "Welcome to SignBridge Universe. Choose your accessibility mode: Deaf, Blind, or Helper. You can also use the voice assistant.",
          preferences.persona
        );
      }
    }, 800);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelect = useCallback(
    (p: PersonaMode) => {
      setPersona(p);
      const hint = personas.find((x) => x.id === p)?.voiceHint;
      if (hint) announce(hint, p);
    },
    [setPersona]
  );

  const handleDyslexiaToggle = useCallback(
    (checked: boolean) => {
      setPreferences({ dyslexiaFriendlyFont: checked });
      announce(
        checked ? "Dyslexia-friendly fonts enabled." : "Dyslexia-friendly fonts disabled.",
        preferences.persona
      );
    },
    [setPreferences, preferences.persona]
  );

  const handleVoicePreset = useCallback(
    (preset: "neutral" | "clear" | "soft") => {
      setPreferences({ ttsVoicePreset: preset });
      announce(`Voice style set to ${preset}.`, preferences.persona);
    },
    [setPreferences, preferences.persona]
  );

  const handleContinue = useCallback(() => {
    setOnboardingComplete(true);
    announce("Entering SignBridge Universe.", preferences.persona);
    setTimeout(() => router.push("/dashboard"), 400);
  }, [setOnboardingComplete, router, preferences.persona]);

  return (
    <div className="min-h-screen gradient-mesh px-4 py-12">
      <VoiceAssistant />
      <div className="mx-auto max-w-2xl">
        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <h1 className="text-3xl font-bold text-[#2A2433] page-title">
            Choose your mode
          </h1>
          <p className="mt-2 text-muted-foreground">
            SignBridge supports Deaf, Blind, Deaf-blind, and Helper users — and
            everyone in between. Your choice shapes the entire experience.
          </p>
        </motion.div>

        {/* Persona cards */}
        <div className="grid gap-6 sm:grid-cols-2">
          {personas.map((p) => {
            const selected = preferences.persona === p.id;
            return (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 24 }}
              >
                <Card
                  className={cn(
                    "cursor-pointer transition-all duration-250 hover:border-brand-rose/40",
                    selected && "ring-2 ring-brand-rose border-brand-rose/50"
                  )}
                  onClick={() => handleSelect(p.id)}
                  data-voice-action={`select-${p.id}`}
                  role="radio"
                  aria-checked={selected}
                  aria-label={p.label}
                >
                  <CardHeader className="flex flex-row items-center gap-3">
                    <div
                      className={cn(
                        "icon-elevated flex h-12 w-12 items-center justify-center rounded-xl",
                        selected
                          ? "bg-brand-pink/40 text-brand-rose"
                          : "bg-brand-pink/15"
                      )}
                    >
                      <p.icon className="h-6 w-6" strokeWidth={1.5} />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-lg">{p.label}</CardTitle>
                      <p className="text-sm text-[#6B6B6B]">{p.sub}</p>
                    </div>
                    {selected && (
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-pink/30">
                        <Check className="h-4 w-4 text-brand-rose" />
                      </div>
                    )}
                  </CardHeader>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Mode-specific banners */}
        <AnimatePresence mode="wait">
          {isDeaf && (
            <motion.div
              key="deaf-banner"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-6 flex items-center gap-3 rounded-2xl bg-gray-100 border border-gray-200 px-4 py-3"
            >
              <VolumeX className="h-5 w-5 text-gray-500 shrink-0" />
              <p className="text-sm text-gray-600">
                <strong>Deaf mode active.</strong> All sound is muted. You will
                see text and sign gloss output.
              </p>
            </motion.div>
          )}
          {isBlind && (
            <motion.div
              key="blind-banner"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-6 flex items-center gap-3 rounded-2xl bg-emerald-50 border border-emerald-200 px-4 py-3"
            >
              <Volume2 className="h-5 w-5 text-emerald-600 shrink-0" />
              <p className="text-sm text-emerald-700">
                <strong>Blind mode active.</strong> You will hear verbal feedback
                for every action and page navigation. The voice assistant is your
                primary interface.
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Accessibility options */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mt-8 rounded-[22px] border border-[rgba(230,180,200,0.35)] bg-[#FAF4F7]/90 backdrop-blur-sm p-4"
          style={{
            boxShadow:
              "0 10px 30px rgba(180,120,150,0.18), 0 2px 8px rgba(200,150,170,0.10)",
          }}
        >
          <p className="text-sm font-medium text-[#2A2433] mb-3">
            Accessibility
          </p>

          {/* Dyslexia toggle */}
          <label
            className="flex items-center gap-3 cursor-pointer text-sm text-[#6B6B6B] hover:text-[#2A2433] min-h-[44px]"
            data-voice-action="toggle-dyslexia"
          >
            <Type
              className="h-5 w-5 text-brand-rose shrink-0"
              strokeWidth={1.5}
            />
            <input
              type="checkbox"
              checked={preferences.dyslexiaFriendlyFont ?? false}
              onChange={(e) => handleDyslexiaToggle(e.target.checked)}
              className="rounded border-brand-pink/40"
            />
            <span>Dyslexia-friendly fonts (OpenDyslexic)</span>
          </label>

          {/* Voice style presets */}
          <div className="mt-3">
            <p className="text-xs font-medium text-[#6B6B6B] mb-2">
              Voice style
            </p>
            <div className="flex gap-2">
              {(["neutral", "clear", "soft"] as const).map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handleVoicePreset(preset)}
                  data-voice-action={`voice-${preset}`}
                  className={`rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                    (preferences.ttsVoicePreset ?? "neutral") === preset
                      ? "bg-brand-pink/30 text-brand-rose"
                      : "bg-white/60 text-[#6B6B6B] hover:bg-brand-pink/15"
                  }`}
                >
                  {preset === "neutral"
                    ? "Neutral"
                    : preset === "clear"
                    ? "Clear"
                    : "Soft"}
                </button>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Continue button */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-10 flex justify-center"
        >
          <Button
            size="lg"
            onClick={handleContinue}
            data-voice-action="continue"
          >
            Continue to Universe Home
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
