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

export function AdminChat() {
  const [list, setList] = useState<Convo[]>([]);
  const [sel, setSel] = useState<number | null>(null);
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/chat", { cache: "no-store" });
      if (!res.ok) return;
      const { conversations } = (await res.json()) as { conversations: Convo[] };
      setList(conversations);
      setSel((s) => s ?? conversations[0]?.userId ?? null);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    refresh();
    const t = setInterval(() => document.visibilityState === "visible" && refresh(), 5000);
    return () => clearInterval(t);
  }, [refresh]);

  if (loaded && list.length === 0) return <p className="card p-6 text-center text-muted">No player has written yet.</p>;
  const current = list.find((c) => c.userId === sel);

  return (
    <div className="grid gap-4 md:grid-cols-[16rem_1fr]">
      <ul className="card max-h-[28rem] overflow-y-auto" aria-label="Conversations">
        {list.map((c) => (
          <li key={c.userId}>
            <button
              onClick={() => setSel(c.userId)}
              aria-current={c.userId === sel ? "true" : undefined}
              className={`block w-full border-b border-line px-3 py-3 text-left hover:bg-surface-2 ${c.userId === sel ? "bg-surface-2" : ""}`}
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
      <section className="card overflow-hidden">
        {current ? (
          <>
            <h2 className="border-b border-line p-3 text-sm font-bold">{current.username} <span className="font-normal text-muted">· {current.email}</span></h2>
            <ChatBox key={current.userId} url={`/api/admin/chat/${current.userId}`} mine="admin" onActivity={refresh} />
          </>
        ) : null}
      </section>
    </div>
  );
}
