"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export interface RequestRow {
  id: number;
  identifier: string;
  userId: number | null;
  username: string | null;
  email: string | null;
  status: string;
  createdAt: string;
}

function Card({ r }: { r: RequestRow }) {
  const router = useRouter();
  const [pw, setPw] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function call(url: string, body: object) {
    const res = await fetch(url, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Failed.");
  }

  async function setPassword() {
    try {
      await call(`/api/admin/users/${r.userId}`, { newPassword: pw });
      await call(`/api/admin/requests/${r.id}`, { status: "done" });
      router.refresh();
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Failed." });
    }
  }
  async function dismiss() {
    try {
      await call(`/api/admin/requests/${r.id}`, { status: "dismissed" });
      router.refresh();
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Failed." });
    }
  }

  return (
    <li className="card space-y-3 p-4">
      <div>
        <p className="font-bold">{r.username ? `${r.username} · ${r.email}` : `No matching account for "${r.identifier}"`}</p>
        <p className="text-xs text-muted">Typed: {r.identifier} · {new Date(r.createdAt).toISOString().slice(0, 16).replace("T", " ")} UTC</p>
      </div>
      {r.userId ? (
        <div className="flex flex-wrap items-end gap-2">
          <label className="min-w-0 flex-1 text-xs font-semibold text-muted">New password (min 8 characters)
            <input className="input mt-1" autoComplete="off" value={pw} onChange={(e) => setPw(e.target.value)} />
          </label>
          <button className="btn btn-gold" disabled={pw.length < 8} onClick={setPassword}>Set password and close</button>
          <button className="btn btn-ghost" onClick={dismiss}>Dismiss</button>
        </div>
      ) : (
        <button className="btn btn-ghost" onClick={dismiss}>Dismiss</button>
      )}
      {msg && <p role="status" className={`text-sm font-semibold ${msg.ok ? "text-teal" : "text-danger"}`}>{msg.text}</p>}
    </li>
  );
}

export function AdminRequests({ rows }: { rows: RequestRow[] }) {
  if (rows.length === 0) return <p className="card p-6 text-center text-muted">No open password requests.</p>;
  return <ul className="space-y-3">{rows.map((r) => <Card key={r.id} r={r} />)}</ul>;
}
