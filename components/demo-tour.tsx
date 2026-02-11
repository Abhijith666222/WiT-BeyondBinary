"use client";

import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { useStore } from "@/lib/store";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

type StepId = "onboarding" | "signwave" | "touchspeak" | "contextai" | "learning" | null;

const DemoContext = createContext<{
  step: StepId;
  startTour: (step?: StepId) => void;
  nextStep: () => void;
  endTour: () => void;
} | null>(null);

const TOUR_ORDER: StepId[] = ["onboarding", "signwave", "touchspeak", "contextai", "learning"];

export function DemoTourProvider({ children }: { children: React.ReactNode }) {
  const [step, setStep] = useState<StepId>(null);
  useEffect(() => {
    useStore.persist.rehydrate();
  }, []);
  const startTour = useCallback((s: StepId = "onboarding") => setStep(s), []);
  const nextStep = useCallback(() => {
    const i = TOUR_ORDER.indexOf(step ?? null);
    if (i < TOUR_ORDER.length - 1) setStep(TOUR_ORDER[i + 1]);
    else setStep(null);
  }, [step]);
  const endTour = useCallback(() => setStep(null), []);
  return (
    <DemoContext.Provider value={{ step, startTour, nextStep, endTour }}>
      {children}
      <AnimatePresence>
        {step && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            role="dialog"
            aria-label="Demo tour"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              className="glass-card max-w-md p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-medium text-brand-cyan">Demo Tour</span>
                <button
                  onClick={endTour}
                  className="rounded-lg p-1 hover:bg-white/10"
                  aria-label="Close tour"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                {step === "onboarding" && "Choose your persona and preferences to adapt the whole experience."}
                {step === "signwave" && "Try the sign picker and see live translation to text, speech, and haptic."}
                {step === "touchspeak" && "Use the braille cell to send and receive haptic patterns."}
                {step === "contextai" && "Run scenario assists (shopping, hawker, MRT) with OCR scan."}
                {step === "learning" && "Classroom mode and Sign Quest mini-game."}
              </p>
              <div className="flex gap-2">
                <Button onClick={endTour} variant="secondary" size="sm">Skip</Button>
                <Button onClick={nextStep} size="sm">Next</Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </DemoContext.Provider>
  );
}

export function useDemoTour() {
  return useContext(DemoContext);
}
