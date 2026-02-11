"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Train, Volume2, Zap } from "lucide-react";
import { useStore } from "@/lib/store";
import { useToastStore } from "@/lib/toast-store";
import { meaningFromText } from "@/lib/mesh/meaning";
import { speakText, triggerVibration, playHapticFallback } from "@/lib/mesh/renderers";

const MOCK_ARRIVALS = [
  { line: "NS", dest: "Jurong East", min: 2 },
  { line: "NS", dest: "Marina South Pier", min: 5 },
  { line: "EW", dest: "Pasir Ris", min: 3 },
  { line: "EW", dest: "Tuas Link", min: 7 },
];

export default function MRTAssistPage() {
  const { preferences } = useStore();
  const addToast = useToastStore((s) => s.addToast);
  const [selected, setSelected] = useState<number | null>(null);

  const speak = (text: string) => {
    const meaning = meaningFromText(text);
    speakText(meaning, { rate: preferences.ttsRate ?? 1, voicePreset: preferences.ttsVoicePreset });
    addToast(text, "success");
  };

  const hapticCue = (direction: "left" | "right") => {
    const pattern = direction === "left" ? [50, 30, 50] : [30, 50, 30];
    if (!triggerVibration(pattern)) playHapticFallback();
    addToast(`Turn ${direction}`, "default");
  };

  return (
    <div className="px-4 py-8 md:px-8">
      <motion.h1
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-2xl font-bold text-foreground"
      >
        MRT assist
      </motion.h1>
      <p className="mt-1 text-muted-foreground">
        Train arrivals + haptic turn cues.
      </p>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Train className="h-5 w-5 text-brand-cyan" /> Next trains
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {MOCK_ARRIVALS.map((a, i) => (
                <motion.li
                  key={i}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center justify-between rounded-xl bg-white/10 px-3 py-2"
                >
                  <span className="font-mono text-foreground">
                    {a.line} — {a.dest} — {a.min} min
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => speak(`${a.line} to ${a.dest} in ${a.min} minutes`)}
                    aria-label={`Read arrival ${a.line} ${a.dest}`}
                  >
                    <Volume2 className="h-4 w-4" />
                  </Button>
                </motion.li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-brand-cyan" /> Haptic turn cues
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Simulate navigation: feel left/right turn (vibrate on mobile).
            </p>
            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => hapticCue("left")} data-voice-action="turn-left">
                Turn left
              </Button>
              <Button variant="secondary" onClick={() => hapticCue("right")} data-voice-action="turn-right">
                Turn right
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
