import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'http';
import type {
  TabState,
  PageMap,
  ToolResult,
  WSMessage,
  WSCommand,
  WSSpeakCommand,
  WSExecuteToolCommand,
  WSStatusUpdate,
  WSHighlightCommand,
  PendingAction
} from './types.js';
import { getAgentResponse, handleSpecialCommand, getProfileValue } from './llm.js';
import { detectConfirmation, detectSpecialCommand } from './transcribe.js';

// Store tab states
const tabStates = new Map<number, TabState>();

// Store WebSocket connections by tab
const tabConnections = new Map<number, WebSocket>();

export function setupWebSocket(server: Server) {
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws: WebSocket) => {
    console.log('[WS] Client connected');
    let connectedTabId: number | null = null;

    ws.on('message', async (data: Buffer) => {
      try {
        const message: WSMessage = JSON.parse(data.toString());
        console.log('[WS] Received:', message.type, 'tabId:', message.tabId);

        const tabId = message.tabId;
        if (!tabId) {
          console.error('[WS] No tabId in message');
          return;
        }

        // Track this connection's tab
        if (!connectedTabId) {
          connectedTabId = tabId;
          tabConnections.set(tabId, ws);
        }

        // Initialize tab state if needed
        if (!tabStates.has(tabId)) {
          tabStates.set(tabId, {
            tabId,
            pageMap: null,
            conversationHistory: [],
            confirmationPending: false,
            pendingAction: null,
            lastPlan: null,
            lastToolCallId: null,
            batchMode: false,
            lastExecutedTool: null
          });
        }

        const tabState = tabStates.get(tabId)!;

        switch (message.type) {
          case 'page_map_update':
            handlePageMapUpdate(tabState, message.data as PageMap, ws);
            break;

          case 'user_transcript':
            await handleUserTranscript(tabState, (message.data as { transcript: string }).transcript, ws);
            break;

          case 'tool_result':
            await handleToolResult(tabState, message.data as ToolResult, ws);
            break;

          case 'register_tab':
            console.log('[WS] Tab registered:', tabId);
            sendCommand(ws, {
              type: 'status_update',
              tabId,
              data: { status: 'idle' }
            });
            break;

          default:
            console.log('[WS] Unknown message type:', message.type);
        }
      } catch (error) {
        console.error('[WS] Error processing message:', error);
      }
    });

    ws.on('close', () => {
      console.log('[WS] Client disconnected');
      if (connectedTabId) {
        tabConnections.delete(connectedTabId);
      }
    });

    ws.on('error', (error) => {
      console.error('[WS] Error:', error);
    });
  });

  console.log('[WS] WebSocket server ready');
  return wss;
}

function handlePageMapUpdate(tabState: TabState, pageMap: PageMap, ws: WebSocket) {
  tabState.pageMap = pageMap;
  console.log('[WS] Page map updated:', pageMap.title, 
    'actions:', pageMap.actions.length, 
    'fields:', pageMap.formFields.length);
}

