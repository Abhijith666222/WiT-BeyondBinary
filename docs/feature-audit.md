# SignBridge Universe — Feature Audit vs Solution Doc

This audit maps the **MDCopy solution document** (SignBridge Universe: multimodal, multi-disability ecosystem) to the **current codebase**. Use it to see what’s in place, what’s mock, and what’s missing.

---

## Actual use cases you can run today

| Doc concept | What works now |
|-------------|----------------|
| **Deaf ↔ hearing** | SignWave: pick sign/phrase or use mic → text + TTS + gloss + haptic. Send to Bridge. Other person sees message in Bridge; can Speak or “Receive in TouchSpeak”. |
| **Blind user sends message** | TouchSpeak Send: use **Dictate** to speak → message appears; **Speak** to hear it; **Send to Bridge** to send. Receive: “Latest from Bridge” → Load into “Text to feel” → Play braille + vibrate. |
| **Deaf-blind** | TouchSpeak: receive text as braille (vibrate on Android Chrome; tone on desktop). Send via Dictate or braille dots. Bridge messages can be loaded and played as braille. |
| **Daily assist (shopping/hawker/MRT)** | ContextAI → Shopping / Hawker / MRT: run mock OCR → list appears → tap speaker for TTS. MRT: haptic “Turn left” / “Turn right”. |
| **Classroom** | Learning → Classroom: Start mic → speech becomes subtitles + sign gloss. Learning → Sign Quest: SgSL quiz (score, streak). |
| **Multi-person conversation** | Bridge: one or more conversations; send from SignWave or TouchSpeak; “Simulate reply” as the other person; view thread, Speak or open in TouchSpeak. |
| **Persona adaptation** | Onboarding: choose Deaf / Blind / Deaf-blind / Helper. Dashboard copy and primary output (speech/text/haptic) adapt. Simulator: preview and apply persona. |
| **Connectors** | Zoom/LTA/Gov pages with mock “Join” / arrivals / SingPass-style modal (no real APIs). |

**Haptics:** Real vibration only on **Chrome for Android** (HTTPS or localhost). On desktop/iOS you get a short tone instead so feedback still works.

---

## 1. SIGNWAVE — Multimodal Sign Language Hub

| Doc feature | Status | Implementation / note |
|-------------|--------|------------------------|
| **Real-time sign recognition (MediaPipe + hand landmarks)** | ❌ Not implemented | No MediaPipe or hand-tracking. **Camera is self-view only**; user **picks sign from list** (no automatic recognition). |
| **SgSL sign picker** | ✅ | `data/sgsl_signs.json` (112 signs), search, quick phrases; SignWave shows signs + gloss. |
| **Multi-dialect (SgSL, ASL fallback, SEE-II)** | ⚠️ Partial | Only SgSL data. No ASL/SEE-II data or dialect toggle. |
| **Contextual translation (meaning, not word-for-word)** | ✅ | `lib/mesh/meaning.ts` — meaning layer; text/gloss from meaning. |
| **Bidirectional: speech-to-sign, text-to-sign** | ⚠️ Partial | **Speech → text/gloss**: mic (Web Speech API) → transcript → meaning → text + gloss. **Text/sign → sign animation**: no avatar or sign animation; only gloss text + hand-shape icon. |
| **Output: Audio, Text, Haptic** | ✅ | TTS, on-screen text, sign gloss, haptic (vibration or fallback tone). |
| **Output: AR overlay** | ❌ | Not implemented. |
| **Personal / home sign library** | ❌ | `data/home_signs.json` exists but is empty; no UI to add or use home signs. |
| **Send to Bridge** | ✅ | Current translation can be sent to Bridge (real messaging). |

**Use case (doc):** Deaf user signs → system translates → hearing person gets speech/text.  
**Actual use case:** User selects sign or phrase (or speaks) → sees text + gloss + hears TTS + feels haptic; can send to Bridge. **No live sign-from-camera recognition.**

---

## 2. TOUCHSPEAK — Haptic Communication Matrix

