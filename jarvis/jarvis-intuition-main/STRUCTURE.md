# Project Structure

```
voice-assistant/
├── extension/                    # Chrome Extension (Manifest V3)
│   ├── manifest.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── package.json
│   ├── src/
│   │   ├── content/
│   │   │   ├── content.ts        # Main content script
│   │   │   ├── pageMap.ts        # DOM analysis & page_map generation
│   │   │   ├── toolExecutor.ts   # Execute browser actions
│   │   │   └── styles.css        # Overlay styles
│   │   ├── background/
│   │   │   └── background.ts     # Service worker
│   │   ├── overlay/
│   │   │   ├── Overlay.ts        # UI component class
│   │   │   └── SwitchScanner.ts  # Switch scanning mode
│   │   ├── audio/
│   │   │   └── AudioRecorder.ts  # Push-to-talk recording
│   │   ├── types/
│   │   │   └── index.ts          # Shared types
│   │   └── utils/
│   │       ├── tts.ts            # Text-to-speech wrapper
│   │       └── accessibility.ts  # A11y helpers
│   └── dist/                     # Build output (generated)
│
├── server/                       # Node.js Backend
│   ├── package.json
│   ├── tsconfig.json
│   ├── src/
│   │   ├── index.ts              # Express + WebSocket server
│   │   ├── routes/
│   │   │   └── audio.ts          # Audio transcription endpoint
│   │   ├── services/
│   │   │   ├── llm.ts            # OpenAI LLM integration
│   │   │   ├── transcription.ts  # Whisper transcription
│   │   │   └── agent.ts          # Agent loop & state management
│   │   ├── tools/
│   │   │   └── definitions.ts    # Tool schemas for OpenAI
│   │   └── types/
│   │       └── index.ts          # Shared types
│   └── dist/                     # Build output (generated)
│
├── shared/                       # Shared types & constants
│   └── types.ts
│
├── profile.json                  # Demo user profile
├── README.md                     # Documentation
└── DEMO_CHECKLIST.md            # Testing checklist
```
