"use client";

import React from "react";
import {
  User,
  MapPin,
  Bell,
  Shield,
  HelpCircle,
  ChevronRight,
  Globe,
  LogOut,
  MessageCircle,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { discoveryApi, discoveryAuthApi } from "../../../state/api";
import type { StoreMessageModel, StoreMessageThreadModel } from "../../../state/types";

interface Props {
  onRequestSignIn?: () => void;
  onSignOut?: () => void;
}

export default function ProfilePage() {
  const onSignOut = () => {};
  const onRequestSignIn = () => {};
  const session = discoveryAuthApi.getSession();
  const defaultIdentity =
    session?.user.phone_e164?.trim() ||
    session?.user.email?.trim() ||
    "";
  const [identity, setIdentity] = useState(defaultIdentity);
  const [channel, setChannel] = useState<"all" | "in_app" | "whatsapp" | "sms" | "email">("all");
  const [threads, setThreads] = useState<StoreMessageThreadModel[]>([]);
  const [activeThreadKey, setActiveThreadKey] = useState("");
  const [rows, setRows] = useState<StoreMessageModel[]>([]);
  const [loadingThreads, setLoadingThreads] = useState(false);
  const [loadingRows, setLoadingRows] = useState(false);
  const [messageError, setMessageError] = useState("");

  const menuItems = [
    {
      icon: MapPin,
      label: "My Location",
      description: "Accra, Ghana",
      action: "Change",
    },
    {
      icon: Bell,
      label: "Notifications",
      description: "Item alerts and updates",
      action: "Manage",
    },
    {
      icon: Globe,
      label: "Language & Currency",
      description: "English, GHS (Ghana Cedis)",
      action: "Change",
    },
    {
      icon: Shield,
      label: "Privacy & Data",
      description: "Control your data settings",
      action: "View",
    },
    {
      icon: HelpCircle,
      label: "Help & Support",
      description: "FAQs, contact us",
      action: "Open",
    },
  ];

  const activeThread = useMemo(
    () => threads.find((entry) => entry.threadKey === activeThreadKey) ?? null,
    [threads, activeThreadKey]
  );

  useEffect(() => {
    let mounted = true;
    if (!identity.trim()) {
      setThreads([]);
      setActiveThreadKey("");
      return () => {
        mounted = false;
      };
    }
    setLoadingThreads(true);
    setMessageError("");
    void discoveryApi
      .listMyMessages({
        identity: identity.trim(),
        channel: channel === "all" ? undefined : channel
      })
      .then((payload: any) => {
        if (!mounted) return;
        setThreads(payload.threads);
        setActiveThreadKey((current) => {
          if (current && payload.threads.some((entry: any) => entry.threadKey === current)) {
            return current;
          }
          return payload.threads[0]?.threadKey ?? "";
        });
      })
      .catch((error: any) => {
        if (!mounted) return;
        setMessageError(error instanceof Error ? error.message : "Could not load messages");
      })
      .finally(() => {
        if (!mounted) return;
        setLoadingThreads(false);
      });
    return () => {
      mounted = false;
    };
  }, [identity, channel]);

  useEffect(() => {
    let mounted = true;
    if (!identity.trim() || !activeThreadKey) {
      setRows([]);
      return () => {
        mounted = false;
      };
    }
    setLoadingRows(true);
    void discoveryApi
      .listMyMessages({
        identity: identity.trim(),
        threadKey: activeThreadKey,
        channel: channel === "all" ? undefined : channel
      })
      .then((payload: any) => {
        if (!mounted) return;
        setRows(payload.rows);
      })
      .catch((error: any) => {
        if (!mounted) return;
        setMessageError(error instanceof Error ? error.message : "Could not load messages");
      })
      .finally(() => {
        if (!mounted) return;
        setLoadingRows(false);
      });
    return () => {
      mounted = false;
    };
  }, [identity, activeThreadKey, channel]);

  useEffect(() => {
    if (!identity.trim()) {
      return;
    }
    const timer = window.setInterval(() => {
      const trimmedIdentity = identity.trim();
      void discoveryApi
        .listMyMessages({
          identity: trimmedIdentity,
          channel: channel === "all" ? undefined : channel
        })
        .then((payload: any) => {
          setThreads(payload.threads);
          setActiveThreadKey((current) => {
            if (current && payload.threads.some((entry: any) => entry.threadKey === current)) {
              return current;
            }
            return payload.threads[0]?.threadKey ?? "";
          });
        })
        .catch(() => undefined);

      if (!activeThreadKey) {
        return;
      }
      void discoveryApi
        .listMyMessages({
          identity: trimmedIdentity,
          threadKey: activeThreadKey,
          channel: channel === "all" ? undefined : channel
        })
        .then((payload: any) => {
          setRows(payload.rows);
        })
        .catch(() => undefined);
    }, 15000);

    return () => {
      window.clearInterval(timer);
    };
  }, [identity, activeThreadKey, channel]);

  return (
    <div className="pb-20 lg:pb-8 pt-4 max-w-3xl mx-auto">
      <div className="px-4 lg:px-6 mb-6">
        <h1 className="text-xl mb-1">Profile</h1>
        <p className="text-sm text-muted-foreground">
          Manage your preferences
        </p>
      </div>

      {/* User Card */}
      <div className="mx-4 lg:mx-6 mb-4 bg-card rounded-2xl border border-border p-4 flex items-center gap-3">
        <div className="w-14 h-14 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
          <User className="w-6 h-6 text-secondary-foreground" />
        </div>
        <div className="flex-1">
          <h2 className="text-base">{session ? "Signed in" : "Guest User"}</h2>
          <p className="text-xs text-muted-foreground">
            {session
              ? session.user.email?.trim() || session.user.phone_e164?.trim() || "Signed in account"
              : "Sign in to save across devices"}
          </p>
        </div>
        {session ? (
          <button
            type="button"
            onClick={onSignOut}
            className="px-3 py-1.5 rounded-lg text-xs min-h-[36px] border border-border bg-secondary text-secondary-foreground inline-flex items-center gap-1.5"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign out
          </button>
        ) : (
          <button
            type="button"
            onClick={onRequestSignIn}
            className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs min-h-[36px]"
          >
            Sign in
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="mx-4 lg:mx-6 mb-4 grid grid-cols-3 gap-3">
        {[
          { value: "2", label: "Saved Stores" },
          { value: "3", label: "Saved Items" },
          { value: "2", label: "Saved Searches" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-card rounded-xl border border-border p-3 text-center"
          >
            <div className="text-lg text-primary">{stat.value}</div>
            <div className="text-[11px] text-muted-foreground">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Menu */}
      <div className="mx-4 lg:mx-6 bg-card rounded-2xl border border-border overflow-hidden">
        {menuItems.map((item, index) => (
          <button
            key={item.label}
            className={`flex items-center gap-3 w-full p-4 text-left min-h-[56px] hover:bg-muted/50 transition-colors ${
              index < menuItems.length - 1 ? "border-b border-border" : ""
            }`}
          >
            <item.icon className="w-5 h-5 text-muted-foreground flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm">{item.label}</p>
              <p className="text-[11px] text-muted-foreground">
                {item.description}
              </p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          </button>
        ))}
      </div>

      <div className="mx-4 lg:mx-6 mt-4 bg-card rounded-2xl border border-border p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm">Messages Terminal</h3>
            <p className="text-[11px] text-muted-foreground">
              Receive replies from stores you messaged.
            </p>
          </div>
          <span className="px-2 py-1 rounded-full bg-secondary text-[10px] text-secondary-foreground">
            {threads.length} thread{threads.length === 1 ? "" : "s"}
          </span>
        </div>

        <div className="mt-3 grid gap-2">
          <label className="text-[11px] text-muted-foreground">Phone or email</label>
          <input
            value={identity}
            onChange={(event) => setIdentity(event.target.value)}
            placeholder="+233... or email"
            className="w-full px-3 py-2.5 rounded-xl bg-input-background text-sm min-h-[44px]"
          />
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {(
            [
              ["all", "All"],
              ["in_app", "In-app"],
              ["whatsapp", "WhatsApp"],
              ["sms", "SMS"],
              ["email", "Email"]
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setChannel(key)}
              className={`px-3 py-2 rounded-full text-xs min-h-[36px] ${
                channel === key
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {messageError && <p className="mt-2 text-xs text-red-600">{messageError}</p>}

        <div className="mt-3 grid md:grid-cols-[220px_1fr] gap-3">
          <div className="border border-border rounded-xl p-2 max-h-[320px] overflow-auto">
            {threads.map((thread) => (
              <button
                key={thread.threadKey}
                type="button"
                onClick={() => setActiveThreadKey(thread.threadKey)}
                className={`w-full text-left rounded-lg border p-2 mb-2 last:mb-0 ${
                  activeThreadKey === thread.threadKey
                    ? "border-primary/50 bg-primary/5"
                    : "border-border"
                }`}
              >
                <p className="text-xs truncate">{thread.storeName || thread.customerLabel}</p>
                <p className="text-[11px] text-muted-foreground truncate">{thread.lastMessage}</p>
              </button>
            ))}
            {!loadingThreads && threads.length === 0 && (
              <p className="text-[11px] text-muted-foreground">
                {identity.trim()
                  ? "No messages yet for this contact."
                  : "Enter phone/email to load messages."}
              </p>
            )}
          </div>

          <div className="border border-border rounded-xl p-3 max-h-[320px] overflow-auto">
            <div className="flex items-center justify-between gap-2 mb-2">
              <p className="text-xs">{activeThread?.storeName || "Conversation"}</p>
              <MessageCircle className="w-4 h-4 text-muted-foreground" />
            </div>
            {rows.map((row) => (
              <article
                key={row.id}
                className={`mb-2 last:mb-0 rounded-xl px-3 py-2 text-xs ${
                  row.senderType === "store"
                    ? "bg-secondary text-foreground"
                    : "bg-muted text-foreground"
                }`}
              >
                <p className="text-[10px] text-muted-foreground mb-1">
                  {row.senderType === "store" ? row.storeName || "Store" : "You"}
                </p>
                <p>{row.message}</p>
              </article>
            ))}
            {!loadingRows && rows.length === 0 && (
              <p className="text-[11px] text-muted-foreground">
                Select a conversation to view messages.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* App Info */}
      <div className="mt-6 text-center">
        <p className="text-xs text-muted-foreground">myHiro v1.0.0</p>
        <p className="text-[10px] text-muted-foreground mt-1">
          Helping you discover stores near you
        </p>
      </div>
    </div>
  );
}
