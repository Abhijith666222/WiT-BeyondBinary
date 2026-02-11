"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Phone, Users, MapPin, Shield, X, Settings, Smartphone, Volume2, Bell, CheckCircle } from "lucide-react";
import { useToastStore } from "@/lib/toast-store";
import { useMessageStore } from "@/lib/message-store";
import type { Meaning } from "@/lib/types";
import {
  renderText,
  speakText,
  renderSignGloss,
  getHapticPattern,
  triggerVibration,
  playHapticFallback,
} from "@/lib/mesh/renderers";
import { meaningFromText } from "@/lib/mesh/meaning";
import { useStore } from "@/lib/store";

type EmergencyType = "police" | "contact" | "nearby_help" | "silent" | "buddy";

const LABELS: Record<EmergencyType, string> = {
  police: "Call Police",
  contact: "Call Emergency Contact",
  nearby_help: "Request Nearby Help",
  silent: "Silent SOS",
  buddy: "Buddy Check-In",
};

const DISPLAY: Record<EmergencyType, string> = {
  police: "Emergency: calling police",
  contact: "Emergency: calling your emergency contact",
  nearby_help: "Emergency: requesting nearby help",
  silent: "Silent SOS — alert sent to trusted contact",
  buddy: "Check-in sent to trusted contact",
};

const EMERGENCY_VOICE_LINES = [
  "Help me!",
  "Emergency!",
  "Call the police!",
  "I need an ambulance",
  "I'm deaf, I need help",
  "I can't hear — please write it down",
  "I need medical assistance",
  "Someone is hurt",
  "Fire!",
  "Intruder!",
];

function emergencyMeaning(type: EmergencyType, mode?: "silent" | "call" | "notify"): Meaning {
  return {
    intent: "emergency_help",
    entities: {
      type,
      raw: DISPLAY[type],
      ...(mode && { mode }),
    },
    confidence: 1,
  };
}

function triggerRenderers(
  meaning: Meaning,
  ttsRate: number,
  voicePreset?: "clear" | "neutral" | "soft"
) {
  const text = renderText(meaning);
  if (text) speakText(meaning, { rate: ttsRate, voicePreset });
  renderSignGloss(meaning);
  const pattern = getHapticPattern(meaning);
  if (!triggerVibration(pattern)) playHapticFallback();
}

const SHAKE_THRESHOLD = 15;
const SHAKE_COOLDOWN_MS = 2000;

const LONG_PRESS_MS = 800;

