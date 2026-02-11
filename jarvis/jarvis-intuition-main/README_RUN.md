# Voice Assistant (fixed build)

## What I changed
- **Fixed the exact TS/runtime issues shown in your screenshot** by adding a backward‑compatible message handler that supports older message types:
  - `assistant_response`
  - `tool_command`
  - direct `status_update` / `speak`
  This prevents the UI from getting stuck at **"thinking"** when the background/content scripts are out of sync.
- **Patched the shipped extension build** (`extension/dist/content.js`) with the same back‑compat logic, so you don’t need to rebuild.
- **Built the server** to `server/dist/` so you can run it with `npm run start`.

## Run the backend
1) Create `server/.env` (or copy from `.env.example`) and set your OpenAI key:

```bash
cd server
cp .env.example .env
# edit .env and set OPENAI_API_KEY
```

2) Start the server:

```bash
cd server
npm run start
```

Expected:
- HTTP: `http://localhost:3001`
- WS: `ws://localhost:3001/ws`

## Load the Chrome extension
1) Open Chrome → `chrome://extensions`
2) Enable **Developer mode**
3) Click **Load unpacked**
4) Select this folder:

```
voice-assistant/extension/dist
```

## Quick sanity check
- Open any normal HTTPS website (not `chrome://` pages).
- Click the extension icon to toggle the overlay.
- Hold **Hold to Talk**, say: “What can I do?”
- You should hear a response and see status return to **idle**.

## If it still gets stuck
Open:
- Chrome DevTools → **Console** on the page
- Service Worker logs for the extension

Look for:
- `[BG] WS not open; dropping ...` (background can’t reach server)
- `[WS] LLM error:` (server can’t reach OpenAI / bad key)

