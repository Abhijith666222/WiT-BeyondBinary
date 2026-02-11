import OpenAI from 'openai';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { toolDefinitions, isRiskyAction } from './tools.js';
import type { PageMap, TabState, ToolResult, UserProfile, PendingAction } from './types.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const openai = new OpenAI();

// Load user profile
let userProfile: UserProfile;
try {
  const profilePath = path.join(__dirname, '..', 'profile.json');
  userProfile = JSON.parse(fs.readFileSync(profilePath, 'utf-8'));
} catch (e) {
  console.error('Failed to load profile.json, using defaults');
  userProfile = {
    firstName: 'User',
    lastName: 'Demo',
    fullName: 'User Demo',
    email: 'user@example.com',
    phone: '555-0000',
    address: { street: '123 Main St', city: 'Anytown', state: 'ST', zip: '00000', country: 'US' },
    dateOfBirth: '1990-01-01',
    company: 'Demo Co',
    jobTitle: 'Tester'
  };
}

const SYSTEM_PROMPT = `You are an accessibility-focused voice assistant helping users with vision and motor impairments navigate websites. You execute ONE action at a time and wait for results.

CORE PRINCIPLES:
1. SAFETY FIRST: Never execute risky actions (submit, pay, purchase, send, delete, checkout, confirm) without explicit user confirmation. Use request_confirmation tool first.
2. GROUNDING: Only reference elements that exist in the current page_map. Never assume elements exist.
3. STEP-BY-STEP: Execute ONE tool call at a time, then wait for results before proceeding.
4. VERIFICATION: After each action, check if the expected result occurred before continuing.
5. ACCESSIBILITY: Keep spoken responses short, clear, and informative. Announce what you're doing and what happened.

NAVIGATION:
- Use navigate_to when the user wants to go to a known URL, homepage, or specific page.
  Examples: "go to my homepage" on LinkedIn → navigate_to with url "https://www.linkedin.com/feed"
  "go to google" → navigate_to with url "https://www.google.com"
  "go to my profile" on LinkedIn → navigate_to with url "https://www.linkedin.com/in/me"
- Use click when the user wants to click a specific button or link visible on the page.
- Links in the page_map include their destination (e.g. "Settings → linkedin.com/settings"). Use this to find the right link.

RESPONSE FORMAT:
- First, briefly state your plan (1-4 steps max)
- Then execute ONE tool call
- Your spoken response should be concise (1-2 sentences)

AVAILABLE CONTEXT:
- page_map: Current page structure with headings, sections, actions (buttons/links), and form fields
- Each action has: actionId, role, label (links include destination URL), isRisky flag
- Each form field has: fieldId, label, type, currentValue
- User profile available for form filling (use fill_form_with_profile)

SPECIAL SITUATIONS:
- If page shows login/captcha/2FA indicators, inform user they need to handle it manually
- If an element is not found, tell user and suggest alternatives
- If action fails, explain what happened and offer retry or alternatives
- If click fails (element not found), try navigate_to if you can infer the URL

PAGE ACCESSIBILITY ADJUSTMENTS:
When the user asks to make a page easier to read or adjust visual appearance:

Basic adjustments:
- "make text bigger" / "increase font size" → adjust_accessibility with "increase_font"
- "high contrast" / "dark mode" / "I can't see this" → adjust_accessibility with "high_contrast"
- "more spacing" / "spread out the text" → adjust_accessibility with "increase_spacing"
- "more word spacing" → adjust_accessibility with "increase_word_spacing"
- "dyslexia font" / "easier to read font" → adjust_accessibility with "dyslexia_font"
- "highlight what I'm focused on" → adjust_accessibility with "focus_highlight"
- "simplify this page" / "too cluttered" → adjust_accessibility with "simplify"
- "bigger cursor" / "large pointer" → adjust_accessibility with "large_pointer"
- "color blind mode" → adjust_accessibility with "color_blind_mode" and value like "protanopia"

Advanced features:
- "reading guide" / "help me track lines" → adjust_accessibility with "reading_guide" (yellow highlight bar follows cursor)
- "bionic reading" / "speed reading" → adjust_accessibility with "bionic_reading" (bolds first half of each word)
- "reading mode" / "distraction free" / "reader view" → adjust_accessibility with "reading_mode" (clean serif layout)
- "stop animations" / "stop moving things" → adjust_accessibility with "stop_animations"
- "highlight all links" / "show me the links" → adjust_accessibility with "highlight_links"
- "text magnifier" / "enlarge on hover" → adjust_accessibility with "text_magnifier"
- "show image descriptions" / "what are the images" → adjust_accessibility with "image_descriptions"

Disability presets (apply MULTIPLE settings at once — VERY POWERFUL for demos):
- "I have low vision" / "I can't see well" → adjust_accessibility with "preset_low_vision" (175% text, high contrast, focus highlights, large pointer, highlighted links)
- "I have dyslexia" / "I'm dyslexic" → adjust_accessibility with "preset_dyslexia" (OpenDyslexic font, bigger text, extra spacing, reading guide)
- "I have a motor impairment" / "I have tremors" → adjust_accessibility with "preset_motor_impairment" (large pointer, focus highlights, simplified, highlighted links)
- "I have trouble focusing" / "cognitive difficulties" → adjust_accessibility with "preset_cognitive" (simplified, bionic reading, no animations, reading guide)
- "I'm a senior" / "elderly mode" → adjust_accessibility with "preset_senior" (large text, large pointer, focus, text magnifier)

Page accessibility audit:
- "check accessibility" / "is this page accessible?" / "audit this page" → audit_accessibility with auto_fix=false
- "fix this page" / "make this accessible" / "auto-fix accessibility" → audit_accessibility with auto_fix=true
The audit scans for: missing alt text, low contrast, tiny text, missing form labels, no focus indicators, animations, complex layout, tight spacing. It returns a score out of 100.

You can combine multiple adjustments. Execute them one at a time.
- "reset everything" → adjust_accessibility with "reset_all"

FORM FILLING:
When the user wants to interact with ANY form (Google Forms, sign-up forms, application forms, surveys, etc.):
1. ALWAYS call scan_form FIRST to get the structured question list
2. Tell the user what questions the form has and ask what they want to fill
3. Use answer_form_question with the questionId and answer to fill each question
4. For radio/dropdown questions: use the exact option label from the scan results
5. For checkbox questions: use comma-separated option labels
6. For text questions: just provide the text
7. After filling, you can call scan_form again to verify the answers
8. NEVER try to fill forms by guessing field IDs or action IDs from the page map — always use scan_form first

Example flow:
- User: "Fill out this form"
- You: call scan_form → get questions list
- You: "This form has 3 questions: 1. Enter Name (text), 2. What is your favorite color (radio: red, blue, green), 3. Email (text). What would you like to fill in?"
- User: "My name is John, favorite color is blue, email john@test.com"
- You: call answer_form_question for each question in sequence

RISKY ACTION PROTOCOL:
When you need to click something marked isRisky=true OR with risky keywords (submit, pay, purchase, buy, send, delete, checkout, confirm):
1. MUST use request_confirmation tool FIRST
2. Wait for user's verbal confirmation
3. Only then proceed with the actual click

Remember: You're helping someone who cannot easily see or interact with the screen. Be their eyes and hands, but always keep them informed and in control.`;

