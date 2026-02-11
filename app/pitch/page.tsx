"use client";

import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function PitchPage() {
  return (
    <div className="px-4 py-8 md:px-8 max-w-2xl mx-auto">
      <motion.h1
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-2xl font-bold text-foreground"
      >
        90-second pitch
      </motion.h1>
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Problem</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <p>Deaf, blind, and deaf-blind users face barriers in daily communication, transit, and services. Singapore has SgSL and a diverse population; no single app bridges sign, speech, text, and haptics in one ecosystem.</p>
        </CardContent>
      </Card>
      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Solution</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <p>SignBridge Universe: one adaptive mesh. Input: sign (picker/camera), speech, text. Output: subtitles, TTS, sign gloss, haptic. Persona modes (Deaf / Blind / Deaf-blind / Helper) reshape the UI. ContextAI for daily assist; Learning Bridge for SgSL. Singapore-first.</p>
        </CardContent>
      </Card>
    </div>
  );
}
