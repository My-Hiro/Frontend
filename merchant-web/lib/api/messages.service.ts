import { jsonFetch } from "./baseClient";
import type { StoreMessage, StoreMessageThread } from "@/types";

export const toUiStoreMessage = (row: Record<string, unknown>): StoreMessage => ({
  id: String(row.id ?? ""),
  storeId: String(row.store_id ?? ""),
  threadKey: String(row.thread_key ?? ""),
  senderType: String(row.sender_type ?? "customer") === "store" ? "store" : "customer",
  senderName: row.sender_name ? String(row.sender_name) : undefined,
  senderContact: row.sender_contact ? String(row.sender_contact) : undefined,
  recipientIdentity: row.recipient_identity ? String(row.recipient_identity) : undefined,
  channel: row.channel
    ? (String(row.channel) as StoreMessage["channel"])
    : "in_app",
  message: String(row.message ?? ""),
  createdAt: String(row.created_at ?? new Date().toISOString())
});

export const toUiStoreMessageThread = (row: Record<string, unknown>): StoreMessageThread => ({
  threadKey: String(row.thread_key ?? ""),
  customerLabel: String(row.customer_label ?? "Guest customer"),
  lastMessage: String(row.last_message ?? ""),
  lastMessageAt: String(row.last_message_at ?? new Date().toISOString()),
  messageCount: Number(row.message_count ?? 0),
  channel: row.channel
    ? (String(row.channel) as StoreMessageThread["channel"])
    : "in_app",
  storeId: row.store_id ? String(row.store_id) : undefined,
  storeName: row.store_name ? String(row.store_name) : undefined
});

export const messagesService = {
  async listStoreMessages(
    storeId: string,
    threadKey?: string,
    channel?: "in_app" | "whatsapp" | "sms" | "email"
  ) {
    const params = new URLSearchParams();
    params.set("store_id", storeId);
    if (threadKey?.trim()) {
      params.set("thread_key", threadKey.trim());
    }
    if (channel) {
      params.set("channel", channel);
    }
    const payload = await jsonFetch<{
      rows: Array<Record<string, unknown>>;
      threads: Array<Record<string, unknown>>;
    }>(`/messages?${params.toString()}`);
    return {
      rows: payload.rows.map(toUiStoreMessage),
      threads: payload.threads.map(toUiStoreMessageThread)
    };
  },

  async sendStoreMessage(
    storeId: string,
    input: { message: string; threadKey?: string; senderName?: string; senderContact?: string }
  ) {
    const payload = await jsonFetch<Record<string, unknown>>("/messages", {
      method: "POST",
      body: JSON.stringify({
        store_id: storeId,
        sender_type: "store",
        message: input.message,
        thread_key: input.threadKey,
        sender_name: input.senderName,
        sender_contact: input.senderContact
      })
    });
    return toUiStoreMessage(payload);
  }
};
