/**
 * formScanner.ts – Deep form structure scanner
 * 
 * Scans the page for form questions and returns a structured representation.
 * Works with: Google Forms, standard HTML forms, and custom form UIs.
 * 
 * The key insight is that forms are organized into QUESTIONS, and each question
 * has a type (text, radio, checkbox, dropdown, etc.) and possibly options.
 * This is fundamentally different from the flat field/action lists in pageMap.
 */

import { findElementById, registerElement, getSelector, generateId } from './pageMap';

export interface FormQuestion {
  questionId: string;
  questionText: string;
  type: 'short_text' | 'long_text' | 'radio' | 'checkbox' | 'dropdown' | 'date' | 'time' | 'file_upload' | 'linear_scale' | 'select' | 'unknown';
  required: boolean;
  options?: { label: string; actionId: string; selected: boolean }[];
  currentAnswer?: string;
  fieldId?: string;         // For text/date/time inputs
  dropdownActionId?: string; // For custom dropdowns: click this to open
}

export interface FormScanResult {
  formTitle: string;
  formDescription: string;
  questions: FormQuestion[];
  submitActionId?: string;
  totalQuestions: number;
  answeredQuestions: number;
}

/** Get visible text, filtering out scripts/styles */
function getCleanText(el: Element): string {
  let text = '';
  for (const node of el.childNodes) {
    if (node.nodeType === Node.TEXT_NODE) {
      text += node.textContent || '';
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const child = node as Element;
      const tag = child.tagName;
      if (['STYLE', 'SCRIPT', 'NOSCRIPT', 'SVG', 'TEMPLATE'].includes(tag)) continue;
      if (child instanceof HTMLElement) {
        const style = window.getComputedStyle(child);
        if (style.display === 'none' || style.visibility === 'hidden') continue;
      }
      text += getCleanText(child);
    }
  }
  return text.trim();
}

/** Detect if page is a Google Form */
function isGoogleForm(): boolean {
  return !!document.querySelector('form[action*="formResponse"], [data-params], .freebirdFormviewerViewItemList');
}

/** Scan a Google Form specifically */
function scanGoogleForm(): FormScanResult {
  const result: FormScanResult = {
    formTitle: '',
    formDescription: '',
    questions: [],
    totalQuestions: 0,
    answeredQuestions: 0
  };

  // Get title and description
  const titleEl = document.querySelector('[data-item-id] .freebirdFormviewerComponentsQuestionBaseTitle, .freebirdFormviewerViewHeaderTitle, [role="heading"][aria-level="1"]');
  // Try multiple selectors for the title
  const headerEl = document.querySelector('.freebirdFormviewerViewHeaderHeader');
  if (headerEl) {
    const headingEl = headerEl.querySelector('[role="heading"], h1, .freebirdFormviewerViewHeaderTitle');
    result.formTitle = headingEl?.textContent?.trim() || '';
    const descEl = headerEl.querySelector('.freebirdFormviewerViewHeaderDescription');
    result.formDescription = descEl?.textContent?.trim() || '';
  }
  if (!result.formTitle) {
    result.formTitle = document.title.replace(' - Google Forms', '').trim();
  }

  // Find all question containers
  // Google Forms wraps each question in a div with data-params or specific classes
  const questionContainers = document.querySelectorAll(
    '[data-params], .freebirdFormviewerViewNumberedItemContainer, .freebirdFormviewerViewItemsItemItem'
  );

  // Deduplicate: data-params containers can nest
  const processed = new Set<Element>();

  for (const container of questionContainers) {
    // Skip if this container is inside an already-processed one
    let skip = false;
    for (const p of processed) {
      if (p.contains(container) && p !== container) { skip = true; break; }
    }
    if (skip) continue;

    // Skip the header section (contains title/description, not a question)
    if (container.closest('.freebirdFormviewerViewHeaderHeader')) continue;

    const question = parseGoogleFormQuestion(container);
    if (question) {
      result.questions.push(question);
      processed.add(container);
    }
  }

  // Find submit button
  const submitBtn = document.querySelector('[type="submit"], [jsname="M2UYVd"], [aria-label="Submit"]') as HTMLElement;
  if (submitBtn) {
    const id = generateId(submitBtn, 'act');
    const sel = getSelector(submitBtn);
    registerElement(id, sel, submitBtn);
    result.submitActionId = id;
  }

  result.totalQuestions = result.questions.length;
  result.answeredQuestions = result.questions.filter(q => {
    if (q.currentAnswer) return true;
    if (q.options?.some(o => o.selected)) return true;
    return false;
  }).length;

  return result;
}

