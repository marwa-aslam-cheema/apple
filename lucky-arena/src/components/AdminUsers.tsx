"use client";

import Link from "next/link";
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
  createdAt?: string;
}

/** Credits, ban and password reset for one player. Used in the Users list and on the player's history page. */
export function AdminUserActions({ u, self }: { u: Pick<AdminUserRow, "id" | "banned">; self: boolean }) {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [pw, setPw] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function patch(body: object, done: string): Promise<boolean> {
    setMsg(null);
    const res = await fetch(`/api/admin/users/${u.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json();
    if (!res.ok) {
      setMsg({ ok: false, text: data.error ?? "Failed." });
      return false;
    }
    setMsg({ ok: true, text: done });
    router.refresh();
    return true;
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-2">
        <label className="text-xs font-semibold text-muted">Add or remove credits (+/-)
          <input type="number" className="input mt-1 w-32" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </label>
        <label className="min-w-0 flex-1 text-xs font-semibold text-muted">Note
          <input className="input mt-1" value={note} maxLength={80} onChange={(e) => setNote(e.target.value)} />
        </label>
        <button className="btn btn-violet" disabled={!amount || Number(amount) === 0} onClick={async () => { if (await patch({ adjust: Number(amount), note }, "Credits updated.")) setAmount(""); }}>Apply</button>
        <button className="btn btn-ghost" disabled={self} onClick={() => patch({ banned: !u.banned }, u.banned ? "Account unbanned." : "Account banned.")}>{u.banned ? "Unban" : "Ban"}</button>
      </div>
      <div className="flex flex-wrap items-end gap-2">
        <label className="min-w-0 flex-1 text-xs font-semibold text-muted">Reset password: type the new one (min 8 characters)
          <input type="text" autoComplete="off" className="input mt-1" value={pw} onChange={(e) => setPw(e.target.value)} />
        </label>
        <button className="btn btn-gold" disabled={pw.length < 8} onClick={async () => { if (await patch({ newPassword: pw }, "Password changed. Send the new one to the player.")) setPw(""); }}>Reset password</button>
      </div>
      {msg && <p role="status" className={`text-sm font-semibold ${msg.ok ? "text-teal" : "text-danger"}`}>{msg.text}</p>}
    </div>
  );
}

function UserRow({ u, self }: { u: AdminUserRow; self: boolean }) {
  return (
    <li className="card space-y-3 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-bold">
            {u.username} {u.role === "admin" && <span className="rounded bg-violet px-1.5 text-xs">admin</span>} {u.banned && <span className="rounded bg-danger px-1.5 text-xs">banned</span>}
          </p>
          <p className="truncate text-sm text-ink">{u.email}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted">Credits</p>
          <p className="text-xl font-extrabold text-gold">{fmt(u.balance)}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Link href={`/admin/users/${u.id}`} className="chip hover:border-gold hover:text-ink">History: games and credits</Link>
        <Link href={`/admin?tab=chat&user=${u.id}`} className="chip hover:border-gold hover:text-ink">Open chat</Link>
      </div>
      <AdminUserActions u={u} self={self} />
    </li>
  );
}

export function AdminUsers({ users, selfId }: { users: AdminUserRow[]; selfId: number }) {
  if (users.length === 0) return <p className="card p-6 text-center text-muted">No player matches.</p>;
  return <ul className="space-y-3">{users.map((u) => <UserRow key={u.id} u={u} self={u.id === selfId} />)}</ul>;
}
