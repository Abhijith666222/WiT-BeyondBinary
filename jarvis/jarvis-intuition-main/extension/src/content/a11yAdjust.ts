// Page accessibility adjustment tools
// Allows voice-controlled modification of any page's appearance

interface AccessibilityState {
  fontSize: number;
  highContrast: boolean;
  lineSpacing: number;
  wordSpacing: number;
  dyslexiaFont: boolean;
  focusHighlight: boolean;
  colorBlindMode: 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia';
  simplified: boolean;
  largePointer: boolean;
  readingGuide: boolean;
  bionicReading: boolean;
  readingMode: boolean;
  stopAnimations: boolean;
  highlightLinks: boolean;
  textMagnifier: boolean;
  imageDescriptions: boolean;
}

let currentState: AccessibilityState = {
  fontSize: 1.0,
  highContrast: false,
  lineSpacing: 1.0,
  wordSpacing: 1.0,
  dyslexiaFont: false,
  focusHighlight: false,
  colorBlindMode: 'none',
  simplified: false,
  largePointer: false,
  readingGuide: false,
  bionicReading: false,
  readingMode: false,
  stopAnimations: false,
  highlightLinks: false,
  textMagnifier: false,
  imageDescriptions: false,
};

let styleElement: HTMLStyleElement | null = null;
let readingGuideElement: HTMLElement | null = null;
let magnifierElement: HTMLElement | null = null;
let bionicReadingOriginals: WeakMap<Node, string> = new WeakMap();
let imageOverlays: HTMLElement[] = [];

function ensureStyleElement(): HTMLStyleElement {
  if (!styleElement) {
    styleElement = document.createElement('style');
    styleElement.id = 'va-accessibility-styles';
    document.head.appendChild(styleElement);
  }
  return styleElement;
}

// ==========================================
// Reading Guide — horizontal highlight follows cursor
// ==========================================

function createReadingGuide(): void {
  if (readingGuideElement) return;
  readingGuideElement = document.createElement('div');
  readingGuideElement.id = 'va-reading-guide';
  readingGuideElement.setAttribute('aria-hidden', 'true');
  Object.assign(readingGuideElement.style, {
    position: 'fixed',
    left: '0',
    width: '100vw',
    height: '48px',
    background: 'linear-gradient(to bottom, transparent 0%, rgba(255,255,0,0.15) 30%, rgba(255,255,0,0.15) 70%, transparent 100%)',
    borderTop: '2px solid rgba(255, 200, 0, 0.4)',
    borderBottom: '2px solid rgba(255, 200, 0, 0.4)',
    pointerEvents: 'none',
    zIndex: '2147483640',
    transition: 'top 0.08s ease-out',
    display: 'none',
  });
  document.body.appendChild(readingGuideElement);
}

function readingGuideMouseHandler(e: MouseEvent): void {
  if (readingGuideElement) {
    readingGuideElement.style.top = `${e.clientY - 24}px`;
    readingGuideElement.style.display = 'block';
  }
}

function enableReadingGuide(): void {
  createReadingGuide();
  document.addEventListener('mousemove', readingGuideMouseHandler, { passive: true });
  if (readingGuideElement) readingGuideElement.style.display = 'block';
}

function disableReadingGuide(): void {
  document.removeEventListener('mousemove', readingGuideMouseHandler);
  if (readingGuideElement) readingGuideElement.style.display = 'none';
}

// ==========================================
// Bionic Reading — bold first half of each word
// ==========================================

function applyBionicReading(): void {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
    acceptNode: (node) => {
      const parent = node.parentElement;
      if (!parent) return NodeFilter.FILTER_REJECT;
      if (parent.closest('script, style, noscript, #voice-assistant-overlay, .va-bionic-processed, textarea, input, select, code, pre')) {
        return NodeFilter.FILTER_REJECT;
      }
      if (!node.textContent || node.textContent.trim().length < 2) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    }
  });

  const textNodes: Text[] = [];
  let node: Node | null;
  while ((node = walker.nextNode())) {
    textNodes.push(node as Text);
  }

  for (const textNode of textNodes) {
    const text = textNode.textContent || '';
    if (!text.trim()) continue;
    bionicReadingOriginals.set(textNode, text);

    const fragment = document.createDocumentFragment();
    const parts = text.split(/(\s+)/);

    for (const part of parts) {
      if (/^\s+$/.test(part) || part.length === 0) {
        fragment.appendChild(document.createTextNode(part));
        continue;
      }
      const boldLen = Math.max(1, Math.ceil(part.length * 0.5));
      const span = document.createElement('span');
      span.classList.add('va-bionic-processed');
      const b = document.createElement('b');
      b.style.fontWeight = '700';
      b.textContent = part.slice(0, boldLen);
      span.appendChild(b);
      const rest = part.slice(boldLen);
      if (rest) span.appendChild(document.createTextNode(rest));
      fragment.appendChild(span);
    }
    textNode.parentNode?.replaceChild(fragment, textNode);
  }
}

