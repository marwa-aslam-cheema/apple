"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BroadcastPanel } from "./BroadcastPanel";
import { ChatBox } from "./ChatBox";
import { Icon } from "./Icon";
import { QuickReplies } from "./QuickReplies";
import { TAGS_MAX, TAG_MAX, joinTags, tagList } from "@/lib/tags";

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
    <div className="flex flex-wrap items-center gap-1.5 px-2 py-1">
      <input type="number" min={1} max={100000} inputMode="numeric" className="input !min-h-7 w-20 !px-2 !py-0 !text-xs" placeholder="Credits" aria-label="Credits to add" value={amount} onChange={(e) => setAmount(e.target.value)} />
      <button className="btn btn-gold !min-h-7 !px-2.5 !py-0 !text-xs" disabled={busy || !(Number(amount) >= 1)} onClick={add}>Add credits</button>
      {msg && <span role="status" className={`text-xs font-semibold ${msg.ok ? "text-teal" : "text-danger"}`}>{msg.text}</span>}
    </div>
  );
}

/** Tells the player their balance inside one game ("🎮 Fire Kirin · 150 credits", shown in green in the chat). Only a message: the game keeps the real balance. */
function GameBalance({ userId }: { userId: number }) {
  const [games, setGames] = useState<{ id: number; title: string }[]>([]);
  const [gameId, setGameId] = useState("");
  const [amount, setAmount] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch(`/api/admin/chat/${userId}/game-balance`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d: { games?: { id: number; title: string }[] }) => setGames(d.games ?? []))
      .catch(() => undefined);
  }, [userId]);

  async function send() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/admin/chat/${userId}/game-balance`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ gameId: Number(gameId), amount: Number(amount) }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed.");
      setMsg({ ok: true, text: "Sent." });
      setAmount("");
      window.dispatchEvent(new Event("la:chat-refresh")); // show the message in this thread right away
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Failed." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5 px-2 py-1">
      <select className="input !min-h-7 w-32 !px-2 !py-0 !text-xs" aria-label="Game" value={gameId} onChange={(e) => setGameId(e.target.value)}>
        <option value="">Pick a game</option>
        {games.map((g) => <option key={g.id} value={g.id}>{g.title}</option>)}
      </select>
      <input type="number" min={0} inputMode="numeric" className="input !min-h-7 w-20 !px-2 !py-0 !text-xs" placeholder="Balance" aria-label="Balance in that game" value={amount} onChange={(e) => setAmount(e.target.value)} />
      <button className="btn btn-violet !min-h-7 !px-2.5 !py-0 !text-xs" disabled={busy || !gameId || amount === ""} onClick={send}>Tell game balance</button>
      {msg && <span role="status" className={`text-xs font-semibold ${msg.ok ? "text-teal" : "text-danger"}`}>{msg.text}</span>}
    </div>
  );
}

/** Tags kept beside the player's name (for example their name inside a game). Shown in the list, Users and History too. */
function TagBar({ userId, tag, onSaved }: { userId: number; tag: string; onSaved: () => void }) {
  const [tags, setTags] = useState(tagList(tag));
  const latest = useRef(tags); // the newest list, so two quick additions never overwrite each other
  latest.current = tags;
  const [adding, setAdding] = useState(false);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  useEffect(() => { setTags(tagList(tag)); setAdding(false); setText(""); setError(""); }, [userId, tag]);

  async function save(next: string[]) {
    setError("");
    latest.current = tagList(joinTags(next));
    setTags(latest.current); // show it straight away; the server confirms in the background
    const res = await fetch(`/api/admin/users/${userId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tag: joinTags(next) }) });
    if (!res.ok) return setError("Could not save the tag.");
    onSaved();
  }
  function add() {
    const t = text.trim();
    setText("");
    setAdding(false);
    if (t) void save([...latest.current, t]);
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5 border-b border-line px-3 py-1">
      {tags.map((t) => (
        <span key={t} className="inline-flex items-center gap-1 rounded-full bg-violet/30 py-0.5 pl-2.5 pr-1 text-xs font-semibold">
          {t}
          <button type="button" className="flex h-4 w-4 items-center justify-center rounded-full text-muted hover:bg-black/30 hover:text-ink" aria-label={`Remove tag ${t}`} onClick={() => void save(latest.current.filter((x) => x !== t))}>×</button>
        </span>
      ))}
      {adding ? (
        <input
          autoFocus
          className="input !min-h-7 !w-40 !rounded-full !px-3 !py-0.5 text-xs"
          placeholder="Type a tag, press Enter"
          aria-label="New tag"
          maxLength={TAG_MAX}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } if (e.key === "Escape") { setAdding(false); setText(""); } }}
          onBlur={add}
        />
      ) : tags.length < TAGS_MAX ? (
        <button type="button" className="inline-flex items-center gap-1 rounded-full border border-dashed border-line px-2.5 py-0.5 text-xs font-semibold text-muted hover:border-gold hover:text-gold" onClick={() => setAdding(true)} aria-label="Add a tag">
          <span aria-hidden="true">+</span> Tag
        </button>
      ) : null}
      {error && <span role="alert" className="text-xs text-danger">{error}</span>}
    </div>
  );
}

interface Convo {
  userId: number;
  username: string;
  email: string;
  nickname?: string;
  tag: string;
  online: boolean;
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
  const [tab, setTab] = useState<"all" | "unread" | "online">("all");

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
  const current: Convo | undefined = list.find((c) => c.userId === sel) ?? (initial && sel === initial.userId ? { ...initial, tag: "", online: false, unread: 0, last: "", lastSender: "admin" } : undefined);

