import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { route } from "@/lib/api";
import { requireAdminApi } from "@/lib/session";
import { getSite, saveSite } from "@/lib/site";
import { bumpSiteVersion } from "@/lib/site-version";

const body = z.object({
  name: z.string().trim().max(30, "The site name can be 30 characters at most."),
  logo: z.string().trim().max(200).refine((v) => v === "" || /^\/api\/game-image\/\d+$/.test(v), "Logo must be an uploaded picture."),
});

/** The admin changes the site's name and logo. */
export const PUT = route(async (req: Request) => {
  await requireAdminApi();
  const db = await getDb();
  await saveSite(db, body.parse(await req.json()));
  await bumpSiteVersion(db);
  return NextResponse.json(await getSite(db));
});
