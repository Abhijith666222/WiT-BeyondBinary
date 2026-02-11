import type { ToolResult, ActionInfo } from '../types';
import { findElementById, extractPageMap } from './pageMap';
import { executeScanForm, executeAnswerFormQuestion } from './formScanner';
import { executeAccessibilityAdjustment, auditPageAccessibility } from './a11yAdjust';

// Execute click action
export async function executeClick(actionId: string, description: string): Promise<ToolResult> {
  const element = findElementById(actionId);
  
  if (!element) {
    return {
      success: false,
      message: `Could not find element with ID ${actionId}. It may have been removed or changed.`
    };
  }
  
  if (element instanceof HTMLElement) {
    // Check if disabled
    if ((element as HTMLButtonElement).disabled || element.getAttribute('aria-disabled') === 'true') {
      return {
        success: false,
        message: `The element "${description}" is disabled and cannot be clicked.`
      };
    }
    
    // Scroll into view if needed
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    
    // Wait for scroll to settle
    await new Promise(resolve => setTimeout(resolve, 150));
    element.focus();
    
    // Dispatch full mouse event sequence for compatibility with
    // Material Design, Google Forms, React, and other frameworks
    // that may not respond to synthetic .click() alone.
    const rect = element.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const eventOpts = { bubbles: true, cancelable: true, clientX: cx, clientY: cy, view: window };
    
    element.dispatchEvent(new PointerEvent('pointerdown', eventOpts));
    element.dispatchEvent(new MouseEvent('mousedown', eventOpts));
    element.dispatchEvent(new PointerEvent('pointerup', eventOpts));
    element.dispatchEvent(new MouseEvent('mouseup', eventOpts));
    element.dispatchEvent(new MouseEvent('click', eventOpts));
    
    return {
      success: true,
      message: `Clicked "${description}". Waiting for page to update.`,
      data: { actionId }
    };
  }
  
  return {
    success: false,
    message: `Element "${description}" is not clickable.`
  };
}

// Execute type action
export function executeType(fieldId: string, text: string, clearFirst: boolean = true): ToolResult {
  const element = findElementById(fieldId);
  
  if (!element) {
    return {
      success: false,
      message: `Could not find input field with ID ${fieldId}.`
    };
  }
  
  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
    // Check if disabled or readonly
    if (element.disabled || element.readOnly) {
      return {
        success: false,
        message: `The input field is disabled or read-only.`
      };
    }
    
    // Focus the element
    element.focus();
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    
    // Clear if needed
    if (clearFirst) {
      element.value = '';
      element.dispatchEvent(new Event('input', { bubbles: true }));
    }
    
    // Use the native value setter to trigger React/Vue/Angular state updates.
    // Directly setting .value won't trigger framework change detection.
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype, 'value'
    )?.set || Object.getOwnPropertyDescriptor(
      window.HTMLTextAreaElement.prototype, 'value'
    )?.set;
    
    if (nativeInputValueSetter) {
      nativeInputValueSetter.call(element, text);
    } else {
      element.value = text;
    }
    
    // Trigger events that frameworks listen for
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
    
    return {
      success: true,
      message: `Typed "${text}" into the field.`,
      data: { fieldId, value: text }
    };
  }
  
  return {
    success: false,
    message: `Element is not a text input field.`
  };
}

// Execute select option
export function executeSelect(fieldId: string, value: string): ToolResult {
  const element = findElementById(fieldId);
  
  if (!element || !(element instanceof HTMLSelectElement)) {
    return {
      success: false,
      message: `Could not find select element with ID ${fieldId}.`
    };
  }
  
  if (element.disabled) {
    return {
      success: false,
      message: `The select field is disabled.`
    };
  }
  
  // Find option by value or text
  let found = false;
  for (const option of element.options) {
    if (option.value === value || option.text.toLowerCase().includes(value.toLowerCase())) {
      element.value = option.value;
      found = true;
      break;
    }
  }
  
  if (!found) {
    const options = Array.from(element.options).map(o => o.text).join(', ');
    return {
      success: false,
      message: `Could not find option "${value}". Available options: ${options}`
    };
  }
  
  // Trigger events
  element.dispatchEvent(new Event('change', { bubbles: true }));
  
  return {
    success: true,
    message: `Selected "${value}" from dropdown.`,
    data: { fieldId, value }
  };
}

