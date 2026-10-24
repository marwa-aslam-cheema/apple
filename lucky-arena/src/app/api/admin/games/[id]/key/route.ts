import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { route } from "@/lib/api";
import { regenerateApiKey } from "@/lib/game-sessions";
import { requireAdminApi } from "@/lib/session";

/** Make a new API key for a game (the old one stops working). */
export const POST = route(async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
  await requireAdminApi();
  return NextResponse.json({ apiKey: await regenerateApiKey(await getDb(), Number((await params).id)) });
});