function removeBionicReading(): void {
  const processed = document.querySelectorAll('.va-bionic-processed');
  processed.forEach((span) => {
    const text = span.textContent || '';
    span.parentNode?.replaceChild(document.createTextNode(text), span);
  });
  bionicReadingOriginals = new WeakMap();
}

// ==========================================
// Text Magnifier — enlarged text at bottom of screen on hover
// ==========================================

function createMagnifier(): void {
  if (magnifierElement) return;
  magnifierElement = document.createElement('div');
  magnifierElement.id = 'va-text-magnifier';
  magnifierElement.setAttribute('aria-hidden', 'true');
  Object.assign(magnifierElement.style, {
    position: 'fixed',
    bottom: '80px',
    left: '50%',
    transform: 'translateX(-50%)',
    maxWidth: '80vw',
    minWidth: '200px',
    padding: '16px 24px',
    background: '#1a1a2e',
    color: '#fff',
    fontSize: '28px',
    lineHeight: '1.5',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    borderRadius: '12px',
    border: '2px solid #4cc9f0',
    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
    pointerEvents: 'none',
    zIndex: '2147483641',
    display: 'none',
    textAlign: 'center',
    wordBreak: 'break-word',
    transition: 'opacity 0.15s',
  });
  document.body.appendChild(magnifierElement);
}

let magnifierTimeout: ReturnType<typeof setTimeout> | null = null;

function magnifierMouseHandler(e: MouseEvent): void {
  if (!magnifierElement) return;
  if (magnifierTimeout) clearTimeout(magnifierTimeout);

  const target = e.target as HTMLElement;
  if (!target || target.closest('#voice-assistant-overlay, #va-text-magnifier, #va-reading-guide')) {
    magnifierElement.style.display = 'none';
    return;
  }

  let text = '';
  if (target.childNodes.length <= 5) {
    text = (target.textContent || '').trim();
  }
  if (!text || text.length > 300) {
    const nearest = target.closest('p, h1, h2, h3, h4, h5, h6, li, td, th, span, a, label, button');
    text = nearest ? (nearest.textContent || '').trim() : '';
  }

  if (text && text.length > 2 && text.length < 500) {
    magnifierElement.textContent = text.length > 200 ? text.slice(0, 200) + '…' : text;
    magnifierElement.style.display = 'block';
    magnifierTimeout = setTimeout(() => {
      if (magnifierElement) magnifierElement.style.display = 'none';
    }, 3000);
  } else {
    magnifierElement.style.display = 'none';
  }
}

function enableTextMagnifier(): void {
  createMagnifier();
  document.addEventListener('mouseover', magnifierMouseHandler, { passive: true });
}

function disableTextMagnifier(): void {
  document.removeEventListener('mouseover', magnifierMouseHandler);
  if (magnifierElement) magnifierElement.style.display = 'none';
  if (magnifierTimeout) clearTimeout(magnifierTimeout);
}

// ==========================================
// Image descriptions — overlay alt text on images
// ==========================================

function showImageDescriptions(): void {
  removeImageDescriptions();
  const images = document.querySelectorAll('img[alt]:not([alt=""])');
  images.forEach((img) => {
    const imgEl = img as HTMLImageElement;
    const alt = imgEl.alt?.trim();
    if (!alt || alt.length < 3) return;
    if (imgEl.closest('#voice-assistant-overlay')) return;

    const parent = imgEl.parentElement;
    if (!parent) return;
    const parentPos = getComputedStyle(parent).position;
    if (parentPos === 'static') parent.style.position = 'relative';

    const overlay = document.createElement('div');
    overlay.className = 'va-img-description-overlay';
    Object.assign(overlay.style, {
      position: 'absolute',
      bottom: '0', left: '0', right: '0',
      padding: '8px 12px',
      background: 'rgba(0, 0, 0, 0.85)',
      color: '#fff',
      fontSize: '14px',
      lineHeight: '1.4',
      fontFamily: 'system-ui, sans-serif',
      zIndex: '1000',
      pointerEvents: 'none',
      borderRadius: '0 0 4px 4px',
      maxHeight: '60px',
      overflow: 'hidden',
    });
    overlay.textContent = `🖼️ ${alt}`;
    parent.appendChild(overlay);
    imageOverlays.push(overlay);
  });
}

function removeImageDescriptions(): void {
  imageOverlays.forEach(el => el.remove());
  imageOverlays = [];
}

// ==========================================
// Stop animations
// ==========================================

function stopPageAnimations(): void {
  document.querySelectorAll('video').forEach(v => { try { v.pause(); } catch (_) {} });
  document.querySelectorAll('audio').forEach(a => { try { a.pause(); } catch (_) {} });
  document.querySelectorAll('img').forEach(img => {
    const imgEl = img as HTMLImageElement;
    if (imgEl.src && (imgEl.src.endsWith('.gif') || imgEl.src.includes('.gif?'))) {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = imgEl.naturalWidth || imgEl.width;
        canvas.height = imgEl.naturalHeight || imgEl.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(imgEl, 0, 0);
          imgEl.dataset.vaOrigSrc = imgEl.src;
          imgEl.src = canvas.toDataURL('image/png');
        }
      } catch (_) {}
    }
  });
}