async function handleUserTranscript(tabState: TabState, transcript: string, ws: WebSocket) {
  console.log('[WS] User said:', transcript);

  // Update status
  sendCommand(ws, {
    type: 'status_update',
    tabId: tabState.tabId,
    data: { status: 'thinking' }
  });

  // Check for special commands first
  const specialCommand = detectSpecialCommand(transcript);
  if (specialCommand === 'repeat') {
    // Re-speak last response (handled by extension)
    sendCommand(ws, {
      type: 'speak',
      tabId: tabState.tabId,
      data: { text: 'repeat_last', priority: 'high' }
    });
    sendCommand(ws, {
      type: 'status_update',
      tabId: tabState.tabId,
      data: { status: 'idle' }
    });
    return;
  }

  if (specialCommand === 'stop') {
    sendCommand(ws, {
      type: 'speak',
      tabId: tabState.tabId,
      data: { text: 'stop_speaking', priority: 'high' }
    });
    sendCommand(ws, {
      type: 'status_update',
      tabId: tabState.tabId,
      data: { status: 'idle' }
    });
    return;
  }

  if (specialCommand === 'slower') {
    sendCommand(ws, {
      type: 'speak',
      tabId: tabState.tabId,
      data: { text: 'I will speak more slowly now.', priority: 'high' }
    });
    sendCommand(ws, {
      type: 'status_update',
      tabId: tabState.tabId,
      data: { status: 'idle' }
    });
    return;
  }

  // Check if waiting for confirmation
  if (tabState.confirmationPending && tabState.pendingAction) {
    const confirmResult = detectConfirmation(transcript);
    if (confirmResult === 'confirm') {
      // User confirmed, execute the pending action
      console.log('[WS] User confirmed action:', tabState.pendingAction);
      tabState.confirmationPending = false;
      const action = tabState.pendingAction;
      tabState.pendingAction = null;

      sendCommand(ws, {
        type: 'speak',
        tabId: tabState.tabId,
        data: { text: `Confirmed. ${action.description}.`, priority: 'normal' }
      });

      sendCommand(ws, {
        type: 'status_update',
        tabId: tabState.tabId,
        data: { status: 'executing', currentStep: action.description }
      });

      sendCommand(ws, {
        type: 'execute_tool',
        tabId: tabState.tabId,
        data: { tool: action.tool, args: action.args }
      });
      return;
    } else if (confirmResult === 'cancel') {
      // User cancelled
      tabState.confirmationPending = false;
      tabState.pendingAction = null;

      sendCommand(ws, {
        type: 'speak',
        tabId: tabState.tabId,
        data: { text: 'Action cancelled. What would you like to do instead?', priority: 'normal' }
      });

      sendCommand(ws, {
        type: 'status_update',
        tabId: tabState.tabId,
        data: { status: 'idle' }
      });
      return;
    }
    // If neither confirm nor cancel detected, continue to process as normal request
  }

  // Handle special commands
  if (specialCommand && specialCommand !== 'repeat' && specialCommand !== 'stop' && specialCommand !== 'slower') {
    const response = handleSpecialCommand(specialCommand, tabState.pageMap);
    
    sendCommand(ws, {
      type: 'speak',
      tabId: tabState.tabId,
      data: { text: response.spokenText, priority: 'normal' }
    });

    if (response.toolCall) {
      // Generate a synthetic tool call ID so the tool result can be matched
      const syntheticToolCallId = `special_${Date.now()}`;
      tabState.lastToolCallId = syntheticToolCallId;

      // Add user message + assistant message with tool_calls to history
      // so the tool result won't be orphaned
      tabState.conversationHistory.push({
        role: 'user',
        content: transcript
      });
      tabState.conversationHistory.push({
        role: 'assistant',
        content: response.spokenText,
        toolCalls: [{
          id: syntheticToolCallId,
          type: 'function',
          function: {
            name: response.toolCall.name,
            arguments: JSON.stringify(response.toolCall.args)
          }
        }]
      });

      sendCommand(ws, {
        type: 'status_update',
        tabId: tabState.tabId,
        data: { status: 'executing', currentStep: response.toolCall.name }
      });

      tabState.lastExecutedTool = response.toolCall.name;
      sendCommand(ws, {
        type: 'execute_tool',
        tabId: tabState.tabId,
        data: { tool: response.toolCall.name, args: response.toolCall.args }
      });
    } else {
      // No tool — just record the exchange in history
      tabState.conversationHistory.push({
        role: 'user',
        content: transcript
      });
      tabState.conversationHistory.push({
        role: 'assistant',
        content: response.spokenText
      });

      sendCommand(ws, {
        type: 'status_update',
        tabId: tabState.tabId,
        data: { status: 'idle' }
      });
    }
    return;
  }

  // Process with LLM
  try {
    const response = await getAgentResponse(tabState, transcript);
    
    // Store plan if provided
    if (response.plan) {
      tabState.lastPlan = response.plan;
    }

    // Speak the response
    if (response.spokenText) {
      sendCommand(ws, {
        type: 'speak',
        tabId: tabState.tabId,
        data: { text: response.spokenText, priority: 'normal' }
      });
    }

    // Handle confirmation request
    if (response.needsConfirmation && response.pendingAction) {
      tabState.confirmationPending = true;
      tabState.pendingAction = response.pendingAction;
      
      sendCommand(ws, {
        type: 'status_update',
        tabId: tabState.tabId,
        data: { status: 'awaiting_confirmation', currentStep: response.pendingAction.description }
      });
      return;
    }

    // Execute tool if requested
    if (response.toolCall) {
      const toolName = response.toolCall.name;
      const toolArgs = response.toolCall.args;

      // Handle request_confirmation specially
      if (toolName === 'request_confirmation') {
        tabState.confirmationPending = true;
        tabState.pendingAction = {
          tool: 'click',
          args: { actionId: toolArgs.actionId },
          description: toolArgs.actionDescription as string
        };

        sendCommand(ws, {
          type: 'status_update',
          tabId: tabState.tabId,
          data: { status: 'awaiting_confirmation', currentStep: toolArgs.actionDescription as string }
        });

        // Highlight the action
        sendCommand(ws, {
          type: 'highlight_action',
          tabId: tabState.tabId,
          data: { actionId: toolArgs.actionId }
        });
        return;
      }

      // Handle profile fill specially (server-side)
      if (toolName === 'fill_form_with_profile') {
        const fieldsToFill = toolArgs.fieldsToFill as Array<{ fieldId: string; profileKey: string }>;
        
        // Enable batch mode to prevent LLM calls for each field's tool result
        tabState.batchMode = true;
        
        let filledCount = 0;
        for (const field of fieldsToFill) {
          const value = getProfileValue(field.profileKey);
          if (value) {
            sendCommand(ws, {
              type: 'execute_tool',
              tabId: tabState.tabId,
              data: {
                tool: 'type_text',
                args: { fieldId: field.fieldId, text: value, clearFirst: true }
              }
            });
            filledCount++;
            // Small delay between fills
            await new Promise(resolve => setTimeout(resolve, 200));
          }
        }

        tabState.batchMode = false;

        sendCommand(ws, {
          type: 'speak',
          tabId: tabState.tabId,
          data: { text: `Filled ${filledCount} form fields with your profile data.`, priority: 'normal' }
        });

        sendCommand(ws, {
          type: 'status_update',
          tabId: tabState.tabId,
          data: { status: 'idle' }
        });
        return;
      }

      // Execute other tools
      sendCommand(ws, {
        type: 'status_update',
        tabId: tabState.tabId,
        data: { status: 'executing', currentStep: toolName }
      });

      // Highlight action if clicking
      if (toolName === 'click' && toolArgs.actionId) {
        sendCommand(ws, {
          type: 'highlight_action',
          tabId: tabState.tabId,
          data: { actionId: toolArgs.actionId }
        });
      }

      tabState.lastExecutedTool = toolName;
      sendCommand(ws, {
        type: 'execute_tool',
        tabId: tabState.tabId,
        data: { tool: toolName, args: toolArgs }
      });
    } else {
      sendCommand(ws, {
        type: 'status_update',
        tabId: tabState.tabId,
        data: { status: 'idle' }
      });
    }
  } catch (error) {
    console.error('[WS] LLM error:', error);
    sendCommand(ws, {
      type: 'speak',
      tabId: tabState.tabId,
      data: { text: 'I encountered an error. Please try again.', priority: 'high' }
    });
    sendCommand(ws, {
      type: 'status_update',
      tabId: tabState.tabId,
      data: { status: 'idle' }
    });
  }
}

