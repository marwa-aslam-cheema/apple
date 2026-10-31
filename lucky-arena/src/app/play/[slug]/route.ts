import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { games } from "@/db/schema";
import { buildLaunchUrl, enterGame, listGameAccounts } from "@/lib/game-sessions";
import { getCurrentUser } from "@/lib/session";
import { requestGameAccount, zeroToldGameBalance } from "@/lib/services";

/**
 * Opening a game that lives on another address. The player's credits move into the game (the site shows 0 meanwhile)
 * and the player is sent to the game with a session token. Admins are not sent here: they use the admin link.
 */
export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const base = new URL(req.url).origin;
  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect(new URL(`/login?next=${encodeURIComponent(`/play/${slug}`)}`, base)); // sign in or sign up first, then straight to the game
  const db = await getDb();
  const [game] = await db.select().from(games).where(and(eq(games.slug, slug), eq(games.active, true)));
  if (!game || !game.link) return NextResponse.redirect(new URL("/games", base));
  let target = game.link;
  if (user.role !== "admin") {
    // No username for this game yet: nobody gets in. The admin is asked to set one up, and the player waits in the chat.
    const acct = (await listGameAccounts(db, user.id)).find((a) => a.gameId === game.id);
    if (!acct) {
      await requestGameAccount(db, user.id, game.id);
      return NextResponse.redirect(new URL(`/games?waiting=${encodeURIComponent(game.slug)}`, base));
    }
    const session = await enterGame(db, user.id, game.id);
    await zeroToldGameBalance(db, user.id, game.id); // the green balance in the chat goes to 0
    if (session) {
      target = buildLaunchUrl(game.link, { origin: base, token: session.token, player: user.username, gameUsername: acct?.username ?? null, balance: session.balance });
    }
  }
  return NextResponse.redirect(target);
}
