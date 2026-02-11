import type { PageMap, HeadingInfo, SectionInfo, ActionInfo, FormFieldInfo, FocusInfo, BoundingBox } from '../types';

const MAX_ACTIONS = 60;
const MAX_FIELDS = 30;
const MAX_SECTIONS = 15;
const MAX_SNIPPET_LENGTH = 300;

// ── Persistent element registry ──
// Caches id → { selector, element WeakRef } so findElementById
// doesn't re-extract the page (which can produce different hashes).
interface CachedEntry {
  selector: string;
  elementRef: WeakRef<Element>;
}
const elementRegistry = new Map<string, CachedEntry>();

export function registerElement(id: string, selector: string, element: Element) {
  elementRegistry.set(id, { selector, elementRef: new WeakRef(element) });
}

const RISKY_KEYWORDS = [
  'submit', 'pay', 'purchase', 'buy', 'send', 'delete', 'remove',
  'checkout', 'confirm', 'place order', 'complete', 'finalize',
  'transfer', 'wire', 'donate', 'subscribe', 'unsubscribe'
];

export function generateId(element: Element, prefix: string): string {
  const label = getAccessibleName(element);
  const role = element.getAttribute('role') || element.tagName.toLowerCase();
  const type = (element as HTMLInputElement).type || '';
  const hash = simpleHash(`${prefix}-${role}-${label}-${type}`);
  return `${prefix}_${hash}`;
}

function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36).substring(0, 8);
}

function getAccessibleName(element: Element): string {
  const ariaLabel = element.getAttribute('aria-label');
  if (ariaLabel) return ariaLabel.trim();

  const labelledBy = element.getAttribute('aria-labelledby');
  if (labelledBy) {
    const parts = labelledBy.split(/\s+/).map(id => {
      const el = document.getElementById(id);
      return el?.textContent?.trim() || '';
    }).filter(Boolean);
    if (parts.length) return parts.join(' ');
  }

  if (element instanceof HTMLInputElement ||
      element instanceof HTMLSelectElement ||
      element instanceof HTMLTextAreaElement) {
    const id = element.id;
    if (id) {
      const label = document.querySelector(`label[for="${id}"]`);
      if (label) return label.textContent?.trim() || '';
    }
    const parentLabel = element.closest('label');
    if (parentLabel) {
      const labelText = parentLabel.textContent?.trim() || '';
      const inputText = element.value || '';
      return labelText.replace(inputText, '').trim();
    }
  }

  const title = element.getAttribute('title');
  if (title) return title.trim();

  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
    const placeholder = element.placeholder;
    if (placeholder) return placeholder.trim();
  }

  // Use getVisibleText to skip style/script garbage — much more reliable
  // than raw textContent on modern pages
  const visibleText = getVisibleText(element).trim();
  if (visibleText && visibleText.length < 150) return visibleText;

  // For links/buttons containing images: check child img alt text
  if (element.tagName === 'A' || element.tagName === 'BUTTON' || element.getAttribute('role') === 'button') {
    const imgs = element.querySelectorAll('img');
    for (const img of imgs) {
      const alt = img.alt?.trim();
      if (alt) return alt;
    }
    // Also check for SVG title
    const svgTitle = element.querySelector('svg title');
    if (svgTitle?.textContent?.trim()) return svgTitle.textContent.trim();
  }

  // For standalone images
  if (element instanceof HTMLImageElement) {
    return element.alt || '';
  }

  if (element instanceof HTMLInputElement &&
      (element.type === 'submit' || element.type === 'button')) {
    return element.value || '';
  }

  // Last resort for links: use the URL path as a label
  if (element.tagName === 'A') {
    const href = (element as HTMLAnchorElement).href;
    try {
      const url = new URL(href);
      // Turn "/education/undergraduate" into "education / undergraduate"
      const pathLabel = url.pathname
        .replace(/^\/|\/$/g, '')
        .replace(/[-_]/g, ' ')
        .split('/')
        .filter(Boolean)
        .join(' / ');
      if (pathLabel) return pathLabel;
    } catch {}
  }

  // If visible text was too long, truncate it rather than returning nothing
  if (visibleText) return visibleText.substring(0, 80) + '…';

  return '';
}

