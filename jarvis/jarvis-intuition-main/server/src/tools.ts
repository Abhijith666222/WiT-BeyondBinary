import type { ChatCompletionTool } from 'openai/resources/chat/completions';

// Tool definitions for OpenAI function calling
export const toolDefinitions: ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'click',
      description: 'Click on an interactive element (button, link, checkbox, etc). Use action_id from the page map.',
      parameters: {
        type: 'object',
        properties: {
          actionId: {
            type: 'string',
            description: 'The action_id of the element to click from the page map'
          },
          description: {
            type: 'string',
            description: 'Brief description of what this click should accomplish'
          }
        },
        required: ['actionId', 'description']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'type_text',
      description: 'Type text into an input field. Use field_id from form fields in page map.',
      parameters: {
        type: 'object',
        properties: {
          fieldId: {
            type: 'string',
            description: 'The field_id of the input field from the page map'
          },
          text: {
            type: 'string',
            description: 'The text to type into the field'
          },
          clearFirst: {
            type: 'boolean',
            description: 'Whether to clear existing content before typing (default true)'
          }
        },
        required: ['fieldId', 'text']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'select_option',
      description: 'Select an option from a dropdown/select element.',
      parameters: {
        type: 'object',
        properties: {
          fieldId: {
            type: 'string',
            description: 'The field_id of the select element'
          },
          value: {
            type: 'string',
            description: 'The value or visible text of the option to select'
          }
        },
        required: ['fieldId', 'value']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'scroll',
      description: 'Scroll the page in a direction.',
      parameters: {
        type: 'object',
        properties: {
          direction: {
            type: 'string',
            enum: ['up', 'down', 'top', 'bottom'],
            description: 'Direction to scroll'
          },
          amount: {
            type: 'string',
            enum: ['small', 'medium', 'large', 'full'],
            description: 'Amount to scroll (default medium)'
          }
        },
        required: ['direction']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'read_section',
      description: 'Read out the content of a specific section on the page.',
      parameters: {
        type: 'object',
        properties: {
          sectionId: {
            type: 'string',
            description: 'The section_id to read from the page map'
          }
        },
        required: ['sectionId']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'read_page_summary',
      description: 'Read a summary of the current page including title, main headings, and available actions.',
      parameters: {
        type: 'object',
        properties: {},
        required: []
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'focus_element',
      description: 'Move keyboard focus to a specific element for accessibility.',
      parameters: {
        type: 'object',
        properties: {
          actionId: {
            type: 'string',
            description: 'The action_id or field_id of the element to focus'
          }
        },
        required: ['actionId']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'fill_form_with_profile',
      description: 'Fill multiple form fields using the user profile data. Matches fields by label similarity.',
      parameters: {
        type: 'object',
        properties: {
          fieldsToFill: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                fieldId: { type: 'string' },
                profileKey: {
                  type: 'string',
                  enum: ['firstName', 'lastName', 'fullName', 'email', 'phone', 'street', 'city', 'state', 'zip', 'country', 'dateOfBirth', 'company', 'jobTitle']
                }
              },
              required: ['fieldId', 'profileKey']
            },
            description: 'Array of field mappings to profile data'
          }
        },
        required: ['fieldsToFill']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'request_confirmation',
      description: 'Request explicit verbal confirmation from the user before proceeding with a risky action.',
      parameters: {
        type: 'object',
        properties: {
          actionDescription: {
            type: 'string',
            description: 'Clear description of the action that needs confirmation'
          },
          actionId: {
            type: 'string',
            description: 'The action_id that will be executed after confirmation'
          }
        },
        required: ['actionDescription', 'actionId']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'go_back',
      description: 'Navigate back to the previous page in browser history.',
      parameters: {
        type: 'object',
        properties: {},
        required: []
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'wait',
      description: 'Wait for a short period for page to load or update.',
      parameters: {
        type: 'object',
        properties: {
          duration: {
            type: 'number',
            description: 'Duration to wait in milliseconds (default 1000, max 5000)'
          },
          reason: {
            type: 'string',
            description: 'Why we are waiting'
          }
        },
        required: ['reason']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'navigate_to',
      description: 'Navigate the browser to a specific URL. Use when the user asks to go to a specific website, page, or URL, or when you need to navigate to a known URL (e.g. linkedin.com/feed for LinkedIn home, google.com, etc).',
      parameters: {
        type: 'object',
        properties: {
          url: {
            type: 'string',
            description: 'The URL to navigate to (can be absolute like "https://google.com" or a path like "/feed")'
          }
        },
        required: ['url']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'scan_form',
      description: 'Deeply scan the current page for form questions. Returns a structured list of all questions with their type (text, radio, checkbox, dropdown, date, etc.), available options, current answers, and IDs needed to fill them. ALWAYS use this tool FIRST when the user wants to interact with any form, before trying to fill fields. Works with Google Forms, standard HTML forms, and custom form UIs.',
      parameters: {
        type: 'object',
        properties: {},
        required: []
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'answer_form_question',
      description: 'Answer a specific form question. Use the questionId from scan_form results and provide the answer text. For radio/dropdown: use the exact option label. For checkbox: use comma-separated option labels. For text: type the text. This tool handles all the mechanics (clicking radios, typing text, opening dropdowns, etc.).',
      parameters: {
        type: 'object',
        properties: {
          questionId: {
            type: 'string',
            description: 'The questionId from scan_form results'
          },
          answer: {
            type: 'string',
            description: 'The answer to provide. For radio/dropdown: exact option label. For checkbox: comma-separated labels. For text: the text to type.'
          }
        },
        required: ['questionId', 'answer']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'adjust_accessibility',
      description: 'Adjust the visual accessibility of the current page in real-time. Supports individual adjustments (font size, contrast, spacing, etc.), advanced features (reading guide, bionic reading, reading mode, text magnifier), and disability-profile presets that apply multiple settings at once. Use when the user asks to make a page easier to read, adjust visual appearance, or mentions a disability/condition.',
      parameters: {
        type: 'object',
        properties: {
          adjustment: {
            type: 'string',
            enum: [
              'increase_font', 'decrease_font', 'reset_font',
              'high_contrast',
              'increase_spacing', 'decrease_spacing',
              'increase_word_spacing', 'decrease_word_spacing',
              'dyslexia_font', 'focus_highlight', 'simplify',
              'large_pointer', 'color_blind_mode',
              'reading_guide', 'bionic_reading', 'reading_mode',
              'stop_animations', 'highlight_links',
              'text_magnifier', 'image_descriptions',
              'preset_low_vision', 'preset_dyslexia',
              'preset_motor_impairment', 'preset_cognitive', 'preset_senior',
              'reset_all', 'get_status'
            ],
            description: 'The accessibility adjustment to make. Presets (preset_*) apply multiple settings at once for a specific disability profile.'
          },
          value: {
            type: 'string',
            description: 'Optional value for the adjustment (e.g. "protanopia" for color_blind_mode). Options for color_blind_mode: none, protanopia, deuteranopia, tritanopia'
          }
        },
        required: ['adjustment']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'audit_accessibility',
      description: 'Scan the current page for accessibility issues and optionally auto-fix them. Reports a score (0-100), lists issues found (missing alt text, low contrast, tiny text, missing form labels, no focus indicators, animations, complex layout, tight spacing), and can automatically apply fixes. Use when the user asks "is this page accessible?", "check accessibility", "fix this page", or "audit this page".',
      parameters: {
        type: 'object',
        properties: {
          auto_fix: {
            type: 'boolean',
            description: 'If true, automatically apply fixes for all auto-fixable issues found (high contrast, font size, focus highlights, stop animations, simplify layout, increase spacing). Default false.'
          }
        },
        required: []
      }
    }
  }
];

// Risky action keywords that require confirmation
export const riskyKeywords = [
  'submit', 'pay', 'purchase', 'buy', 'send', 'delete', 'remove',
  'checkout', 'confirm', 'place order', 'complete', 'finalize',
  'transfer', 'wire', 'donate', 'subscribe', 'unsubscribe',
  'cancel subscription', 'close account', 'deactivate'
];

export function isRiskyAction(label: string): boolean {
  const lowerLabel = label.toLowerCase();
  return riskyKeywords.some(keyword => lowerLabel.includes(keyword));
}
