"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { shrinkImage } from "@/lib/shrink-image";

export interface Field {
  key: string;
  label: string;
  type: "text" | "textarea" | "number" | "bool" | "select" | "color" | "picture" | "gameimage";
  options?: string[];
}
type Row = Record<string, string | number | boolean>;

/** Add, change or remove the picture that goes out with a quick reply. 0 means no picture. */
function PictureInput({ f, value, onChange }: { f: Field; value: number; onChange: (v: number) => void }) {
  const [busy, setBusy] = useState(false);
  const [local, setLocal] = useState<{ id: number; src: string } | null>(null); // preview of a picture that is not saved yet
  const [err, setErr] = useState("");
  async function pick(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setErr("");
    try {
      const dataUrl = await shrinkImage(file);
      const res = await fetch("/api/chat/image", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ dataUrl }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not upload.");
      setLocal({ id: data.imageId, src: dataUrl });
      onChange(data.imageId);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not upload.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-1 sm:col-span-2 lg:col-span-4">
      <p className="text-xs font-semibold text-muted">{f.label}</p>
      <div className="flex flex-wrap items-center gap-3">
        {value > 0 && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={local?.id === value ? local.src : `/api/chat/image/${value}`} alt="Picture for this reply" className="h-16 w-16 rounded-lg object-cover" />
        )}
        <label className="btn btn-ghost cursor-pointer !min-h-9 !px-3 !py-1 text-sm">
          {busy ? "Uploading..." : value > 0 ? "Change picture" : "Add picture"}
          <input type="file" accept="image/*" className="hidden" disabled={busy} onChange={(e) => { void pick(e.target.files?.[0]); e.target.value = ""; }} />
        </label>
        {value > 0 && <button type="button" className="text-sm text-danger underline" onClick={() => onChange(0)}>Remove picture</button>}
        <span className="text-xs text-muted">Press Save to keep the change.</span>
      </div>
      {err && <p role="alert" className="text-xs font-semibold text-danger">{err}</p>}
    </div>
  );
}

/** The picture on a game card: upload one (no link needed) or remove it. Stored as this site's own address. */
function GameImageInput({ f, value, onChange }: { f: Field; value: string; onChange: (v: string) => void }) {
  const [busy, setBusy] = useState(false);
  const [local, setLocal] = useState<{ url: string; src: string } | null>(null); // preview of a picture that is not saved yet
  const [err, setErr] = useState("");
  async function pick(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setErr("");
    try {
      const dataUrl = await shrinkImage(file);
      const res = await fetch("/api/chat/image", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ dataUrl }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not upload.");
      setLocal({ url: `/api/game-image/${data.imageId}`, src: dataUrl });
      onChange(`/api/game-image/${data.imageId}`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not upload.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-1 sm:col-span-2 lg:col-span-4">
      <p className="text-xs font-semibold text-muted">{f.label}</p>
      <div className="flex flex-wrap items-center gap-3">
        {value && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={local?.url === value ? local.src : value} alt="Game picture" className="h-20 w-20 rounded-xl object-cover" />
        )}
        <label className="btn btn-ghost cursor-pointer !min-h-9 !px-3 !py-1 text-sm">
          {busy ? "Uploading..." : value ? "Change picture" : "Add picture"}
          <input type="file" accept="image/*" className="hidden" disabled={busy} onChange={(e) => { void pick(e.target.files?.[0]); e.target.value = ""; }} />
        </label>
        {value && <button type="button" className="text-sm text-danger underline" onClick={() => onChange("")}>Remove picture</button>}
        <span className="text-xs text-muted">Press Save (or Add) to keep the change.</span>
      </div>
      {err && <p role="alert" className="text-xs font-semibold text-danger">{err}</p>}
    </div>
  );
}

function Input({ f, value, onChange }: { f: Field; value: Row[string]; onChange: (v: Row[string]) => void }) {
  if (f.type === "gameimage") return <GameImageInput f={f} value={String(value ?? "")} onChange={onChange} />;
  if (f.type === "picture") return <PictureInput f={f} value={Number(value) || 0} onChange={onChange} />;
  const id = `f-${f.key}-${Math.random().toString(36).slice(2, 7)}`;
  if (f.type === "bool") {
    return (
      <label className="flex min-h-11 items-center gap-2 text-sm font-semibold">
        <input type="checkbox" className="h-5 w-5 accent-violet" checked={!!value} onChange={(e) => onChange(e.target.checked)} />
        {f.label}
      </label>
    );
  }
  if (f.type === "textarea") {
    return (
      <label htmlFor={id} className="block text-xs font-semibold text-muted sm:col-span-2 lg:col-span-4">
        {f.label}
        <textarea id={id} rows={6} className="input mt-1 min-h-32 resize-y whitespace-pre-wrap" value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} />
        <span className="mt-1 block font-normal">Press Enter for a new line.</span>
      </label>
    );
  }
  return (
    <label htmlFor={id} className="block text-xs font-semibold text-muted">
      {f.label}
      {f.type === "select" ? (
        <select id={id} className="input mt-1" value={String(value)} onChange={(e) => onChange(e.target.value)}>
          {f.options!.map((o) => <option key={o}>{o}</option>)}
        </select>
      ) : (
        <input
          id={id}
          className="input mt-1"
          type={f.type === "number" ? "number" : f.type === "color" ? "color" : "text"}
          value={String(value ?? "")}
          onChange={(e) => onChange(f.type === "number" ? (e.target.value === "" ? "" : Number(e.target.value)) : e.target.value)}
        />
      )}
    </label>
  );
}

