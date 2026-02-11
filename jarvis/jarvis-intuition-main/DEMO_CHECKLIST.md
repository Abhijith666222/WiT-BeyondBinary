# 🧪 Demo Checklist

Use this checklist to verify all features work correctly before a demo or presentation.

## Pre-Demo Setup

- [ ] Server is running (`npm start` in server directory)
- [ ] Extension is loaded in Chrome (unpacked from `extension/dist`)
- [ ] Microphone permissions granted
- [ ] `OPENAI_API_KEY` environment variable is set
- [ ] Test page loaded in browser

## Core Functionality Tests

### 1. Connection Test
- [ ] Open any webpage
- [ ] Click extension icon or press `Ctrl+Shift+V`
- [ ] Overlay panel appears
- [ ] Status shows "Ready"
- [ ] Console shows `[VoiceAssistant] WebSocket connected`

### 2. Push-to-Talk Test
- [ ] Hold the "Hold to Talk" button
- [ ] Status changes to "Recording..."
- [ ] Speak: "Where am I?"
- [ ] Release button
- [ ] Status changes to "Thinking..."
- [ ] Assistant speaks the page title/URL
- [ ] Transcript shows in panel

### 3. Voice Commands Test

| Command | Expected Result |
|---------|-----------------|
| "Where am I?" | Speaks page title and URL |
| "What can I do?" | Lists available actions |
| "Scroll down" | Page scrolls down |
| "Scroll up" | Page scrolls up |
| "Go back" | Navigates to previous page |
| "Repeat" | Repeats last response |
| "Slower" | Slows speech rate |
| "Stop" | Stops speaking |

### 4. Click Test (on Wikipedia)
- [ ] Navigate to https://en.wikipedia.org
- [ ] Say: "Click on the search box"
- [ ] Search input gets focused
- [ ] Say: "Type accessibility"
- [ ] Text appears in search
- [ ] Say: "Click the search button"
- [ ] Search results appear

### 5. Form Fill Test
- [ ] Navigate to a form page (e.g., https://jqueryvalidation.org/demo/)
- [ ] Say: "Fill this form with my profile"
- [ ] Fields populate with profile data
- [ ] Check firstName, lastName, email filled correctly

### 6. Safety Confirmation Test
- [ ] Navigate to a page with a submit button
- [ ] Say: "Click the submit button"
- [ ] Assistant asks for confirmation
- [ ] Say: "Cancel"
- [ ] Action is cancelled
- [ ] Say: "Click the submit button" again
- [ ] Say: "Confirm"
- [ ] Button is clicked

## Switch Scanning Tests

### 7. Enable Switch Scanning
- [ ] Click "Switch Scan" button
- [ ] Button shows as active
- [ ] Announcement: "Switch scanning enabled"
- [ ] Press Space or Tab
- [ ] First element highlights (green border)
- [ ] Label is spoken

### 8. Navigate Elements
- [ ] Press Space repeatedly
- [ ] Different elements highlight in sequence
- [ ] Each element's label is announced
- [ ] Press Shift+Space
- [ ] Goes to previous element

### 9. Select Element
- [ ] Highlight a button
- [ ] Press Enter
- [ ] Button is clicked
- [ ] Result is announced

### 10. Disable Scanning
- [ ] Press Escape
- [ ] Highlight disappears
- [ ] "Switch scanning disabled" announcement

## Accessibility Tests

### 11. Keyboard Navigation
- [ ] Press `Ctrl+Shift+V` to toggle overlay
- [ ] Tab navigates through overlay controls
- [ ] Focus indicators visible (outline)

### 12. High Contrast
- [ ] Enable high contrast mode in OS settings
- [ ] Overlay adapts colors
- [ ] All text readable

### 13. Screen Reader
- [ ] Enable screen reader
- [ ] Overlay elements announced correctly
- [ ] Status updates announced (live regions)

## Edge Cases

### 14. Login Page Detection
- [ ] Navigate to a login page
- [ ] Say: "Where am I?"
- [ ] Mentions "login page" detection

### 15. CAPTCHA Detection
- [ ] Navigate to a page with CAPTCHA
- [ ] Assistant alerts about CAPTCHA requiring manual handling

### 16. Element Not Found
- [ ] Say: "Click the nonexistent button"
- [ ] Assistant explains element not found

### 17. Disabled Element
- [ ] Find a disabled button
- [ ] Say: "Click the [disabled button name]"
- [ ] Assistant explains it's disabled

## Performance

### 18. Page Load
- [ ] Navigate to a complex page
- [ ] Page map updates within 2 seconds
- [ ] No visible lag in overlay

### 19. Multiple Tabs
- [ ] Open assistant in multiple tabs
- [ ] Each tab works independently
- [ ] No cross-tab interference

## Recovery

### 20. Server Disconnect
- [ ] Stop the server
- [ ] Extension shows disconnection message
- [ ] Restart server
- [ ] Extension reconnects automatically

### 21. API Error
- [ ] Invalid API key scenario
- [ ] User receives error message
- [ ] Extension remains functional for retry

## Demo Flow Suggestion

For a live demo, follow this flow:

1. **Introduction** (30 sec)
   - Show the overlay panel
   - Explain accessibility focus

2. **Basic Interaction** (1 min)
   - "Where am I?" on Wikipedia
   - "What can I do?"
   - Click a link by voice

3. **Form Filling** (1 min)
   - Navigate to a form
   - "Fill this form with my profile"
   - Show auto-population

4. **Safety Demo** (45 sec)
   - Try to submit
   - Show confirmation request
   - Demonstrate cancel and confirm

5. **Switch Scanning** (1 min)
   - Enable switch scan
   - Navigate through elements
   - Select an action

6. **Q&A** (as needed)

## Troubleshooting Quick Reference

| Issue | Solution |
|-------|----------|
| No audio output | Check system volume, try different voice |
| Microphone not working | Check Chrome permissions, ensure HTTPS/localhost |
| WebSocket not connecting | Verify server is running on port 3001 |
| Actions not working | Refresh page, check element exists in page map |
| Slow response | Check API key, OpenAI service status |

---

**Demo Ready Checklist Complete!** ✅

Print this page and use during demo for reference.
