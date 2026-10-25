import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { route } from "@/lib/api";
import { getPromo, savePromo } from "@/lib/promo";
import { requireAdminApi } from "@/lib/session";
import { bumpSiteVersion } from "@/lib/site-version";

const body = z.object({
  popup: z.object({
    enabled: z.boolean(),
    title: z.string().trim().min(1, "The popup needs a title.").max(40),
    text: z.string().trim().max(160),
    button: z.string().trim().min(1, "The popup button needs a name.").max(30),
    buttonMember: z.string().trim().min(1, "The button for existing players needs a name.").max(30),
  }),
  ticker: z.object({
    enabled: z.boolean(),
    lines: z.array(z.string().trim().min(1).max(100)).max(30),
  }),
});

export const PUT = route(async (req: Request) => {
  await requireAdminApi();
  const b = body.parse(await req.json());
  const db = await getDb();
  await savePromo(db, b.popup, b.ticker);
  await bumpSiteVersion(db);
  return NextResponse.json(await getPromo(db));
});