function parseGoogleFormQuestion(container: Element): FormQuestion | null {
  // Extract question text
  let questionText = '';
  
  // Try data-params first
  const params = container.getAttribute('data-params');
  if (params) {
    const match = params.match(/\[\s*null\s*,\s*\[\s*"([^"]+)"/);
    if (match) questionText = match[1];
  }

  // Try heading/title elements
  if (!questionText) {
    const titleEl = container.querySelector(
      '[role="heading"], .freebirdFormviewerComponentsQuestionBaseTitle, ' +
      '.freebirdFormviewerComponentsQuestionBaseHeader span[dir]'
    );
    if (titleEl) questionText = titleEl.textContent?.trim() || '';
  }

  // Try first significant text
  if (!questionText) {
    const spans = container.querySelectorAll('span, div');
    for (const s of spans) {
      const t = s.textContent?.trim();
      if (t && t.length > 2 && t.length < 200 && !['Required', '*'].includes(t)) {
        questionText = t;
        break;
      }
    }
  }

  if (!questionText) return null;

  // Check if required
  const required = !!container.querySelector('[aria-label*="Required"], .freebirdFormviewerComponentsQuestionBaseRequiredAsterisk, [data-required="true"]') ||
    container.textContent?.includes('*') && !!container.querySelector('[aria-label*="Required"]');

  // Detect question type and extract options
  const question: FormQuestion = {
    questionId: `q_${simpleHash(questionText)}`,
    questionText,
    type: 'unknown',
    required
  };

  // Check for radio buttons
  const radios = container.querySelectorAll('[role="radio"], input[type="radio"]');
  if (radios.length > 0) {
    question.type = 'radio';
    question.options = [];
    for (const radio of radios) {
      const label = radio.getAttribute('aria-label') || 
                    radio.getAttribute('data-value') ||
                    getCleanText(radio.closest('[role="radio"], label') || radio);
      const actionId = generateId(radio, 'act');
      const sel = getSelector(radio);
      registerElement(actionId, sel, radio);
      const selected = radio.getAttribute('aria-checked') === 'true' || 
                       (radio as HTMLInputElement).checked === true;
      if (selected) question.currentAnswer = label;
      question.options.push({ label: label || 'Unknown option', actionId, selected });
    }
    return question;
  }

  // Check for checkboxes
  const checkboxes = container.querySelectorAll('[role="checkbox"], input[type="checkbox"]');
  if (checkboxes.length > 0) {
    question.type = 'checkbox';
    question.options = [];
    const selectedValues: string[] = [];
    for (const cb of checkboxes) {
      const label = cb.getAttribute('aria-label') ||
                    cb.getAttribute('data-value') ||
                    getCleanText(cb.closest('[role="checkbox"], label') || cb);
      const actionId = generateId(cb, 'act');
      const sel = getSelector(cb);
      registerElement(actionId, sel, cb);
      const selected = cb.getAttribute('aria-checked') === 'true' ||
                       (cb as HTMLInputElement).checked === true;
      if (selected) selectedValues.push(label);
      question.options.push({ label: label || 'Unknown option', actionId, selected });
    }
    if (selectedValues.length) question.currentAnswer = selectedValues.join(', ');
    return question;
  }

  // Check for dropdown (Google Forms uses a custom div-based dropdown)
  const dropdown = container.querySelector('[role="listbox"], [data-value]');
  if (dropdown) {
    question.type = 'dropdown';
    const options = container.querySelectorAll('[role="option"], [data-value]');
    if (options.length > 0) {
      question.options = [];
      for (const opt of options) {
        const label = opt.getAttribute('data-value') || opt.textContent?.trim() || '';
        const actionId = generateId(opt, 'act');
        const sel = getSelector(opt);
        registerElement(actionId, sel, opt);
        const selected = opt.getAttribute('aria-selected') === 'true';
        if (selected && label) question.currentAnswer = label;
        question.options.push({ label, actionId, selected });
      }
    }
    // Find the dropdown trigger button
    const trigger = container.querySelector('[role="combobox"], [aria-haspopup="listbox"]') as HTMLElement;
    if (trigger) {
      const triggerId = generateId(trigger, 'act');
      const triggerSel = getSelector(trigger);
      registerElement(triggerId, triggerSel, trigger);
      question.dropdownActionId = triggerId;
    }
    return question;
  }

  // Check for text input (short answer)
  const textInput = container.querySelector('input[type="text"], input:not([type])') as HTMLInputElement;
  if (textInput) {
    question.type = 'short_text';
    question.currentAnswer = textInput.value || '';
    const fieldId = generateId(textInput, 'fld');
    const sel = getSelector(textInput);
    registerElement(fieldId, sel, textInput);
    question.fieldId = fieldId;
    return question;
  }

  // Check for textarea (long answer / paragraph)
  const textarea = container.querySelector('textarea') as HTMLTextAreaElement;
  if (textarea) {
    question.type = 'long_text';
    question.currentAnswer = textarea.value || '';
    const fieldId = generateId(textarea, 'fld');
    const sel = getSelector(textarea);
    registerElement(fieldId, sel, textarea);
    question.fieldId = fieldId;
    return question;
  }

  // Check for date input
  const dateInput = container.querySelector('input[type="date"], [aria-label*="Day"], [aria-label*="Month"], [aria-label*="Year"]') as HTMLInputElement;
  if (dateInput) {
    question.type = 'date';
    // Google Forms dates have separate Day/Month/Year inputs
    const dateInputs = container.querySelectorAll('input');
    const parts: string[] = [];
    for (const di of dateInputs) {
      if ((di as HTMLInputElement).value) parts.push((di as HTMLInputElement).value);
    }
    question.currentAnswer = parts.join('/') || '';
    const fieldId = generateId(dateInput, 'fld');
    const sel = getSelector(dateInput);
    registerElement(fieldId, sel, dateInput);
    question.fieldId = fieldId;
    return question;
  }

  // Check for linear scale
  const scaleOptions = container.querySelectorAll('[role="radio"]');
  if (scaleOptions.length >= 3) {
    // Already handled by radio above, but sometimes scale uses different markup
    question.type = 'linear_scale';
    return question;
  }

  // Check for file upload
  if (container.textContent?.includes('Add file') || container.querySelector('input[type="file"]')) {
    question.type = 'file_upload';
    return question;
  }

  return question;
}

/** Scan a standard HTML form */
function scanHTMLForm(): FormScanResult {
  const result: FormScanResult = {
    formTitle: document.title,
    formDescription: '',
    questions: [],
    totalQuestions: 0,
    answeredQuestions: 0
  };

  // Find forms on the page
  const forms = document.querySelectorAll('form');
  const targetForm = forms.length === 1 ? forms[0] : document.body;

  // Strategy 1: Look for fieldsets/groups (well-structured forms)
  const fieldsets = targetForm.querySelectorAll('fieldset, [role="group"], [role="radiogroup"], .form-group, .field-group, .form-field, .question');
  
  if (fieldsets.length > 0) {
    for (const group of fieldsets) {
      const q = parseHTMLFormGroup(group);
      if (q) result.questions.push(q);
    }
  }

  // Strategy 2: Find individual form elements not yet covered
  const coveredElements = new Set<Element>();
  for (const q of result.questions) {
    if (q.fieldId) {
      const el = findElementById(q.fieldId);
      if (el) coveredElements.add(el);
    }
    if (q.options) {
      for (const opt of q.options) {
        const el = findElementById(opt.actionId);
        if (el) coveredElements.add(el);
      }
    }
  }

  // Find uncovered text inputs, textareas, selects
  const inputs = targetForm.querySelectorAll(
    'input[type="text"], input[type="email"], input[type="password"], input[type="tel"], ' +
    'input[type="number"], input[type="search"], input[type="url"], input[type="date"], ' +
    'input[type="time"], input:not([type]), textarea, select'
  );

  for (const input of inputs) {
    if (coveredElements.has(input)) continue;
    if (!isElementVisible(input)) continue;

    const q = parseStandaloneInput(input);
    if (q) {
      result.questions.push(q);
      coveredElements.add(input);
    }
  }

  // Find uncovered radio/checkbox groups
  const radioGroups = new Map<string, Element[]>();
  targetForm.querySelectorAll('input[type="radio"], [role="radio"]').forEach(el => {
    if (coveredElements.has(el)) return;
    if (!isElementVisible(el)) return;
    const name = (el as HTMLInputElement).name || el.closest('[role="radiogroup"]')?.getAttribute('aria-label') || 'unnamed';
    if (!radioGroups.has(name)) radioGroups.set(name, []);
    radioGroups.get(name)!.push(el);
  });

  for (const [name, radios] of radioGroups) {
    const q = parseRadioGroup(name, radios);
    if (q) result.questions.push(q);
  }

  const checkboxGroups = new Map<string, Element[]>();
  targetForm.querySelectorAll('input[type="checkbox"], [role="checkbox"]').forEach(el => {
    if (coveredElements.has(el)) return;
    if (!isElementVisible(el)) return;
    const name = (el as HTMLInputElement).name || 'unnamed_cb';
    if (!checkboxGroups.has(name)) checkboxGroups.set(name, []);
    checkboxGroups.get(name)!.push(el);
  });

  for (const [name, cbs] of checkboxGroups) {
    if (cbs.length > 1) {
      const q = parseCheckboxGroup(name, cbs);
      if (q) result.questions.push(q);
    }
  }

  // Find submit button
  const submitBtn = targetForm.querySelector('[type="submit"], button:not([type="button"]), input[type="submit"]') as HTMLElement;
  if (submitBtn) {
    const id = generateId(submitBtn, 'act');
    const sel = getSelector(submitBtn);
    registerElement(id, sel, submitBtn);
    result.submitActionId = id;
  }

  result.totalQuestions = result.questions.length;
  result.answeredQuestions = result.questions.filter(q => {
    if (q.currentAnswer) return true;
    if (q.options?.some(o => o.selected)) return true;
    return false;
  }).length;

  return result;
}

function parseHTMLFormGroup(group: Element): FormQuestion | null {
  // Get group label
  let questionText = '';
  const legend = group.querySelector('legend, [role="heading"], h1, h2, h3, h4, h5, h6, label');
  if (legend) questionText = legend.textContent?.trim() || '';
  if (!questionText) questionText = group.getAttribute('aria-label') || '';
  if (!questionText) {
    const labelledBy = group.getAttribute('aria-labelledby');
    if (labelledBy) questionText = document.getElementById(labelledBy)?.textContent?.trim() || '';
  }

  // Check for radio/checkbox groups
  const radios = group.querySelectorAll('input[type="radio"], [role="radio"]');
  if (radios.length > 0) {
    return buildChoiceQuestion(questionText || 'Unnamed choice', 'radio', Array.from(radios));
  }

  const checkboxes = group.querySelectorAll('input[type="checkbox"], [role="checkbox"]');
  if (checkboxes.length > 1) {
    return buildChoiceQuestion(questionText || 'Unnamed checkboxes', 'checkbox', Array.from(checkboxes));
  }

  // Check for text input
  const input = group.querySelector('input, textarea, select');
  if (input) {
    return parseStandaloneInput(input, questionText);
  }

  return null;
}

function parseStandaloneInput(input: Element, overrideLabel?: string): FormQuestion | null {
  let label = overrideLabel || '';
  
  if (!label) {
    // Try label[for]
    const id = input.id;
    if (id) {
      const lbl = document.querySelector(`label[for="${id}"]`);
      if (lbl) label = lbl.textContent?.trim() || '';
    }
    // Try parent label
    if (!label) {
      const parentLabel = input.closest('label');
      if (parentLabel) label = getCleanText(parentLabel).replace((input as HTMLInputElement).value || '', '').trim();
    }
    // Try adjacent td
    if (!label) {
      const td = input.closest('td, th');
      if (td) {
        const tr = td.closest('tr');
        if (tr) {
          for (const cell of tr.querySelectorAll('td, th')) {
            if (cell === td) continue;
            const t = getCleanText(cell).trim();
            if (t && t.length < 100) { label = t; break; }
          }
        }
      }
    }
    // Try preceding sibling
    if (!label) {
      let prev = input.previousElementSibling;
      while (prev && prev.tagName === 'BR') prev = prev.previousElementSibling;
      if (prev) label = getCleanText(prev).trim();
    }
    // Try aria
    if (!label) label = input.getAttribute('aria-label') || '';
    // Try placeholder
    if (!label) label = (input as HTMLInputElement).placeholder || '';
    // Try name
    if (!label) label = (input as HTMLInputElement).name?.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[_-]/g, ' ') || '';
  }

  if (!label) label = 'Unlabeled field';

  const fieldId = generateId(input, 'fld');
  const sel = getSelector(input);
  registerElement(fieldId, sel, input);

  if (input instanceof HTMLSelectElement) {
    const options: { label: string; actionId: string; selected: boolean }[] = [];
    for (const opt of input.options) {
      if (opt.value === '' && opt.textContent?.trim() === '') continue; // skip blank placeholder
      options.push({
        label: opt.textContent?.trim() || opt.value,
        actionId: '', // selects use select_option tool, not click
        selected: opt.selected
      });
    }
    return {
      questionId: `q_${simpleHash(label)}`,
      questionText: label,
      type: 'select',
      required: input.required,
      options,
      currentAnswer: input.options[input.selectedIndex]?.textContent?.trim() || '',
      fieldId
    };
  }

  let type: FormQuestion['type'] = 'short_text';
  if (input instanceof HTMLTextAreaElement) type = 'long_text';
  else if ((input as HTMLInputElement).type === 'date') type = 'date';
  else if ((input as HTMLInputElement).type === 'time') type = 'time';
  else if ((input as HTMLInputElement).type === 'email') type = 'short_text';
  else if ((input as HTMLInputElement).type === 'password') type = 'short_text';

  return {
    questionId: `q_${simpleHash(label)}`,
    questionText: label,
    type,
    required: (input as HTMLInputElement).required || input.getAttribute('aria-required') === 'true',
    currentAnswer: (input as HTMLInputElement).value || '',
    fieldId
  };
}