/** Get visible text from element, skipping style/script/svg junk */
function getVisibleText(element: Element): string {
  let text = '';
  for (const node of element.childNodes) {
    if (node.nodeType === Node.TEXT_NODE) {
      text += node.textContent || '';
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as Element;
      const tag = el.tagName.toLowerCase();
      if (tag === 'style' || tag === 'script' || tag === 'noscript' ||
          tag === 'svg' || tag === 'template' || tag === 'link') {
        continue;
      }
      try {
        const style = window.getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden') continue;
      } catch {}
      text += getVisibleText(el);
    }
  }
  return text;
}

export function getSelector(element: Element): string {
  if (element.id) {
    return `#${CSS.escape(element.id)}`;
  }

  const path: string[] = [];
  let current: Element | null = element;

  while (current && current !== document.body) {
    let selector = current.tagName.toLowerCase();

    if (current.id) {
      selector = `#${CSS.escape(current.id)}`;
      path.unshift(selector);
      break;
    }

    if (current.className && typeof current.className === 'string') {
      const classes = current.className.split(/\s+/).filter(c => c).slice(0, 2);
      if (classes.length > 0) {
        selector += '.' + classes.map(c => CSS.escape(c)).join('.');
      }
    }

    const parent = current.parentElement;
    if (parent) {
      const siblings = Array.from(parent.children).filter(
        c => c.tagName === current!.tagName
      );
      if (siblings.length > 1) {
        const index = siblings.indexOf(current) + 1;
        selector += `:nth-child(${index})`;
      }
    }

    path.unshift(selector);
    current = current.parentElement;
  }

  return path.join(' > ');
}

function getBoundingBox(element: Element): BoundingBox | null {
  const rect = element.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return null;
  return {
    x: Math.round(rect.x),
    y: Math.round(rect.y),
    width: Math.round(rect.width),
    height: Math.round(rect.height)
  };
}

function isVisible(element: Element): boolean {
  const style = window.getComputedStyle(element);
  if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
    return false;
  }
  const rect = element.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return false;
  // Generous tolerance — nav elements may be above or below viewport
  return rect.bottom > -500 && rect.top < window.innerHeight + 500;
}

function isRiskyAction(label: string): boolean {
  const lowerLabel = label.toLowerCase();
  return RISKY_KEYWORDS.some(keyword => lowerLabel.includes(keyword));
}

function extractHeadings(): HeadingInfo[] {
  const headings: HeadingInfo[] = [];
  document.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach((heading, index) => {
    const text = heading.textContent?.trim() || '';
    if (text && isVisible(heading)) {
      headings.push({
        level: parseInt(heading.tagName[1]),
        text: text.substring(0, 100),
        sectionId: `section_${index}`
      });
    }
  });
  return headings.slice(0, 20);
}

function extractSections(): SectionInfo[] {
  const sections: SectionInfo[] = [];
  const headings = document.querySelectorAll('h1, h2, h3');

  headings.forEach((heading, index) => {
    const headingText = heading.textContent?.trim() || '';
    if (!headingText || !isVisible(heading)) return;

    let content = '';
    let sibling = heading.nextElementSibling;

    while (sibling && !sibling.matches('h1, h2, h3')) {
      // Use getVisibleText to skip <style>/<script> garbage
      const text = getVisibleText(sibling).trim();
      if (text) {
        content += text + ' ';
        if (content.length > MAX_SNIPPET_LENGTH) break;
      }
      sibling = sibling.nextElementSibling;
    }

    content = content.trim();
    if (content) {
      sections.push({
        id: `section_${index}`,
        headingText: headingText.substring(0, 100),
        snippet: content.substring(0, MAX_SNIPPET_LENGTH)
      });
    }
  });

  return sections.slice(0, MAX_SECTIONS);
}

