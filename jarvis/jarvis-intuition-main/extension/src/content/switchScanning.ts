// Switch scanning for users with motor impairments
// Provides Next/Select navigation through interactive elements

import type { ActionInfo } from '../types';
import { extractPageMap } from './pageMap';
import { speak } from './tts';
import { executeClick } from './tools';

let isEnabled = false;
let currentIndex = -1;
let currentActions: ActionInfo[] = [];
let highlightElement: HTMLElement | null = null;

// Initialize switch scanning
export function initSwitchScanning(): void {
  // Create highlight overlay element
  highlightElement = document.createElement('div');
  highlightElement.id = 'voice-assistant-scan-highlight';
  highlightElement.style.cssText = `
    position: fixed;
    pointer-events: none;
    z-index: 2147483646;
    border: 4px solid #00FF00;
    border-radius: 4px;
    background: rgba(0, 255, 0, 0.1);
    transition: all 0.2s ease;
    display: none;
  `;
  document.body.appendChild(highlightElement);
  
  // Listen for keyboard shortcuts
  document.addEventListener('keydown', handleKeyDown);
}

// Enable/disable switch scanning
export function setEnabled(enabled: boolean): void {
  isEnabled = enabled;
  
  if (enabled) {
    refreshActions();
    currentIndex = -1;
    speak('Switch scanning enabled. Press Space or Tab for next, Enter to select.', 'high');
  } else {
    hideHighlight();
    currentIndex = -1;
    speak('Switch scanning disabled.', 'high');
  }
}

export function isEnabledState(): boolean {
  return isEnabled;
}

// Refresh available actions
export function refreshActions(): void {
  const pageMap = extractPageMap(0);
  // Filter to only visible, enabled actions
  currentActions = pageMap.actions.filter(a => 
    !a.state.disabled && a.boundingBox
  );
  
  // Sort by position (top to bottom, left to right)
  currentActions.sort((a, b) => {
    if (!a.boundingBox || !b.boundingBox) return 0;
    const yDiff = a.boundingBox.y - b.boundingBox.y;
    if (Math.abs(yDiff) > 20) return yDiff;
    return a.boundingBox.x - b.boundingBox.x;
  });
}

// Move to next action
export function next(): void {
  if (!isEnabled || currentActions.length === 0) return;
  
  currentIndex = (currentIndex + 1) % currentActions.length;
  const action = currentActions[currentIndex];
  
  highlightAction(action);
  announceAction(action);
}

// Move to previous action
export function previous(): void {
  if (!isEnabled || currentActions.length === 0) return;
  
  currentIndex = currentIndex <= 0 ? currentActions.length - 1 : currentIndex - 1;
  const action = currentActions[currentIndex];
  
  highlightAction(action);
  announceAction(action);
}

// Select current action
export async function select(): Promise<void> {
  if (!isEnabled || currentIndex < 0 || currentIndex >= currentActions.length) {
    speak('No action selected. Press Space for next.', 'normal');
    return;
  }
  
  const action = currentActions[currentIndex];
  
  if (action.isRisky) {
    speak(`Warning: This is "${action.label}". This may be a risky action. Say confirm to proceed.`, 'high');
    return;
  }
  
  speak(`Selecting ${action.label}`, 'normal');
  await executeClick(action.actionId, action.label);
  
  // Refresh after click
  setTimeout(() => {
    refreshActions();
    currentIndex = -1;
    hideHighlight();
  }, 500);
}

// Highlight the current action
function highlightAction(action: ActionInfo): void {
  if (!highlightElement || !action.boundingBox) return;
  
  const box = action.boundingBox;
  highlightElement.style.left = `${box.x - 4}px`;
  highlightElement.style.top = `${box.y - 4}px`;
  highlightElement.style.width = `${box.width + 8}px`;
  highlightElement.style.height = `${box.height + 8}px`;
  highlightElement.style.display = 'block';
  
  // Scroll into view if needed
  const element = document.querySelector(action.selector);
  if (element) {
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

// Hide highlight
function hideHighlight(): void {
  if (highlightElement) {
    highlightElement.style.display = 'none';
  }
}

// Announce action
function announceAction(action: ActionInfo): void {
  let announcement = `${currentIndex + 1} of ${currentActions.length}: ${action.label}`;
  
  if (action.role !== 'button' && action.role !== 'link') {
    announcement += `, ${action.role}`;
  }
  
  if (action.state.checked !== undefined) {
    announcement += action.state.checked ? ', checked' : ', unchecked';
  }
  
  if (action.state.expanded !== undefined) {
    announcement += action.state.expanded ? ', expanded' : ', collapsed';
  }
  
  if (action.isRisky) {
    announcement += ', caution: this may submit or change data';
  }
  
  speak(announcement, 'normal');
}

// Handle keyboard events
function handleKeyDown(event: KeyboardEvent): void {
  if (!isEnabled) return;
  
  // Don't interfere with form inputs
  const target = event.target as HTMLElement;
  if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') {
    return;
  }
  
  switch (event.key) {
    case ' ':
    case 'Tab':
      event.preventDefault();
      if (event.shiftKey) {
        previous();
      } else {
        next();
      }
      break;
      
    case 'Enter':
      event.preventDefault();
      select();
      break;
      
    case 'Escape':
      event.preventDefault();
      setEnabled(false);
      break;
  }
}

// Get current scan state
export function getScanState(): {
  enabled: boolean;
  index: number;
  total: number;
  currentAction: ActionInfo | null;
} {
  return {
    enabled: isEnabled,
    index: currentIndex,
    total: currentActions.length,
    currentAction: currentIndex >= 0 ? currentActions[currentIndex] : null
  };
}

// Cleanup
export function cleanup(): void {
  document.removeEventListener('keydown', handleKeyDown);
  if (highlightElement && highlightElement.parentNode) {
    highlightElement.parentNode.removeChild(highlightElement);
  }
}
