import { NextRequest, NextResponse } from "next/server";
import {
  APP_ROUTES,
  PAGE_INFO,
  type VoiceAction,
} from "@/lib/voice/navigator";

const ROUTES_JSON = JSON.stringify(
  APP_ROUTES.map((r) => ({ path: r.path, label: r.label }))
);

export async function POST(request: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json(
      { error: "OpenAI API key not configured." },
      { status: 503 }
    );
  }

  let body: {
    transcript?: string;
    pathname?: string;
    pageContext?: string;
    availableInputs?: string[];
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON. Send { transcript: string, pathname: string, pageContext?: string, availableInputs?: string[] }." },
      { status: 400 }
    );
  }

  const transcript = (body.transcript ?? "").trim();
  const pathname = (body.pathname ?? "/").split("?")[0];
  const pageContext = body.pageContext ?? "";
  const availableInputs = body.availableInputs ?? [
    "message",
    "search",
    "room code",
    "join code",
  ];

  if (!transcript) {
    return NextResponse.json(
      { error: "Missing transcript." },
      { status: 400 }
    );
  }

  const pageInfo = PAGE_INFO[pathname];

  const systemPrompt = `You are a voice command interpreter for SignBridge Universe, an accessibility app for Deaf, Blind, and Helper users. The user speaks naturally and you must interpret their intent into a JSON action.

AVAILABLE ACTIONS (return exactly one JSON object, no other text):

1. navigate: { "type": "navigate", "path": "/path", "label": "Page Name" }
   - Path must be one of: ${ROUTES_JSON}
   - Use when user wants to go somewhere: "take me to safety", "open relay", "I need to go to the hospital flow" -> publicassist

2. go_back: { "type": "go_back" }
   - Use for: "go back", "previous", "return"

3. scroll: { "type": "scroll", "direction": "up"|"down"|"top"|"bottom" }

4. read_page: { "type": "read_page" }
   - Use for: "where am I", "what can I do", "describe this page", "help"

5. page_action: { "type": "page_action", "actionId": "action-id" }
   - actionId must match a known action. Available on this page: ${pageInfo?.actions?.map((a) => a.actionId).join(", ") ?? "create-room, join-room, tab-chat, tab-relay, connect-another-device, read-all-places, refresh-places, etc."}

6. click_element: { "type": "click_element", "label": "button or link name" }
   - Use when user wants to click something: "click create room", "press the red button", "select women-owned filter"

7. type_text: { "type": "type_text", "text": "what to type", "field": "field identifier" }
   - Use when user wants to fill or type something. Examples:
     - "send a message saying hello" -> { "type": "type_text", "text": "hello", "field": "message" }
     - "type coffee in the search" -> { "type": "type_text", "text": "coffee", "field": "search" }
     - "enter room code ABC123" -> { "type": "type_text", "text": "ABC123", "field": "room code" }
   - field should be one of: ${availableInputs.join(", ")}

8. list_elements: { "type": "list_elements" }
   - Use for: "what can I click", "list buttons", "show me options"

9. unknown: { "type": "unknown", "transcript": "original", "message": "friendly reply" }
   - Use only when intent is unclear. Include a helpful message.`;

  const userPrompt = `Current page: ${pathname}
${pageContext ? `Page context: ${pageContext}\n` : ""}
User said: "${transcript}"

Respond with ONLY a valid JSON object (no markdown, no explanation). Example: {"type":"navigate","path":"/safetyassist","label":"SafetyAssist"}`;

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 200,
        temperature: 0.2,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return NextResponse.json(
        {
          error:
            (err as { error?: { message?: string } }).error?.message ||
            res.statusText,
        },
        { status: res.status >= 500 ? 502 : 400 }
      );
    }

    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const raw = data.choices?.[0]?.message?.content?.trim() ?? "";
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? jsonMatch[0] : raw;

    let action: VoiceAction;
    try {
      const parsed = JSON.parse(jsonStr) as Record<string, unknown>;
      const type = String(parsed.type ?? "unknown").toLowerCase();

      switch (type) {
        case "navigate":
          action = {
            type: "navigate",
            path: String(parsed.path ?? "/dashboard"),
            label: String(parsed.label ?? "Home"),
          };
          break;
        case "go_back":
          action = { type: "go_back" };
          break;
        case "scroll":
          action = {
            type: "scroll",
            direction: ["up", "down", "top", "bottom"].includes(
              String(parsed.direction)
            )
              ? (parsed.direction as "up" | "down" | "top" | "bottom")
              : "down",
          };
          break;
        case "read_page":
          action = { type: "read_page" };
          break;
        case "page_action":
          action = {
            type: "page_action",
            actionId: String(parsed.actionId ?? ""),
          };
          break;
        case "click_element":
          action = {
            type: "click_element",
            label: String(parsed.label ?? ""),
          };
          break;
        case "type_text":
          action = {
            type: "type_text",
            text: String(parsed.text ?? ""),
            field: String(parsed.field ?? "message"),
          };
          break;
        case "list_elements":
          action = { type: "list_elements" };
          break;
        default:
          action = {
            type: "unknown",
            transcript,
            message: String(parsed.message ?? "").trim() || undefined,
          };
      }

      return NextResponse.json({ action });
    } catch {
      return NextResponse.json(
        { error: "Could not parse AI response", raw },
        { status: 502 }
      );
    }
  } catch (err) {
    console.error("Voice command API error", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "AI request failed" },
      { status: 502 }
    );
  }
}