function extractActions(): ActionInfo[] {
  const actions: ActionInfo[] = [];
  const seen = new Set<string>();

  // Buttons
  document.querySelectorAll('button, [role="button"], input[type="submit"], input[type="button"]').forEach(el => {
    if (!isVisible(el)) return;
    const label = getAccessibleName(el);
    if (!label) return;

    const actionId = generateId(el, 'act');
    if (seen.has(actionId)) return;
    seen.add(actionId);

    const selector = getSelector(el);
    registerElement(actionId, selector, el);

    actions.push({
      actionId, role: 'button', label,
      type: (el as HTMLInputElement).type || 'button',
      state: {
        disabled: (el as HTMLButtonElement).disabled || el.getAttribute('aria-disabled') === 'true',
        expanded: el.getAttribute('aria-expanded') === 'true'
      },
      selector, boundingBox: getBoundingBox(el),
      isRisky: isRiskyAction(label)
    });
  });

  // Links — append hostname so LLM knows where they go
  document.querySelectorAll('a[href]').forEach(el => {
    if (!isVisible(el)) return;
    let label = getAccessibleName(el);
    if (!label) return;

    const actionId = generateId(el, 'act');
    if (seen.has(actionId)) return;
    seen.add(actionId);

    const selector = getSelector(el);
    registerElement(actionId, selector, el);

    // Add link destination info
    const href = (el as HTMLAnchorElement).href;
    let linkInfo = '';
    try {
      const url = new URL(href);
      // Only add if it's a real http link
      if (url.protocol === 'http:' || url.protocol === 'https:') {
        const pathSnippet = url.pathname.length > 1 ? url.pathname.substring(0, 30) : '';
        linkInfo = ` → ${url.hostname}${pathSnippet}`;
      }
    } catch {}

    actions.push({
      actionId, role: 'link',
      label: label + linkInfo,
      type: 'link',
      state: { disabled: false },
      selector, boundingBox: getBoundingBox(el),
      isRisky: false
    });
  });

  // Checkboxes and radios — native AND ARIA role-based (Google Forms, custom UIs)
  document.querySelectorAll(
    'input[type="checkbox"], input[type="radio"], [role="radio"], [role="checkbox"], [role="switch"], [role="option"], [role="menuitemradio"], [role="menuitemcheckbox"]'
  ).forEach(el => {
    if (!isVisible(el)) return;
    const label = getAccessibleName(el);
    if (!label) return;
    
    const actionId = generateId(el, 'act');
    if (seen.has(actionId)) return;
    seen.add(actionId);
    const selector = getSelector(el);
    registerElement(actionId, selector, el);

    // Determine role and checked state for both native and ARIA elements
    const isNativeInput = el instanceof HTMLInputElement;
    const role = el.getAttribute('role') || (isNativeInput ? (el as HTMLInputElement).type : 'radio');
    const isChecked = isNativeInput
      ? (el as HTMLInputElement).checked
      : el.getAttribute('aria-checked') === 'true' || el.getAttribute('aria-selected') === 'true';
    const isDisabled = isNativeInput
      ? (el as HTMLInputElement).disabled
      : el.getAttribute('aria-disabled') === 'true';

    // Find parent group label (e.g. the question text in Google Forms)
    let groupLabel = '';
    
    // Strategy 1: ARIA radiogroup/listbox with aria-label or aria-labelledby
    const radioGroup = el.closest('[role="radiogroup"], [role="listbox"], [role="group"], fieldset');
    if (radioGroup) {
      groupLabel = radioGroup.getAttribute('aria-label') || '';
      if (!groupLabel) {
        const labelId = radioGroup.getAttribute('aria-labelledby');
        if (labelId) {
          groupLabel = document.getElementById(labelId)?.textContent?.trim() || '';
        }
      }
      if (!groupLabel && radioGroup.tagName === 'FIELDSET') {
        groupLabel = radioGroup.querySelector('legend')?.textContent?.trim() || '';
      }
    }

    // Strategy 2: Google Forms data-params on ancestor
    if (!groupLabel) {
      const gFormItem = el.closest('[data-params]');
      if (gFormItem) {
        const params = gFormItem.getAttribute('data-params');
        if (params) {
          const match = params.match(/\[\s*null\s*,\s*\[\s*"([^"]+)"/);
          if (match) groupLabel = match[1];
        }
      }
    }

    // Strategy 3: Find a question-like heading or text in the nearest form section container.
    // Walk up from the radio group (or the element itself) looking for a container that
    // has heading text or a question-like span preceding the options.
    if (!groupLabel) {
      const container = (radioGroup || el).closest(
        '[data-item-id], .freebirdFormviewerViewItemsItemItem, ' +  // Google Forms
        '.question, .form-group, .field-group, ' +                   // Common patterns
        'div > div, li'                                               // Generic containers
      );
      if (container) {
        // Look for headings, or spans/divs that contain the question text
        // They're typically BEFORE the radio group in DOM order
        const candidates = container.querySelectorAll(
          'h1, h2, h3, h4, h5, h6, legend, [role="heading"], ' +
          'span[dir], .freebirdFormviewerComponentsQuestionBaseTitle, ' +
          '.freebirdFormviewerComponentsQuestionBaseHeader'
        );
        for (const c of candidates) {
          const t = c.textContent?.trim();
          if (t && t.length > 0 && t.length < 150) {
            groupLabel = t;
            break;
          }
        }
      }
    }

    // Strategy 4: Walk up and find the first preceding text block above the radiogroup
    if (!groupLabel && radioGroup) {
      let prev = radioGroup.previousElementSibling;
      while (prev) {
        const t = getVisibleText(prev).trim();
        if (t && t.length > 0 && t.length < 150) {
          groupLabel = t;
          break;
        }
        prev = prev.previousElementSibling;
      }
    }
    
    // Strategy 5: For elements not in a radiogroup, check parent's preceding text
    if (!groupLabel && !radioGroup) {
      const parent = el.parentElement;
      if (parent) {
        let prev = parent.previousElementSibling;
        while (prev) {
          const t = getVisibleText(prev).trim();
          if (t && t.length > 0 && t.length < 150) {
            groupLabel = t;
            break;
          }
          prev = prev.previousElementSibling;
        }
      }
    }

    const displayLabel = groupLabel ? `${groupLabel}: ${label}` : label;

    actions.push({
      actionId, role, label: displayLabel, type: role,
      state: { disabled: isDisabled, checked: isChecked },
      selector, boundingBox: getBoundingBox(el), isRisky: false
    });
  });

  // Tabs
  document.querySelectorAll('[role="tab"]').forEach(el => {
    if (!isVisible(el)) return;
    const label = getAccessibleName(el);
    if (!label) return;
    const actionId = generateId(el, 'act');
    if (seen.has(actionId)) return;
    seen.add(actionId);
    const selector = getSelector(el);
    registerElement(actionId, selector, el);

    actions.push({
      actionId, role: 'tab', label, type: 'tab',
      state: {
        disabled: el.getAttribute('aria-disabled') === 'true',
        selected: el.getAttribute('aria-selected') === 'true'
      },
      selector, boundingBox: getBoundingBox(el), isRisky: false
    });
  });

  return actions.slice(0, MAX_ACTIONS);
}

/**
 * Find a label for a form field using aggressive heuristics.
 * Tries semantic/structural patterns first, then falls back to 
 * basic accessible name (which may only be a generic placeholder).
 */
function getFormFieldLabel(element: Element): string {
  // 1. High-confidence standard labels (aria-label, label[for], parent <label>, title)
  //    BUT skip placeholder — it's often generic like "Your answer"
  const ariaLabel = element.getAttribute('aria-label');
  if (ariaLabel && !isGenericPlaceholder(ariaLabel)) return ariaLabel.trim();

  const labelledBy = element.getAttribute('aria-labelledby');
  if (labelledBy) {
    const parts = labelledBy.split(/\s+/).map(id =>
      document.getElementById(id)?.textContent?.trim() || ''
    ).filter(Boolean);
    if (parts.length) return parts.join(' ');
  }

  if (element instanceof HTMLInputElement || element instanceof HTMLSelectElement || element instanceof HTMLTextAreaElement) {
    const id = element.id;
    if (id) {
      const lbl = document.querySelector(`label[for="${id}"]`);
      if (lbl?.textContent?.trim()) return lbl.textContent.trim();
    }
    const parentLabel = element.closest('label');
    if (parentLabel) {
      const t = parentLabel.textContent?.trim() || '';
      if (t) return t.replace(element.value || '', '').trim();
    }
  }

  const title = element.getAttribute('title');
  if (title) return title.trim();

  // 2. Google Forms: data-params on ancestor
  const gFormItem = element.closest('[data-params]');
  if (gFormItem) {
    const params = gFormItem.getAttribute('data-params');
    if (params) {
      const match = params.match(/\[\s*null\s*,\s*\[\s*"([^"]+)"/);
      if (match) return match[1];
    }
  }

  // 3. Google Forms / custom UIs: heading or question text in same container
  const container = element.closest(
    '[data-item-id], .freebirdFormviewerViewItemsItemItem, ' +
    '.question, .form-group, .field-group, ' +
    'div[class], section, fieldset, [role="group"]'
  );
  if (container) {
    const candidates = container.querySelectorAll(
      'h1, h2, h3, h4, h5, h6, legend, [role="heading"], ' +
      'span[dir], .freebirdFormviewerComponentsQuestionBaseTitle, ' +
      '.freebirdFormviewerComponentsQuestionBaseHeader'
    );
    for (const c of candidates) {
      // Don't pick up text that is inside the input itself
      if (element.contains(c)) continue;
      const t = c.textContent?.trim();
      if (t && t.length > 0 && t.length < 150 && !isGenericPlaceholder(t)) {
        return t;
      }
    }
  }

  // 4. Adjacent <td> in same <tr> (table-based forms)
  const parentTd = element.closest('td, th');
  if (parentTd) {
    const parentTr = parentTd.closest('tr');
    if (parentTr) {
      const cells = parentTr.querySelectorAll('td, th');
      for (const cell of cells) {
        if (cell === parentTd) continue;
        const cellText = getVisibleText(cell).trim();
        if (cellText && cellText.length < 100) return cellText;
      }
    }
  }

  // 5. Preceding sibling element
  let prev = element.previousElementSibling;
  while (prev && (prev.tagName === 'BR' ||
         (prev instanceof HTMLElement && window.getComputedStyle(prev).display === 'none'))) {
    prev = prev.previousElementSibling;
  }
  if (prev) {
    const prevText = getVisibleText(prev).trim();
    if (prevText && prevText.length < 100 && !isGenericPlaceholder(prevText)) return prevText;
  }

  // 6. Previous text node in parent
  let node = element.previousSibling;
  while (node) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent?.trim();
      if (text && text.length > 1 && text.length < 100) return text;
    }
    node = node.previousSibling;
  }

  // 7. Parent container text (minus the input's own value)
  const parent = element.parentElement;
  if (parent && parent.tagName !== 'BODY' && parent.tagName !== 'FORM') {
    const parentText = getVisibleText(parent).trim();
    const inputValue = (element as HTMLInputElement).value || '';
    const placeholder = (element as HTMLInputElement).placeholder || '';
    let cleaned = parentText.replace(inputValue, '').replace(placeholder, '').trim();
    if (cleaned && cleaned.length < 100 && !isGenericPlaceholder(cleaned)) return cleaned;
  }

  // 8. Walk up looking for any text-bearing ancestor that isn't too big
  let ancestor = element.parentElement;
  for (let i = 0; i < 5 && ancestor; i++) {
    const vt = getVisibleText(ancestor).trim();
    const placeholder = (element as HTMLInputElement).placeholder || '';
    const cleaned = vt.replace(placeholder, '').replace((element as HTMLInputElement).value || '', '').trim();
    if (cleaned && cleaned.length > 2 && cleaned.length < 120 && !isGenericPlaceholder(cleaned)) {
      return cleaned;
    }
    ancestor = ancestor.parentElement;
  }

  // 9. Fall back to placeholder/name as last resort
  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
    if (element.placeholder) return element.placeholder.trim();
  }

  return '';
}

