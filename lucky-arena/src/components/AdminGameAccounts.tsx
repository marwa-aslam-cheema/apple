"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export interface GameOption { id: number; title: string }
export interface GameAccountRow { gameId: number; title: string; username: string }

/** The name a player uses inside a game's own login. Saved here so it travels with the player to that game. */
export function AdminGameAccounts({ userId, games, accounts }: { userId: number; games: GameOption[]; accounts: GameAccountRow[] }) {
  const router = useRouter();
  const [gameId, setGameId] = useState(games[0]?.id ?? 0);
  const [username, setUsername] = useState("");
  const [msg, setMsg] = useState("");

  async function call(method: "PUT" | "DELETE", body: object) {
    const res = await fetch(`/api/admin/users/${userId}/game-account`, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json();
    setMsg(res.ok ? "Saved." : data.error ?? "Failed.");
    if (res.ok) { setUsername(""); router.refresh(); }
  }

  return (
    <div className="space-y-3">
      {accounts.length === 0 ? <p className="text-sm text-muted">No game usernames saved yet.</p> : (
        <ul className="divide-y divide-line text-sm">
          {accounts.map((a) => (
            <li key={a.gameId} className="flex items-center justify-between gap-2 py-2">
              <span><b>{a.title}</b>: {a.username}</span>
              <button className="chip hover:border-danger" onClick={() => call("DELETE", { gameId: a.gameId })}>Remove</button>
            </li>
          ))}
        </ul>
      )}
      {games.length > 0 && (
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-xs font-semibold text-muted">Game
            <select className="input mt-1" value={gameId} onChange={(e) => setGameId(Number(e.target.value))}>{games.map((g) => <option key={g.id} value={g.id}>{g.title}</option>)}</select>
          </label>
          <label className="min-w-0 flex-1 text-xs font-semibold text-muted">Username in that game
            <input className="input mt-1" value={username} maxLength={60} onChange={(e) => setUsername(e.target.value)} />
          </label>
          <button className="btn btn-violet" disabled={!username.trim()} onClick={() => call("PUT", { gameId, username })}>Save</button>
        </div>
      )}
      {msg && <p role="status" className="text-sm text-muted">{msg}</p>}
    </div>
  );
}
