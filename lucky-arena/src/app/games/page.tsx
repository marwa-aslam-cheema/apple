import type { Metadata } from "next";
import { getDb } from "@/db";
import { GameCard } from "@/components/GameCard";
import { LobbyControls } from "@/components/LobbyControls";
import { getCurrentUser } from "@/lib/session";
import { lobbyGames } from "@/lib/services";

export const metadata: Metadata = { title: "Games" };

export default async function GamesPage({ searchParams }: { searchParams: Promise<{ q?: string; cat?: string }> }) {
  const { q = "", cat = "All" } = await searchParams;
  const user = await getCurrentUser();
  const list = await lobbyGames(await getDb(), { q, category: cat, admin: user?.role === "admin" });
  const needsCredits = !!user && user.role !== "admin" && user.balance === 0 && user.welcomeSpins === 0;
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-extrabold">Games lobby</h1>
      <LobbyControls q={q} cat={cat} />
      {list.length === 0 ? (
        <p className="card p-8 text-center text-muted">No games match your search.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5" data-testid="game-grid">
          {list.map((g) => <GameCard key={g.id} game={g} needsCredits={needsCredits} />)}
        </div>
      )}
    </div>
  );
}
