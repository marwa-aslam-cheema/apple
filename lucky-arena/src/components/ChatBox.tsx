"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { shrinkImage as shrink } from "@/lib/shrink-image";
import { fmtDate } from "@/lib/format";
import { sfxReceived, sfxSent, unlockSfx } from "@/lib/sfx";
import { buildMap, expandShortcut, normalizeShortcut, type ShortcutMap } from "@/lib/shortcuts";

export interface ChatMsg {
  id: number;
  sender: string;
  body: string;
  imageId?: number | null;
  deleted?: boolean;
  reactions?: { emoji: string; count: number; mine: boolean }[];
  createdAt: string;
}

const REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];
const EMOJIS = ["😀", "😁", "😂", "🤣", "😊", "😍", "😘", "😎", "🤩", "🥳", "😉", "🙂", "😅", "😇", "🤔", "😴", "😢", "😭", "😡", "🤯", "👍", "👎", "👏", "🙌", "🙏", "💪", "🤝", "👋", "🔥", "🎉", "🎁", "💎", "👑", "🍀", "⭐", "🎰", "🃏", "🎲", "❤️", "💯"];

/** One conversation. `mine` is who is looking at it ("user" = the player, "admin" = staff). */
export function ChatBox({ url, mine, onActivity, allowImages = true, className = "h-[28rem] max-h-[70vh]" }: { url: string; mine: "user" | "admin"; onActivity?: () => void; allowImages?: boolean; className?: string }) {
  const router = useRouter();
  const [msgs, setMsgs] = useState<ChatMsg[]>([]);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const lastId = useRef(0);
  const firstLoad = useRef(true);
  const box = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const [image, setImage] = useState<{ id: number; preview: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [menu, setMenu] = useState<number | null>(null); // message whose options (react, copy, delete) are open
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const file = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState("");
  const [shortcut, setShortcut] = useState("");
  const [map, setMap] = useState<ShortcutMap>({});
  const [pics, setPics] = useState<Record<string, number>>({}); // shortcut -> picture of that quick reply
  const expanded = useRef<{ from: string; to: string } | null>(null); // last auto-fill, so Backspace can undo it
  const suppress = useRef<string | null>(null); // a shortcut the admin undid: do not expand it again until the text changes

  const load = useCallback(async () => {
    try {
      const res = await fetch(`${url}?after=${lastId.current}`, { cache: "no-store" });
      if (!res.ok) return;
      const { messages, meta } = (await res.json()) as { messages: ChatMsg[]; meta?: { id: number; deleted: boolean; hidden?: boolean; reactions: NonNullable<ChatMsg["reactions"]> }[] };
      // Reactions and deletions on messages that are already on screen.
      if (meta?.length) {
        setMsgs((cur) => cur.filter((x) => !meta.find((y) => y.id === x.id)?.hidden).map((x) => {
          const m = meta.find((y) => y.id === x.id);
          if (!m) return x;
          return m.deleted ? { ...x, deleted: true, body: "", imageId: null, reactions: [] } : { ...x, deleted: false, reactions: m.reactions };
        }));
      }
      if (messages.length) {
        if (!firstLoad.current && messages.some((m) => m.sender !== mine)) {
          sfxReceived();
          router.refresh(); // an admin message may have added credits: update the balance in the top bar
        }
        lastId.current = messages[messages.length - 1].id;
        setMsgs((m) => [...m, ...messages.filter((x) => !m.some((y) => y.id === x.id)).map((x) => ({ ...x, reactions: meta?.find((y) => y.id === x.id)?.reactions ?? [] }))]);
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
      const d = (e as CustomEvent<string | { text: string; imageId?: number | null }>).detail;
      const reply = typeof d === "string" ? { text: d, imageId: null } : d;
      setImage(reply.imageId ? { id: reply.imageId, preview: `/api/chat/image/${reply.imageId}` } : null); // a quick reply can carry a picture
      setText(reply.text);
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
        if (res.ok && alive) {
          const items = (await res.json()).items as { shortcut?: string | null; body: string; imageId?: number | null }[];
          setMap(buildMap(items));
          setPics(Object.fromEntries(items.filter((r) => r.imageId && r.shortcut).map((r) => [normalizeShortcut(r.shortcut!), r.imageId!])));
        }
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
      const pic = pics[key];
      if (pic) setImage({ id: pic, preview: `/api/chat/image/${pic}` }); // the quick reply's picture comes along with its text
    }, 350);
  }

  async function saveQuick() {
    const body = text.trim();
    if (!body || !title.trim()) return;
    try {
      const res = await fetch("/api/admin/replies", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title, body, shortcut, imageId: image?.id ?? null }) });
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

  // Close the options / emoji panels when tapping elsewhere.
  useEffect(() => {
    if (menu === null && !emojiOpen) return;
    const close = (e: Event) => { if (!(e.target as HTMLElement).closest("[data-keep-open]")) { setMenu(null); setEmojiOpen(false); } };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [menu, emojiOpen]);

  async function act(m: ChatMsg, body: { action: "delete" } | { action: "react"; emoji: string | null }) {
    setMenu(null);
    setError("");
    // Show the change straight away; the next poll confirms it.
    if (body.action === "delete") setMsgs((cur) => cur.filter((x) => x.id !== m.id)); // gone from this side straight away
    else setMsgs((cur) => cur.map((x) => {
      if (x.id !== m.id) return x;
      const had = x.reactions ?? [];
      let next = had.map((r) => (r.mine ? { ...r, count: r.count - 1, mine: false } : r)).filter((r) => r.count > 0);
      if (body.emoji) {
        const hit = next.find((r) => r.emoji === body.emoji);
        next = hit ? next.map((r) => (r.emoji === body.emoji ? { ...r, count: r.count + 1, mine: true } : r)) : [...next, { emoji: body.emoji, count: 1, mine: true }];
      }
      return { ...x, reactions: next };
    }));
    try {
      const res = await fetch(`${url}/messages/${m.id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error((await res.json()).error ?? "Could not do that.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not do that.");
    }
    await load();
  }

  async function copyText(m: ChatMsg) {
    try {
      await navigator.clipboard.writeText(m.body);
    } catch {
      const t = document.createElement("textarea");
      t.value = m.body;
      document.body.appendChild(t);
      t.select();
      document.execCommand("copy");
      t.remove();
    }
    setMenu(null);
    setCopiedId(m.id);
    setTimeout(() => setCopiedId((c) => (c === m.id ? null : c)), 1500);
  }

  function addEmoji(e: string) {
    const el = input.current;
    const start = el?.selectionStart ?? text.length;
    const end = el?.selectionEnd ?? text.length;
    setText(text.slice(0, start) + e + text.slice(end));
    requestAnimationFrame(() => { el?.focus(); el?.setSelectionRange(start + e.length, start + e.length); });
  }

  async function pick(f: File | undefined) {
    if (!f) return;
    setError("");
    setUploading(true);
    try {
      const dataUrl = await shrink(f);
      const res = await fetch("/api/chat/image", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ dataUrl }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not upload the picture.");
      setImage({ id: data.imageId, preview: dataUrl });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not upload the picture.");
    } finally {
      setUploading(false);
      if (file.current) file.current.value = "";
    }
  }

  async function send() {
    if (timer.current) clearTimeout(timer.current);
    // Enter right after a shortcut sends the saved reply, not the shortcut itself.
    const expandedBody = mine === "admin" ? expandShortcut(text, map) : null;
    const body = expandedBody ?? text.trim();
    const sendImage = image ?? (expandedBody !== null && pics[normalizeShortcut(text)] ? { id: pics[normalizeShortcut(text)], preview: "" } : null);
    if ((!body && !sendImage) || busy || uploading) return;
    setBusy(true);
    setError("");
    unlockSfx();
    try {
      const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ body, imageId: sendImage?.id }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not send.");
      setText("");
      setImage(null);
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
        {msgs.map((m) => {
          const own = m.sender === mine;
          const canDelete = !m.deleted;
          return (
            <div key={m.id} className={`flex flex-col ${own ? "items-end" : "items-start"}`}>
              <div className={`group flex max-w-[88%] items-end gap-1 ${own ? "flex-row-reverse" : ""}`}>
                <div className={`min-w-0 rounded-2xl px-3 py-2 text-sm ${m.deleted ? "border border-line bg-transparent italic text-muted" : own ? "bg-violet text-white" : "bg-surface-2"}`}>
                  {m.deleted ? (
                    <p>This message was deleted</p>
                  ) : (
                    <>
                      {m.imageId && (
                        <a href={`/api/chat/image/${m.imageId}`} target="_blank" rel="noopener noreferrer" className="mb-1 block">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={`/api/chat/image/${m.imageId}`} alt="Picture in the chat" loading="lazy" className="max-h-72 w-auto max-w-full rounded-lg" />
                        </a>
                      )}
                      {m.body && <p className="whitespace-pre-wrap break-words">{m.body}</p>}
                    </>
                  )}
                  <p className="mt-1 text-[10px] opacity-60">{m.sender === "admin" && mine === "user" ? "Support · " : ""}{fmtDate(m.createdAt)}{copiedId === m.id ? " · Copied" : ""}</p>
                </div>
                {!m.deleted && (
                  <button type="button" data-keep-open aria-label="Message options" aria-expanded={menu === m.id} onClick={() => setMenu(menu === m.id ? null : m.id)} className="mb-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted opacity-60 hover:bg-surface-2 hover:opacity-100 focus:opacity-100 group-hover:opacity-100">⋯</button>
                )}
              </div>
              {menu === m.id && (
                <div data-keep-open className="mt-1 flex flex-wrap items-center gap-1 rounded-xl border border-line bg-surface p-1.5 shadow-lg" role="menu" aria-label="Message options">
                  {REACTIONS.map((e) => (
                    <button key={e} type="button" role="menuitem" aria-label={`React ${e}`} className="h-8 w-8 rounded-lg text-lg hover:bg-surface-2" onClick={() => void act(m, { action: "react", emoji: m.reactions?.some((r) => r.mine && r.emoji === e) ? null : e })}>{e}</button>
                  ))}
                  {m.body && <button type="button" role="menuitem" className="chip !py-1 text-xs hover:border-gold" onClick={() => void copyText(m)}>Copy</button>}
                  {canDelete && <button type="button" role="menuitem" className="chip !py-1 text-xs text-danger hover:border-danger" onClick={() => { if (confirm("Delete this message from your side? The other person will still see it.")) void act(m, { action: "delete" }); }}>Delete for me</button>}
                </div>
              )}
              {!!m.reactions?.length && !m.deleted && (
                <div className="mt-0.5 flex flex-wrap gap-1">
                  {m.reactions.map((r) => (
                    <button key={r.emoji} type="button" aria-label={`${r.emoji} ${r.count}${r.mine ? ", yours, tap to remove" : ""}`} onClick={() => void act(m, { action: "react", emoji: r.mine ? null : r.emoji })} className={`rounded-full border px-2 py-0.5 text-xs ${r.mine ? "border-gold bg-gold/15" : "border-line bg-surface-2"}`}>
                      {r.emoji} {r.count > 1 ? r.count : ""}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {error && <p role="alert" className="px-3 text-sm font-semibold text-danger">{error}</p>}
      {mine === "admin" && (text.trim() || image) && (
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
      {image && (
        <div className="flex items-center gap-2 border-t border-line px-3 pt-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image.preview} alt="Picture to send" className="h-14 w-14 rounded-lg object-cover" />
          <button type="button" className="text-xs text-gold underline" onClick={() => setImage(null)}>Remove picture</button>
        </div>
      )}
      <form
        className="flex gap-2 border-t border-line p-3"
        onSubmit={(e) => { e.preventDefault(); send(); }}
      >
        {allowImages && (
          <>
            <input ref={file} type="file" accept="image/*" className="hidden" aria-label="Choose a picture" onChange={(e) => void pick(e.target.files?.[0])} />
            <button type="button" className="btn btn-ghost !px-3" aria-label="Attach a picture" title="Attach a picture" disabled={busy || uploading} onClick={() => file.current?.click()}>{uploading ? "..." : "🖼️"}</button>
          </>
        )}
        <div className="relative" data-keep-open>
          <button type="button" className="btn btn-ghost !px-3" aria-label="Add an emoji" aria-expanded={emojiOpen} onClick={() => setEmojiOpen((o) => !o)}>😊</button>
          {emojiOpen && (
            <div role="dialog" aria-label="Emoji" className="absolute bottom-full left-0 z-10 mb-2 grid w-64 grid-cols-8 gap-0.5 rounded-xl border border-line bg-surface p-2 shadow-xl">
              {EMOJIS.map((e) => <button key={e} type="button" className="h-8 w-8 rounded-lg text-lg hover:bg-surface-2" onClick={() => addEmoji(e)}>{e}</button>)}
            </div>
          )}
        </div>
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
              if (pics[suppress.current] && image?.id === pics[suppress.current]) setImage(null);
              setText(expanded.current.from);
              expanded.current = null;
              return;
            }
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
          }}
        />
        <button className="btn btn-gold" disabled={busy || uploading || (!text.trim() && !image)}>Send</button>
      </form>
    </div>
  );
}
