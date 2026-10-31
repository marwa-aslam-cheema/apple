import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { route } from "@/lib/api";
import { requireAdminApi } from "@/lib/session";
import { bumpSiteVersion } from "@/lib/site-version";
import { getTexts, saveTexts } from "@/lib/texts";

const body = z.object({
  currency: z.string().trim().min(1, "Write the word for credits.").max(20),
  currencyOne: z.string().trim().min(1, "Write the word for one credit.").max(20),
  msgTopup: z.string().trim().min(1, "The top-up message cannot be empty.").max(100),
  msgGame: z.string().trim().min(1).max(100).refine((v) => v.includes("{game}"), "Keep {game} in this message so the game's name shows."),
  msgSignup: z.string().trim().min(1, "The sign-up message cannot be empty.").max(100),
  googleBonus: z.coerce.number().int().min(0).max(1000),
});

export const PUT = route(async (req: Request) => {
  await requireAdminApi();
  const db = await getDb();
  await saveTexts(db, body.parse(await req.json()));
  await bumpSiteVersion(db);
  return NextResponse.json(await getTexts(db));
});
