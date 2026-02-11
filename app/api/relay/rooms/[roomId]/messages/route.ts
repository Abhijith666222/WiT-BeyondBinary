import { NextResponse } from "next/server";
import { getRoom, getMessages } from "@/lib/relay-rooms";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const { roomId } = await params;
  if (!getRoom(roomId)) {
    return NextResponse.json({ error: "Room not found." }, { status: 404 });
  }
  const messages = getMessages(roomId);
  return NextResponse.json({ messages });
}
