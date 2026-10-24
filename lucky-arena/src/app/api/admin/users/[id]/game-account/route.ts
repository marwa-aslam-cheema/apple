import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { route } from "@/lib/api";
import { removeGameAccount, setGameAccount } from "@/lib/game-sessions";
import { requireAdminApi } from "@/lib/session";
import { bumpSiteVersion } from "@/lib/site-version";

const body = z.object({ gameId: z.coerce.number().int(), username: z.string().optional() });

/** Save (PUT) or forget (DELETE) the username a player has inside a game's own login. */
export const PUT = route(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  await requireAdminApi();
  const b = body.parse(await req.json());
  const db = await getDb();
  await setGameAccount(db, Number((await params).id), b.gameId, b.username ?? "");
  await bumpSiteVersion(db); // open player pages notice the new username and stop asking for it
  return NextResponse.json({ ok: true });
});

export const DELETE = route(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  await requireAdminApi();
  const b = body.parse(await req.json());
  const db = await getDb();
  await removeGameAccount(db, Number((await params).id), b.gameId);
  await bumpSiteVersion(db);
  return NextResponse.json({ ok: true });
});
