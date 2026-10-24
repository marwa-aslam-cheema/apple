"use client";

import { useCallback, useEffect, useState } from "react";
import { ChatBox } from "./ChatBox";

interface Convo {
  userId: number;
  username: string;
  email: string;
  unread: number;
  last: string;
  lastSender: string;
}

export function AdminChat({ compact = false }: { compact?: boolean }) {
  const [list, setList] = useState<Convo[]>([]);
  const [sel, setSel] = useState<number | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [thread, setThread] = useState(!compact); // compact: start on the list, open a thread on click

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/chat", { cache: "no-store" });
      if (!res.ok) return;
      const { conversations } = (await res.json()) as { conversations: Convo[] };
      setList(conversations);
      setSel((s) => s ?? (compact ? null : conversations[0]?.userId ?? null));
    } finally {
      setLoaded(true);
    }
  }, [compact]);

  useEffect(() => {
    refresh();
    const t = setInterval(() => document.visibilityState === "visible" && refresh(), 5000);
    return () => clearInterval(t);
  }, [refresh]);

  if (loaded && list.length === 0) return <p className="card p-6 text-center text-muted">No player has written yet.</p>;
  const current = list.find((c) => c.userId === sel);

  const listView = (
    <ul className={compact ? "h-full overflow-y-auto" : "card max-h-[28rem] overflow-y-auto"} aria-label="Conversations">
      {list.map((c) => (
        <li key={c.userId}>
          <button
            onClick={() => { setSel(c.userId); setThread(true); }}
            aria-current={c.userId === sel ? "true" : undefined}
            className={`block w-full border-b border-line px-3 py-3 text-left hover:bg-surface-2 ${c.userId === sel && !compact ? "bg-surface-2" : ""}`}
          >
            <span className="flex items-center justify-between gap-2">
              <b className="truncate text-sm">{c.username}</b>
              {c.unread > 0 && <span className="rounded-full bg-gold px-2 text-xs font-extrabold text-black">{c.unread}</span>}
            </span>
            <span className="block truncate text-xs text-muted">{c.lastSender === "admin" ? "You: " : ""}{c.last}</span>
          </button>
        </li>
      ))}
    </ul>
  );

  const threadView = current ? (
    <>
      <h2 className="flex items-center gap-2 border-b border-line p-3 text-sm font-bold">
        {compact && <button className="rounded-lg px-2 py-1 hover:bg-surface-2" onClick={() => setThread(false)} aria-label="Back to conversations">&larr;</button>}
        <span className="truncate">{current.username} <span className="font-normal text-muted">· {current.email}</span></span>
      </h2>
      <ChatBox key={current.userId} url={`/api/admin/chat/${current.userId}`} mine="admin" onActivity={refresh} className={compact ? "h-[calc(100%-2.75rem)]" : "h-[28rem] max-h-[70vh]"} />
    </>
  ) : null;

  if (compact) return <div className="h-full">{thread && current ? threadView : listView}</div>;

  return (
    <div className="grid gap-4 md:grid-cols-[16rem_1fr]">
      {listView}
      <section className="card overflow-hidden">{threadView}</section>
    </div>
  );
}
