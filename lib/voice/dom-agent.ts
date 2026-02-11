/**
 * DOM Agent — scans page for interactive elements and executes actions.
 * Inspired by Jarvis extension tools.ts / pageMap.ts, adapted for React/Next.js SPA.
 */

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface InteractiveElement {
  type: "button" | "link" | "input" | "checkbox" | "select" | "tab" | "card";
  label: string;
  element: HTMLElement;
  disabled: boolean;
}

export interface ActionResult {
  success: boolean;
  message: string;
}

/* ------------------------------------------------------------------ */
/*  Accessible name                                                    */
/* ------------------------------------------------------------------ */

function getAccessibleName(el: Element): string {
  const ariaLabel = el.getAttribute("aria-label");
  if (ariaLabel) return ariaLabel.trim();

  const labelledBy = el.getAttribute("aria-labelledby");
  if (labelledBy) {
    const parts = labelledBy
      .split(/\s+/)
      .map((id) => document.getElementById(id)?.textContent?.trim())
      .filter(Boolean);
    if (parts.length) return parts.join(" ");
  }

  // For form controls check <label for="">
  if (
    el instanceof HTMLInputElement ||
    el instanceof HTMLTextAreaElement ||
    el instanceof HTMLSelectElement
  ) {
    const id = el.id;
    if (id) {
      const label = document.querySelector(`label[for="${id}"]`);
      if (label) return label.textContent?.trim() || "";
    }
    if ("placeholder" in el && (el as HTMLInputElement).placeholder) {
      return (el as HTMLInputElement).placeholder;
    }
  }

  // data-voice-action can serve as a name hint
  const voiceAction = el.getAttribute("data-voice-action");
  if (voiceAction) return voiceAction.replace(/-/g, " ");

  // data-voice-field for inputs (e.g. message, search, room code)
  const voiceField = el.getAttribute("data-voice-field");
  if (voiceField) return voiceField.replace(/-/g, " ");

  // innerText (short enough to be a label)
  const text = (el.textContent || "").trim();
  if (text && text.length < 80) return text;

  return el.getAttribute("title") || "";
}

/* ------------------------------------------------------------------ */
/*  Visibility                                                         */
/* ------------------------------------------------------------------ */

function isVisible(el: Element): boolean {
  if (!(el instanceof HTMLElement)) return false;
  if (el.offsetParent === null && getComputedStyle(el).position !== "fixed") return false;
  const rect = el.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) return false;
  const style = getComputedStyle(el);
  return (
    style.display !== "none" &&
    style.visibility !== "hidden" &&
    style.opacity !== "0"
  );
}

/* ------------------------------------------------------------------ */
/*  Scanning                                                           */
/* ------------------------------------------------------------------ */

export function scanInteractiveElements(): InteractiveElement[] {
  if (typeof document === "undefined") return [];

  const elements: InteractiveElement[] = [];
  const seen = new Set<Element>();

  // Helper
  const add = (
    el: Element,
    type: InteractiveElement["type"],
    labelOverride?: string
  ) => {
    if (seen.has(el) || !isVisible(el)) return;
    seen.add(el);
    const label = labelOverride || getAccessibleName(el);
    if (!label) return;
    const disabled =
      (el as HTMLButtonElement).disabled ||
      el.getAttribute("aria-disabled") === "true";
    elements.push({ type, label, element: el as HTMLElement, disabled });
  };

  // 1. Buttons (including role="button")
  document
    .querySelectorAll(
      'button, [role="button"], input[type="submit"], input[type="button"]'
    )
    .forEach((el) => add(el, "button"));

  // 2. Links
  document.querySelectorAll("a[href]").forEach((el) => add(el, "link"));

  // 3. Clickable cards with data-voice-action
  document
    .querySelectorAll("[data-voice-action]")
    .forEach((el) => {
      if (!seen.has(el)) add(el, "card");
    });

  // 4. Form controls
  document
    .querySelectorAll(
      "input:not([type=hidden]):not([type=submit]):not([type=button]), textarea, select"
    )
    .forEach((el) => {
      if (seen.has(el) || !isVisible(el)) return;
      seen.add(el);
      const htmlEl = el as HTMLInputElement;
      const type = htmlEl.type;
      const label = getAccessibleName(el) || htmlEl.placeholder || "";
      if (!label) return;
      const disabled = htmlEl.disabled;
      if (type === "checkbox" || type === "radio") {
        elements.push({ type: "checkbox", label, element: htmlEl, disabled });
      } else if (el instanceof HTMLSelectElement) {
        elements.push({ type: "select", label, element: htmlEl, disabled });
      } else {
        elements.push({ type: "input", label, element: htmlEl, disabled });
      }
    });

  // 5. Tabs
  document.querySelectorAll('[role="tab"]').forEach((el) => add(el, "tab"));

  return elements;
}

/* ------------------------------------------------------------------ */
/*  Fuzzy matching                                                     */
/* ------------------------------------------------------------------ */

function normalise(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim();
}

function fuzzyScore(query: string, label: string): number {
  const q = normalise(query);
  const l = normalise(label);
  if (!q || !l) return 0;
  if (l === q) return 1.0;
  if (l.startsWith(q) || l.endsWith(q)) return 0.9;
  if (l.includes(q)) return 0.8;
  if (q.includes(l)) return 0.7;
  // word overlap
  const qw = q.split(" ");
  const lw = l.split(" ");
  const hits = qw.filter((w) =>
    lw.some((lword) => lword.includes(w) || w.includes(lword))
  );
  if (hits.length > 0)
    return 0.4 + (hits.length / Math.max(qw.length, lw.length)) * 0.35;
  return 0;
}

/* ------------------------------------------------------------------ */
/*  Find element                                                       */
/* ------------------------------------------------------------------ */

