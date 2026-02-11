// Background service worker for Chrome extension
// Owns WebSocket connections to backend. Content scripts communicate via runtime messaging.

const WS_URL = "ws://localhost:3001/ws";

type TabWS = {
  ws: WebSocket | null;
  reconnectAttempts: number;
  reconnectTimer?: number;
  /** Messages queued while WS is connecting */
  pendingQueue: string[];
};

const tabSockets = new Map<number, TabWS>();
const MAX_RECONNECT_ATTEMPTS = 8;

function getTabWS(tabId: number): TabWS {
  let st = tabSockets.get(tabId);
  if (!st) {
    st = { ws: null, reconnectAttempts: 0, pendingQueue: [] };
    tabSockets.set(tabId, st);
  }
  return st;
}

function connectWS(tabId: number) {
  const st = getTabWS(tabId);

  if (st.ws && (st.ws.readyState === WebSocket.OPEN || st.ws.readyState === WebSocket.CONNECTING)) {
    return;
  }

  console.log("[BG] Opening WS for tab", tabId);
  const ws = new WebSocket(WS_URL);
  st.ws = ws;

  ws.onopen = () => {
    st.reconnectAttempts = 0;
    console.log("[BG] WS connected tab", tabId);

    // Register this tab
    ws.send(JSON.stringify({ type: "register_tab", tabId }));

    // Flush any messages that were queued while connecting
    while (st.pendingQueue.length > 0) {
      const msg = st.pendingQueue.shift()!;
      console.log("[BG] Flushing queued message for tab", tabId);
      ws.send(msg);
    }
  };

  ws.onmessage = async (event) => {
    try {
      const cmd = JSON.parse(typeof event.data === "string" ? event.data : await event.data.text());
      // forward to content script in that tab
      await chrome.tabs.sendMessage(tabId, { type: "server_command", command: cmd });
    } catch (e) {
      console.error("[BG] Failed to parse/forward server msg:", e);
    }
  };

  ws.onerror = (e) => {
    console.error("[BG] WS error tab", tabId, e);
  };

  ws.onclose = () => {
    console.warn("[BG] WS closed tab", tabId);
    st.ws = null;

    if (st.reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
      st.reconnectAttempts += 1;
      const delay = Math.min(15000, 1000 * st.reconnectAttempts);
      console.log(`[BG] Reconnecting tab ${tabId} in ${delay}ms (${st.reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`);
      if (st.reconnectTimer) clearTimeout(st.reconnectTimer);
      st.reconnectTimer = setTimeout(() => connectWS(tabId), delay) as unknown as number;
    } else {
      console.error(`[BG] Max reconnect attempts reached for tab ${tabId}. Dropping ${st.pendingQueue.length} queued messages.`);
      st.pendingQueue = [];
    }
  };
}

function sendToServer(tabId: number, payload: any) {
  connectWS(tabId);
  const st = getTabWS(tabId);
  const msg = JSON.stringify(payload);

  if (st.ws && st.ws.readyState === WebSocket.OPEN) {
    st.ws.send(msg);
  } else {
    // WS is still connecting — queue the message instead of dropping it
    console.log("[BG] WS not open yet, queuing", payload?.type, "for tab", tabId);
    st.pendingQueue.push(msg);
  }
}

// Handle messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === "get_tab_id") {
    sendResponse({ tabId: sender.tab?.id || 0 });
    return true;
  }

  if (message?.type === "open_options") {
    chrome.runtime.openOptionsPage();
    return true;
  }

  if (message?.type === "page_map_update") {
    sendToServer(message.tabId, { type: "page_map_update", tabId: message.tabId, data: message.data });
    return true;
  }

  if (message?.type === "user_transcript") {
    sendToServer(message.tabId, {
      type: "user_transcript",
      tabId: message.tabId,
      data: { transcript: message.transcript },
    });
    return true;
  }

  if (message?.type === "tool_result") {
    sendToServer(message.tabId, { type: "tool_result", tabId: message.tabId, data: message.data });
    return true;
  }

  return false;
});

// Handle extension icon click (toggle overlay)
chrome.action.onClicked.addListener(async (tab) => {
  if (tab.id) {
    try {
      await chrome.tabs.sendMessage(tab.id, { type: "toggle_overlay" });
    } catch (e) {
      console.log("[BG] Content script not ready:", e);
    }
  }
});

console.log("[BG] Voice Assistant background service worker started");
