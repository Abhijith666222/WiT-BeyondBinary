import { NextRequest, NextResponse } from "next/server";
import { getRoom, subscribe } from "@/lib/relay-rooms";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const { roomId } = await params;
  const room = getRoom(roomId);
  if (!room) {
    return NextResponse.json({ error: "Room not found." }, { status: 404 });
  }

  const stream = new ReadableStream({
    start(controller) {
      const unsub = subscribe(roomId, (msg) => {
        try {
          controller.enqueue("data: " + JSON.stringify(msg) + "\n\n");
        } catch {
          unsub();
        }
      });
      request.signal?.addEventListener?.("abort", () => unsub());
      const heartbeat = "data: " + JSON.stringify({ type: "connected" }) + "\n\n";
      controller.enqueue(heartbeat);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-store, no-cache",
      Connection: "keep-alive",
    },
  });
}