function SafetyAssistContent() {
  const searchParams = useSearchParams();
  const { preferences } = useStore();
  const addToast = useToastStore((s) => s.addToast);
  const sendMessage = useMessageStore((s) => s.sendMessage);
  const activeConversationId = useMessageStore((s) => s.activeConversationId);
  const [modalOpen, setModalOpen] = useState(false);
  const [lastEmergency, setLastEmergency] = useState<EmergencyType | null>(null);
  const [shakeEnabled, setShakeEnabled] = useState(false);
  const lastShakeRef = useRef(0);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sendToTrustedContact = useCallback(
    (text: string) => {
      const cid = activeConversationId ?? "default";
      sendMessage(cid, { text, sender: "me" });
      addToast("Message sent to Bridge (trusted contact)", "success");
    },
    [activeConversationId, sendMessage, addToast]
  );

  const handleEmergency = useCallback(
    (type: EmergencyType, mode?: "silent" | "call" | "notify") => {
      const meaning = emergencyMeaning(type, mode);
      if (type === "silent") {
        if (!triggerVibration([100, 50, 100])) playHapticFallback();
        sendToTrustedContact("🆘 Silent SOS — I may need help. Please check on me.");
        setLastEmergency("silent");
        setModalOpen(true);
      } else if (type === "buddy") {
        sendToTrustedContact("✅ Check-in: I'm okay.");
        if (!triggerVibration([50, 30, 50])) playHapticFallback();
        setLastEmergency("buddy");
        addToast("Check-in sent", "success");
      } else {
        triggerRenderers(meaning, preferences.ttsRate ?? 1, preferences.ttsVoicePreset);
        setLastEmergency(type);
        setModalOpen(true);
      }
    },
    [preferences.ttsRate, preferences.ttsVoicePreset, sendToTrustedContact, addToast]
  );

  const handleDiscreetSOS = useCallback(() => {
    handleEmergency("silent", "silent");
  }, [handleEmergency]);

  const handleLongPressStart = useCallback(() => {
    longPressTimerRef.current = setTimeout(handleDiscreetSOS, LONG_PRESS_MS);
  }, [handleDiscreetSOS]);

  const handleLongPressEnd = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "s" && (e.ctrlKey || e.metaKey) && e.shiftKey) {
        e.preventDefault();
        handleDiscreetSOS();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleDiscreetSOS]);

  useEffect(() => {
    if (searchParams.get("shake") === "1") {
      handleEmergency("police");
      if (typeof window !== "undefined") window.history.replaceState({}, "", "/safetyassist");
    }
  }, [searchParams, handleEmergency]);

  useEffect(() => {
    if (typeof sessionStorage !== "undefined" && sessionStorage.getItem("shakePermission") === "granted") {
      setShakeEnabled(true);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !("DeviceMotionEvent" in window)) return;
    const onMotion = (e: Event) => {
      const me = e as unknown as { accelerationIncludingGravity?: { x?: number | null; y?: number | null; z?: number | null } | null };
      const a = me.accelerationIncludingGravity;
      if (!a) return;
      const total = Math.sqrt((Number(a.x) || 0) ** 2 + (Number(a.y) || 0) ** 2 + (Number(a.z) || 0) ** 2);
      if (total > SHAKE_THRESHOLD && Date.now() - lastShakeRef.current > SHAKE_COOLDOWN_MS) {
        lastShakeRef.current = Date.now();
        handleEmergency("police");
      }
    };
    window.addEventListener("devicemotion", onMotion);
    return () => window.removeEventListener("devicemotion", onMotion);
  }, [handleEmergency]);

  const requestShakePermission = useCallback(async () => {
    if (typeof window === "undefined" || !("DeviceMotionEvent" in window)) {
      addToast("Shake detection not supported", "default");
      return;
    }
    const DevMotion = (window as unknown as { DeviceMotionEvent?: { requestPermission?: () => Promise<string> } }).DeviceMotionEvent;
    const req = DevMotion?.requestPermission;
    if (!req) {
      addToast("Shake already works on this device (e.g. Android).", "default");
      setShakeEnabled(true);
      return;
    }
    try {
      const result = await req();
      if (result === "granted") {
        setShakeEnabled(true);
        if (typeof sessionStorage !== "undefined") sessionStorage.setItem("shakePermission", "granted");
        addToast("Shake detection enabled. Shake from any screen to open SafetyAssist.", "success");
      } else {
        addToast("Permission denied. Shake will only work when this page is open.", "default");
      }
    } catch (e) {
      addToast("Could not enable shake. Try again or use the buttons above.", "error");
    }
  }, [addToast]);

  return (
    <div className="px-4 py-8 md:px-8">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Shield className="h-7 w-7 text-brand-rose" strokeWidth={1.5} />
          SafetyAssist
        </h1>
        <p className="mt-1 text-muted-foreground">
          Emergency help — tap a button or shake your device to open this page and trigger alert.
        </p>
        {typeof window !== "undefined" && "DeviceMotionEvent" in window && (
          <Button
            variant="outline"
            size="sm"
            className="mt-3 border-brand-rose/40"
            onClick={requestShakePermission}
          >
            <Smartphone className="h-4 w-4 mr-2" />
            {shakeEnabled ? "Shake detection enabled" : "Enable shake from any screen (iOS)"}
          </Button>
        )}
      </motion.div>

      <Card className="mb-6 max-w-4xl border-rose-500/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Volume2 className="h-5 w-5 text-red-400" />
            Emergency voice lines — tap to speak
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex flex-wrap gap-2">
            {EMERGENCY_VOICE_LINES.map((line) => (
              <Button
                key={line}
                variant="secondary"
                size="sm"
                className="h-auto py-2 px-3 text-left whitespace-normal border-rose-500/30 hover:border-rose-500/60"
                onClick={() => speakText(meaningFromText(line), { rate: preferences.ttsRate ?? 1, voicePreset: preferences.ttsVoicePreset })}
              >
                <Volume2 className="h-3.5 w-3.5 mr-1.5 shrink-0 mt-0.5" />
                {line}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 max-w-4xl">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="glass-card border-red-500/30 hover:border-red-500/50 transition-all">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Phone className="h-5 w-5 text-red-400" />
                {LABELS.police}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Button
                className="w-full bg-red-600 hover:bg-red-700"
                onClick={() => handleEmergency("police")}
                data-voice-action="call-police"
              >
                Call Police
              </Button>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="glass-card border-amber-500/30 hover:border-amber-500/50 transition-all">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="h-5 w-5 text-amber-400" />
                {LABELS.contact}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Button
                variant="secondary"
                className="w-full border-amber-500/50"
                onClick={() => handleEmergency("contact")}
                data-voice-action="call-contact"
              >
                Call Emergency Contact
              </Button>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="glass-card border-brand-rose/30 hover:border-brand-rose/50 transition-all">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <MapPin className="h-5 w-5 text-brand-rose" strokeWidth={1.5} />
                {LABELS.nearby_help}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Button
                variant="secondary"
                className="w-full"
                onClick={() => handleEmergency("nearby_help")}
                data-voice-action="nearby-help"
              >
                Request Nearby Help
              </Button>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
          <Card className="glass-card border-violet-500/30 hover:border-violet-500/50 transition-all">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Bell className="h-5 w-5 text-violet-500" strokeWidth={1.5} />
                {LABELS.silent}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Button
                variant="secondary"
                className="w-full border-violet-500/40 text-sm min-h-[44px] whitespace-normal"
                onMouseDown={handleLongPressStart}
                onMouseUp={handleLongPressEnd}
                onMouseLeave={handleLongPressEnd}
                onTouchStart={handleLongPressStart}
                onTouchEnd={handleLongPressEnd}
                data-voice-action="silent-sos"
              >
                Long-press or Ctrl+Shift+S
              </Button>
              <p className="text-xs text-muted-foreground mt-2">Sends alert to Bridge — no sound</p>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Card className="glass-card border-emerald-500/30 hover:border-emerald-500/50 transition-all">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <CheckCircle className="h-5 w-5 text-emerald-500" strokeWidth={1.5} />
                {LABELS.buddy}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Button
                variant="secondary"
                className="w-full border-emerald-500/40"
                onClick={() => handleEmergency("buddy")}
                data-voice-action="buddy-checkin"
              >
                Check in with trusted contact
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {(preferences.emergencyContact?.name || preferences.emergencyContact?.phone) && (
        <Card className="mt-6 max-w-xl border-amber-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="h-4 w-4 text-amber-400" />
              Emergency contact
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-sm">
            {preferences.emergencyContact?.name && (
              <p className="text-foreground">{preferences.emergencyContact.name}</p>
            )}
            {preferences.emergencyContact?.phone && (
              <p className="text-muted-foreground font-mono">{preferences.emergencyContact.phone}</p>
            )}
            <Link href="/simulator" className="inline-flex items-center gap-1 mt-2 text-xs text-brand-rose hover:underline">
              <Settings className="h-3 w-3" /> Edit in Simulator
            </Link>
          </CardContent>
        </Card>
      )}

      <p className="mt-6 text-xs text-muted-foreground max-w-xl">
        Shake your phone from any screen to open SafetyAssist (enable above on iOS). On this page, shake also triggers the police alert. Alerts are rendered as text, speech, sign gloss, and haptic.
      </p>

      <AnimatePresence>
        {modalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            role="dialog"
            aria-labelledby="emergency-modal-title"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="glass-card max-w-sm w-full"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 id="emergency-modal-title" className="font-semibold text-foreground">
                  Emergency mode activated
                </h2>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-lg p-1 hover:bg-brand-pink/20"
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <p className="text-sm text-muted-foreground">
                Emergency mode activated — sending alert{lastEmergency ? `: ${DISPLAY[lastEmergency]}` : ""}.
              </p>
              <Button className="mt-4 w-full" onClick={() => setModalOpen(false)}>
                Dismiss
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function SafetyAssistPage() {
  return (
    <Suspense fallback={<div className="px-4 py-8 text-muted-foreground">Loading…</div>}>
      <SafetyAssistContent />
    </Suspense>
  );
}
