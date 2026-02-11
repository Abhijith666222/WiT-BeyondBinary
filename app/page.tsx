"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Waves, Hand, Sparkles, BookOpen, ArrowRight } from "lucide-react";
import { VoiceAssistant } from "@/components/voice-assistant";

const features = [
  {
    icon: Waves,
    title: "SignWave",
    desc: "Real-time sign ↔ speech ↔ text. Multi-person conversation with SgSL & home signs.",
  },
  {
    icon: Hand,
    title: "TouchSpeak",
    desc: "Haptic braille matrix. Send and receive via vibration patterns.",
  },
  {
    icon: Sparkles,
    title: "ContextAI",
    desc: "Daily assistant: shopping, hawker, MRT. OCR & safety alerts.",
  },
  {
    icon: BookOpen,
    title: "Learning Bridge",
    desc: "Classroom mode. Sign Quest — gamified SgSL learning.",
  },
];

const personas = [
  { id: "deaf", label: "Deaf user", sub: "Camera-first" },
  { id: "blind", label: "Blind user", sub: "Voice-first" },
  { id: "deafblind", label: "Deaf-blind", sub: "Haptic-first" },
  { id: "helper", label: "Helper", sub: "Communicating with disabled user" },
];

export default function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <VoiceAssistant />
      <div className="gradient-mesh absolute inset-0" />
      <div className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
        {/* Hero */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center pt-12 pb-20"
        >
          <h1 className="text-4xl font-bold tracking-tight text-[#2A2433] sm:text-5xl md:text-6xl page-title">
            SignBridge <span className="text-brand-rose">Universe</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-[#6B6B6B]">
            Multimodal, multi-disability assistive communication. Singapore-first.
            Sign ↔ Speech ↔ Text ↔ Haptic.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/onboarding"
              className={cn(buttonVariants({ size: "lg" }), "shadow-glow")}
            >
              Start Demo <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
            <Link
              href="/dashboard"
              className={cn(buttonVariants({ variant: "secondary", size: "lg" }))}
            >
              Go to Universe Home
            </Link>
          </div>
        </motion.section>

        {/* Mode carousel / persona cards */}
        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="py-12"
        >
          <h2 className="text-center text-2xl font-semibold text-[#2A2433] page-title">
            Choose your experience
          </h2>
          <p className="mt-2 text-center text-[#6B6B6B]">
            UI adapts to your persona: Deaf, Blind, Deaf-blind, or Helper.
          </p>
          <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
            {personas.map((p, i) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * i }}
              >
                <Link href="/onboarding">
                  <div className="glass-card cursor-pointer transition-all duration-250 hover:border-brand-rose/40">
                    <p className="font-medium text-[#2A2433]">{p.label}</p>
                    <p className="mt-1 text-xs text-[#6B6B6B]">{p.sub}</p>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* Feature highlights */}
        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="py-16"
        >
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + i * 0.1 }}
                className="glass-card group transition-all duration-250"
              >
                <div className="icon-elevated mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-brand-pink/30 text-brand-rose">
                  <f.icon className="h-5 w-5" strokeWidth={1.5} />
                </div>
                <h3 className="font-semibold text-[#2A2433]">{f.title}</h3>
                <p className="mt-2 text-sm text-[#6B6B6B]">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.section>
      </div>
    </div>
  );
}
