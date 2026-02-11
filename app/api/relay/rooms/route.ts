import { NextResponse } from "next/server";
import { createRoom } from "@/lib/relay-rooms";

export async function POST() {
  const { roomId, code } = createRoom();
  return NextResponse.json({ roomId, code });
}