function Editor({ resource, fields, initial, id, onDone }: { resource: string; fields: Field[]; initial: Row; id?: number; onDone?: () => void }) {
  const router = useRouter();
  const [row, setRow] = useState<Row>(initial);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function call(method: "POST" | "PATCH" | "DELETE") {
    setBusy(true);
    setMsg(null);
    const url = id ? `/api/admin/${resource}/${id}` : `/api/admin/${resource}`;
    try {
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: method === "DELETE" ? undefined : JSON.stringify(row) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed.");
      setMsg({ ok: true, text: method === "DELETE" ? "Deleted." : "Saved." });
      if (method === "POST") setRow(initial);
      router.refresh();
      onDone?.();
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Failed." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {fields.map((f) => <Input key={f.key} f={f} value={row[f.key]} onChange={(v) => setRow({ ...row, [f.key]: v })} />)}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {id ? (
          <>
            <button className="btn btn-violet" disabled={busy} onClick={() => call("PATCH")}>Save</button>
            <button className="btn btn-ghost text-danger" disabled={busy} onClick={() => confirm("Delete this item?") && call("DELETE")}>Delete</button>
          </>
        ) : (
          <button className="btn btn-gold" disabled={busy} onClick={() => call("POST")}>Add</button>
        )}
        <span role="status" className={`text-sm font-semibold ${msg?.ok ? "text-teal" : "text-danger"}`}>{msg?.text}</span>
      </div>
    </div>
  );
}

export function AdminResource({ resource, fields, rows, defaults, titleKey }: { resource: string; fields: Field[]; rows: Row[]; defaults: Row; titleKey: string }) {
  return (
    <div className="space-y-4">
      <details className="card p-4" open={rows.length === 0}>
        <summary className="cursor-pointer font-bold">Add new</summary>
        <div className="mt-3"><Editor resource={resource} fields={fields} initial={defaults} /></div>
      </details>
      {rows.map((r) => (
        <details key={String(r.id)} className="card p-4">
          <summary className="cursor-pointer font-semibold">{String(r[titleKey])}</summary>
          <div className="mt-3"><Editor resource={resource} fields={fields} initial={r} id={Number(r.id)} /></div>
        </details>
      ))}
    </div>
  );
}
