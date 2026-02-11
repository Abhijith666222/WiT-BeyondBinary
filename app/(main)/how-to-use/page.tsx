"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Waves, Hand, Sparkles, BookOpen, HelpCircle, ArrowRight, MessageCircle } from "lucide-react";

export default function HowToUsePage() {
  return (
    <div className="px-4 py-8 md:px-8 max-w-4xl">
      <motion.h1
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-2xl font-bold text-foreground flex items-center gap-2"
      >
        <HelpCircle className="h-8 w-8 text-brand-cyan" /> How to use SignBridge Universe
      </motion.h1>
      <p className="mt-2 text-muted-foreground">
        Step-by-step guide for each feature. Start with onboarding, then try the modules below.
      </p>

      <div className="mt-8 space-y-8">
        <Card className="border-brand-cyan/30 bg-brand-cyan/5">
          <CardHeader>
            <CardTitle className="text-lg">Solution overview (use cases)</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p><strong className="text-foreground">SignBridge Universe</strong> is a multimodal assistive ecosystem: Sign ↔ Speech ↔ Text ↔ Haptic. One platform for Deaf, Blind, Deaf-blind, and Helpers.</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li><strong className="text-foreground">Bridge</strong> — Real in-app messaging. Send from SignWave or TouchSpeak; receive as text, TTS, or load into TouchSpeak for braille. Simulate a reply to test the flow.</li>
              <li><strong className="text-foreground">SignWave</strong> — Pick SgSL sign or phrase (or speak); get text, TTS, sign gloss, haptic. Send to Bridge so others see your message.</li>
              <li><strong className="text-foreground">TouchSpeak</strong> — Receive: type or load “Latest from Bridge” → feel braille + vibrate. Send: dictate or tap braille dots → Speak or Send to Bridge.</li>
              <li><strong className="text-foreground">ContextAI</strong> — Daily assist: OCR scan (shopping, hawker menu, MRT) → results in your mode; MRT haptic turn cues.</li>
              <li><strong className="text-foreground">Learning Bridge</strong> — Classroom (teacher mic → subtitles + gloss); Sign Quest (SgSL quiz).</li>
            </ul>
            <Link href="/messages"><Button variant="secondary" size="sm" className="mt-3">Open Bridge <ArrowRight className="ml-1 h-4 w-4" /></Button></Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Before you start</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>1. Go to the <Link href="/" className="text-brand-cyan underline">landing page</Link> and click <strong className="text-foreground">Start Demo</strong>.</p>
            <p>2. Choose a <strong className="text-foreground">persona</strong> (Deaf, Blind, Deaf-blind, or Helper). This changes how the app behaves (e.g. Deaf = camera-first, Blind = voice-first).</p>
            <p>3. Click <strong className="text-foreground">Continue to Universe Home</strong>. From the dashboard you can open any module.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Waves className="h-5 w-5 text-brand-cyan" /> SignWave — Sign ↔ Speech ↔ Text ↔ Haptic
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p><strong className="text-foreground">What it does:</strong> You choose a sign or phrase (or speak), and the app shows text, speaks it (TTS), shows the sign gloss, and plays a haptic pattern (vibration on supported devices, or a short tone on others).</p>
            <ul className="list-decimal list-inside space-y-2 ml-2">
              <li><strong className="text-foreground">Start camera</strong> — Click to turn on your webcam. You’ll see yourself; use this to practice hand signs in view of the camera.</li>
              <li><strong className="text-foreground">Hand sign panel</strong> — When you pick a sign or phrase, the current sign appears here (e.g. “WATER”). Practice that sign in your camera view.</li>
              <li><strong className="text-foreground">Quick phrases</strong> — Tap “Hello”, “Thank you”, “Where is the MRT?” etc. The app will speak it, show the gloss, and trigger haptic.</li>
              <li><strong className="text-foreground">SgSL signs</strong> — Tap any sign (e.g. HELLO, THANK, WATER). Same: text + speak + gloss + haptic.</li>
              <li><strong className="text-foreground">Start mic</strong> — Speak into the microphone, then click <strong className="text-foreground">Stop mic</strong>. What you said is turned into text, TTS, and haptic.</li>
              <li><strong className="text-foreground">Speak again / Gloss / Haptic ready</strong> — In the Output section you can tap these to hear the phrase again, or feel the haptic pattern again. On Android Chrome you get real vibration; on other devices you get a short tone.</li>
              <li><strong className="text-foreground">Send to Bridge</strong> — Once you have a translation, tap <strong className="text-foreground">Send to Bridge</strong> to post it to the real messaging thread. Others can read it or receive it in TouchSpeak as braille.</li>
            </ul>
            <Link href="/signwave"><Button variant="secondary" size="sm" className="mt-2">Open SignWave <ArrowRight className="ml-1 h-4 w-4" /></Button></Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Hand className="h-5 w-5 text-brand-cyan" /> TouchSpeak — Braille-style haptic
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p><strong className="text-foreground">What it does:</strong> Converts text into a 3×2 braille-style pattern you can feel (vibration on Android Chrome) or hear as short tones. You can also tap dots to build letters and have them spoken.</p>
            <ul className="list-decimal list-inside space-y-2 ml-2">
              <li>Switch between <strong className="text-foreground">Receive</strong> and <strong className="text-foreground">Send</strong> tabs.</li>
              <li><strong className="text-foreground">Receive:</strong> Type text in the box (e.g. “Hello”), then click <strong className="text-foreground">Play braille + vibrate</strong>. You’ll see braille cells light up; on Android Chrome the phone will vibrate; on other devices you’ll hear a short tone per character.</li>
              <li><strong className="text-foreground">Send:</strong> Tap the 3×2 dots to form a letter (e.g. “a” = top-left dot), or use <strong className="text-foreground">Dictate</strong> to speak your message. Click <strong className="text-foreground">Add letter</strong>, then <strong className="text-foreground">Speak</strong> to hear via TTS, or <strong className="text-foreground">Send to Bridge</strong> to post to the real messaging thread.</li>
              <li><strong className="text-foreground">Latest from Bridge</strong> — In Receive, if someone sent you a message in Bridge, it appears here. Tap <strong className="text-foreground">Load into Text to feel</strong> and then Play to feel it as braille.</li>
              <li><strong className="text-foreground">Quick responses</strong> — Tap any phrase to hear it spoken (TTS).</li>
            </ul>
            <Link href="/touchspeak"><Button variant="secondary" size="sm" className="mt-2">Open TouchSpeak <ArrowRight className="ml-1 h-4 w-4" /></Button></Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="h-5 w-5 text-brand-cyan" /> ContextAI — Daily assistant
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p><strong className="text-foreground">What it does:</strong> Daily assist scenarios: shopping, hawker menu, MRT. You scan and get results you can hear (TTS) or use in your preferred mode.</p>
            <ul className="list-decimal list-inside space-y-2 ml-2">
              <li>From ContextAI, open <strong className="text-foreground">Shopping</strong>, <strong className="text-foreground">Hawker</strong>, or <strong className="text-foreground">MRT</strong>.</li>
              <li><strong className="text-foreground">Shopping / Hawker:</strong> Click <strong className="text-foreground">Run OCR</strong> or <strong className="text-foreground">Scan</strong>. After a short delay, a list of items appears. Tap the speaker icon next to any line to hear it (TTS).</li>
              <li><strong className="text-foreground">MRT:</strong> See train arrivals. Use <strong className="text-foreground">Turn left</strong> / <strong className="text-foreground">Turn right</strong> to trigger a haptic-style cue (vibration on Android Chrome, or simulated feedback).</li>
            </ul>
            <Link href="/contextai"><Button variant="secondary" size="sm" className="mt-2">Open ContextAI <ArrowRight className="ml-1 h-4 w-4" /></Button></Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <BookOpen className="h-5 w-5 text-brand-cyan" /> Learning Bridge
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p><strong className="text-foreground">What it does:</strong> Classroom mode (teacher speaks → subtitles + sign gloss) and Sign Quest (mini quiz on SgSL signs).</p>
            <ul className="list-decimal list-inside space-y-2 ml-2">
              <li><strong className="text-foreground">Classroom mode</strong> — Click <strong className="text-foreground">Enter classroom</strong>. Click <strong className="text-foreground">Start mic</strong> and speak. Your speech appears as text and sign gloss below. Use “Open SignWave picker” to simulate a student signing (picker → TTS).</li>
              <li><strong className="text-foreground">Sign Quest</strong> — Click <strong className="text-foreground">Play</strong>. You’ll see an example sentence and four possible meanings. Pick the correct one. Your score and streak are shown. Click <strong className="text-foreground">Next</strong> to continue; at the end you can play again.</li>
            </ul>
            <Link href="/learning"><Button variant="secondary" size="sm" className="mt-2">Open Learning <ArrowRight className="ml-1 h-4 w-4" /></Button></Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Simulator, Connectors, and more</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p><strong className="text-foreground">Simulator</strong> — Preview how the app behaves for each persona (Deaf, Blind, Deaf-blind, Helper) and see which adaptations apply. Use <strong className="text-foreground">Apply</strong> to switch your active mode.</p>
            <p><strong className="text-foreground">Connectors</strong> — Integrations: Zoom (join meeting), LTA (train times), Gov (SingPass-style login).</p>
            <p><strong className="text-foreground">Mode & preferences</strong> — In the sidebar/footer, open “Mode & preferences” to change persona or go through onboarding again.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Feeling vibration (haptics)</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>Real device vibration works only in <strong className="text-foreground">Chrome on Android</strong> (with the page loaded over HTTPS or your computer’s local network).</p>
            <p>On desktop or iPhone you’ll get a <strong className="text-foreground">short low tone</strong> instead when you tap “Haptic ready” or play TouchSpeak patterns — so you still get clear feedback.</p>
            <p>To feel real vibration: open this app on an Android phone in Chrome (e.g. <code className="bg-white/10 px-1 rounded">http://YOUR_PC_IP:3000</code> or a deployed HTTPS URL).</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