export function findElementByLabel(
  label: string,
  typeFilter?: InteractiveElement["type"]
): InteractiveElement | null {
  const all = scanInteractiveElements();
  const filtered = typeFilter ? all.filter((e) => e.type === typeFilter) : all;

  let best: InteractiveElement | null = null;
  let bestScore = 0.35; // minimum threshold

  for (const el of filtered) {
    const score = fuzzyScore(label, el.label);
    if (score > bestScore) {
      bestScore = score;
      best = el;
    }
  }
  return best;
}

/* ------------------------------------------------------------------ */
/*  Click                                                              */
/* ------------------------------------------------------------------ */

export function clickElement(el: HTMLElement): void {
  el.scrollIntoView({ behavior: "smooth", block: "center" });
  // Small delay to let scroll settle
  setTimeout(() => {
    el.focus();
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const opts: MouseEventInit & { view: Window } = {
      bubbles: true,
      cancelable: true,
      clientX: cx,
      clientY: cy,
      view: window,
    };
    el.dispatchEvent(new PointerEvent("pointerdown", opts));
    el.dispatchEvent(new MouseEvent("mousedown", opts));
    el.dispatchEvent(new PointerEvent("pointerup", opts));
    el.dispatchEvent(new MouseEvent("mouseup", opts));
    el.dispatchEvent(new MouseEvent("click", opts));
  }, 160);
}

export function clickByLabel(label: string): ActionResult {
  // 1. Try data-voice-action first (exact match)
  const voiceEl = document.querySelector(
    `[data-voice-action="${label.toLowerCase().replace(/\s+/g, "-")}"]`
  );
  if (voiceEl instanceof HTMLElement && isVisible(voiceEl)) {
    clickElement(voiceEl);
    return {
      success: true,
      message: `Clicked "${getAccessibleName(voiceEl) || label}".`,
    };
  }

  // 2. Fuzzy match interactive elements
  const match = findElementByLabel(label);
  if (!match) {
    return { success: false, message: `Could not find "${label}" on this page.` };
  }
  if (match.disabled) {
    return { success: false, message: `"${match.label}" is disabled.` };
  }
  clickElement(match.element);
  return { success: true, message: `Clicked "${match.label}".` };
}

/* ------------------------------------------------------------------ */
/*  Type into input                                                    */
/* ------------------------------------------------------------------ */

function setInputValue(
  el: HTMLInputElement | HTMLTextAreaElement,
  text: string
): void {
  el.focus();
  el.scrollIntoView({ behavior: "smooth", block: "center" });

  // Use native setter for React/framework compatibility
  const nativeSetter =
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")
      ?.set ||
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")
      ?.set;

  if (nativeSetter) {
    nativeSetter.call(el, text);
  } else {
    el.value = text;
  }

  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
}

export function typeIntoField(
  fieldLabel: string,
  text: string
): ActionResult {
  // 1. Try data-voice-field exact match (e.g. message, search, room-code)
  const fieldId = fieldLabel.toLowerCase().replace(/\s+/g, "-");
  const byField = document.querySelector(
    `[data-voice-field="${fieldId}"]`
  );
  if (byField instanceof HTMLInputElement || byField instanceof HTMLTextAreaElement) {
    if (!byField.disabled && !byField.readOnly) {
      setInputValue(byField, text);
      const label = byField.getAttribute("aria-label") || byField.placeholder || fieldLabel;
      return { success: true, message: `Typed "${text}" into ${label}.` };
    }
  }

  // 2. Try explicit label match
  const match = findElementByLabel(fieldLabel, "input");
  if (match && !match.disabled) {
    setInputValue(match.element as HTMLInputElement, text);
    return { success: true, message: `Typed "${text}" into "${match.label}".` };
  }

  // Fallback: if only one visible input, use it
  const inputs = scanInteractiveElements().filter(
    (e) => e.type === "input" && !e.disabled
  );
  if (inputs.length === 1) {
    setInputValue(inputs[0].element as HTMLInputElement, text);
    return {
      success: true,
      message: `Typed "${text}" into ${inputs[0].label}.`,
    };
  }
  if (inputs.length > 1) {
    const names = inputs.map((i) => `"${i.label}"`).join(", ");
    return {
      success: false,
      message: `Multiple inputs found: ${names}. Say "type ${text} in [field name]".`,
    };
  }
  return {
    success: false,
    message: `Could not find an input field${fieldLabel ? ` matching "${fieldLabel}"` : ""}.`,
  };
}

/* ------------------------------------------------------------------ */
/*  List elements (for "what can I click?" command)                     */
/* ------------------------------------------------------------------ */

export function listInteractiveElements(): string {
  const elements = scanInteractiveElements();
  if (elements.length === 0) return "No interactive elements found on this page.";

  const grouped: Record<string, string[]> = {};
  for (const el of elements) {
    const key = el.type;
    if (!grouped[key]) grouped[key] = [];
    if (grouped[key].length < 12) grouped[key].push(el.label);
  }

  const parts: string[] = [];
  if (grouped.button)
    parts.push(`Buttons: ${grouped.button.join(", ")}`);
  if (grouped.link) parts.push(`Links: ${grouped.link.join(", ")}`);
  if (grouped.card) parts.push(`Cards: ${grouped.card.join(", ")}`);
  if (grouped.input)
    parts.push(`Input fields: ${grouped.input.join(", ")}`);
  if (grouped.checkbox)
    parts.push(`Checkboxes: ${grouped.checkbox.join(", ")}`);
  if (grouped.tab) parts.push(`Tabs: ${grouped.tab.join(", ")}`);
  if (grouped.select)
    parts.push(`Dropdowns: ${grouped.select.join(", ")}`);

  return parts.join(". ") + ".";
}
