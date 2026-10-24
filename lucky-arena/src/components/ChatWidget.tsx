"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { sfxReceived } from "@/lib/sfx";
import { AdminChat } from "./AdminChat";
import { ChatBox } from "./ChatBox";
import { SocialBar } from "./SocialBar";
import { Icon } from "./Icon";

/** Floating chat bubble shown on every page: for the admin, signed-in players and (as "guest") visitors who are signed out. */
export function ChatWidget({ role }: { role: string }) {
  const guest = role === "guest";
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const isAdmin = role === "admin";
  const openRef = useRef(false);
  const prevUnread = useRef<number | null>(null);
  openRef.current = open;

  useEffect(() => {
    let alive = true;
    async function check() {
      if (document.visibilityState !== "visible") return;
      try {
        const res = await fetch(guest ? "/api/guest/unread" : "/api/chat/unread", { cache: "no-store" });
        if (res.ok && alive) {
          const n = (await res.json()).unread as number;
          if (prevUnread.current !== null && n > prevUnread.current && !openRef.current) sfxReceived(); // new message while the bubble is closed
          prevUnread.current = n;
          setUnread(n);
        }
      } catch {
        /* offline: try again next tick */
      }
    }
    check();
    const t = setInterval(check, 8000);
    return () => { alive = false; clearInterval(t); };
  }, [open, guest]);

  useEffect(() => {
    const openIt = () => setOpen(true);
    window.addEventListener("la:open-chat", openIt);
    return () => window.removeEventListener("la:open-chat", openIt);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      {open && (
        <section
          role="dialog"
          aria-label={isAdmin ? "Player messages" : "Support chat"}
          className={`fixed inset-x-2 bottom-36 z-40 flex ${isAdmin ? "h-[36rem] max-h-[78vh]" : "h-[26rem] max-h-[65vh]"} flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-2xl sm:inset-x-auto sm:right-4 sm:w-96 lg:bottom-24`}
        >
          <header className="flex items-center justify-between border-b border-line bg-surface-2 px-3 py-2">
            <b className="text-sm">{isAdmin ? "Player messages" : "Support chat"}</b>
            <button className="rounded-lg p-1.5 hover:bg-surface" onClick={() => setOpen(false)} aria-label="Close chat"><Icon name="x" className="h-4 w-4" /></button>
          </header>
          {!isAdmin && <SocialBar title="" className="border-b border-line px-3 py-2" />}
          {guest && (
            <p className="border-b border-line bg-surface-2/60 px-3 py-2 text-xs text-muted">
              Forgot your password? <Link href="/forgot" onClick={() => setOpen(false)} className="font-bold text-gold underline">Send a reset request</Link> and the admin will reply here.
            </p>
          )}
          <div className="min-h-0 flex-1">
            {isAdmin ? <AdminChat compact /> : <ChatBox url={guest ? "/api/guest/chat" : "/api/chat"} mine="user" className="h-full" />}
          </div>
        </section>
      )}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close chat" : "Open chat"}
        aria-expanded={open}
        className="fixed bottom-20 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-violet to-pink text-white shadow-xl transition-transform hover:scale-105 lg:bottom-6"
      >
        <Icon name="chat" className="h-6 w-6" />
        {unread > 0 && !open && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-gold px-1 text-xs font-extrabold text-black" data-testid="chat-badge">{unread > 9 ? "9+" : unread}</span>
        )}
      </button>
    </>
  );
}