function restorePageAnimations(): void {
  document.querySelectorAll('img[data-va-orig-src]').forEach(img => {
    const imgEl = img as HTMLImageElement;
    if (imgEl.dataset.vaOrigSrc) {
      imgEl.src = imgEl.dataset.vaOrigSrc;
      delete imgEl.dataset.vaOrigSrc;
    }
  });
}

// ==========================================
// CSS stylesheet builder
// ==========================================

function applyStyles(): void {
  const el = ensureStyleElement();
  let css = '';

  if (currentState.fontSize !== 1.0) {
    css += `html { font-size: ${currentState.fontSize * 100}% !important; }\n`;
  }

  if (currentState.highContrast) {
    css += `
      body { background: #000 !important; color: #fff !important; }
      body * { background-color: #000 !important; color: #fff !important; border-color: #fff !important; }
      body a, body a * { color: #4fc3f7 !important; text-decoration: underline !important; }
      body button, body [role="button"], body input[type="submit"], body input[type="button"] {
        background-color: #1565c0 !important; color: #fff !important; border: 2px solid #fff !important;
      }
      body input, body textarea, body select {
        background-color: #1a1a1a !important; color: #fff !important; border: 2px solid #90caf9 !important;
      }
      body img { filter: contrast(1.2) brightness(0.9) !important; }
      #voice-assistant-overlay, #voice-assistant-overlay * { all: revert !important; }
    `;
  }

  if (currentState.lineSpacing !== 1.0) {
    css += `
      body, body p, body li, body td, body span, body div {
        line-height: ${currentState.lineSpacing * 1.6} !important;
        letter-spacing: ${(currentState.lineSpacing - 1) * 0.5}px !important;
      }
    `;
  }

  if (currentState.wordSpacing !== 1.0) {
    css += `body, body * { word-spacing: ${(currentState.wordSpacing - 1) * 8}px !important; }\n`;
  }

  if (currentState.dyslexiaFont) {
    css += `
      @font-face {
        font-family: 'OpenDyslexic';
        src: url('https://cdn.jsdelivr.net/npm/open-dyslexic@1.0.3/woff/OpenDyslexic-Regular.woff') format('woff');
        font-weight: normal;
      }
      @font-face {
        font-family: 'OpenDyslexic';
        src: url('https://cdn.jsdelivr.net/npm/open-dyslexic@1.0.3/woff/OpenDyslexic-Bold.woff') format('woff');
        font-weight: bold;
      }
      body, body * { font-family: 'OpenDyslexic', 'Comic Sans MS', 'Verdana', sans-serif !important; }
    `;
  }

  if (currentState.focusHighlight) {
    css += `
      *:focus { outline: 4px solid #ff6600 !important; outline-offset: 3px !important; box-shadow: 0 0 12px rgba(255, 102, 0, 0.6) !important; }
      a:hover, button:hover, [role="button"]:hover { outline: 3px solid #ff6600 !important; outline-offset: 2px !important; }
    `;
  }

  if (currentState.colorBlindMode !== 'none') {
    const filterMap: Record<string, string> = {
      protanopia: 'saturate(0.8) hue-rotate(-20deg)',
      deuteranopia: 'saturate(0.9) hue-rotate(20deg) contrast(1.1)',
      tritanopia: 'saturate(0.85) hue-rotate(180deg)',
    };
    css += `html { filter: ${filterMap[currentState.colorBlindMode]} !important; }
      #voice-assistant-overlay { filter: none !important; }\n`;
  }

  if (currentState.simplified) {
    css += `
      header nav:not(:first-of-type), aside, [role="complementary"],
      [role="banner"] ~ [role="banner"], footer,
      .ad, .ads, .advertisement, [class*="advert"],
      .sidebar, [class*="sidebar"], .popup, .modal-backdrop,
      [class*="cookie"], [class*="consent"],
      [class*="newsletter"], [class*="subscribe"],
      [class*="social-share"], [class*="share-button"],
      iframe:not([title]), .comments-section,
      [class*="related-posts"], [aria-hidden="true"] {
        display: none !important;
      }
      main, [role="main"], article, .content, #content {
        max-width: 800px !important; margin: 0 auto !important; width: 100% !important; padding: 20px !important;
      }
    `;
  }

  if (currentState.largePointer) {
    css += `
      * { cursor: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='48' height='48' viewBox='0 0 48 48'%3E%3Cpath d='M8 4l28 20H20l-4 16z' fill='black' stroke='white' stroke-width='2'/%3E%3C/svg%3E") 8 4, auto !important; }
      a, button, [role="button"], input, select, textarea, label {
        cursor: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='48' height='48' viewBox='0 0 48 48'%3E%3Cpath d='M16 4v32M4 24h24' fill='none' stroke='black' stroke-width='4'/%3E%3Cpath d='M16 4v32M4 24h24' fill='none' stroke='white' stroke-width='2'/%3E%3C/svg%3E") 16 24, pointer !important;
      }
    `;
  }

  if (currentState.readingMode) {
    css += `
      body { background: #fafaf7 !important; color: #2c2c2c !important; }
      body > *:not(main):not(article):not([role="main"]):not(#voice-assistant-overlay):not(#va-reading-guide):not(#va-text-magnifier):not(.va-img-description-overlay) {
        display: none !important;
      }
      body > main, body > article, body > [role="main"] { display: block !important; }
      main, article, [role="main"], .content, #content, .post, .entry-content, .article-body {
        display: block !important; max-width: 680px !important; margin: 40px auto !important;
        padding: 40px !important; background: #fff !important; color: #2c2c2c !important;
        font-family: Georgia, 'Times New Roman', 'Noto Serif', serif !important;
        font-size: 20px !important; line-height: 1.8 !important;
        border-radius: 8px !important; box-shadow: 0 2px 20px rgba(0,0,0,0.08) !important;
      }
      main *, article *, [role="main"] * { color: #2c2c2c !important; background: transparent !important; font-family: inherit !important; max-width: 100% !important; }
      main h1, main h2, main h3, article h1, article h2, article h3 {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif !important;
        color: #1a1a1a !important; margin-top: 1.5em !important; margin-bottom: 0.5em !important;
      }
      main h1, article h1 { font-size: 2em !important; }
      main h2, article h2 { font-size: 1.5em !important; }
      main p, article p { margin-bottom: 1.2em !important; }
      main a, article a { color: #1a73e8 !important; text-decoration: underline !important; }
      main img, article img { max-width: 100% !important; height: auto !important; border-radius: 8px !important; margin: 16px 0 !important; }
      nav, aside, footer, [role="complementary"], [class*="sidebar"],
      [class*="advert"], [class*="social"], [class*="share"],
      [class*="comment"], [class*="related"], [class*="newsletter"] { display: none !important; }
      #voice-assistant-overlay, #voice-assistant-overlay * { all: revert !important; }
    `;
  }

  if (currentState.stopAnimations) {
    css += `
      *, *::before, *::after { animation: none !important; animation-duration: 0s !important; transition: none !important; transition-duration: 0s !important; }
      #voice-assistant-overlay *, #voice-assistant-overlay *::before, #voice-assistant-overlay *::after { transition: all 0.2s ease !important; }
      video, [class*="carousel"], [class*="slider"], [class*="marquee"] { animation-play-state: paused !important; }
    `;
  }

  if (currentState.highlightLinks) {
    css += `
      a, a *, [role="link"], [role="link"] * {
        color: #d32f2f !important; text-decoration: underline !important;
        text-decoration-thickness: 3px !important; text-underline-offset: 4px !important;
        text-decoration-color: #d32f2f !important; font-weight: bold !important;
        background: rgba(211, 47, 47, 0.08) !important; padding: 2px 4px !important; border-radius: 3px !important;
      }
      a:hover, [role="link"]:hover { background: rgba(211, 47, 47, 0.2) !important; outline: 2px solid #d32f2f !important; outline-offset: 2px !important; }
      a:visited, a:visited * { color: #7b1fa2 !important; text-decoration-color: #7b1fa2 !important; background: rgba(123, 31, 162, 0.08) !important; }
      #voice-assistant-overlay a, #voice-assistant-overlay a * { all: revert !important; }
    `;
  }

  el.textContent = css;
}

