"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { sfxReceived } from "@/lib/sfx";
import { AdminChat } from "./AdminChat";
import { ChatBox } from "./ChatBox";
import { SocialBar } from "./SocialBar";
import { Icon } from "./Icon";

/** Floating chat bubble shown on every page: for the admin, signed-in players and (as "guest") visitors who are signed out. */
export function ChatWidget({ role }: { role: string }) {
  const guest = role === "guest";
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const isAdmin = role === "admin";
  const openRef = useRef(false);
  const prevUnread = useRef<number | null>(null);
  openRef.current = open;

  // The admin's popup is big by default and can be made bigger or smaller by dragging its top-left corner (the size is remembered).
  const SIZE_KEY = "la_admin_chat_size";
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const drag = useRef<{ x: number; y: number; w: number; h: number } | null>(null);
  const clampSize = (w: number, h: number) => ({ w: Math.round(Math.max(340, Math.min(w, window.innerWidth - 32))), h: Math.round(Math.max(540, Math.min(h, window.innerHeight - 100))) });
  useEffect(() => {
    if (!isAdmin) return;
    let saved: { w: number; h: number } | null = null;
    try { saved = JSON.parse(localStorage.getItem(SIZE_KEY) ?? "null"); } catch { /* use the default */ }
    setSize(clampSize(saved?.w ?? 520, saved?.h ?? window.innerHeight * 0.88));
  }, [isAdmin]);
  function grabStart(e: React.PointerEvent<HTMLButtonElement>) {
    if (!size) return;
    drag.current = { x: e.clientX, y: e.clientY, w: size.w, h: size.h };
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function grabMove(e: React.PointerEvent<HTMLButtonElement>) {
    const d = drag.current;
    if (d) setSize(clampSize(d.w + (d.x - e.clientX), d.h + (d.y - e.clientY))); // the popup sits bottom-right, so pulling up/left makes it bigger
  }
  function grabEnd() {
    if (!drag.current) return;
    drag.current = null;
    try { if (size) localStorage.setItem(SIZE_KEY, JSON.stringify(size)); } catch { /* ignore */ }
  }

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
          window.dispatchEvent(new CustomEvent("la:chat-unread", { detail: n })); // the mobile Chat tab shows the badge
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
    // On a phone the chat is a full page (like Messenger); on a computer it is the little window.
    const openIt = () => (window.matchMedia("(max-width: 1023px)").matches ? router.push(isAdmin ? "/admin?tab=chat" : "/chat") : setOpen(true));
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
          style={isAdmin && size ? ({ "--w": `${size.w}px`, "--h": `${size.h}px` } as React.CSSProperties) : undefined}
          className={`fixed inset-x-2 bottom-20 z-40 flex ${isAdmin ? "h-[36rem] max-h-[78vh] sm:h-[var(--h,44rem)] sm:max-h-none sm:w-[var(--w,32rem)]" : "h-[26rem] max-h-[65vh] sm:w-96"} flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-2xl sm:inset-x-auto sm:right-4 lg:bottom-24`}
        >
          {isAdmin && (
            <button
              type="button"
              aria-label="Drag to make the chat bigger or smaller"
              title="Drag to make this chat bigger or smaller"
              onPointerDown={grabStart}
              onPointerMove={grabMove}
              onPointerUp={grabEnd}
              onPointerCancel={grabEnd}
              className="absolute left-0 top-0 z-10 hidden h-6 w-6 cursor-nwse-resize touch-none items-start justify-start rounded-br-lg bg-gold/30 p-1 text-[10px] leading-none text-gold hover:bg-gold/60 sm:flex"
            >
              ⤡
            </button>
          )}
          <header className="flex items-center justify-between border-b border-line bg-surface-2 px-3 py-2 pl-8">
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
            {isAdmin ? <AdminChat compact /> : <ChatBox url={guest ? "/api/guest/chat" : "/api/chat"} mine="user" allowImages={!guest} className="h-full" />}
          </div>
        </section>
      )}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close chat" : "Open chat"}
        aria-expanded={open}
        className="fixed bottom-20 right-4 z-40 hidden h-14 w-14 items-center justify-center rounded-full lg:flex bg-gradient-to-br from-violet to-pink text-white shadow-xl transition-transform hover:scale-105 lg:bottom-6"
      >
        <Icon name="chat" className="h-6 w-6" />
        {unread > 0 && !open && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-gold px-1 text-xs font-extrabold text-black" data-testid="chat-badge">{unread > 9 ? "9+" : unread}</span>
        )}
      </button>
    </>
  );
}
