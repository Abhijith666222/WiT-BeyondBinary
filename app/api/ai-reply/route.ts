import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json(
      { error: "OpenAI API key not configured. Set OPENAI_API_KEY in .env." },
      { status: 503 }
    );
  }

  let body: { lastMessage?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON. Send { lastMessage: string }." },
      { status: 400 }
    );
  }

  const lastMessage = body.lastMessage?.trim();
  if (!lastMessage) {
    return NextResponse.json(
      { error: "Missing lastMessage." },
      { status: 400 }
    );
  }

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
          {
            role: "system",
            content:
              "You are a helpful assistant in a sign-language and accessibility app. Reply briefly and conversationally (1–3 sentences).",
          },
          { role: "user", content: lastMessage },
        ],
        max_tokens: 150,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return NextResponse.json(
        { error: (err as { error?: { message?: string } }).error?.message || res.statusText },
        { status: res.status }
      );
    }

    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const reply =
      data.choices?.[0]?.message?.content?.trim() || "(No reply generated.)";
    return NextResponse.json({ reply });
  } catch (err) {
    console.error("OpenAI request error", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "AI reply failed" },
      { status: 502 }
    );
  }
}