// ==========================================
// Main executor
// ==========================================

export function executeAccessibilityAdjustment(adjustment: string, value?: string): { success: boolean; message: string; currentState: AccessibilityState } {
  const adj = adjustment.toLowerCase().trim();

  switch (adj) {
    case 'increase_font':
    case 'larger_text':
    case 'bigger_text': {
      currentState.fontSize = Math.min(currentState.fontSize + 0.25, 3.0);
      applyStyles();
      return { success: true, message: `Font size increased to ${Math.round(currentState.fontSize * 100)}%`, currentState };
    }
    case 'decrease_font':
    case 'smaller_text': {
      currentState.fontSize = Math.max(currentState.fontSize - 0.25, 0.5);
      applyStyles();
      return { success: true, message: `Font size decreased to ${Math.round(currentState.fontSize * 100)}%`, currentState };
    }
    case 'reset_font': {
      currentState.fontSize = 1.0;
      applyStyles();
      return { success: true, message: 'Font size reset to default', currentState };
    }
    case 'high_contrast':
    case 'toggle_contrast': {
      currentState.highContrast = !currentState.highContrast;
      applyStyles();
      return { success: true, message: currentState.highContrast ? 'High contrast mode enabled' : 'High contrast mode disabled', currentState };
    }
    case 'increase_spacing': {
      currentState.lineSpacing = Math.min(currentState.lineSpacing + 0.25, 3.0);
      applyStyles();
      return { success: true, message: `Line spacing increased to ${Math.round(currentState.lineSpacing * 100)}%`, currentState };
    }
    case 'decrease_spacing': {
      currentState.lineSpacing = Math.max(currentState.lineSpacing - 0.25, 0.75);
      applyStyles();
      return { success: true, message: `Line spacing decreased to ${Math.round(currentState.lineSpacing * 100)}%`, currentState };
    }
    case 'increase_word_spacing': {
      currentState.wordSpacing = Math.min(currentState.wordSpacing + 0.5, 4.0);
      applyStyles();
      return { success: true, message: `Word spacing increased to ${Math.round(currentState.wordSpacing * 100)}%`, currentState };
    }
    case 'decrease_word_spacing': {
      currentState.wordSpacing = Math.max(currentState.wordSpacing - 0.5, 1.0);
      applyStyles();
      return { success: true, message: `Word spacing decreased to ${Math.round(currentState.wordSpacing * 100)}%`, currentState };
    }
    case 'dyslexia_font':
    case 'toggle_dyslexia': {
      currentState.dyslexiaFont = !currentState.dyslexiaFont;
      applyStyles();
      return { success: true, message: currentState.dyslexiaFont ? 'Dyslexia-friendly font enabled' : 'Dyslexia-friendly font disabled', currentState };
    }
    case 'focus_highlight':
    case 'toggle_focus': {
      currentState.focusHighlight = !currentState.focusHighlight;
      applyStyles();
      return { success: true, message: currentState.focusHighlight ? 'Focus highlighting enabled' : 'Focus highlighting disabled', currentState };
    }
    case 'simplify':
    case 'toggle_simplify': {
      currentState.simplified = !currentState.simplified;
      applyStyles();
      return { success: true, message: currentState.simplified ? 'Page simplified — non-essential elements hidden' : 'Page restored to normal layout', currentState };
    }
    case 'large_pointer':
    case 'toggle_pointer': {
      currentState.largePointer = !currentState.largePointer;
      applyStyles();
      return { success: true, message: currentState.largePointer ? 'Large pointer enabled' : 'Large pointer disabled', currentState };
    }
    case 'color_blind_mode': {
      const mode = (value || 'protanopia').toLowerCase() as AccessibilityState['colorBlindMode'];
      if (['none', 'protanopia', 'deuteranopia', 'tritanopia'].includes(mode)) {
        currentState.colorBlindMode = mode;
        applyStyles();
        return { success: true, message: mode === 'none' ? 'Color blind mode disabled' : `Color blind mode set to ${mode}`, currentState };
      }
      return { success: false, message: 'Invalid color blind mode. Use: none, protanopia, deuteranopia, tritanopia', currentState };
    }

    // ====== NEW FEATURES ======

    case 'reading_guide':
    case 'toggle_reading_guide': {
      currentState.readingGuide = !currentState.readingGuide;
      currentState.readingGuide ? enableReadingGuide() : disableReadingGuide();
      return { success: true, message: currentState.readingGuide ? 'Reading guide enabled — a highlight bar follows your cursor to help track lines' : 'Reading guide disabled', currentState };
    }
    case 'bionic_reading':
    case 'toggle_bionic': {
      currentState.bionicReading = !currentState.bionicReading;
      currentState.bionicReading ? applyBionicReading() : removeBionicReading();
      return { success: true, message: currentState.bionicReading ? 'Bionic reading enabled — first half of each word is bolded for faster reading' : 'Bionic reading disabled', currentState };
    }
    case 'reading_mode':
    case 'toggle_reading_mode': {
      currentState.readingMode = !currentState.readingMode;
      applyStyles();
      return { success: true, message: currentState.readingMode ? 'Reading mode enabled — clean, distraction-free layout with serif font' : 'Reading mode disabled', currentState };
    }
    case 'stop_animations':
    case 'toggle_animations': {
      currentState.stopAnimations = !currentState.stopAnimations;
      currentState.stopAnimations ? stopPageAnimations() : restorePageAnimations();
      applyStyles();
      return { success: true, message: currentState.stopAnimations ? 'All animations and motion stopped' : 'Animations restored', currentState };
    }
    case 'highlight_links':
    case 'toggle_links': {
      currentState.highlightLinks = !currentState.highlightLinks;
      applyStyles();
      return { success: true, message: currentState.highlightLinks ? 'Links highlighted — all links are now bold and underlined in red' : 'Link highlighting disabled', currentState };
    }
    case 'text_magnifier':
    case 'toggle_magnifier': {
      currentState.textMagnifier = !currentState.textMagnifier;
      currentState.textMagnifier ? enableTextMagnifier() : disableTextMagnifier();
      return { success: true, message: currentState.textMagnifier ? 'Text magnifier enabled — hover over text to see it enlarged' : 'Text magnifier disabled', currentState };
    }
    case 'image_descriptions':
    case 'show_image_descriptions': {
      currentState.imageDescriptions = !currentState.imageDescriptions;
      currentState.imageDescriptions ? showImageDescriptions() : removeImageDescriptions();
      return { success: true, message: currentState.imageDescriptions ? 'Image descriptions shown — alt text overlays are visible on images' : 'Image descriptions hidden', currentState };
    }

    case 'reset_all': {
      if (currentState.readingGuide) disableReadingGuide();
      if (currentState.bionicReading) removeBionicReading();
      if (currentState.textMagnifier) disableTextMagnifier();
      if (currentState.imageDescriptions) removeImageDescriptions();
      if (currentState.stopAnimations) restorePageAnimations();
      currentState = {
        fontSize: 1.0, highContrast: false, lineSpacing: 1.0, wordSpacing: 1.0,
        dyslexiaFont: false, focusHighlight: false, colorBlindMode: 'none',
        simplified: false, largePointer: false, readingGuide: false,
        bionicReading: false, readingMode: false, stopAnimations: false,
        highlightLinks: false, textMagnifier: false, imageDescriptions: false,
      };
      applyStyles();
      return { success: true, message: 'All accessibility adjustments reset to defaults', currentState };
    }

    case 'get_status': {
      const active: string[] = [];
      if (currentState.fontSize !== 1.0) active.push(`Font ${Math.round(currentState.fontSize * 100)}%`);
      if (currentState.highContrast) active.push('High Contrast');
      if (currentState.lineSpacing !== 1.0) active.push(`Line Spacing ${Math.round(currentState.lineSpacing * 100)}%`);
      if (currentState.wordSpacing !== 1.0) active.push(`Word Spacing ${Math.round(currentState.wordSpacing * 100)}%`);
      if (currentState.dyslexiaFont) active.push('Dyslexia Font');
      if (currentState.focusHighlight) active.push('Focus Highlight');
      if (currentState.colorBlindMode !== 'none') active.push(`Color Blind: ${currentState.colorBlindMode}`);
      if (currentState.simplified) active.push('Simplified');
      if (currentState.largePointer) active.push('Large Pointer');
      if (currentState.readingGuide) active.push('Reading Guide');
      if (currentState.bionicReading) active.push('Bionic Reading');
      if (currentState.readingMode) active.push('Reading Mode');
      if (currentState.stopAnimations) active.push('Animations Stopped');
      if (currentState.highlightLinks) active.push('Links Highlighted');
      if (currentState.textMagnifier) active.push('Text Magnifier');
      if (currentState.imageDescriptions) active.push('Image Descriptions');
      const msg = active.length > 0 ? `Active: ${active.join(', ')}` : 'No accessibility adjustments active';
      return { success: true, message: msg, currentState };
    }

    // ====== PRESETS — disability-profile bundles ======

    case 'preset_low_vision': {
      // Reset first, then apply
      executeAccessibilityAdjustment('reset_all');
      currentState.fontSize = 1.75;
      currentState.highContrast = true;
      currentState.focusHighlight = true;
      currentState.largePointer = true;
      currentState.highlightLinks = true;
      currentState.lineSpacing = 1.5;
      applyStyles();
      return { success: true, message: 'Low vision preset applied: large text 175%, high contrast, focus highlights, large pointer, links highlighted, increased spacing', currentState };
    }

    case 'preset_dyslexia': {
      executeAccessibilityAdjustment('reset_all');
      currentState.dyslexiaFont = true;
      currentState.fontSize = 1.25;
      currentState.lineSpacing = 1.75;
      currentState.wordSpacing = 2.0;
      currentState.readingGuide = true;
      enableReadingGuide();
      applyStyles();
      return { success: true, message: 'Dyslexia-friendly preset applied: OpenDyslexic font, larger text, extra line and word spacing, reading guide enabled', currentState };
    }

    case 'preset_motor_impairment': {
      executeAccessibilityAdjustment('reset_all');
      currentState.largePointer = true;
      currentState.focusHighlight = true;
      currentState.fontSize = 1.25;
      currentState.highlightLinks = true;
      currentState.simplified = true;
      applyStyles();
      return { success: true, message: 'Motor impairment preset applied: large pointer, focus highlights, simplified layout, highlighted links, larger text', currentState };
    }

    case 'preset_cognitive': {
      executeAccessibilityAdjustment('reset_all');
      currentState.simplified = true;
      currentState.fontSize = 1.25;
      currentState.lineSpacing = 1.5;
      currentState.bionicReading = true;
      applyBionicReading();
      currentState.stopAnimations = true;
      stopPageAnimations();
      currentState.readingGuide = true;
      enableReadingGuide();
      applyStyles();
      return { success: true, message: 'Cognitive accessibility preset applied: simplified layout, bionic reading, no animations, reading guide, larger text with more spacing', currentState };
    }

    case 'preset_senior': {
      executeAccessibilityAdjustment('reset_all');
      currentState.fontSize = 1.75;
      currentState.lineSpacing = 1.5;
      currentState.largePointer = true;
      currentState.focusHighlight = true;
      currentState.highlightLinks = true;
      currentState.textMagnifier = true;
      enableTextMagnifier();
      applyStyles();
      return { success: true, message: 'Senior-friendly preset applied: large text 175%, large pointer, focus highlights, highlighted links, text magnifier on hover', currentState };
    }

    default:
      return { success: false, message: `Unknown adjustment: ${adjustment}. Available: increase_font, decrease_font, reset_font, high_contrast, increase_spacing, decrease_spacing, increase_word_spacing, decrease_word_spacing, dyslexia_font, focus_highlight, simplify, large_pointer, color_blind_mode, reading_guide, bionic_reading, reading_mode, stop_animations, highlight_links, text_magnifier, image_descriptions, reset_all, get_status, preset_low_vision, preset_dyslexia, preset_motor_impairment, preset_cognitive, preset_senior`, currentState };
  }
}

