import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { route } from "@/lib/api";
import { getRegularBonus, saveRegularBonus } from "@/lib/promo";
import { requireAdminApi } from "@/lib/session";
import { bumpSiteVersion } from "@/lib/site-version";

const body = z.object({
  enabled: z.boolean(),
  title: z.string().trim().min(1, "The Regular Bonus needs a title.").max(40),
  text: z.string().trim().max(160),
  button: z.string().trim().min(1, "The button needs a name.").max(30),
  message: z.string().trim().min(1, "The message sent to your chat cannot be empty.").max(100),
});

/** The admin edits the "Regular Bonus" offer shown to players who have already claimed the sign-up bonus. */
export const PUT = route(async (req: Request) => {
  await requireAdminApi();
  const db = await getDb();
  await saveRegularBonus(db, body.parse(await req.json()));
  await bumpSiteVersion(db);
  return NextResponse.json(await getRegularBonus(db));
});