  const broadcastButton = (
    <button className="btn btn-violet !min-h-10 w-full !py-1.5" onClick={() => { setBroadcast(true); setThread(true); }}>
      <Icon name="megaphone" className="h-4 w-4" /> Send to all
    </button>
  );

  const counts = { all: list.length, unread: list.filter((c) => c.unread > 0).length, online: list.filter((c) => c.online).length };
  const shown = list.filter((c) => tab === "all" || (tab === "unread" ? c.unread > 0 : c.online));
  const tabs = (
    <div className="p-2">
      <div className="grid grid-cols-3 gap-1 rounded-xl bg-surface-2 p-1" role="tablist" aria-label="Filter conversations">
        {([["all", "All"], ["unread", "Unread"], ["online", "Online"]] as const).map(([t, label]) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`flex min-w-0 items-center justify-center gap-1 rounded-lg px-1 py-1.5 text-xs font-bold transition-colors ${tab === t ? "bg-surface text-gold shadow" : "text-muted hover:text-ink"}`}
          >
            {t === "online" && <span className="h-2 w-2 shrink-0 rounded-full bg-green-500" aria-hidden="true" />}
            <span className="truncate">{label}</span>
            <span className={`rounded-full px-1.5 text-[10px] ${t === "unread" && counts.unread > 0 ? "bg-gold text-black" : "bg-black/30"}`}>{counts[t]}</span>
          </button>
        ))}
      </div>
    </div>
  );

  const listView = (
    <ul className={compact ? "overflow-y-auto" : "max-h-[24rem] overflow-y-auto"} aria-label="Conversations">
      {loaded && shown.length === 0 && <li className="p-4 text-center text-sm text-muted">{tab === "all" ? "No player has written yet." : tab === "unread" ? "No unread messages." : "Nobody is online right now."}</li>}
      {shown.map((c) => (
        <li key={c.userId}>
          <button
            onClick={() => { setSel(c.userId); setThread(true); setBroadcast(false); }}
            aria-current={c.userId === sel && !broadcast ? "true" : undefined}
            className={`block w-full border-b border-line px-3 py-3 text-left hover:bg-surface-2 ${c.userId === sel && !compact && !broadcast ? "bg-surface-2" : ""}`}
          >
            <span className="flex items-center justify-between gap-2">
              <b className="flex min-w-0 items-center gap-1.5 truncate text-sm">
                {c.online && <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-full bg-green-500 shadow-[0_0_6px_#22c55e]" role="img" aria-label="Online" title="Online" />}
                <span className="truncate">{c.nickname || c.username}</span>
                
              </b>
              {c.unread > 0 && <span className="rounded-full bg-gold px-2 text-xs font-extrabold text-black">{c.unread}</span>}
            </span>
            {tagList(c.tag).length > 0 && (
              <span className="mt-0.5 flex flex-wrap gap-1">
                {tagList(c.tag).slice(0, 2).map((t) => <span key={t} className="max-w-[8rem] truncate rounded-full bg-violet/30 px-2 text-[10px] font-semibold">{t}</span>)}
                {tagList(c.tag).length > 2 && <span className="text-[10px] text-muted">+{tagList(c.tag).length - 2}</span>}
              </span>
            )}
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
        <span className="truncate">
          {current.online && <span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full bg-green-500" role="img" aria-label="Online" title="Online" />}
          {current.nickname || current.username} <span className="font-normal text-muted">· {current.email}</span>
        </span>
        <a href={`/admin/users/${current.userId}`} className="chip ml-auto shrink-0 !py-0.5 text-xs hover:border-gold" title="Game usernames, credits and history">Game usernames</a>
      </h2>
      <TagBar userId={current.userId} tag={current.tag} onSaved={refresh} />
      <div className="flex flex-wrap items-center border-b border-line bg-surface-2/60">
        <AddCredits userId={current.userId} onDone={refresh} />
        <GameBalance userId={current.userId} />
      </div>
      <QuickReplies />
      <ChatBox key={current.userId} url={`/api/admin/chat/${current.userId}`} mine="admin" onActivity={refresh} className={compact ? "min-h-0 flex-1" : "h-[24rem] max-h-[60vh]"} />
    </>
  ) : (
    <p className="p-6 text-center text-sm text-muted">Pick a conversation, or use Send to all.</p>
  );

  if (compact) {
    if (broadcast) return <div className="h-full"><BroadcastPanel onClose={() => setBroadcast(false)} /></div>;
    if (thread && current) return <div className="flex h-full flex-col">{threadView}</div>;
    return <div className="flex h-full flex-col"><div className="border-b border-line p-2">{broadcastButton}</div>{tabs}<div className="min-h-0 flex-1 overflow-y-auto">{listView}</div></div>;
  }

  return (
    <div className="grid gap-4 md:grid-cols-[18rem_minmax(0,1fr)]">
      <div className="card flex flex-col">
        <div className="border-b border-line p-2">{broadcastButton}</div>
        {tabs}
        {listView}
      </div>
      <section className="card overflow-hidden">{broadcast ? <div className="h-[34rem] max-h-[75vh]"><BroadcastPanel onClose={() => setBroadcast(false)} /></div> : threadView}</section>
    </div>
  );
}
