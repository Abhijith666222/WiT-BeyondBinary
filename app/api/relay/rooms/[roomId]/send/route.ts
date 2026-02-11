import { NextRequest, NextResponse } from "next/server";
import { sendMessage } from "@/lib/relay-rooms";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const { roomId } = await params;
  let body: { from?: "A" | "B"; text?: string; signGloss?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON. Send { from: 'A'|'B', text: string, signGloss?: string }." },
      { status: 400 }
    );
  }
  const from = body.from;
  const text = body.text?.trim() ?? "";
  if (from !== "A" && from !== "B") {
    return NextResponse.json({ error: "Invalid from. Use 'A' or 'B'." }, { status: 400 });
  }
  const msg = sendMessage(roomId, from, text, body.signGloss);
  if (!msg) {
    return NextResponse.json({ error: "Room not found." }, { status: 404 });
  }
  return NextResponse.json(msg);
}
