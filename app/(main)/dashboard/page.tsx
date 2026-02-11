"use client";

import { useStore } from "@/lib/store";
import { useMessageStore } from "@/lib/message-store";
import { useDemoTour } from "@/components/demo-tour";
import { motion } from "framer-motion";
import Link from "next/link";
import { Waves, Hand, Sparkles, BookOpen, ArrowRight, Play, HelpCircle, MessageCircle, Shield, Building2, Repeat } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const modules = [
  { href: "/messages", label: "Bridge", icon: MessageCircle, desc: "Real messaging: send & receive across SignWave & TouchSpeak" },
  { href: "/signwave", label: "SignWave", icon: Waves, desc: "Sign ↔ speech ↔ text — send to Bridge" },
  { href: "/touchspeak", label: "TouchSpeak", icon: Hand, desc: "Braille & voice — send & receive from Bridge" },
  { href: "/contextai", label: "ContextAI", icon: Sparkles, desc: "Daily assistant scenarios" },
  { href: "/learning", label: "Learning Bridge", icon: BookOpen, desc: "Classroom & Sign Quest" },
  { href: "/safetyassist", label: "SafetyAssist", icon: Shield, desc: "Emergency help — police, contact, nearby; shake to alert" },
  { href: "/publicassist", label: "PublicAssist", icon: Building2, desc: "Kiosk workflows: hospital, MRT, govt — persona-adaptive steps" },
  { href: "/relay", label: "Relay", icon: Repeat, desc: "Dual-channel relay: A ↔ B via text, speech & sign" },
];

export default function DashboardPage() {
  const { preferences } = useStore();
  const tour = useDemoTour();
  const persona = preferences.persona;
  const unreadCount = useMessageStore((s) => (s.messages, s.getUnreadTotal()));

  return (
    <div className="px-4 py-8 md:px-8">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-10"
      >
        <div className="flex flex-wrap items-center justify-between gap-5">
          <div>
            <h1 className="text-2xl font-bold text-[#2A2433] md:text-3xl page-title">
              Universe Home
            </h1>
            <p className="mt-1 text-muted-foreground">
          {persona === "deaf" && "Camera-first. Start with SignWave or type to communicate."}
          {persona === "blind" && "Voice-first. Use speech or explore modules with screen reader."}
          {persona === "deafblind" && "Haptic-first. Simplified navigation. TouchSpeak is your hub."}
          {persona === "helper" && "You're supporting someone. Open any module to bridge the conversation."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/how-to-use" className={cn(buttonVariants({ variant: "secondary", size: "sm" }))}>
              <HelpCircle className="mr-2 h-4 w-4" /> How to use
            </Link>
            {tour && (
              <Button variant="secondary" size="sm" onClick={() => tour.startTour("onboarding")}>
                <Play className="mr-2 h-4 w-4" /> Start demo tour
              </Button>
            )}
          </div>
        </div>
      </motion.div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {modules.map((m, i) => (
          <motion.div
            key={m.href}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 * i }}
          >
            <Link href={m.href}>
              <Card className="group h-full transition-all duration-250 relative hover:border-brand-rose/40">
                {m.href === "/messages" && unreadCount > 0 && (
                  <span className="absolute top-3 right-3 flex h-6 min-w-6 items-center justify-center rounded-full bg-brand-rose px-1.5 text-xs font-bold text-white shadow-sm" aria-label={`${unreadCount} unread messages`}>
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
                <CardHeader className="flex flex-row items-center gap-3">
                  <div className="icon-elevated flex h-11 w-11 items-center justify-center rounded-xl bg-brand-pink/30 text-brand-rose group-hover:bg-brand-pink/40 transition-colors">
                    <m.icon className="h-5 w-5" strokeWidth={1.5} />
                  </div>
                  <CardTitle className="text-lg">{m.label}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-[#6B6B6B]">{m.desc}</p>
                  <span className="mt-3 inline-flex items-center text-sm text-brand-rose font-medium">
                    Open <ArrowRight className="ml-1 h-4 w-4" />
                  </span>
                </CardContent>
              </Card>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
