"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { fmtDate } from "@/lib/format";
import { sfxReceived, sfxSent, unlockSfx } from "@/lib/sfx";
import { buildMap, expandShortcut, normalizeShortcut, type ShortcutMap } from "@/lib/shortcuts";

export interface ChatMsg {
  id: number;
  sender: string;
  body: string;
  createdAt: string;
}

/** One conversation. `mine` is who is looking at it ("user" = the player, "admin" = staff). */
export function ChatBox({ url, mine, onActivity, className = "h-[28rem] max-h-[70vh]" }: { url: string; mine: "user" | "admin"; onActivity?: () => void; className?: string }) {
  const router = useRouter();
  const [msgs, setMsgs] = useState<ChatMsg[]>([]);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const lastId = useRef(0);
  const firstLoad = useRef(true);
  const box = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState("");
  const [shortcut, setShortcut] = useState("");
  const [map, setMap] = useState<ShortcutMap>({});
  const expanded = useRef<{ from: string; to: string } | null>(null); // last auto-fill, so Backspace can undo it
  const suppress = useRef<string | null>(null); // a shortcut the admin undid: do not expand it again until the text changes

  const load = useCallback(async () => {
    try {
      const res = await fetch(`${url}?after=${lastId.current}`, { cache: "no-store" });
      if (!res.ok) return;
      const { messages } = (await res.json()) as { messages: ChatMsg[] };
      if (messages.length) {
        if (!firstLoad.current && messages.some((m) => m.sender !== mine)) {
          sfxReceived();
          router.refresh(); // an admin message may have added credits: update the balance in the top bar
        }
        lastId.current = messages[messages.length - 1].id;
        setMsgs((m) => [...m, ...messages.filter((x) => !m.some((y) => y.id === x.id))]);
        onActivity?.();
      }
    } catch {
      /* network blip: the next poll retries */
    } finally {
      firstLoad.current = false;
    }
  }, [url, onActivity, mine, router]);

  useEffect(() => {
    load();
    window.addEventListener("la:chat-refresh", load);
    const t = setInterval(() => document.visibilityState === "visible" && load(), 4000);
    return () => {
      clearInterval(t);
      window.removeEventListener("la:chat-refresh", load);
    };
  }, [load]);

  // Admin quick replies drop their text into the box (editable before sending).
  useEffect(() => {
    if (mine !== "admin") return;
    const fill = (e: Event) => {
      setText((e as CustomEvent<string>).detail);
      input.current?.focus();
    };
    window.addEventListener("la:chat-fill", fill);
    return () => window.removeEventListener("la:chat-fill", fill);
  }, [mine]);

  // Admin: load the shortcuts (typing one alone in the box fills the saved reply).
  useEffect(() => {
    if (mine !== "admin") return;
    let alive = true;
    const load = async () => {
      try {
        const res = await fetch("/api/admin/replies", { cache: "no-store" });
        if (res.ok && alive) setMap(buildMap((await res.json()).items));
      } catch {
        /* offline: keep the shortcuts we have */
      }
    };
    load();
    window.addEventListener("la:quick-changed", load);
    return () => {
      alive = false;
      window.removeEventListener("la:quick-changed", load);
    };
  }, [mine]);

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  /** Typing a shortcut alone fills the saved reply after a short pause, so longer words like "okay" are not cut in. */
  function onType(v: string) {
    setText(v);
    if (mine !== "admin") return;
    if (timer.current) clearTimeout(timer.current);
    const key = normalizeShortcut(v);
    if (suppress.current && key !== suppress.current) suppress.current = null;
    if (suppress.current) return;
    const hit = expandShortcut(v, map);
    if (hit === null) return;
    timer.current = setTimeout(() => {
      expanded.current = { from: v.trim(), to: hit };
      setText(hit);
    }, 350);
  }

  async function saveQuick() {
    const body = text.trim();
    if (!body || !title.trim()) return;
    try {
      const res = await fetch("/api/admin/replies", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title, body, shortcut }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not save.");
      setSaving(false);
      setTitle("");
      setShortcut("");
      window.dispatchEvent(new Event("la:quick-changed"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save.");
    }
  }

  // The message box grows with what is typed or filled in (multi-line replies), up to about six lines.
  useEffect(() => {
    const el = input.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 150)}px`;
  }, [text]);

  useEffect(() => {
    box.current?.scrollTo({ top: box.current.scrollHeight });
  }, [msgs.length]);

  async function send() {
    if (timer.current) clearTimeout(timer.current);
    // Enter right after a shortcut sends the saved reply, not the shortcut itself.
    const body = (mine === "admin" ? expandShortcut(text, map) : null) ?? text.trim();
    if (!body || busy) return;
    setBusy(true);
    setError("");
    unlockSfx();
    try {
      const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ body }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not send.");
      setText("");
      expanded.current = null;
      sfxSent();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={`flex flex-col ${className}`}>
      <div ref={box} className="flex-1 space-y-2 overflow-y-auto p-3" aria-live="polite">
        {msgs.length === 0 && <p className="py-8 text-center text-sm text-muted">No messages yet.</p>}
        {msgs.map((m) => (
          <div key={m.id} className={`flex ${m.sender === mine ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${m.sender === mine ? "bg-violet text-white" : "bg-surface-2"}`}>
              <p className="whitespace-pre-wrap break-words">{m.body}</p>
              <p className="mt-1 text-[10px] opacity-60">{m.sender === "admin" && mine === "user" ? "Support · " : ""}{fmtDate(m.createdAt)}</p>
            </div>
          </div>
        ))}
      </div>
      {error && <p role="alert" className="px-3 text-sm font-semibold text-danger">{error}</p>}
      {mine === "admin" && text.trim() && (
        <div className="flex flex-wrap items-center gap-2 border-t border-line px-3 pt-2 text-xs">
          {saving ? (
            <>
              <input className="input !min-h-8 !w-40 !py-1 text-sm" placeholder="Button title" aria-label="Quick reply title" maxLength={30} value={title} onChange={(e) => setTitle(e.target.value)} />
              <input className="input !min-h-8 !w-32 !py-1 text-sm" placeholder="Shortcut (optional)" aria-label="Quick reply shortcut" maxLength={20} value={shortcut} onChange={(e) => setShortcut(e.target.value.replace(/\s/g, ""))} />
              <button type="button" className="btn btn-violet !min-h-8 !px-3 !py-1" disabled={!title.trim()} onClick={saveQuick}>Save</button>
              <button type="button" className="btn btn-ghost !min-h-8 !px-3 !py-1" onClick={() => setSaving(false)}>Cancel</button>
            </>
          ) : (
            <button type="button" className="text-gold underline" onClick={() => setSaving(true)}>Save as quick reply</button>
          )}
        </div>
      )}
      <form
        className="flex gap-2 border-t border-line p-3"
        onSubmit={(e) => { e.preventDefault(); send(); }}
      >
        <textarea
          ref={input}
          className="input min-h-11 flex-1 resize-none"
          rows={1}
          maxLength={1000}
          placeholder="Type a message"
          aria-label="Message"
          value={text}
          onChange={(e) => onType(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Backspace" && mine === "admin" && expanded.current && text === expanded.current.to) {
              e.preventDefault(); // undo the auto-fill: back to the shortcut the admin typed
              suppress.current = normalizeShortcut(expanded.current.from);
              setText(expanded.current.from);
              expanded.current = null;
              return;
            }
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
          }}
        />
        <button className="btn btn-gold" disabled={busy || !text.trim()}>Send</button>
      </form>
    </div>
  );
}