/** Detect generic placeholder text that isn't a useful label */
function isGenericPlaceholder(text: string): boolean {
  const lower = text.toLowerCase().trim();
  return [
    'your answer', 'type here', 'enter text', 'enter here',
    'type your answer', 'your response', 'write here',
    'placeholder', 'input', '...', '…', 'search',
  ].some(g => lower === g || lower === g + '...' || lower === g + '…');
}

function extractFormFields(): FormFieldInfo[] {
  const fields: FormFieldInfo[] = [];
  const seen = new Set<string>();

  const fieldSelectors = [
    'input[type="text"]', 'input[type="email"]', 'input[type="password"]',
    'input[type="tel"]', 'input[type="number"]', 'input[type="search"]',
    'input[type="url"]', 'input[type="date"]', 'input:not([type])',
    'textarea', 'select'
  ];

  document.querySelectorAll(fieldSelectors.join(', ')).forEach(el => {
    if (!isVisible(el)) return;
    const input = el as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
    const label = getFormFieldLabel(el);
    const fieldId = generateId(el, 'fld');
    if (seen.has(fieldId)) return;
    seen.add(fieldId);

    const selector = getSelector(el);
    registerElement(fieldId, selector, el);

    let validationError: string | null = null;
    const ariaDescribedBy = el.getAttribute('aria-describedby');
    if (ariaDescribedBy) {
      const errorEl = document.getElementById(ariaDescribedBy);
      if (errorEl && errorEl.textContent) {
        validationError = errorEl.textContent.trim();
      }
    }
    if (el.getAttribute('aria-invalid') === 'true') {
      validationError = validationError || 'Invalid input';
    }

    // Humanize the name attribute if it's the only thing we have
    let displayLabel = label;
    if (!displayLabel && input.name) {
      // Turn "firstName" → "first Name", "user_email" → "user email"
      displayLabel = input.name
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .replace(/[_-]/g, ' ')
        .trim();
    }
    if (!displayLabel) {
      displayLabel = 'Unlabeled field';
    }

    fields.push({
      fieldId,
      label: displayLabel,
      type: (input as HTMLInputElement).type || input.tagName.toLowerCase(),
      required: input.required || el.getAttribute('aria-required') === 'true',
      currentValue: input.value || '',
      validationError, selector,
      placeholder: (input as HTMLInputElement).placeholder || ''
    });
  });

  return fields.slice(0, MAX_FIELDS);
}