| Doc feature | Status | Implementation / note |
|-------------|--------|------------------------|
| **6-point Braille cell (vibration)** | ✅ | `lib/braille.ts` + `BrailleCell`; dots 1–6; vibration pattern per cell (or tone fallback). |
| **Receive: Text → Braille + vibrate** | ✅ | Receive tab: type text → Play → cells + vibrate/tone. |
| **Receive: Speech → Haptic** | ⚠️ Partial | No direct “speech → haptic” pipeline; user can paste/load text then play. |
| **Receive: Sign → Haptic** | ⚠️ Partial | Only via Bridge: receive message from SignWave, then load in TouchSpeak and play. |
| **Receive from Bridge** | ✅ | “Latest from Bridge” + Load into “Text to feel”; URL `?receive=...`. |
| **Send: Tap Braille → output** | ✅ | Send tab: tap dots → Add letter → buffer; Speak (TTS); Dictate (voice input). |
| **Send to Bridge** | ✅ | “Send to Bridge” sends buffer to active conversation. |
| **Quick responses (tap codes)** | ✅ | Quick phrases (TTS); also in TouchSpeak card. |
| **Gesture-in-air (camera) → speech** | ❌ | Not implemented. |
| **Social haptic (who’s speaking, emotion)** | ❌ | Not implemented. |
| **Environmental (obstacles, OCR → haptic)** | ❌ | Not implemented. |
| **Screen reader / accessibility** | ✅ | sr-only intro, aria-live, BrailleCell buttons, Dictate. |

**Use case (doc):** Deaf-blind person receives conversation via wrist Braille; sends via tap or gesture.  
**Actual use case:** Receive: type or load Bridge message → feel Braille + vibrate. Send: dictate or tap Braille → Speak or Send to Bridge. **No hardware wristband; phone vibration/tone.**

---

## 3. CONTEXTAI — Intelligent Daily Assistant

| Doc feature | Status | Implementation / note |
|-------------|--------|------------------------|
| **Shopping: object recognition, product details** | ⚠️ Mock | Shopping assist: “Run OCR (mock)” → fixed list (e.g. Chicken Rice, Teh Tarik); TTS per line. No real camera OCR or product DB. |
| **Hawker: scan menu → read aloud** | ⚠️ Mock | Hawker: “Run OCR (mock)” → fixed menu; TTS per item. |
| **MRT: next trains + haptic turn cues** | ⚠️ Mock + ✅ | Mock arrivals list + TTS; **haptic turn left/right** (vibrate/tone) implemented. |
| **Scene understanding (e.g. “5 stalls ahead…”)** | ❌ | Not implemented. |
| **Document OCR + explain** | ❌ | No doc reading flow. |
| **Facial recognition (opt-in)** | ❌ | Not implemented. |
| **Navigation / wayfinding (AR, audio, haptic)** | ⚠️ Partial | MRT haptic turn cues only; no maps or real navigation. |
| **Emergency (sirens, SOS, danger)** | ❌ | Not implemented. |
| **“Who’s talking” / meeting mode** | ❌ | Not implemented. |

**Use case (doc):** Point camera at product/menu → get speech/haptic description.  
**Actual use case:** Run mock OCR in Shopping/Hawker/MRT → get list → TTS (and MRT haptic cues). **No real CV/OCR.**

---

## 4. LEARNING BRIDGE — Adaptive Education

| Doc feature | Status | Implementation / note |
|-------------|--------|------------------------|
| **Classroom: teacher speaks → subtitles + sign** | ✅ | Classroom mode: mic → live transcript + sign gloss; link to SignWave. |
| **Classroom: student signs → TTS** | ⚠️ Partial | Student can use SignWave (picker/mic) and send to Bridge; no in-classroom sign input. |
| **Sign Quest (gamified SgSL)** | ✅ | Quiz: question + 4 options (gloss), score, streak, play again. |
| **Multi-format content (video SgSL, audio desc, haptic)** | ❌ | No video/interactive multi-format lessons. |
| **Progress tracking / adaptive difficulty** | ❌ | No persistence of progress or difficulty. |
| **Peer-to-peer (deaf ↔ blind classmate)** | ⚠️ Partial | Bridge allows messaging across modes; no dedicated “classroom peer” UI. |

**Use case (doc):** Mainstream class with live SgSL + subtitles; students learn SgSL via games.  
**Actual use case:** Classroom: teacher mic → subtitles + gloss. Sign Quest: SgSL gloss quiz. **Fits doc for MVP.**

---

## 5. BRIDGE / MESSAGING

| Doc feature | Status | Implementation / note |
|-------------|--------|------------------------|
| **Real in-app messaging** | ✅ | `lib/message-store.ts`; conversations; send/receive; persisted. |
| **Send from SignWave / TouchSpeak** | ✅ | “Send to Bridge” from both; sign gloss stored when from SignWave. |
| **Receive in TouchSpeak (braille)** | ✅ | “Latest from Bridge”, “Receive in TouchSpeak” link, `?receive=`. |
| **Multi-person / group conversation** | ❌ | Single “other” (simulate reply); no multi-party or roles. |
| **Conversation list + unread** | ✅ | Sidebar, unread count, mark read. |

