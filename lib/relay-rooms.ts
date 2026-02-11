/**
 * In-memory relay rooms for cross-device Relay. Dev only; use a real store (e.g. Redis) in production.
 */

export interface RelayRoomMessage {
  id: string;
  from: "A" | "B";
  text: string;
  signGloss?: string;
  at: number;
}

export interface RelayRoom {
  roomId: string;
  code: string;
  createdAt: number;
  messages: RelayRoomMessage[];
  /** Which sides have joined */
  sides: Set<"A" | "B">;
  /** SSE: send new message to all subscribers */
  subscribers: Array<(msg: RelayRoomMessage) => void>;
}

const rooms = new Map<string, RelayRoom>();
const codeToRoomId = new Map<string, string>();

const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function genCode(): string {
  let code = "";
  for (let i = 0; i < 6; i++) code += CHARS[Math.floor(Math.random() * CHARS.length)];
  if (codeToRoomId.has(code)) return genCode();
  return code;
}

function genId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function createRoom(): { roomId: string; code: string } {
  const roomId = genId();
  const code = genCode();
  const room: RelayRoom = {
    roomId,
    code,
    createdAt: Date.now(),
    messages: [],
    sides: new Set(),
    subscribers: [],
  };
  rooms.set(roomId, room);
  codeToRoomId.set(code, roomId);
  return { roomId, code };
}

export function joinRoom(code: string): { roomId: string; side: "A" | "B"; code: string } | null {
  const roomId = codeToRoomId.get(code.toUpperCase().trim());
  if (!roomId) return null;
  const room = rooms.get(roomId);
  if (!room) return null;
  const side = room.sides.has("A") ? "B" : "A";
  room.sides.add(side);
  return { roomId, side, code: room.code };
}

export function getRoom(roomId: string): RelayRoom | null {
  return rooms.get(roomId) ?? null;
}

export function sendMessage(
  roomId: string,
  from: "A" | "B",
  text: string,
  signGloss?: string
): RelayRoomMessage | null {
  const room = rooms.get(roomId);
  if (!room) return null;
  const msg: RelayRoomMessage = {
    id: genId(),
    from,
    text,
    signGloss,
    at: Date.now(),
  };
  room.messages.push(msg);
  room.subscribers.forEach((fn) => fn(msg));
  return msg;
}

export function getMessages(roomId: string): RelayRoomMessage[] {
  const room = rooms.get(roomId);
  return room ? [...room.messages] : [];
}

export function subscribe(
  roomId: string,
  onMessage: (msg: RelayRoomMessage) => void
): () => void {
  const room = rooms.get(roomId);
  if (!room) return () => {};
  room.subscribers.push(onMessage);
  return () => {
    const i = room.subscribers.indexOf(onMessage);
    if (i !== -1) room.subscribers.splice(i, 1);
  };
}