function getFocusInfo(): FocusInfo | null {
  const active = document.activeElement;
  if (!active || active === document.body) return null;
  const label = getAccessibleName(active);
  const actionId = generateId(active, 'act');
  const fieldId = generateId(active, 'fld');
  const isField = active.matches('input, textarea, select');
  return {
    actionId: isField ? null : actionId,
    fieldId: isField ? fieldId : null,
    label: label || 'Unknown element'
  };
}

function detectLoginPage(): boolean {
  const hasPasswordField = document.querySelector('input[type="password"]') !== null;
  const text = document.body.innerText.toLowerCase();
  return hasPasswordField && (text.includes('sign in') || text.includes('log in') || text.includes('login'));
}

function detectCaptchaPage(): boolean {
  return document.querySelector('[class*="captcha"], [id*="captcha"], iframe[src*="recaptcha"]') !== null;
}

function detectCheckoutPage(): boolean {
  const keywords = ['checkout', 'payment', 'billing', 'shipping', 'order summary'];
  const text = document.body.innerText.toLowerCase();
  return keywords.some(kw => text.includes(kw)) &&
         (document.querySelector('input[type="text"][name*="card"]') !== null ||
          document.querySelector('[class*="payment"]') !== null);
}

function extractAlerts(): string[] {
  const alerts: string[] = [];
  document.querySelectorAll('[role="alert"], [role="status"], [class*="alert"], [class*="notification"], [class*="error"], [class*="warning"]').forEach(el => {
    const text = el.textContent?.trim();
    if (text && isVisible(el) && text.length < 200) {
      alerts.push(text);
    }
  });
  return alerts.slice(0, 5);
}

