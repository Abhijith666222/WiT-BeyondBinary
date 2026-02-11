# SignBridge Universe (MVP)

Multimodal, multi-disability assistive communication ecosystem — Singapore-first.  
Sign ↔ Speech ↔ Text ↔ Haptic.

## Quick start

```bash
cd /Users/shreyv/Desktop/projects/beyond_binary
npm install
npm run dev
```

Open **http://localhost:3000**. One command to run locally.

**Sign detection (camera):** To transcribe signs from your camera in SignWave, add a Roboflow API key. Copy `.env.example` to `.env.local` and set `ROBOFLOW_API_KEY`. Get a free key at [roboflow.com](https://roboflow.com). The app uses **ASL word-level** detection by default (Roboflow model `asl-dataset-p9yw8/1`: yes, no, thank-you, help, good, etc.). Set `ROBOFLOW_MODEL_ID=video-call-asl-signs/1` for letter-level (A–Z) instead.

## What’s included (all phases)

- **Next.js 14** + TypeScript + Tailwind + Framer Motion + Zustand
- **Landing** (`/`) — Hero, persona cards, feature highlights, “Start Demo” / “Universe Home”
- **Onboarding** (`/onboarding`) — Choose persona: Deaf, Blind, Deaf-blind, Helper; continue to dashboard
- **Universe Home** (`/dashboard`) — Adaptive dashboard, “Start demo tour” button, module cards
- **SignWave** (`/signwave`) — Sign phrase picker (SgSL + quick phrases), Web Speech API mic, **camera sign detection** (Roboflow ASL API), live output: text, TTS, sign gloss, haptic
- **TouchSpeak** (`/touchspeak`) — Receive: text → braille cells + vibration; Send: tap braille dots → text → TTS; quick responses
- **ContextAI** — Shopping / Hawker / MRT scenarios with mock OCR, camera placeholder, output to user mode (TTS); MRT haptic turn cues
- **Learning Bridge** (`/learning`) — Classroom mode (teacher mic → subtitles + gloss; student → SignWave); Sign Quest quiz (streak, score)
- **Simulator** (`/simulator`) — Preview persona, see applied adaptations
- **Connectors** (`/connectors`) — Zoom/Teams mock, LTA/MRT mock, Gov/SingPass mock (secure modal)
- **Pitch** (`/pitch`) — 90s problem/solution
- **Data** — `data/sgsl_signs.json` (112 SgSL signs), `data/quick_phrases.json`; `data/home_signs.json` (empty, reserved for future)
- **Bridge** — Real messaging: send from SignWave/TouchSpeak, receive in thread; “Latest from Bridge” in TouchSpeak; Dictate (voice) in TouchSpeak Send

**Full checklist vs solution doc:** see `docs/feature-audit.md` for what’s implemented vs mock vs not built (e.g. home signs UI, AR). Camera sign recognition uses Roboflow ASL word detection (default: asl-dataset-p9yw8) when `ROBOFLOW_API_KEY` is set.

## Demo path (under 2 min)

1. Open **http://localhost:3000**
2. Click **Start Demo** → onboarding
3. Choose **Deaf user** → **Continue to Universe Home**
4. (Optional) Click **Start demo tour** on dashboard for step-by-step overlay
5. **SignWave**: turn on camera and use “Detect sign now” or live detection to transcribe your sign; or pick a sign/phrase or use mic → see text, “Speak again”, gloss, haptic
6. **TouchSpeak**: Receive — enter text, “Play braille + vibrate”; Send — tap dots, Add letter, Speak
7. **ContextAI** → Shopping → Run OCR (mock) → tap speaker on results
8. **Learning** → Classroom (mic → subtitles + gloss) or Sign Quest (quiz)
9. **Simulator**: preview persona, Apply; **Connectors**: Zoom/LTA/Gov mocks

## Tech stack

- Next.js 14, TypeScript, Tailwind CSS
- Framer Motion, Zustand, React Hook Form, Zod, Recharts (ready for charts)
- lucide-react icons
- Web APIs: Web Speech (STT), SpeechSynthesis (TTS), Vibration (haptics)
- `lib/mesh`: Meaning Layer + text/speech/sign/haptic renderers
- `lib/braille`: character ↔ 3×2 braille dots

## Project structure

- `app/` — Routes (landing, onboarding, (main)/dashboard, signwave, touchspeak, messages, contextai, learning, simulator, connectors, rules, pitch)
- `components/` — UI, BrailleCell, demo-tour, layout/app-shell
- `lib/` — types, store, message-store, toast-store, mesh (meaning + renderers), braille
- `data/` — SgSL signs, quick phrases (home_signs reserved for future)
- `docs/` — Demo script
