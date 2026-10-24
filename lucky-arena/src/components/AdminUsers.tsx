"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { fmt } from "@/lib/format";

export interface AdminUserRow {
  id: number;
  username: string;
  email: string;
  role: string;
  balance: number;
  banned: boolean;
}

function UserRow({ u, self }: { u: AdminUserRow; self: boolean }) {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [pw, setPw] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function patch(body: object) {
    setMsg(null);
    const res = await fetch(`/api/admin/users/${u.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json();
    if (!res.ok) return setMsg({ ok: false, text: data.error ?? "Failed." });
    setMsg({ ok: true, text: "Done." });
    setAmount("");
    router.refresh();
  }

  return (
    <li className="card space-y-3 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-bold">{u.username} {u.role === "admin" && <span className="rounded bg-violet px-1.5 text-xs">admin</span>} {u.banned && <span className="rounded bg-danger px-1.5 text-xs">banned</span>}</p>
          <p className="truncate text-xs text-muted">{u.email}</p>
        </div>
        <p className="font-extrabold text-gold">{fmt(u.balance)}</p>
      </div>
      <div className="flex flex-wrap items-end gap-2">
        <label className="text-xs font-semibold text-muted">Adjust credits (+/-)
          <input type="number" className="input mt-1 w-32" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </label>
        <label className="min-w-0 flex-1 text-xs font-semibold text-muted">Note
          <input className="input mt-1" value={note} maxLength={80} onChange={(e) => setNote(e.target.value)} />
        </label>
        <button className="btn btn-violet" disabled={!amount || Number(amount) === 0} onClick={() => patch({ adjust: Number(amount), note })}>Apply</button>
        <button className="btn btn-ghost" disabled={self} onClick={() => patch({ banned: !u.banned })}>{u.banned ? "Unban" : "Ban"}</button>
      </div>
      <div className="flex flex-wrap items-end gap-2">
        <label className="min-w-0 flex-1 text-xs font-semibold text-muted">New password (min 8 characters)
          <input type="text" autoComplete="off" className="input mt-1" value={pw} onChange={(e) => setPw(e.target.value)} />
        </label>
        <button className="btn btn-ghost" disabled={pw.length < 8} onClick={async () => { await patch({ newPassword: pw }); setPw(""); }}>Set password</button>
      </div>
      {msg && <p role="status" className={`text-sm font-semibold ${msg.ok ? "text-teal" : "text-danger"}`}>{msg.text}</p>}
    </li>
  );
}

export function AdminUsers({ users, selfId }: { users: AdminUserRow[]; selfId: number }) {
  return <ul className="space-y-3">{users.map((u) => <UserRow key={u.id} u={u} self={u.id === selfId} />)}</ul>;
}
