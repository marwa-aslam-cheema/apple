"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { shrinkImage } from "@/lib/shrink-image";

/** The invite post that players share on social media: its words, its picture and the free-chips code. */
export function AdminInvitePost({ caption, image, bonus, defaultCaption, title, intro, codeLabel, linkBase }: { caption: string; image: string; bonus: string; defaultCaption: string; title: string; intro: string; codeLabel: string; linkBase: string }) {
  const router = useRouter();
  const [c, setC] = useState(caption);
  const [img, setImg] = useState(image);
  const [b, setB] = useState(bonus);
  const [t, setT] = useState(title);
  const [i, setI] = useState(intro);
  const [cl, setCl] = useState(codeLabel);
  const [lb, setLb] = useState(linkBase);
  const [local, setLocal] = useState<{ url: string; src: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function pick(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setMsg(null);
    try {
      const dataUrl = await shrinkImage(file);
      const res = await fetch("/api/chat/image", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ dataUrl }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not upload.");
      setLocal({ url: `/api/game-image/${data.imageId}`, src: dataUrl });
      setImg(`/api/game-image/${data.imageId}`);
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Could not upload." });
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/share", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ caption: c, image: img, bonus: b, title: t, intro: i, codeLabel: cl, linkBase: lb }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not save.");
      setMsg({ ok: true, text: "Saved." });
      router.refresh();
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Could not save." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div id="invite" className="card max-w-xl scroll-mt-24 space-y-4 p-5">
      <h2 className="font-bold">Invite page and post</h2>
      <div className="space-y-3 rounded-xl border border-line p-3">
        <p className="text-sm font-semibold">The page players open ("Referral")</p>
        <label className="block text-xs font-semibold text-muted">Page title<input className="input mt-1" value={t} maxLength={40} onChange={(e) => setT(e.target.value)} /></label>
        <label className="block text-xs font-semibold text-muted">Text under the title<input className="input mt-1" value={i} maxLength={200} onChange={(e) => setI(e.target.value)} /><span className="mt-1 block font-normal">{"{credits}"} becomes the bonus amount.</span></label>
        <label className="block text-xs font-semibold text-muted">Name of the code box<input className="input mt-1" value={cl} maxLength={30} onChange={(e) => setCl(e.target.value)} /></label>
        <label className="block text-xs font-semibold text-muted">Invite link starts with (leave empty to use this site's address)
          <input className="input mt-1" value={lb} maxLength={120} placeholder="https://myclub.com" onChange={(e) => setLb(e.target.value)} />
          <span className="mt-1 block font-normal">The link players copy and share becomes this address, then <code>/register?ref=THEIR-CODE</code>.</span>
        </label>
      </div>
      <p className="text-sm font-semibold">The post players share on social media</p>
      <label className="block text-sm font-semibold">Post text
        <textarea className="input mt-1 min-h-28" value={c} maxLength={500} onChange={(e) => setC(e.target.value)} />
        <span className="mt-1 block text-xs font-normal text-muted">Write anything. <b>{"{code}"}</b> becomes each player's own invite code, <b>{"{bonus}"}</b> becomes the free-chips code below, <b>{"{site}"}</b> your site name.</span>
      </label>
      <label className="block text-sm font-semibold">Free chips code (optional)
        <input className="input mt-1" value={b} maxLength={40} onChange={(e) => setB(e.target.value)} />
        <span className="mt-1 block text-xs font-normal text-muted">Shown to players above the post with a Copy button, and put into the text where you write {"{bonus}"}.</span>
      </label>
      <div className="space-y-2">
        <p className="text-sm font-semibold">Post picture</p>
        <div className="flex flex-wrap items-center gap-3">
          {img && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={local?.url === img ? local.src : img} alt="Post picture" className="h-24 w-auto max-w-[8rem] rounded-lg" />
          )}
          <label className="btn btn-ghost cursor-pointer !min-h-9 !px-3 !py-1 text-sm">
            {busy ? "Please wait..." : img ? "Change picture" : "Add picture"}
            <input type="file" accept="image/*" className="hidden" disabled={busy} onChange={(e) => { void pick(e.target.files?.[0]); e.target.value = ""; }} />
          </label>
          {img && <button type="button" className="text-sm text-danger underline" onClick={() => setImg("")}>Remove (use the automatic picture)</button>}
        </div>
        <p className="text-xs text-muted">Without a picture of your own, the site makes a post picture with the player's code on it.</p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button className="btn btn-gold" disabled={busy} onClick={save}>Save</button>
        <button type="button" className="text-sm text-muted underline" onClick={() => setC(defaultCaption)}>Use the original text</button>
        {msg && <span role="status" className={`text-sm font-semibold ${msg.ok ? "text-teal" : "text-danger"}`}>{msg.text}</span>}
      </div>
    </div>
  );
}
