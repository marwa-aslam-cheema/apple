"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { fmtDate } from "@/lib/format";

export interface ChatMsg {
  id: number;
  sender: string;
  body: string;
  createdAt: string;
}

/** One conversation. `mine` is who is looking at it ("user" = the player, "admin" = staff). */
export function ChatBox({ url, mine, onActivity, className = "h-[28rem] max-h-[70vh]" }: { url: string; mine: "user" | "admin"; onActivity?: () => void; className?: string }) {
  const [msgs, setMsgs] = useState<ChatMsg[]>([]);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const lastId = useRef(0);
  const box = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`${url}?after=${lastId.current}`, { cache: "no-store" });
      if (!res.ok) return;
      const { messages } = (await res.json()) as { messages: ChatMsg[] };
      if (messages.length) {
        lastId.current = messages[messages.length - 1].id;
        setMsgs((m) => [...m, ...messages.filter((x) => !m.some((y) => y.id === x.id))]);
        onActivity?.();
      }
    } catch {
      /* network blip: the next poll retries */
    }
  }, [url, onActivity]);

  useEffect(() => {
    load();
    const t = setInterval(() => document.visibilityState === "visible" && load(), 4000);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    box.current?.scrollTo({ top: box.current.scrollHeight });
  }, [msgs.length]);

  async function send() {
    const body = text.trim();
    if (!body || busy) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ body }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not send.");
      setText("");
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
      <form
        className="flex gap-2 border-t border-line p-3"
        onSubmit={(e) => { e.preventDefault(); send(); }}
      >
        <textarea
          className="input min-h-11 flex-1 resize-none"
          rows={1}
          maxLength={1000}
          placeholder="Type a message"
          aria-label="Message"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
        />
        <button className="btn btn-gold" disabled={busy || !text.trim()}>Send</button>
      </form>
    </div>
  );
}