export interface AgentResponse {
  spokenText: string;
  toolCall?: {
    name: string;
    args: Record<string, unknown>;
  };
  plan?: string;
  needsConfirmation?: boolean;
  pendingAction?: PendingAction;
}

function truncatePageMap(pageMap: PageMap): object {
  // Limit to most relevant items to stay within token limits
  const MAX_ACTIONS = 40;
  const MAX_FIELDS = 30;
  const MAX_SECTIONS = 10;
  const MAX_SNIPPET_LENGTH = 200;

  return {
    version: pageMap.version,
    url: pageMap.url,
    title: pageMap.title,
    headings: pageMap.headings.slice(0, 15),
    sections: pageMap.sections.slice(0, MAX_SECTIONS).map(s => ({
      ...s,
      snippet: s.snippet.slice(0, MAX_SNIPPET_LENGTH)
    })),
    actions: pageMap.actions.slice(0, MAX_ACTIONS),
    formFields: pageMap.formFields.slice(0, MAX_FIELDS),
    focus: pageMap.focus,
    alerts: pageMap.alerts,
    isLoginPage: pageMap.isLoginPage,
    isCaptchaPage: pageMap.isCaptchaPage,
    isCheckoutPage: pageMap.isCheckoutPage
  };
}

function buildMessages(
  tabState: TabState,
  userMessage: string,
  lastToolResult?: ToolResult
): ChatCompletionMessageParam[] {
  const messages: ChatCompletionMessageParam[] = [
    { role: 'system', content: SYSTEM_PROMPT }
  ];

  // Add page context
  if (tabState.pageMap) {
    const truncated = truncatePageMap(tabState.pageMap);
    messages.push({
      role: 'system',
      content: `CURRENT PAGE MAP:\n${JSON.stringify(truncated, null, 2)}\n\nUSER PROFILE AVAILABLE:\n${JSON.stringify(userProfile, null, 2)}`
    });
  }

  // ── Sanitize conversation history ──
  // OpenAI requires:
  //   1. Every tool message must reference a tool_call_id from a PRECEDING assistant message
  //   2. Every assistant message with tool_calls must be FOLLOWED by tool messages for ALL tool_call_ids
  // Violations of either rule cause 400 errors.
  
  const recentHistory = tabState.conversationHistory.slice(-20);

  // Pass 1: collect which tool_call_ids have responses
  const toolResultIds = new Set<string>();
  for (const msg of recentHistory) {
    if (msg.role === 'tool' && msg.toolCallId) {
      toolResultIds.add(msg.toolCallId);
    }
  }

  // Pass 2: collect which tool_call_ids were issued by assistants
  const toolCallIds = new Set<string>();
  for (const msg of recentHistory) {
    if (msg.role === 'assistant' && msg.toolCalls) {
      for (const tc of msg.toolCalls) {
        toolCallIds.add(tc.id);
      }
    }
  }

  // Pass 3: build clean message array
  for (const msg of recentHistory) {
    if (msg.role === 'user') {
      messages.push({ role: 'user', content: msg.content });
    } else if (msg.role === 'assistant') {
      if (msg.toolCalls && msg.toolCalls.length > 0) {
        // Check if ALL tool_call_ids in this message have matching tool results
        const allHaveResults = msg.toolCalls.every(tc => toolResultIds.has(tc.id));
        
        if (allHaveResults) {
          // Safe to include with tool_calls
          messages.push({
            role: 'assistant',
            content: msg.content || null,
            tool_calls: msg.toolCalls.map(tc => ({
              id: tc.id,
              type: 'function' as const,
              function: tc.function
            }))
          });
        } else {
          // Some tool results are missing (e.g. page reloaded before they arrived).
          // Strip tool_calls and include as plain assistant message to avoid 400 error.
          console.warn('[LLM] Stripping tool_calls from assistant message — missing results for:',
            msg.toolCalls.filter(tc => !toolResultIds.has(tc.id)).map(tc => tc.id));
          messages.push({
            role: 'assistant',
            content: msg.content || '(Action was interrupted by page navigation.)'
          });
        }
      } else {
        messages.push({ role: 'assistant', content: msg.content });
      }
    } else if (msg.role === 'tool' && msg.toolCallId) {
      // Only include if the tool_call_id exists in a preceding assistant message
      // AND that assistant message was included with its tool_calls (i.e. all its results exist)
      if (toolCallIds.has(msg.toolCallId)) {
        // Check that the parent assistant message's ALL tool calls have results
        // (if we stripped the assistant's tool_calls, we must skip this tool result too)
        const parentAssistant = recentHistory.find(m =>
          m.role === 'assistant' && m.toolCalls?.some(tc => tc.id === msg.toolCallId)
        );
        const parentAllResolved = parentAssistant?.toolCalls?.every(tc => toolResultIds.has(tc.id));
        
        if (parentAllResolved) {
          messages.push({
            role: 'tool',
            tool_call_id: msg.toolCallId,
            content: msg.content
          });
        } else {
          console.warn('[LLM] Skipping tool result (parent assistant was stripped):', msg.toolCallId);
        }
      } else {
        console.warn('[LLM] Skipping orphaned tool message (no matching tool_calls):', msg.toolCallId);
      }
    }
  }

  // Add current user message
  messages.push({ role: 'user', content: userMessage });

  // Add last tool result if exists
  if (lastToolResult) {
    messages.push({
      role: 'system',
      content: `LAST TOOL RESULT: ${JSON.stringify(lastToolResult)}`
    });
  }

  return messages;
}