export function extractPageMap(tabId: number): PageMap {
  return {
    version: '1.0', tabId,
    url: window.location.href,
    title: document.title || 'Untitled Page',
    timestamp: Date.now(),
    headings: extractHeadings(),
    sections: extractSections(),
    actions: extractActions(),
    formFields: extractFormFields(),
    focus: getFocusInfo(),
    alerts: extractAlerts(),
    isLoginPage: detectLoginPage(),
    isCaptchaPage: detectCaptchaPage(),
    isCheckoutPage: detectCheckoutPage()
  };
}

/** Find element by action/field ID — uses cached registry, falls back to re-extract */
export function findElementById(id: string): Element | null {
  // 1. Try the cached registry (fast path)
  const cached = elementRegistry.get(id);
  if (cached) {
    const el = cached.elementRef.deref();
    if (el && el.isConnected) return el;
    // WeakRef gone — try selector
    const found = document.querySelector(cached.selector);
    if (found) {
      cached.elementRef = new WeakRef(found);
      return found;
    }
  }

  // 2. Slow path: re-extract and match
  console.log('[PageMap] Cache miss for', id, '— re-extracting');
  const allActions = extractActions();
  const allFields = extractFormFields();

  const action = allActions.find(a => a.actionId === id);
  if (action) return document.querySelector(action.selector);

  const field = allFields.find(f => f.fieldId === id);
  if (field) return document.querySelector(field.selector);

  return null;
}
