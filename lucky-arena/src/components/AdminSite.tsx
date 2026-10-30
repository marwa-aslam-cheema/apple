"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { shrinkImage } from "@/lib/shrink-image";

/** The site's name and logo, shown at the top of every page. */
export function AdminSite({ name, logo }: { name: string; logo: string }) {
  const router = useRouter();
  const [n, setN] = useState(name);
  const [l, setL] = useState(logo);
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
      setL(`/api/game-image/${data.imageId}`);
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
      const res = await fetch("/api/admin/site", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: n, logo: l }) });
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
    <div className="card max-w-xl space-y-4 p-5">
      <label className="block text-sm font-semibold">Site name
        <input className="input mt-1" value={n} maxLength={30} onChange={(e) => setN(e.target.value)} />
        <span className="mt-1 block text-xs font-normal text-muted">Shown at the top of every page, in the browser tab and on the phone's home screen.</span>
      </label>
      <div className="space-y-2">
        <p className="text-sm font-semibold">Logo / profile picture of the site</p>
        <div className="flex flex-wrap items-center gap-3">
          {l && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={local?.url === l ? local.src : l} alt="Site logo" className="h-16 w-16 rounded-full object-cover" />
          )}
          <label className="btn btn-ghost cursor-pointer !min-h-9 !px-3 !py-1 text-sm">
            {busy ? "Please wait..." : l ? "Change logo" : "Add logo"}
            <input type="file" accept="image/*" className="hidden" disabled={busy} onChange={(e) => { void pick(e.target.files?.[0]); e.target.value = ""; }} />
          </label>
          {l && <button type="button" className="text-sm text-danger underline" onClick={() => setL("")}>Remove logo</button>}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button className="btn btn-gold" disabled={busy} onClick={save}>Save</button>
        {msg && <span role="status" className={`text-sm font-semibold ${msg.ok ? "text-teal" : "text-danger"}`}>{msg.text}</span>}
      </div>
    </div>
  );
}
