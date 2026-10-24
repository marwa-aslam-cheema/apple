"use client";

import { useCallback, useEffect, useState } from "react";
import { BroadcastPanel } from "./BroadcastPanel";
import { ChatBox } from "./ChatBox";
import { Icon } from "./Icon";
import { QuickReplies } from "./QuickReplies";

/** Adds virtual credits to this player and sends them the "Added ..." message in one click. */
function AddCredits({ userId, onDone }: { userId: number; onDone: () => void }) {
  const [amount, setAmount] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function add() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/admin/chat/${userId}/credit`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ amount: Number(amount) }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed.");
      setMsg({ ok: true, text: `Added. Balance ${data.balance.toLocaleString("en-US")}` });
      setAmount("");
      window.dispatchEvent(new Event("la:chat-refresh")); // show the "Added ..." message in this thread right away
      onDone();
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Failed." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-line bg-surface-2/60 p-2">
      <input type="number" min={1} max={100000} inputMode="numeric" className="input !min-h-9 w-28 !py-1" placeholder="Credits" aria-label="Credits to add" value={amount} onChange={(e) => setAmount(e.target.value)} />
      <button className="btn btn-gold !min-h-9 !px-3 !py-1" disabled={busy || !(Number(amount) >= 1)} onClick={add}>Add credits</button>
      {msg && <span role="status" className={`text-xs font-semibold ${msg.ok ? "text-teal" : "text-danger"}`}>{msg.text}</span>}
    </div>
  );
}

interface Convo {
  userId: number;
  username: string;
  email: string;
  unread: number;
  last: string;
  lastSender: string;
}

export function AdminChat({ compact = false, initial }: { compact?: boolean; initial?: { userId: number; username: string; email: string } }) {
  const [list, setList] = useState<Convo[]>([]);
  const [sel, setSel] = useState<number | null>(initial?.userId ?? null);
  const [loaded, setLoaded] = useState(false);
  const [thread, setThread] = useState(!compact || !!initial); // compact: start on the list, open a thread on click
  const [broadcast, setBroadcast] = useState(false);

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

  // A player with no messages yet (opened from the Users list) is not in the list: build their header from what we were given.
  const current: Convo | undefined = list.find((c) => c.userId === sel) ?? (initial && sel === initial.userId ? { ...initial, unread: 0, last: "", lastSender: "admin" } : undefined);

  const broadcastButton = (
    <button className="btn btn-violet !min-h-10 w-full !py-1.5" onClick={() => { setBroadcast(true); setThread(true); }}>
      <Icon name="megaphone" className="h-4 w-4" /> Send to all
    </button>
  );

  const listView = (
    <ul className={compact ? "overflow-y-auto" : "max-h-[24rem] overflow-y-auto"} aria-label="Conversations">
      {loaded && list.length === 0 && <li className="p-4 text-center text-sm text-muted">No player has written yet.</li>}
      {list.map((c) => (
        <li key={c.userId}>
          <button
            onClick={() => { setSel(c.userId); setThread(true); setBroadcast(false); }}
            aria-current={c.userId === sel && !broadcast ? "true" : undefined}
            className={`block w-full border-b border-line px-3 py-3 text-left hover:bg-surface-2 ${c.userId === sel && !compact && !broadcast ? "bg-surface-2" : ""}`}
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
      <AddCredits userId={current.userId} onDone={refresh} />
      <QuickReplies />
      <ChatBox key={current.userId} url={`/api/admin/chat/${current.userId}`} mine="admin" onActivity={refresh} className={compact ? "min-h-0 flex-1" : "h-[24rem] max-h-[60vh]"} />
    </>
  ) : (
    <p className="p-6 text-center text-sm text-muted">Pick a conversation, or use Send to all.</p>
  );

  if (compact) {
    if (broadcast) return <div className="h-full"><BroadcastPanel onClose={() => setBroadcast(false)} /></div>;
    if (thread && current) return <div className="flex h-full flex-col">{threadView}</div>;
    return <div className="flex h-full flex-col"><div className="border-b border-line p-2">{broadcastButton}</div><div className="min-h-0 flex-1 overflow-y-auto">{listView}</div></div>;
  }

  return (
    <div className="grid gap-4 md:grid-cols-[16rem_1fr]">
      <div className="card flex flex-col">
        <div className="border-b border-line p-2">{broadcastButton}</div>
        {listView}
      </div>
      <section className="card overflow-hidden">{broadcast ? <div className="h-[34rem] max-h-[75vh]"><BroadcastPanel onClose={() => setBroadcast(false)} /></div> : threadView}</section>
    </div>
  );
}
