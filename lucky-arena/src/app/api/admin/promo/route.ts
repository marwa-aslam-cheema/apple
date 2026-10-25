import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { route } from "@/lib/api";
import { DEFAULT_TICKER, getPromo, savePromo } from "@/lib/promo";
import { requireAdminApi } from "@/lib/session";
import { bumpSiteVersion } from "@/lib/site-version";

const body = z.object({
  popup: z.object({
    enabled: z.boolean(),
    title: z.string().trim().min(1, "The popup needs a title.").max(40),
    text: z.string().trim().max(160),
    button: z.string().trim().min(1, "The popup button needs a name.").max(30),
    buttonMember: z.string().trim().min(1, "The button for existing players needs a name.").max(30),
    timerHours: z.coerce.number().int().min(0).max(720),
  }),
  ticker: z.object({
    enabled: z.boolean(),
    lines: z.array(z.string().trim().min(1).max(100)).max(30),
    showWins: z.boolean(),
    winTemplate: z.string().trim().max(100).default(""),
    minPrize: z.coerce.number().int().min(1).max(100000),
  }).refine((t) => !t.showWins || (t.winTemplate.length > 0 && t.winTemplate.includes("{prize}")), { message: "Real wins are on: keep {prize} in the sentence so the amount shows.", path: ["winTemplate"] }),
});

export const PUT = route(async (req: Request) => {
  await requireAdminApi();
  const b = body.parse(await req.json());
  const db = await getDb();
  await savePromo(db, b.popup, { ...b.ticker, winTemplate: b.ticker.winTemplate || DEFAULT_TICKER.winTemplate });
  await bumpSiteVersion(db);
  return NextResponse.json(await getPromo(db));
});