export async function getAgentResponse(
  tabState: TabState,
  userMessage: string,
  lastToolResult?: ToolResult
): Promise<AgentResponse> {
  try {
    const messages = buildMessages(tabState, userMessage, lastToolResult);

    console.log('[LLM] Sending request with', messages.length, 'messages');

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages,
      tools: toolDefinitions,
      tool_choice: 'auto',
      max_tokens: 1024,
      temperature: 0.3
    });

    const choice = response.choices[0];
    const message = choice.message;

    console.log('[LLM] Response:', JSON.stringify(message, null, 2));

    // Extract spoken text (content) and tool call if any
    let spokenText = message.content || '';
    let toolCall: AgentResponse['toolCall'] = undefined;
    let needsConfirmation = false;
    let pendingAction: PendingAction | undefined = undefined;

    if (message.tool_calls && message.tool_calls.length > 0) {
      const tc = message.tool_calls[0];
      const args = JSON.parse(tc.function.arguments);
      
      // Store the tool call ID so we can match tool results later
      tabState.lastToolCallId = tc.id;
      
      toolCall = {
        name: tc.function.name,
        args
      };

      // Check if this is a risky click that needs confirmation
      if (tc.function.name === 'click' && args.actionId && tabState.pageMap) {
        const action = tabState.pageMap.actions.find(a => a.actionId === args.actionId);
        if (action && (action.isRisky || isRiskyAction(action.label))) {
          // Block the click and request confirmation instead
          needsConfirmation = true;
          pendingAction = {
            tool: 'click',
            args,
            description: `Click "${action.label}"`
          };
          toolCall = {
            name: 'request_confirmation',
            args: {
              actionDescription: `click the "${action.label}" button`,
              actionId: args.actionId
            }
          };
          spokenText = `I need to click "${action.label}". This looks like an important action. Please say "confirm" to proceed or "cancel" to stop.`;
        }
      }

      // Store in history — user message first, then assistant
      tabState.conversationHistory.push({
        role: 'user',
        content: userMessage
      });
      tabState.conversationHistory.push({
        role: 'assistant',
        content: spokenText,
        toolCalls: [{
          id: tc.id,
          type: 'function',
          function: tc.function
        }]
      });
    } else {
      // No tool call, just spoken response
      tabState.conversationHistory.push({
        role: 'user',
        content: userMessage
      });
      tabState.conversationHistory.push({
        role: 'assistant',
        content: spokenText
      });
    }

    // Trim history to prevent unbounded growth
    if (tabState.conversationHistory.length > 30) {
      tabState.conversationHistory = tabState.conversationHistory.slice(-20);
    }

    return {
      spokenText,
      toolCall,
      needsConfirmation,
      pendingAction
    };
  } catch (error) {
    console.error('[LLM] Error:', error);
    return {
      spokenText: 'I encountered an error processing your request. Please try again.'
    };
  }
}