async function handleToolResult(tabState: TabState, result: ToolResult, ws: WebSocket) {
  console.log('[WS] Tool result:', result);

  // Add tool result to conversation history with matching tool call ID
  const toolCallId = tabState.lastToolCallId || `tool_${Date.now()}`;
  tabState.lastToolCallId = null; // consume the ID
  
  tabState.conversationHistory.push({
    role: 'tool',
    content: JSON.stringify(result),
    toolCallId
  });

  // During batch operations (e.g. form filling), don't trigger LLM follow-up
  if (tabState.batchMode) {
    console.log('[WS] Batch mode — skipping LLM follow-up for tool result');
    return;
  }

  // After navigation tools, the page is about to reload. Don't follow up —
  // the WebSocket will disconnect and a new content script will start.
  if (tabState.lastExecutedTool === 'navigate_to' || tabState.lastExecutedTool === 'go_back') {
    console.log(`[WS] ${tabState.lastExecutedTool} completed — skipping LLM follow-up (page reloading)`);
    tabState.lastExecutedTool = null;
    sendCommand(ws, {
      type: 'status_update',
      tabId: tabState.tabId,
      data: { status: 'idle' }
    });
    return;
  }

  // If tool failed, speak error
  if (!result.success) {
    sendCommand(ws, {
      type: 'speak',
      tabId: tabState.tabId,
      data: { text: result.message, priority: 'normal' }
    });
    sendCommand(ws, {
      type: 'status_update',
      tabId: tabState.tabId,
      data: { status: 'idle' }
    });
    return;
  }

  // Continue processing with LLM to decide next step
  try {
    const response = await getAgentResponse(
      tabState,
      `Tool result: ${result.message}`,
      result
    );

    if (response.spokenText) {
      sendCommand(ws, {
        type: 'speak',
        tabId: tabState.tabId,
        data: { text: response.spokenText, priority: 'normal' }
      });
    }

    if (response.toolCall) {
      sendCommand(ws, {
        type: 'status_update',
        tabId: tabState.tabId,
        data: { status: 'executing', currentStep: response.toolCall.name }
      });

      tabState.lastExecutedTool = response.toolCall.name;
      sendCommand(ws, {
        type: 'execute_tool',
        tabId: tabState.tabId,
        data: { tool: response.toolCall.name, args: response.toolCall.args }
      });
    } else {
      sendCommand(ws, {
        type: 'status_update',
        tabId: tabState.tabId,
        data: { status: 'idle' }
      });
    }
  } catch (error) {
    console.error('[WS] Continue error:', error);
    sendCommand(ws, {
      type: 'status_update',
      tabId: tabState.tabId,
      data: { status: 'idle' }
    });
  }
}

function sendCommand(ws: WebSocket, command: WSCommand) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(command));
    console.log('[WS] Sent:', command.type);
  }
}

// Get tab state (for REST endpoints)
export function getTabState(tabId: number): TabState | undefined {
  return tabStates.get(tabId);
}

// Send command to specific tab
export function sendToTab(tabId: number, command: WSCommand) {
  const ws = tabConnections.get(tabId);
  if (ws) {
    sendCommand(ws, command);
  }
}
