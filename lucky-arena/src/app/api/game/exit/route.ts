import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { route } from "@/lib/api";
import { exitGame } from "@/lib/game-sessions";
import { requireUserApi } from "@/lib/session";

/** Leave the game: whatever is left in it goes back to the wallet. */
export const POST = route(async () => {
  const user = await requireUserApi();
  return NextResponse.json({ result: await exitGame(await getDb(), user.id) });
});