**Use case (doc):** Everyone talks through one platform; messages adapt to each user’s mode.  
**Actual use case:** One thread (or several); send from SignWave/TouchSpeak or compose; receive as text, speak, or load into TouchSpeak for braille. **Aligns with doc for MVP.**

---

## 6. ADAPTIVE UI / PERSONAS

| Doc feature | Status | Implementation / note |
|-------------|--------|------------------------|
| **Persona: Deaf / Blind / Deaf-blind / Helper** | ✅ | Onboarding + store; dashboard copy per persona. |
| **Deaf: camera-first, large visual** | ⚠️ Partial | Dashboard suggests SignWave; no layout change per persona. |
| **Blind: voice-first, screen reader** | ⚠️ Partial | TouchSpeak has Dictate, aria-labels; no app-wide voice nav. |
| **Deaf-blind: haptic-first, 4-option menu** | ❌ | Simulator describes it; no simplified 4-option layout. |
| **Helper: dual view, prompts** | ❌ | Persona exists; no special helper UI. |
| **Simulator: preview persona** | ✅ | Simulator page: preview + apply persona. |

**Use case (doc):** Interface morphs by ability.  
**Actual use case:** Persona changes dashboard tagline and preferences; Simulator shows adaptations. **No full layout/screen morph per persona.**

---

## 7. CONNECTORS & SINGAPORE

| Doc feature | Status | Implementation / note |
|-------------|--------|------------------------|
| **Zoom / Teams / Meet** | ⚠️ Mock | Connector page + subpage; no real integration. |
| **LTA / MRT** | ⚠️ Mock | Connector + MRT mock arrivals; no LTA API. |
| **Gov / SingPass** | ⚠️ Mock | Connector + secure modal; no SingPass. |
| **995 / SCDF, emergency** | ❌ | Not implemented. |
| **SADeaf / TOUCH Silent Club** | ❌ | Not in app. |
| **en-SG / Singapore locale** | ✅ | Speech recognition lang “en-SG”; Singapore-focused copy. |

---

## 8. DATA & CONFIG

| Item | Status |
|------|--------|
| SgSL signs | ✅ 112 signs in `sgsl_signs.json` (doc mentions 700+ for full vision) |
| Quick phrases | ✅ Used in SignWave + TouchSpeak |
| Home signs | ❌ `home_signs.json` empty; reserved for future; no UI |
| Rules | ✅ `/rules` = short “Adaptation rules” info (built-in persona behaviour). No sidebar link; no configurable rule editor. |

---

## Summary: What’s there vs doc

- **Fully aligned (use case works):**  
  SignWave (picker + mic → text/gloss/TTS/haptic, Send to Bridge), TouchSpeak (receive/send Braille + Dictate + Bridge), Bridge (real messaging, receive in TouchSpeak), Learning (Classroom + Sign Quest), ContextAI (mock Shopping/Hawker/MRT + MRT haptic), Personas + Simulator, Connectors (mock).
- **Partial / mock:**  
  No live sign-from-camera; no sign avatar; ContextAI is mock OCR; no real multi-dialect; no home signs UI; persona drives copy/preferences, not full layout.
- **Not implemented:**  
  MediaPipe/real sign recognition, AR, environmental/social haptic, facial recognition, emergency/SOS, document OCR, full adaptive layout (e.g. 4-option deaf-blind), real Zoom/LTA/SingPass.

---

## Recommended next steps (to better match doc)

1. **Copy and How to use**  
   Add a “Solution overview” that maps each module to the doc’s use cases (e.g. “SignWave: pick or speak → get text and sign gloss; send to Bridge”).

2. **Home signs**  
   Either wire `home_signs.json` into SignWave (e.g. “My signs” section) or remove reference until backend exists.

3. **ContextAI**  
   Keep mock but add one-line use-case text (e.g. “Point at product/menu — in production, OCR would read labels”).

4. **Persona layout**  
   Optional: one clear “deaf-blind” shortcut (e.g. dashboard or nav) to TouchSpeak + Bridge only (4 main actions).

5. **Doc disclaimer**  
   In README or How to use: “MVP: sign recognition is picker-based; ContextAI and Connectors are mock; full doc is the product vision.”

This audit reflects the repo as of the audit date; update as features ship.
