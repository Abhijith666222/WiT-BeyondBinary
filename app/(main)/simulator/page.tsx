"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";
import type { PersonaMode } from "@/lib/types";
import { Eye, Ear, Hand, Users, Type } from "lucide-react";

const personas: { id: PersonaMode; label: string; icon: typeof Eye }[] = [
  { id: "deaf", label: "Deaf user", icon: Eye },
  { id: "blind", label: "Blind user", icon: Ear },
  { id: "deafblind", label: "Deaf-blind", icon: Hand },
  { id: "helper", label: "Helper", icon: Users },
];

const adaptations: Record<PersonaMode, string[]> = {
  deaf: ["Camera-first layout", "Large subtitles", "Sign gloss cards", "Visual alerts"],
  blind: ["Voice-first", "Screen reader friendly", "TTS primary", "No visual-only info"],
  deafblind: ["Haptic-first", "Simplified nav (4 actions)", "Braille patterns", "Minimal text"],
  helper: ["Dual view", "See all modes", "Translate to/from user", "Guided prompts"],
};

export default function SimulatorPage() {
  const { preferences, setPersona, setPreferences } = useStore();
  const [previewPersona, setPreviewPersona] = useState<PersonaMode | null>(null);
  const current = previewPersona ?? preferences.persona;

  return (
    <div className="px-4 py-8 md:px-8">
      <motion.h1
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-2xl font-bold text-foreground"
      >
        Accessibility simulator
      </motion.h1>
      <p className="mt-1 text-muted-foreground">
        Preview baseline vs adapted layout per persona.
      </p>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Current mode</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Persona: <span className="text-foreground font-medium">{preferences.persona}</span>
            </p>
            <p className="text-xs text-muted-foreground">
              Primary output: {preferences.primaryOutput}. Secondary: {preferences.secondaryOutputs?.join(", ")}.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Preview persona</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {personas.map((p) => (
              <div key={p.id} className="flex items-center gap-3">
                <p.icon className="h-5 w-5 text-brand-cyan" />
                <Button
                  variant={previewPersona === p.id ? "default" : "secondary"}
                  size="sm"
                  onClick={() => setPreviewPersona(previewPersona === p.id ? null : p.id)}
                >
                  {p.label}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setPersona(p.id);
                    setPreviewPersona(null);
                  }}
                >
                  Apply
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Applied adaptations ({current})</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
            {adaptations[current].map((a, i) => (
              <li key={i}>{a}</li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground mt-4">
            Baseline = unadapted form. Adapted = wizard, big targets, TTS/haptic according to persona.
          </p>
        </CardContent>
      </Card>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Display &amp; accessibility</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-center gap-3 cursor-pointer text-sm text-muted-foreground hover:text-foreground">
            <Type className="h-5 w-5 text-brand-cyan shrink-0" />
            <input
              type="checkbox"
              checked={preferences.dyslexiaFriendlyFont ?? false}
              onChange={(e) => setPreferences({ dyslexiaFriendlyFont: e.target.checked })}
              className="rounded border-white/20"
            />
            <span>Dyslexia-friendly fonts (OpenDyslexic)</span>
          </label>
          <div>
            <p className="text-xs text-muted-foreground mb-2">Voice style (TTS)</p>
            <div className="flex gap-2">
              {(["neutral", "clear", "soft"] as const).map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setPreferences({ ttsVoicePreset: preset })}
                  className={`rounded-lg px-3 py-2 text-xs font-medium ${
                    (preferences.ttsVoicePreset ?? "neutral") === preset ? "bg-brand-pink/30 text-brand-rose" : "bg-white/10 text-muted-foreground"
                  }`}
                >
                  {preset === "neutral" ? "Neutral" : preset === "clear" ? "Clear" : "Soft"}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Emergency contact (SafetyAssist)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Name</label>
            <input
              type="text"
              placeholder="Contact name"
              value={preferences.emergencyContact?.name ?? ""}
              onChange={(e) =>
                setPreferences({
                  emergencyContact: {
                    ...preferences.emergencyContact,
                    name: e.target.value || undefined,
                  },
                })
              }
              className="w-full rounded-xl border border-white/20 bg-white/5 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-brand-cyan/50 focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Phone</label>
            <input
              type="tel"
              placeholder="Phone number"
              value={preferences.emergencyContact?.phone ?? ""}
              onChange={(e) =>
                setPreferences({
                  emergencyContact: {
                    ...preferences.emergencyContact,
                    phone: e.target.value || undefined,
                  },
                })
              }
              className="w-full rounded-xl border border-white/20 bg-white/5 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-brand-cyan/50 focus:outline-none"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Shown on SafetyAssist. No actual calls are placed in this release.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
