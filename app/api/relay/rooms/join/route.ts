import { NextRequest, NextResponse } from "next/server";
import { joinRoom } from "@/lib/relay-rooms";

export async function POST(request: NextRequest) {
  let body: { code?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON. Send { code: string }." }, { status: 400 });
  }
  const code = body.code?.trim();
  if (!code) {
    return NextResponse.json({ error: "Missing code." }, { status: 400 });
  }
  const result = joinRoom(code);
  if (!result) {
    return NextResponse.json({ error: "Invalid or expired code." }, { status: 404 });
  }
  return NextResponse.json(result);
}