// Execute scroll
export function executeScroll(direction: string, amount: string = 'medium'): ToolResult {
  const amounts: Record<string, number> = {
    small: 200,
    medium: 500,
    large: 800,
    full: window.innerHeight
  };
  
  const scrollAmount = amounts[amount] || 500;
  
  switch (direction) {
    case 'up':
      window.scrollBy({ top: -scrollAmount, behavior: 'smooth' });
      break;
    case 'down':
      window.scrollBy({ top: scrollAmount, behavior: 'smooth' });
      break;
    case 'top':
      window.scrollTo({ top: 0, behavior: 'smooth' });
      break;
    case 'bottom':
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
      break;
    default:
      return {
        success: false,
        message: `Unknown scroll direction: ${direction}`
      };
  }
  
  return {
    success: true,
    message: `Scrolled ${direction}.`
  };
}

// Read section content
export function executeReadSection(sectionId: string): ToolResult {
  // Find the section heading
  const pageMap = extractPageMap(0);
  const section = pageMap.sections.find(s => s.id === sectionId);
  
  if (!section) {
    return {
      success: false,
      message: `Could not find section ${sectionId}.`
    };
  }
  
  return {
    success: true,
    message: section.snippet,
    data: { sectionId, heading: section.headingText }
  };
}

// Read page summary
export function executeReadPageSummary(): ToolResult {
  const pageMap = extractPageMap(0);
  
  const headings = pageMap.headings.slice(0, 5).map(h => h.text).join(', ');
  const actionCount = pageMap.actions.length;
  const formFieldCount = pageMap.formFields.length;
  
  let summary = `Page: ${pageMap.title}. `;
  if (headings) {
    summary += `Main sections: ${headings}. `;
  }
  summary += `There are ${actionCount} interactive elements`;
  if (formFieldCount > 0) {
    summary += ` and ${formFieldCount} form fields`;
  }
  summary += '.';
  
  if (pageMap.isLoginPage) {
    summary += ' This appears to be a login page.';
  }
  if (pageMap.isCaptchaPage) {
    summary += ' Warning: This page has a captcha that requires manual interaction.';
  }
  if (pageMap.isCheckoutPage) {
    summary += ' This appears to be a checkout or payment page.';
  }
  if (pageMap.alerts.length > 0) {
    summary += ` Alert: ${pageMap.alerts[0]}`;
  }
  
  return {
    success: true,
    message: summary
  };
}

// Focus element
export function executeFocus(actionId: string): ToolResult {
  const element = findElementById(actionId);
  
  if (!element) {
    return {
      success: false,
      message: `Could not find element with ID ${actionId}.`
    };
  }
  
  if (element instanceof HTMLElement) {
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    element.focus();
    
    // Add visible focus indicator
    element.style.outline = '3px solid #FFD700';
    element.style.outlineOffset = '2px';
    
    // Remove indicator after 2 seconds
    setTimeout(() => {
      element.style.outline = '';
      element.style.outlineOffset = '';
    }, 2000);
    
    return {
      success: true,
      message: `Focused on element.`,
      data: { actionId }
    };
  }
  
  return {
    success: false,
    message: `Cannot focus this element.`
  };
}

// Go back
export function executeGoBack(): ToolResult {
  if (window.history.length > 1) {
    window.history.back();
    return {
      success: true,
      message: `Going back to previous page.`
    };
  }
  
  return {
    success: false,
    message: `Cannot go back, no history available.`
  };
}

// Wait
export function executeWait(duration: number = 1000, reason: string): Promise<ToolResult> {
  const safeDuration = Math.min(Math.max(duration, 100), 5000);
  
  return new Promise(resolve => {
    setTimeout(() => {
      resolve({
        success: true,
        message: `Waited ${safeDuration}ms: ${reason}`
      });
    }, safeDuration);
  });
}