function parseRadioGroup(name: string, radios: Element[]): FormQuestion | null {
  // Find group label from radiogroup container, fieldset, or adjacent text
  let questionText = '';
  const container = radios[0].closest('[role="radiogroup"], fieldset');
  if (container) {
    questionText = container.getAttribute('aria-label') || '';
    if (!questionText) {
      const legend = container.querySelector('legend, [role="heading"]');
      if (legend) questionText = legend.textContent?.trim() || '';
    }
  }
  if (!questionText) questionText = name.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[_-]/g, ' ');

  return buildChoiceQuestion(questionText, 'radio', radios);
}

function parseCheckboxGroup(name: string, cbs: Element[]): FormQuestion | null {
  let questionText = name.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[_-]/g, ' ');
  return buildChoiceQuestion(questionText, 'checkbox', cbs);
}

function buildChoiceQuestion(questionText: string, type: 'radio' | 'checkbox', elements: Element[]): FormQuestion {
  const options: { label: string; actionId: string; selected: boolean }[] = [];
  const selectedValues: string[] = [];

  for (const el of elements) {
    let label = el.getAttribute('aria-label') || el.getAttribute('data-value') || '';
    if (!label) {
      // Try associated label
      const id = el.id;
      if (id) {
        const lbl = document.querySelector(`label[for="${id}"]`);
        if (lbl) label = lbl.textContent?.trim() || '';
      }
    }
    if (!label) {
      const parentLabel = el.closest('label');
      if (parentLabel) {
        label = getCleanText(parentLabel).trim();
      }
    }
    if (!label) label = getCleanText(el).trim();
    if (!label) label = 'Unknown option';

    const actionId = generateId(el, 'act');
    const sel = getSelector(el);
    registerElement(actionId, sel, el);

    const selected = el.getAttribute('aria-checked') === 'true' ||
                     (el as HTMLInputElement).checked === true;
    if (selected) selectedValues.push(label);

    options.push({ label, actionId, selected });
  }

  return {
    questionId: `q_${simpleHash(questionText)}`,
    questionText,
    type,
    required: false,
    options,
    currentAnswer: selectedValues.join(', ') || undefined
  };
}