export function getProfileValue(key: string): string {
  switch (key) {
    case 'firstName': return userProfile.firstName;
    case 'lastName': return userProfile.lastName;
    case 'fullName': return userProfile.fullName;
    case 'email': return userProfile.email;
    case 'phone': return userProfile.phone;
    case 'street': return userProfile.address.street;
    case 'city': return userProfile.address.city;
    case 'state': return userProfile.address.state;
    case 'zip': return userProfile.address.zip;
    case 'country': return userProfile.address.country;
    case 'dateOfBirth': return userProfile.dateOfBirth;
    case 'company': return userProfile.company;
    case 'jobTitle': return userProfile.jobTitle;
    default: return '';
  }
}

// Handle special voice commands
export function handleSpecialCommand(command: string, pageMap: PageMap | null): AgentResponse {
  switch (command) {
    case 'where_am_i':
      if (pageMap) {
        return {
          spokenText: `You are on ${pageMap.title}. The URL is ${new URL(pageMap.url).hostname}.`
        };
      }
      return { spokenText: 'I cannot determine the current page.' };

    case 'what_can_i_do':
      if (pageMap) {
        const actionCount = pageMap.actions.length;
        const formCount = pageMap.formFields.length;
        const topActions = pageMap.actions.slice(0, 5).map(a => a.label).join(', ');
        return {
          spokenText: `There are ${actionCount} interactive elements and ${formCount} form fields. Top actions include: ${topActions}. What would you like to do?`
        };
      }
      return { spokenText: 'No page information available.' };

    case 'go_back':
      return {
        spokenText: 'Going back to the previous page.',
        toolCall: { name: 'go_back', args: {} }
      };

    default:
      return { spokenText: 'I did not understand that command.' };
  }
}
