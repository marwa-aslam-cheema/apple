"use client";

import Link from "next/link";
import type { Game } from "@/db/schema";

function Glyph({ category }: { category: string }) {
  const c = "rgba(255,255,255,0.9)";
  switch (category) {
    case "Wheel":
      return (<g stroke={c} strokeWidth="3" fill="none"><circle cx="60" cy="60" r="26" />{[0, 45, 90, 135].map((a) => <line key={a} x1="60" y1="34" x2="60" y2="86" transform={`rotate(${a} 60 60)`} />)}</g>);
    case "Cards":
      return (<g fill="none" stroke={c} strokeWidth="3"><rect x="36" y="32" width="34" height="48" rx="6" transform="rotate(-10 53 56)" /><rect x="52" y="34" width="34" height="48" rx="6" transform="rotate(8 69 58)" fill="rgba(255,255,255,0.18)" /></g>);
    case "Arcade":
      return (<g fill="none" stroke={c} strokeWidth="3"><rect x="30" y="46" width="60" height="30" rx="14" /><path d="M46 54v14M39 61h14" /><circle cx="72" cy="58" r="3" fill={c} /><circle cx="80" cy="66" r="3" fill={c} /></g>);
    case "Puzzle":
      return (<g fill="none" stroke={c} strokeWidth="3"><rect x="34" y="34" width="22" height="22" rx="4" /><rect x="64" y="34" width="22" height="22" rx="4" fill="rgba(255,255,255,0.18)" /><rect x="34" y="64" width="22" height="22" rx="4" fill="rgba(255,255,255,0.18)" /><rect x="64" y="64" width="22" height="22" rx="4" /></g>);
    default:
      return <text x="60" y="80" textAnchor="middle" fontSize="60" fontWeight="800" fill={c}>?</text>;
  }
}

export function GameArt({ hue, category }: { hue: number; category: string }) {
  const id = `ga-${hue}-${category}`;
  return (
    <svg viewBox="0 0 120 120" className="h-full w-full" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={`hsl(${hue} 80% 55%)`} />
          <stop offset="1" stopColor={`hsl(${(hue + 50) % 360} 70% 25%)`} />
        </linearGradient>
      </defs>
      <rect width="120" height="120" fill={`url(#${id})`} />
      <circle cx="104" cy="14" r="30" fill="rgba(255,255,255,0.08)" />
      <circle cx="10" cy="110" r="34" fill="rgba(0,0,0,0.18)" />
      <Glyph category={category} />
    </svg>
  );
}

/** Out of credits? Tapping a game quietly sends "I want credits in <game>" to the admin chat (the server double-checks). */
function askForCredits(gameId: number) {
  void fetch("/api/credits/request", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ gameId }), keepalive: true })
    .then(() => window.dispatchEvent(new Event("la:open-chat"))) // show the player the message that was sent
    .catch(() => undefined);
}

/** A linked game needs the player's username for it first: ask the admin, and keep the player in the chat meanwhile. */
function askForAccount(gameId: number) {
  void fetch("/api/games/request-account", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ gameId }), keepalive: true })
    .then(() => window.dispatchEvent(new Event("la:open-chat")))
    .catch(() => undefined);
}

export function GameCard({ game, needsCredits = false, needsAccount = false }: { game: Game; needsCredits?: boolean; needsAccount?: boolean }) {
  const onOpen = needsCredits ? () => askForCredits(game.id) : undefined;
  const inner = (
    <>
      <div className="relative aspect-square overflow-hidden rounded-xl">
        {game.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={game.image} alt="" loading="lazy" referrerPolicy="no-referrer" className="h-full w-full object-cover" />
        ) : (
          <GameArt hue={game.hue} category={game.category} />
        )}
        {game.featured && <span className="hot-badge absolute left-2 top-2"><span className="flame" aria-hidden="true">🔥</span>HOT</span>}
        <span className={`absolute bottom-2 right-2 rounded-full px-2 py-0.5 text-[10px] font-bold ${game.playable || game.link || game.adminLink ? "bg-teal text-black" : "bg-black/60 text-muted"}`}>
          {game.playable || game.link || game.adminLink ? "PLAY" : "SOON"}
        </span>
      </div>
      <div className="px-1 pb-1 pt-2">
        <h3 className="truncate text-sm font-bold">{game.title}</h3>
        <p className="text-xs text-muted">{game.category}</p>
      </div>
    </>
  );
  const cls = `card block p-2 transition-transform hover:-translate-y-0.5 ${game.featured ? "hot-card" : ""}`;
  // Admins who set a back-office link land there (the game's own login); players only ever get the player link.
  const href = game.adminLink || (game.link ? `/play/${game.slug}` : "");
  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={cls} title={game.description} onClick={(e) => {
        if (needsAccount && !game.adminLink) { e.preventDefault(); askForAccount(game.id); return; } onOpen?.(); setTimeout(() => window.dispatchEvent(new Event("la:wallet-refresh")), 800); }}>{inner}</a>
    );
  }
  return game.playable ? (
    <Link href="/spin" className={cls} title={game.description} onClick={onOpen}>{inner}</Link>
  ) : needsCredits ? (
    <button type="button" className={`${cls} w-full text-left`} title={game.description} onClick={onOpen}>{inner}</button>
  ) : (
    <div className={`${cls} opacity-90`} title={game.description}>{inner}</div>
  );
}