// Highlight an action element
export function highlightAction(actionId: string | null): void {
  // Remove existing highlights
  document.querySelectorAll('[data-voice-highlight]').forEach(el => {
    (el as HTMLElement).style.outline = '';
    (el as HTMLElement).style.outlineOffset = '';
    el.removeAttribute('data-voice-highlight');
  });
  
  if (!actionId) return;
  
  const element = findElementById(actionId);
  if (element instanceof HTMLElement) {
    element.style.outline = '4px solid #00FF00';
    element.style.outlineOffset = '2px';
    element.setAttribute('data-voice-highlight', 'true');
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

// Main tool executor
export async function executeTool(
  tool: string,
  args: Record<string, unknown>
): Promise<ToolResult> {
  console.log('[Tools] Executing:', tool, args);
  
  switch (tool) {
    case 'click':
      return executeClick(
        args.actionId as string,
        args.description as string || 'element'
      );
      
    case 'type_text':
      return executeType(
        args.fieldId as string,
        args.text as string,
        args.clearFirst !== false
      );
      
    case 'select_option':
      return executeSelect(
        args.fieldId as string,
        args.value as string
      );
      
    case 'scroll':
      return executeScroll(
        args.direction as string,
        args.amount as string
      );
      
    case 'read_section':
      return executeReadSection(args.sectionId as string);
      
    case 'read_page_summary':
      return executeReadPageSummary();
      
    case 'focus_element':
      return executeFocus(args.actionId as string);
      
    case 'go_back':
      return executeGoBack();
      
    case 'wait':
      return executeWait(
        args.duration as number,
        args.reason as string
      );

    case 'navigate_to':
      return executeNavigateTo(args.url as string);

    case 'scan_form': {
      const scanResult = executeScanForm();
      // Build a concise LLM-friendly summary
      let summary = `Form: "${scanResult.formTitle}" (${scanResult.totalQuestions} questions, ${scanResult.answeredQuestions} answered)\n`;
      if (scanResult.formDescription) summary += `Description: ${scanResult.formDescription}\n`;
      summary += '\nQuestions:\n';
      for (const q of scanResult.questions) {
        summary += `- [${q.questionId}] "${q.questionText}" (${q.type}${q.required ? ', required' : ''})`;
        if (q.options) {
          summary += ` Options: ${q.options.map(o => `${o.selected ? '✓' : '○'} ${o.label}`).join(', ')}`;
        }
        if (q.currentAnswer) summary += ` Current: "${q.currentAnswer}"`;
        summary += '\n';
      }
      if (scanResult.submitActionId) {
        summary += `\nSubmit button ID: ${scanResult.submitActionId}`;
      }
      return {
        success: true,
        message: summary,
        data: scanResult as any
      };
    }

    case 'answer_form_question':
      return executeAnswerFormQuestion(
        args.questionId as string,
        args.answer as string
      );

    case 'adjust_accessibility': {
      const result = executeAccessibilityAdjustment(
        args.adjustment as string,
        args.value as string | undefined
      );
      return {
        success: result.success,
        message: result.message
      };
    }

    case 'audit_accessibility': {
      const autoFix = args.auto_fix === true || args.auto_fix === 'true';
      const auditResult = auditPageAccessibility(autoFix);
      return {
        success: true,
        message: auditResult.summary,
        data: {
          score: auditResult.score,
          issueCount: auditResult.issues.length,
          issues: auditResult.issues.map(i => `[${i.type.toUpperCase()}] ${i.problem} → ${i.suggestion}`),
          fixesApplied: auditResult.fixesApplied
        }
      };
    }
      
    default:
      return {
        success: false,
        message: `Unknown tool: ${tool}`
      };
  }
}

// Navigate to a URL
export function executeNavigateTo(url: string): ToolResult {
  try {
    // Allow relative URLs and absolute URLs
    const resolved = new URL(url, window.location.href);
    window.location.href = resolved.href;
    return {
      success: true,
      message: `Navigating to ${resolved.href}. Page will reload.`
    };
  } catch {
    return {
      success: false,
      message: `Invalid URL: ${url}`
    };
  }
}
