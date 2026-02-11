"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Home,
  Waves,
  Hand,
  Sparkles,
  BookOpen,
  Settings,
  Video,
  LayoutGrid,
  Plug,
  HelpCircle,
  MessageCircle,
  Shield,
  Building2,
  MapPin,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useStore } from "@/lib/store";
import { useMessageStore } from "@/lib/message-store";
import { getShakeHandler, requestShakePermission } from "@/lib/shake-detection";
import { VoiceAssistant } from "@/components/voice-assistant";
import { BlindAnnouncer } from "@/components/blind-announcer";

const nav = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/messages", label: "Bridge", icon: MessageCircle },
  { href: "/accessible-places", label: "Places", icon: MapPin },
  { href: "/signwave", label: "SignWave", icon: Waves },
  { href: "/touchspeak", label: "TouchSpeak", icon: Hand },
  { href: "/contextai", label: "ContextAI", icon: Sparkles },
  { href: "/learning", label: "Learning", icon: BookOpen },
  { href: "/safetyassist", label: "SafetyAssist", icon: Shield },
  { href: "/publicassist", label: "PublicAssist", icon: Building2 },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const unreadCount = useMessageStore((s) => (s.messages, s.getUnreadTotal()));
  const [shakeReady, setShakeReady] = useState(false);
  const [showShakePrompt, setShowShakePrompt] = useState(false);

  useEffect(() => {
    useMessageStore.persist.rehydrate();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem("shakePermission") === "granted") {
      setShakeReady(true);
    }
    const DevMotion = (window as unknown as { DeviceMotionEvent?: { requestPermission?: () => unknown } }).DeviceMotionEvent;
    const hasRequestPermission = !!DevMotion && typeof DevMotion.requestPermission === "function";
    if (hasRequestPermission && !sessionStorage.getItem("shakePermission")) {
      setShowShakePrompt(true);
    } else if (!hasRequestPermission) {
      setShakeReady(true);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !("DeviceMotionEvent" in window) || !shakeReady) return;
    const handler = getShakeHandler(() => router.push("/safetyassist?shake=1"));
    window.addEventListener("devicemotion", handler);
    return () => window.removeEventListener("devicemotion", handler);
  }, [router, shakeReady]);

  const handleEnableShake = async () => {
    const ok = await requestShakePermission();
    if (ok) {
      sessionStorage.setItem("shakePermission", "granted");
      setShakeReady(true);
      setShowShakePrompt(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      {/* Sidebar — desktop */}
      <aside
        className="fixed left-0 top-0 z-40 hidden h-screen w-56 flex-col border-r border-[rgba(230,180,200,0.35)] bg-[#FAF4F7]/95 backdrop-blur-xl md:flex"
        aria-label="Main navigation"
      >
        <div className="flex h-14 items-center gap-2 border-b border-[rgba(230,180,200,0.35)] px-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-pink/30 text-brand-rose shadow-[0_4px_6px_rgba(160,100,130,0.2)]">
            <Video className="h-5 w-5" strokeWidth={1.5} />
          </div>
          <span className="font-semibold text-[#2A2433]">SignBridge</span>
        </div>
        <nav className="flex-1 space-y-0.5 p-3">
          {nav.map((item) => {
            const isActive = pathname === item.href;
            const showBadge = item.href === "/messages" && unreadCount > 0;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-250 relative min-h-[44px]",
                  isActive
                    ? "bg-brand-pink/25 text-brand-rose ring-2 ring-brand-rose/30 shadow-sm"
                    : "text-[#6B6B6B] hover:bg-brand-pink/15 hover:text-[#2A2433]"
                )}
              >
                <item.icon className="h-5 w-5 shrink-0" strokeWidth={1.5} />
                {item.label}
                {showBadge && (
                  <span className="absolute right-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-rose px-1.5 text-xs font-medium text-white" aria-label={`${unreadCount} unread`}>
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-[rgba(230,180,200,0.35)] p-3">
          <Link
            href="/how-to-use"
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-[#6B6B6B] hover:bg-brand-pink/15 hover:text-[#2A2433] min-h-[44px] transition-all duration-250"
          >
            <HelpCircle className="h-5 w-5" strokeWidth={1.5} />
            How to use
          </Link>
          <Link
            href="/simulator"
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-[#6B6B6B] hover:bg-brand-pink/15 hover:text-[#2A2433] min-h-[44px] transition-all duration-250"
          >
            <LayoutGrid className="h-5 w-5" strokeWidth={1.5} />
            Simulator
          </Link>
          <Link
            href="/connectors"
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-[#6B6B6B] hover:bg-brand-pink/15 hover:text-[#2A2433] min-h-[44px] transition-all duration-250"
          >
            <Plug className="h-5 w-5" strokeWidth={1.5} />
            Connectors
          </Link>
          <Link
            href="/onboarding"
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-[#6B6B6B] hover:bg-brand-pink/15 hover:text-[#2A2433] min-h-[44px] transition-all duration-250"
          >
            <Settings className="h-5 w-5" strokeWidth={1.5} />
            Mode &amp; preferences
          </Link>
        </div>
      </aside>

      {/* Voice Assistant — global */}
      <VoiceAssistant />
      {/* Blind-mode verbal feedback on every click */}
      <BlindAnnouncer />

      {/* Main content */}
      <main className="flex-1 md:pl-56">
        <div className="min-h-[calc(100vh-4rem)] pb-20 md:pb-0">{children}</div>
        {showShakePrompt && (
          <div className="fixed bottom-20 left-4 right-4 md:bottom-4 md:left-auto md:right-4 md:w-72 z-50">
            <button
              type="button"
              onClick={handleEnableShake}
              className="w-full rounded-full bg-gradient-to-r from-[#F0BFCF] to-[#E8A3B5] text-[#2A2433] px-4 py-3 text-sm font-medium flex items-center justify-center gap-2 shadow-soft min-h-[44px] hover:shadow-button-glow hover:scale-[1.02] active:shadow-button-press transition-all duration-250"
            >
              <Shield className="h-5 w-5" strokeWidth={1.5} />
              Enable shake to open SafetyAssist (tap once)
            </button>
          </div>
        )}
      </main>

      {/* Bottom nav — mobile */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around border-t border-[rgba(230,180,200,0.35)] bg-[#FAF4F7]/90 py-2 backdrop-blur-xl md:hidden"
        aria-label="Mobile navigation"
      >
        {nav.slice(0, 5).map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-0.5 rounded-xl px-4 py-3 text-xs min-h-[56px] min-w-[56px] justify-center transition-all",
                isActive
                  ? "text-brand-rose ring-2 ring-brand-rose/30 bg-brand-pink/20"
                  : "text-[#6B6B6B]"
              )}
            >
              <item.icon className="h-6 w-6" strokeWidth={1.5} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