function isElementVisible(el: Element): boolean {
  if (!(el instanceof HTMLElement)) return true;
  const style = window.getComputedStyle(el);
  if (style.display === 'none' || style.visibility === 'hidden') return false;
  const rect = el.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36).substring(0, 8);
}

// ── Exported tool implementations ──

/** Scan the form and return structured question data */
export function executeScanForm(): FormScanResult {
  if (isGoogleForm()) {
    return scanGoogleForm();
  }
  return scanHTMLForm();
}

/** Answer a form question by question text or ID */
export async function executeAnswerFormQuestion(
  questionId: string,
  answer: string
): Promise<{ success: boolean; message: string; data?: Record<string, unknown> }> {
  // First scan to get the current form state
  const scan = executeScanForm();
  const question = scan.questions.find(q => q.questionId === questionId);

  if (!question) {
    // Try fuzzy match by question text
    const lowerAnswer = questionId.toLowerCase();
    const fuzzy = scan.questions.find(q => 
      q.questionText.toLowerCase().includes(lowerAnswer) ||
      lowerAnswer.includes(q.questionText.toLowerCase())
    );
    if (!fuzzy) {
      return {
        success: false,
        message: `Could not find question "${questionId}". Available questions: ${scan.questions.map(q => q.questionText).join('; ')}`
      };
    }
    return executeAnswerFormQuestion(fuzzy.questionId, answer);
  }

  // Handle based on question type
  switch (question.type) {
    case 'short_text':
    case 'long_text':
    case 'date':
    case 'time': {
      if (!question.fieldId) {
        return { success: false, message: `No input field found for question "${question.questionText}"` };
      }
      const el = findElementById(question.fieldId);
      if (!el || !(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)) {
        return { success: false, message: `Input element not found for "${question.questionText}"` };
      }
      el.focus();
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      await new Promise(r => setTimeout(r, 100));

      // Use native setter for React/framework compat
      const setter = Object.getOwnPropertyDescriptor(
        el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype, 'value'
      )?.set;
      if (setter) setter.call(el, answer);
      else el.value = answer;

      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      // Some frameworks also need keyup
      el.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));

      return {
        success: true,
        message: `Typed "${answer}" for question "${question.questionText}"`,
        data: { questionId: question.questionId }
      };
    }

    case 'radio': {
      if (!question.options) {
        return { success: false, message: `No options found for "${question.questionText}"` };
      }
      // Find matching option
      const lowerAnswer = answer.toLowerCase().trim();
      const match = question.options.find(o => 
        o.label.toLowerCase().trim() === lowerAnswer ||
        o.label.toLowerCase().trim().includes(lowerAnswer) ||
        lowerAnswer.includes(o.label.toLowerCase().trim())
      );
      if (!match) {
        return {
          success: false,
          message: `Option "${answer}" not found for "${question.questionText}". Available: ${question.options.map(o => o.label).join(', ')}`
        };
      }
      const el = findElementById(match.actionId);
      if (!el || !(el instanceof HTMLElement)) {
        return { success: false, message: `Could not find radio button for "${match.label}"` };
      }
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      await new Promise(r => setTimeout(r, 100));
      
      // Click with full event sequence
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const opts = { bubbles: true, cancelable: true, clientX: cx, clientY: cy, view: window };
      el.dispatchEvent(new PointerEvent('pointerdown', opts));
      el.dispatchEvent(new MouseEvent('mousedown', opts));
      el.dispatchEvent(new PointerEvent('pointerup', opts));
      el.dispatchEvent(new MouseEvent('mouseup', opts));
      el.dispatchEvent(new MouseEvent('click', opts));

      return {
        success: true,
        message: `Selected "${match.label}" for question "${question.questionText}"`,
        data: { questionId: question.questionId }
      };
    }

    case 'checkbox': {
      if (!question.options) {
        return { success: false, message: `No options found for "${question.questionText}"` };
      }
      // Answer can be comma-separated for multiple selections
      const answers = answer.split(',').map(a => a.trim().toLowerCase());
      const results: string[] = [];

      for (const ans of answers) {
        const match = question.options.find(o =>
          o.label.toLowerCase().trim() === ans ||
          o.label.toLowerCase().trim().includes(ans) ||
          ans.includes(o.label.toLowerCase().trim())
        );
        if (!match) {
          results.push(`Option "${ans}" not found`);
          continue;
        }
        if (match.selected) {
          results.push(`"${match.label}" already selected`);
          continue;
        }
        const el = findElementById(match.actionId);
        if (!el || !(el instanceof HTMLElement)) {
          results.push(`Could not find checkbox for "${match.label}"`);
          continue;
        }
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        await new Promise(r => setTimeout(r, 80));
        
        const rect = el.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const opts = { bubbles: true, cancelable: true, clientX: cx, clientY: cy, view: window };
        el.dispatchEvent(new PointerEvent('pointerdown', opts));
        el.dispatchEvent(new MouseEvent('mousedown', opts));
        el.dispatchEvent(new PointerEvent('pointerup', opts));
        el.dispatchEvent(new MouseEvent('mouseup', opts));
        el.dispatchEvent(new MouseEvent('click', opts));

        results.push(`Selected "${match.label}"`);
      }

      return {
        success: true,
        message: `For "${question.questionText}": ${results.join('; ')}`,
        data: { questionId: question.questionId }
      };
    }

    case 'dropdown':
    case 'select': {
      if (question.type === 'select' && question.fieldId) {
        // Native <select> element
        const el = findElementById(question.fieldId);
        if (el instanceof HTMLSelectElement) {
          const lowerAnswer = answer.toLowerCase().trim();
          let found = false;
          for (const opt of el.options) {
            if (opt.text.toLowerCase().includes(lowerAnswer) || opt.value.toLowerCase() === lowerAnswer) {
              el.value = opt.value;
              el.dispatchEvent(new Event('change', { bubbles: true }));
              found = true;
              break;
            }
          }
          if (!found) {
            return {
              success: false,
              message: `Option "${answer}" not found. Available: ${Array.from(el.options).map(o => o.text).join(', ')}`
            };
          }
          return {
            success: true,
            message: `Selected "${answer}" for "${question.questionText}"`,
            data: { questionId: question.questionId }
          };
        }
      }

      // Custom dropdown (Google Forms etc.) - need to open it first, then click option
      if (question.dropdownActionId) {
        const trigger = findElementById(question.dropdownActionId);
        if (trigger instanceof HTMLElement) {
          trigger.click();
          await new Promise(r => setTimeout(r, 300)); // Wait for dropdown to open
        }
      }

      // Now find and click the option
      if (question.options) {
        const lowerAnswer = answer.toLowerCase().trim();
        const match = question.options.find(o =>
          o.label.toLowerCase().trim() === lowerAnswer ||
          o.label.toLowerCase().trim().includes(lowerAnswer)
        );
        if (match) {
          const el = findElementById(match.actionId);
          if (el instanceof HTMLElement) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            await new Promise(r => setTimeout(r, 100));
            el.click();
            return {
              success: true,
              message: `Selected "${match.label}" for "${question.questionText}"`,
              data: { questionId: question.questionId }
            };
          }
        }
        return {
          success: false,
          message: `Option "${answer}" not found. Available: ${question.options.map(o => o.label).join(', ')}`
        };
      }

      return { success: false, message: `Cannot interact with dropdown for "${question.questionText}"` };
    }

    case 'file_upload':
      return { success: false, message: `File upload questions require manual interaction.` };

    default:
      return { success: false, message: `Unsupported question type "${question.type}" for "${question.questionText}"` };
  }
}
