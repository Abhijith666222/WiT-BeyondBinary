import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { BridgeConversation, BridgeMessage, MessageSender } from "./types";

function genId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

interface MessageState {
  activeConversationId: string | null;
  conversations: BridgeConversation[];
  messages: BridgeMessage[];
  // actions
  setActiveConversation: (id: string | null) => void;
  getConversations: () => BridgeConversation[];
  getMessages: (conversationId: string) => BridgeMessage[];
  sendMessage: (
    conversationId: string,
    payload: { text: string; signGloss?: string; sender?: MessageSender }
  ) => BridgeMessage;
  addConversation: (title: string) => BridgeConversation;
  markConversationRead: (conversationId: string) => void;
  getUnreadTotal: () => number;
  simulateReply: (conversationId: string, text: string) => BridgeMessage;
}

const DEFAULT_CONVO: BridgeConversation = {
  id: "default",
  title: "Bridge chat",
  createdAt: Date.now(),
  updatedAt: Date.now(),
  lastMessagePreview: undefined,
  lastMessageAt: undefined,
  unreadCount: 0,
};

export const useMessageStore = create<MessageState>()(
  persist(
    (set, get) => ({
      activeConversationId: "default",
      conversations: [DEFAULT_CONVO],
      messages: [],

      setActiveConversation: (id) => {
        set({ activeConversationId: id });
        if (id) get().markConversationRead(id);
      },

      getConversations: () => {
        const { conversations, messages } = get();
        return conversations
          .map((c) => {
            const convMessages = messages.filter((m) => m.conversationId === c.id);
            const last = convMessages.sort((a, b) => b.createdAt - a.createdAt)[0];
            const unread = convMessages.filter((m) => m.sender === "other" && !m.readAt).length;
            return {
              ...c,
              lastMessagePreview: last?.text?.slice(0, 40) ?? undefined,
              lastMessageAt: last?.createdAt,
              unreadCount: unread,
            };
          })
          .sort((a, b) => (b.lastMessageAt ?? b.updatedAt) - (a.lastMessageAt ?? a.updatedAt));
      },

      getMessages: (conversationId) => {
        return get().messages
          .filter((m) => m.conversationId === conversationId)
          .sort((a, b) => a.createdAt - b.createdAt);
      },

      sendMessage: (conversationId, { text, signGloss, sender = "me" }) => {
        const msg: BridgeMessage = {
          id: genId(),
          conversationId,
          sender,
          text: text.trim(),
          signGloss,
          createdAt: Date.now(),
        };
        set((s) => ({
          messages: [...s.messages, msg],
          conversations: s.conversations.map((c) =>
            c.id === conversationId
              ? { ...c, updatedAt: Date.now(), lastMessageAt: msg.createdAt }
              : c
          ),
        }));
        return msg;
      },

      addConversation: (title) => {
        const id = genId();
        const convo: BridgeConversation = {
          id,
          title,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          unreadCount: 0,
        };
        set((s) => ({
          conversations: [...s.conversations, convo],
          activeConversationId: id,
        }));
        return convo;
      },

      markConversationRead: (conversationId) => {
        set((s) => ({
          messages: s.messages.map((m) =>
            m.conversationId === conversationId && m.sender === "other"
              ? { ...m, readAt: m.readAt ?? Date.now() }
              : m
          ),
        }));
      },

      getUnreadTotal: () => {
        const { conversations, messages } = get();
        return conversations.reduce((sum, c) => {
          const unread = messages.filter(
            (m) => m.conversationId === c.id && m.sender === "other" && !m.readAt
          ).length;
          return sum + unread;
        }, 0);
      },

      simulateReply: (conversationId, text) => {
        return get().sendMessage(conversationId, { text, sender: "other" });
      },
    }),
    { name: "signbridge-messages", skipHydration: true }
  )
);
