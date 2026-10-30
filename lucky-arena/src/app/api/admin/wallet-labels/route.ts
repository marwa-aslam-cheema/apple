import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { route } from "@/lib/api";
import { requireAdminApi } from "@/lib/session";
import { bumpSiteVersion } from "@/lib/site-version";
import { getWalletLabels, saveWalletLabels } from "@/lib/wallet-labels";

const body = z.object({ topup: z.string().trim().max(30), reward: z.string().trim().max(30) });

export const PUT = route(async (req: Request) => {
  await requireAdminApi();
  const db = await getDb();
  await saveWalletLabels(db, body.parse(await req.json()));
  await bumpSiteVersion(db);
  return NextResponse.json(await getWalletLabels(db));
});
