import type { Metadata } from "next";
import { getDb } from "@/db";
import { GameCard } from "@/components/GameCard";
import { LobbyControls } from "@/components/LobbyControls";
import { lobbyGames } from "@/lib/services";

export const metadata: Metadata = { title: "Games" };

export default async function GamesPage({ searchParams }: { searchParams: Promise<{ q?: string; cat?: string }> }) {
  const { q = "", cat = "All" } = await searchParams;
  const list = await lobbyGames(await getDb(), { q, category: cat });
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-extrabold">Games lobby</h1>
      <LobbyControls q={q} cat={cat} />
      {list.length === 0 ? (
        <p className="card p-8 text-center text-muted">No games match your search.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5" data-testid="game-grid">
          {list.map((g) => <GameCard key={g.id} game={g} />)}
        </div>
      )}
      <p className="text-xs text-muted">Only Lucky Spin is playable in this prototype. Other titles are placeholder listings managed from the admin dashboard.</p>
    </div>
  );
}
