# 🎙️ Voice Assistant for Accessibility

An accessibility-first, agentic voice web assistant for users with vision and motor impairments. This Chrome extension enables natural language voice commands to navigate, interact with, and complete tasks on any website.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue.svg)
![Chrome Extension](https://img.shields.io/badge/Chrome-MV3-green.svg)

## 🌟 Features

### Core Capabilities
- **Natural Voice Commands**: Speak naturally to navigate websites (e.g., "click the login button", "fill this form with my details", "scroll down")
- **Intelligent Task Execution**: LLM-powered understanding of complex requests with step-by-step execution
- **Text-to-Speech Feedback**: Clear audio responses describing actions and page content
- **Real-time Page Analysis**: Continuous extraction of page structure, interactive elements, and form fields

### Voice Activation & Hands-Free Interaction
- **Wake Word Detection**: Say **"Hey Jarvis"** to activate — no buttons needed
- **Voice Activity Detection (VAD)**: Automatically stops recording when you stop speaking — no need to hold a button or say "stop"
- **Continuous Conversation Mode**: After the assistant responds, it automatically starts listening again for truly hands-free operation
- **Keyboard Shortcut**: **Ctrl+Shift+J** to toggle recording for keyboard-only users
- **Audio Feedback Tones**: Subtle audio cues for state transitions (recording start/stop, errors) so users know the system state without visual feedback
- **Auto-Announce Navigation**: When navigating to a new page, automatically announces the page title

### Accessibility Features
- **Voice-Controlled Page Adjustments**: Say "make text bigger", "high contrast", "dyslexia font", "simplify page", "large pointer" etc. to instantly adapt any page
- **High-Contrast UI**: Dark theme overlay panel with large, readable text
- **Switch Scanning Mode**: Next/Select navigation for users with motor impairments
- **Keyboard Navigation**: Full keyboard support with shortcuts
- **Screen Reader Compatible**: ARIA labels and live regions throughout
- **Reduced Motion Support**: Respects `prefers-reduced-motion` preference
- **Color Blind Modes**: Protanopia, deuteranopia, tritanopia filters
- **Focus Highlighting**: Enhanced focus outlines for keyboard navigation

### 🎨 Live Page Adaptation (Demo-Ready!)

**Disability Presets** — Say one phrase and the entire page transforms:
| Voice Command | What Happens |
|---|---|
| "I have low vision" | 175% text, high contrast, large pointer, focus highlights, links highlighted |
| "I have dyslexia" | OpenDyslexic font, larger text, extra word/line spacing, reading guide |
| "I have a motor impairment" | Large pointer, focus highlights, simplified layout, highlighted links |
| "I have trouble focusing" | Simplified page, bionic reading, no animations, reading guide |
| "I'm a senior" | Large text, large pointer, focus highlights, text magnifier |

**Advanced Visual Adaptations:**
- **Reading Guide**: Yellow highlight bar follows your cursor to help track lines
- **Bionic Reading**: Bolds the first half of each word for faster reading comprehension
- **Reading Mode**: Strips away everything except the article content, renders in clean serif font
- **Stop Animations**: Pauses all CSS animations, GIFs, and auto-playing videos
- **Highlight Links**: Makes every link bold red with thick underlines — impossible to miss
- **Text Magnifier**: Hover over any text to see it enlarged in a floating panel at the bottom
- **Image Descriptions**: Overlays alt text directly on images so you can see what they describe

**Page Accessibility Audit:**
- "Check this page for accessibility" → Scans for 8 categories of issues and reports a score (0-100)
- "Fix this page" → Automatically applies fixes for all detected issues
- Checks: missing alt text, low contrast, tiny text, missing form labels, no focus indicators, animations, complex layout, tight spacing

### Smart Form Filling
- **Deep Form Scanner**: Detects and parses Google Forms, HTML forms, and custom UIs into structured questions
- **Question-by-Question Filling**: LLM understands form structure, options, and can fill fields via natural language
- **Supports All Field Types**: Text, radio, checkbox, dropdown, date, linear scale
- **Custom Dropdown Handling**: Works with non-native dropdowns (Google Forms, React selects)

### Safety Features
- **Confirmation Gate**: Risky actions (submit, pay, delete, purchase) require explicit verbal confirmation
- **Grounded Actions**: Only interacts with elements verified in the current page state
- **Captcha/Login Detection**: Alerts users when manual intervention is needed
- **Action Verification**: Confirms each action's success before proceeding

## 📋 Prerequisites

- **Node.js** 18.0 or higher
- **npm** 9.0 or higher
- **Google Chrome** (latest version)
- **OpenAI API Key** with access to:
  - GPT-4o (for agent reasoning)
  - Whisper (for speech-to-text)

## 🚀 Quick Start

### 1. Clone or Download

```bash
cd voice-assistant
```

### 2. Set Up Environment Variable

Create a `.env` file in the server directory:

```bash
cd server
echo "OPENAI_API_KEY=your-api-key-here" > .env
```

Or export directly:

```bash
# Linux/macOS
export OPENAI_API_KEY=your-api-key-here

# Windows (PowerShell)
$env:OPENAI_API_KEY="your-api-key-here"

# Windows (CMD)
set OPENAI_API_KEY=your-api-key-here
```

### 3. Install Dependencies

```bash
# Install server dependencies
cd server
npm install

# Install extension dependencies
cd ../extension
npm install
```

### 4. Build the Project

```bash
# Build the server (from server directory)
cd ../server
npm run build

# Build the extension (from extension directory)
cd ../extension
npm run build
```

### 5. Create Extension Icons

The extension needs PNG icons. Create them by converting the SVG files:

```bash
# Option 1: Use an online converter for icon16.svg, icon48.svg, icon128.svg
# Place the PNG files in extension/public/icons/

# Option 2: Use ImageMagick if installed
cd extension/public/icons
convert icon16.svg icon16.png
convert icon48.svg icon48.png
convert icon128.svg icon128.png
```

Or simply replace with any 16x16, 48x48, and 128x128 PNG icons.

### 6. Start the Server

```bash
cd server
npm start
```

You should see:
```
╔══════════════════════════════════════════════════════════════╗
║   🎙️  Voice Assistant Server Running                         ║
║   HTTP:      http://localhost:3001                           ║
║   WebSocket: ws://localhost:3001/ws                          ║
╚══════════════════════════════════════════════════════════════╝
```

### 7. Load the Chrome Extension

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable **Developer mode** (toggle in top-right)
3. Click **Load unpacked**
4. Select the `extension/dist` folder
5. The Voice Assistant icon should appear in your toolbar

### 8. Grant Permissions

1. Click the extension icon or press `Ctrl+Shift+V`
2. When prompted, allow microphone access
3. The overlay panel will appear on the page

## 🎯 Usage

### Voice Commands

**Navigation:**
- "Where am I?" - Describes current page
- "What can I do?" - Lists available actions
- "Scroll down/up" - Scrolls the page
- "Go back" - Previous page

**Interaction:**
- "Click [button name]" - Clicks a button or link
- "Click the search button"
- "Open the menu"

**Forms:**
- "Fill this form with my profile" - Auto-fills using stored profile
- "Type [text] in [field]" - Types into a specific field
- "Select [option] from [dropdown]" - Selects dropdown option

**Reading:**
- "Read the [section name]" - Reads section content
- "What does it say about [topic]?" - Finds and reads relevant content

**Control:**
- "Repeat" - Repeats last response
- "Slower" - Slows down speech
- "Stop" - Stops speaking

### Push-to-Talk

1. Click and **hold** the "Hold to Talk" button
2. Speak your command
3. Release to send

### Switch Scanning Mode

1. Click "Switch Scan" to enable
2. Press **Space/Tab** to cycle through elements
3. Press **Enter** to select
4. Press **Escape** to disable

### Keyboard Shortcuts

- `Ctrl+Shift+V` - Toggle overlay panel
- `Space` (in scanning mode) - Next element
- `Enter` (in scanning mode) - Select element
- `Escape` (in scanning mode) - Exit scanning

## 📁 Project Structure

```
voice-assistant/
├── extension/                 # Chrome Extension
│   ├── public/
│   │   ├── manifest.json     # Extension manifest
│   │   ├── overlay.css       # Overlay styles
│   │   └── icons/            # Extension icons
│   ├── src/
│   │   ├── content/
│   │   │   ├── index.ts      # Main content script
│   │   │   ├── pageMap.ts    # DOM analysis
│   │   │   ├── tools.ts      # Action executors
│   │   │   ├── overlay.ts    # UI component
│   │   │   ├── tts.ts        # Text-to-speech
│   │   │   └── switchScanning.ts
│   │   ├── background/
│   │   │   └── index.ts      # Service worker
│   │   └── types.ts          # TypeScript types
│   └── dist/                  # Build output
│
├── server/                    # Node.js Backend
│   ├── src/
│   │   ├── index.ts          # Express + WebSocket server
│   │   ├── websocket.ts      # WS message handling
│   │   ├── llm.ts            # OpenAI integration
│   │   ├── transcribe.ts     # Whisper transcription
│   │   ├── tools.ts          # Tool definitions
│   │   └── types.ts          # TypeScript types
│   ├── profile.json          # Demo user profile
│   └── dist/                  # Build output
│
└── shared/                    # Shared types
    └── types.ts
```

## 🧪 Demo Scenarios

### 1. Google Search

1. Navigate to https://google.com
2. Say: "Type 'accessible web design' in the search box"
3. Say: "Click the search button"

### 2. Wikipedia Navigation

1. Navigate to https://en.wikipedia.org
2. Say: "Where am I?"
3. Say: "What can I do?"
4. Say: "Search for accessibility"
5. Say: "Read the first section"

### 3. Form Filling (Example Contact Form)

1. Navigate to any contact form page
2. Say: "Fill this form with my profile"
3. Review the filled fields
4. Say: "Click the submit button"
5. (You'll be asked to confirm: "Say 'confirm' to proceed")
6. Say: "Confirm" or "Cancel"

### 4. E-commerce (Read-Only Demo)

1. Navigate to any e-commerce site
2. Say: "What products are available?"
3. Say: "Click on the first product"
4. Say: "Read the product description"

## ⚙️ Configuration

### User Profile

Edit `server/profile.json` to customize auto-fill data:

```json
{
  "firstName": "Your Name",
  "lastName": "Last Name",
  "email": "your@email.com",
  "phone": "+1-555-000-0000",
  "address": {
    "street": "123 Main St",
    "city": "City",
    "state": "ST",
    "zip": "00000",
    "country": "Country"
  }
}
```

### Server Port

Change the default port (3001) via environment variable:

```bash
PORT=3002 npm start
```

Update `SERVER_URL` and `WS_URL` in `extension/src/content/index.ts` accordingly.

## 🔧 Development

### Watch Mode

```bash
# Server (auto-restart on changes)
cd server
npm run dev

# Extension (auto-rebuild on changes)
cd extension
npm run dev
```

After extension rebuild, click the refresh icon in `chrome://extensions/`.

### Debugging

- **Extension Console**: Right-click the page → Inspect → Console (look for `[VoiceAssistant]` logs)
- **Background Script**: Go to `chrome://extensions/` → Voice Assistant → "service worker" link
- **Server Logs**: Check terminal running the server

## 🛡️ Safety Implementation

### Risky Action Keywords

Actions containing these words require confirmation:
- submit, pay, purchase, buy, send
- delete, remove, cancel, unsubscribe
- checkout, confirm, place order, complete, finalize

### Confirmation Flow

1. LLM detects risky action
2. User hears: "I'm about to [action]. Say 'confirm' to proceed or 'cancel' to stop."
3. User must say "confirm", "yes", "proceed", etc. to continue
4. "Cancel", "no", "stop", etc. aborts the action

## ⚠️ Known Limitations

- Requires active internet connection for OpenAI API
- Cannot bypass CAPTCHA or 2FA (alerts user to handle manually)
- Audio recording requires HTTPS or localhost
- Some dynamic/SPA pages may need manual page refresh
- Voice recognition works best in quiet environments

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details.

## 🙏 Acknowledgments

- OpenAI for GPT-4 and Whisper APIs
- Chrome Extensions team for Manifest V3
- Web Accessibility Initiative (WAI) for ARIA guidelines