export function getAccessibilityState(): AccessibilityState {
  return { ...currentState };
}

// ==========================================
// Page Accessibility Audit — scan and report issues
// ==========================================

export interface AuditIssue {
  type: 'error' | 'warning' | 'info';
  element: string;
  problem: string;
  suggestion: string;
  autoFixable: boolean;
}

export interface AuditResult {
  score: number;       // 0-100
  issues: AuditIssue[];
  summary: string;
  fixesApplied: string[];
}

export function auditPageAccessibility(autoFix: boolean = false): AuditResult {
  const issues: AuditIssue[] = [];
  const fixesApplied: string[] = [];

  // 1. Check for images without alt text
  const imgsNoAlt = document.querySelectorAll('img:not([alt]), img[alt=""]');
  if (imgsNoAlt.length > 0) {
    issues.push({
      type: 'error',
      element: `${imgsNoAlt.length} images`,
      problem: `${imgsNoAlt.length} image(s) missing alt text`,
      suggestion: 'Add descriptive alt attributes to all images',
      autoFixable: false,
    });
  }

  // 2. Check for low contrast text
  let lowContrastCount = 0;
  const textEls = document.querySelectorAll('p, span, h1, h2, h3, h4, h5, h6, a, li, td, label');
  textEls.forEach(el => {
    if (el.closest('#voice-assistant-overlay')) return;
    const style = getComputedStyle(el);
    const color = style.color;
    const bg = style.backgroundColor;
    if (color && bg && color !== 'rgba(0, 0, 0, 0)' && bg !== 'rgba(0, 0, 0, 0)') {
      const ratio = estimateContrastRatio(color, bg);
      if (ratio < 3.0 && ratio > 0) lowContrastCount++;
    }
  });
  if (lowContrastCount > 0) {
    issues.push({
      type: 'error',
      element: `${lowContrastCount} elements`,
      problem: `${lowContrastCount} text element(s) may have insufficient color contrast (below 3:1)`,
      suggestion: 'Enable high contrast mode for better readability',
      autoFixable: true,
    });
    if (autoFix && !currentState.highContrast) {
      currentState.highContrast = true;
      fixesApplied.push('Enabled high contrast mode to fix low contrast text');
    }
  }

  // 3. Check for tiny text (below 12px)
  let tinyTextCount = 0;
  textEls.forEach(el => {
    if (el.closest('#voice-assistant-overlay')) return;
    const size = parseFloat(getComputedStyle(el).fontSize);
    if (size < 12 && (el.textContent || '').trim().length > 0) tinyTextCount++;
  });
  if (tinyTextCount > 0) {
    issues.push({
      type: 'warning',
      element: `${tinyTextCount} elements`,
      problem: `${tinyTextCount} text element(s) are smaller than 12px`,
      suggestion: 'Increase font size for better readability',
      autoFixable: true,
    });
    if (autoFix && currentState.fontSize < 1.25) {
      currentState.fontSize = 1.25;
      fixesApplied.push('Increased font size to 125%');
    }
  }

  // 4. Check for missing form labels
  const unlabeledInputs = document.querySelectorAll('input:not([type="hidden"]):not([aria-label]):not([aria-labelledby])');
  let missingLabels = 0;
  unlabeledInputs.forEach(input => {
    const id = input.id;
    if (id && document.querySelector(`label[for="${id}"]`)) return;
    if (input.closest('label')) return;
    missingLabels++;
  });
  if (missingLabels > 0) {
    issues.push({
      type: 'error',
      element: `${missingLabels} inputs`,
      problem: `${missingLabels} form input(s) have no accessible label`,
      suggestion: 'Add label elements or aria-label attributes to form inputs',
      autoFixable: false,
    });
  }

  // 5. Check for keyboard traps / no focus outlines
  const focusableEls = document.querySelectorAll('a, button, input, select, textarea, [tabindex]');
  let noOutlineCount = 0;
  focusableEls.forEach(el => {
    if (el.closest('#voice-assistant-overlay')) return;
    const style = getComputedStyle(el);
    if (style.outlineStyle === 'none' && style.outlineWidth === '0px' && !style.boxShadow.includes('rgb')) {
      noOutlineCount++;
    }
  });
  if (noOutlineCount > 5) {
    issues.push({
      type: 'warning',
      element: `${noOutlineCount} focusable elements`,
      problem: `${noOutlineCount} focusable element(s) have no visible focus indicator`,
      suggestion: 'Enable focus highlighting for keyboard navigation',
      autoFixable: true,
    });
    if (autoFix && !currentState.focusHighlight) {
      currentState.focusHighlight = true;
      fixesApplied.push('Enabled focus highlighting for keyboard navigation');
    }
  }

  // 6. Check for animations
  const hasAnimations = document.querySelectorAll('[class*="animate"], [class*="carousel"], [class*="slider"], video[autoplay], .gif');
  const autoplayVideos = document.querySelectorAll('video[autoplay]');
  if (hasAnimations.length > 0 || autoplayVideos.length > 0) {
    issues.push({
      type: 'info',
      element: `${hasAnimations.length + autoplayVideos.length} elements`,
      problem: 'Page contains animations or auto-playing media that may cause discomfort',
      suggestion: 'Use stop_animations to pause all motion',
      autoFixable: true,
    });
    if (autoFix && !currentState.stopAnimations) {
      currentState.stopAnimations = true;
      stopPageAnimations();
      fixesApplied.push('Stopped all animations and auto-playing media');
    }
  }

  // 7. Check for crowded/complex layout
  const totalElements = document.body.querySelectorAll('*').length;
  const visibleSidebars = document.querySelectorAll('aside, [role="complementary"], [class*="sidebar"]');
  if (totalElements > 1500 || visibleSidebars.length >= 2) {
    issues.push({
      type: 'info',
      element: 'page layout',
      problem: `Page is complex (${totalElements} elements${visibleSidebars.length > 0 ? ', ' + visibleSidebars.length + ' sidebars' : ''}) which may be overwhelming`,
      suggestion: 'Use simplify to remove non-essential content',
      autoFixable: true,
    });
    if (autoFix && !currentState.simplified) {
      currentState.simplified = true;
      fixesApplied.push('Simplified page layout — removed sidebars, ads, and non-essential content');
    }
  }

  // 8. Check line spacing
  let tightSpacing = 0;
  document.querySelectorAll('p, li').forEach(el => {
    if (el.closest('#voice-assistant-overlay')) return;
    const lh = parseFloat(getComputedStyle(el).lineHeight);
    const fs = parseFloat(getComputedStyle(el).fontSize);
    if (lh > 0 && fs > 0 && lh / fs < 1.3) tightSpacing++;
  });
  if (tightSpacing > 3) {
    issues.push({
      type: 'warning',
      element: `${tightSpacing} paragraphs`,
      problem: `${tightSpacing} text block(s) have tight line spacing (below 1.3x)`,
      suggestion: 'Increase line spacing for easier reading',
      autoFixable: true,
    });
    if (autoFix && currentState.lineSpacing < 1.25) {
      currentState.lineSpacing = 1.25;
      fixesApplied.push('Increased line spacing for readability');
    }
  }

  // Apply fixes
  if (autoFix && fixesApplied.length > 0) {
    applyStyles();
  }

  // Calculate score
  const errorCount = issues.filter(i => i.type === 'error').length;
  const warningCount = issues.filter(i => i.type === 'warning').length;
  const infoCount = issues.filter(i => i.type === 'info').length;
  let score = 100 - (errorCount * 15) - (warningCount * 8) - (infoCount * 3);
  score = Math.max(0, Math.min(100, score));

  let summary = '';
  if (score >= 80) {
    summary = `Accessibility score: ${score}/100 (Good). `;
  } else if (score >= 50) {
    summary = `Accessibility score: ${score}/100 (Needs improvement). `;
  } else {
    summary = `Accessibility score: ${score}/100 (Poor). `;
  }
  summary += `Found ${errorCount} error(s), ${warningCount} warning(s), ${infoCount} suggestion(s).`;
  if (autoFix && fixesApplied.length > 0) {
    summary += ` Auto-fixed ${fixesApplied.length} issue(s): ${fixesApplied.join('; ')}.`;
  }

  return { score, issues, summary, fixesApplied };
}

// ==========================================
// Contrast estimation helper
// ==========================================

function parseRGB(color: string): [number, number, number] | null {
  const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (match) return [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])];
  return null;
}

function relativeLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r / 255, g / 255, b / 255].map(c =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  );
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function estimateContrastRatio(fg: string, bg: string): number {
  const fgRGB = parseRGB(fg);
  const bgRGB = parseRGB(bg);
  if (!fgRGB || !bgRGB) return -1;
  const l1 = relativeLuminance(...fgRGB);
  const l2 = relativeLuminance(...bgRGB);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}
