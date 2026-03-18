import { MessageCircle, Send } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { merchantApi } from "../state/api";
import { useMerchant } from "../state/merchantContext";
import type { StoreMessage, StoreMessageThread } from "../state/types";

interface Props {
  storeId: string;
  storeName: string;
}

export function MessagesPage({ storeId, storeName }: Props) {
  const { formatDateTime } = useMerchant();
  const [activeChannel, setActiveChannel] = useState<"all" | "in_app" | "whatsapp" | "sms" | "email">(
    "all"
  );
  const [threads, setThreads] = useState<StoreMessageThread[]>([]);
  const [activeThreadKey, setActiveThreadKey] = useState("");
  const [messages, setMessages] = useState<StoreMessage[]>([]);
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const activeThread = useMemo(
    () => threads.find((entry) => entry.threadKey === activeThreadKey) ?? null,
    [threads, activeThreadKey]
  );

  const refreshThreads = async () => {
    const payload = await merchantApi.listStoreMessages(
      storeId,
      undefined,
      activeChannel === "all" ? undefined : activeChannel
    );
    setThreads(payload.threads);
    setActiveThreadKey((current) => {
      if (current && payload.threads.some((entry) => entry.threadKey === current)) {
        return current;
      }
      return payload.threads[0]?.threadKey ?? "";
    });
  };

  const refreshMessages = async (threadKey: string) => {
    if (!threadKey) {
      setMessages([]);
      return;
    }
    const payload = await merchantApi.listStoreMessages(
      storeId,
      threadKey,
      activeChannel === "all" ? undefined : activeChannel
    );
    setMessages(payload.rows);
  };

  useEffect(() => {
    let mounted = true;
    setBusy(true);
    setError("");
    refreshThreads()
      .catch((err) => {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : "Could not load messages.");
      })
      .finally(() => {
        if (!mounted) return;
        setBusy(false);
      });
    return () => {
      mounted = false;
    };
  }, [storeId, activeChannel]);

  useEffect(() => {
    let mounted = true;
    if (!activeThreadKey) {
      setMessages([]);
      return () => {
        mounted = false;
      };
    }
    refreshMessages(activeThreadKey).catch((err) => {
      if (!mounted) return;
      setError(err instanceof Error ? err.message : "Could not load thread messages.");
    });
    return () => {
      mounted = false;
    };
  }, [storeId, activeThreadKey, activeChannel]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      void refreshThreads().catch(() => undefined);
      if (activeThreadKey) {
        void refreshMessages(activeThreadKey).catch(() => undefined);
      }
    }, 15000);
    return () => window.clearInterval(timer);
  }, [storeId, activeThreadKey, activeChannel]);

  const sendReply = async () => {
    const text = reply.trim();
    if (!activeThreadKey || !text || sending) {
      return;
    }
    setSending(true);
    setError("");
    try {
      await merchantApi.sendStoreMessage(storeId, {
        threadKey: activeThreadKey,
        senderName: storeName,
        message: text
      });
      setReply("");
      await Promise.all([refreshThreads(), refreshMessages(activeThreadKey)]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send message.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="page-stack">
      <section className="panel">
        <div className="panel-head">
          <div>
            <h3>Store Conversations</h3>
            <p>Reply to Discovery customer messages from one inbox.</p>
          </div>
        </div>
        {error && <p className="danger-text">{error}</p>}
        <div className="toolbar-row">
          <div className="message-channel-tabs" role="tablist" aria-label="Messenger channel" data-tour="messages-channels">
            <button
              type="button"
              className={activeChannel === "all" ? "active" : ""}
              onClick={() => setActiveChannel("all")}
            >
              All
            </button>
            <button
              type="button"
              className={activeChannel === "in_app" ? "active" : ""}
              onClick={() => setActiveChannel("in_app")}
            >
              In-app
            </button>
            <button
              type="button"
              className={activeChannel === "whatsapp" ? "active" : ""}
              onClick={() => setActiveChannel("whatsapp")}
            >
              WhatsApp
            </button>
            <button
              type="button"
              className={activeChannel === "sms" ? "active" : ""}
              onClick={() => setActiveChannel("sms")}
            >
              SMS
            </button>
            <button
              type="button"
              className={activeChannel === "email" ? "active" : ""}
              onClick={() => setActiveChannel("email")}
            >
              Email
            </button>
          </div>
        </div>
        <div className="messages-layout">
          <aside className="messages-threads" data-tour="messages-threads">
            {threads.map((thread) => (
              <button
                key={thread.threadKey}
                type="button"
                className={thread.threadKey === activeThreadKey ? "message-thread active" : "message-thread"}
                onClick={() => setActiveThreadKey(thread.threadKey)}
              >
                <strong>{thread.customerLabel}</strong>
                <small>{thread.lastMessage}</small>
                <span>
                  {formatDateTime(thread.lastMessageAt)}
                  {thread.channel ? ` | ${thread.channel.replace("_", "-")}` : ""}
                </span>
              </button>
            ))}
            {!busy && threads.length === 0 && <p className="muted">No customer messages yet.</p>}
          </aside>

          <section className="messages-pane">
            <header className="messages-pane-head">
              <div>
                <h4>{activeThread?.customerLabel ?? "No thread selected"}</h4>
                {activeThread && <small>{activeThread.messageCount} messages</small>}
              </div>
            </header>

            <div className="message-timeline" data-tour="messages-timeline">
              {messages.map((entry) => (
                <article
                  key={entry.id}
                  className={entry.senderType === "store" ? "message-bubble store" : "message-bubble customer"}
                >
                  <strong>
                    {entry.senderType === "store"
                      ? storeName
                      : entry.senderName || entry.senderContact || "Customer"}
                  </strong>
                  <p>{entry.message}</p>
                  <small>{formatDateTime(entry.createdAt)}</small>
                </article>
              ))}
              {!busy && activeThread && messages.length === 0 && (
                <p className="muted">No messages in this thread.</p>
              )}
              {!busy && !activeThread && <p className="muted">Select a thread to start replying.</p>}
            </div>

            <div className="message-compose" data-tour="messages-compose">
              <textarea
                value={reply}
                onChange={(event) => setReply(event.target.value)}
                rows={3}
                placeholder={
                  activeThread ? "Type your reply..." : "Select a thread to reply"
                }
                disabled={!activeThread || sending}
              />
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => void sendReply()}
                disabled={!activeThread || !reply.trim() || sending}
              >
                {sending ? (
                  "Sending..."
                ) : (
                  <>
                    <Send size={15} />
                    Send reply
                  </>
                )}
              </button>
            </div>
          </section>
        </div>
      </section>

      <section className="panel soft">
        <div className="line-item">
          <div>
            <strong>Inbox tips</strong>
            <small>Use contact details when available to move conversations to phone/WhatsApp.</small>
          </div>
          <span className="pill">
            <MessageCircle size={14} /> {threads.length} threads
          </span>
        </div>
      </section>
    </div>
  );
}
