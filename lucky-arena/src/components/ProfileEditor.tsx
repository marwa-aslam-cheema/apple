"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { shrinkImage } from "@/lib/shrink-image";

/** The player's picture and nickname: change them and press Save. */
export function ProfileEditor({ username, nickname, avatar }: { username: string; nickname: string; avatar: string }) {
  const router = useRouter();
  const [nick, setNick] = useState(nickname);
  const [pic, setPic] = useState(avatar);
  const [local, setLocal] = useState<{ url: string; src: string } | null>(null); // preview before saving
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
      setPic(`/api/game-image/${data.imageId}`);
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
      const res = await fetch("/api/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nickname: nick, avatar: pic }) });
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
    <section className="card space-y-4 p-5">
      <h2 className="font-bold">Edit profile</h2>
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border border-gold/60 bg-gradient-to-br from-violet to-pink text-3xl font-extrabold">
          {pic ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={local?.url === pic ? local.src : pic} alt="Your profile picture" className="h-full w-full object-cover" />
          ) : (
            <span aria-hidden="true">{(nick || username)[0]?.toUpperCase()}</span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="btn btn-ghost cursor-pointer !min-h-9 !px-3 !py-1 text-sm">
            {busy ? "Please wait..." : pic ? "Change picture" : "Add picture"}
            <input type="file" accept="image/*" className="hidden" disabled={busy} onChange={(e) => { void pick(e.target.files?.[0]); e.target.value = ""; }} />
          </label>
          {pic && <button type="button" className="text-sm text-danger underline" onClick={() => setPic("")}>Remove picture</button>}
        </div>
      </div>
      <label className="block text-sm font-semibold">Nickname
        <input className="input mt-1" value={nick} maxLength={20} placeholder={username} onChange={(e) => setNick(e.target.value)} />
        <span className="mt-1 block text-xs font-normal text-muted">Up to 20 characters. Your username ({username}) stays the same for logging in.</span>
      </label>
      <div className="flex items-center gap-3">
        <button className="btn btn-gold" disabled={busy} onClick={save}>Save</button>
        {msg && <span role="status" className={`text-sm font-semibold ${msg.ok ? "text-teal" : "text-danger"}`}>{msg.text}</span>}
      </div>
    </section>
  );
}
