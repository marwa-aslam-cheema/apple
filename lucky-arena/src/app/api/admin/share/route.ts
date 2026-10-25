import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { route } from "@/lib/api";
import { requireAdminApi } from "@/lib/session";
import { getShare, saveShare } from "@/lib/site";
import { bumpSiteVersion } from "@/lib/site-version";

const body = z.object({
  caption: z.string().trim().max(500, "The post text can be 500 characters at most."),
  image: z.string().trim().max(200).refine((v) => v === "" || /^\/api\/game-image\/\d+$/.test(v), "The picture must be an uploaded file."),
  bonus: z.string().trim().max(40, "The code can be 40 characters at most."),
  title: z.string().trim().max(40),
  intro: z.string().trim().max(200),
  codeLabel: z.string().trim().max(30),
  linkBase: z.string().trim().max(120).refine((v) => v === "" || /^https?:\/\/[^\s/]+(\/[^\s]*)?$/i.test(v), "The link address must start with https:// (for example https://myclub.com)"),
});

/** The admin edits the invite post: words, picture and free-chips code. */
export const PUT = route(async (req: Request) => {
  await requireAdminApi();
  const db = await getDb();
  await saveShare(db, body.parse(await req.json()));
  await bumpSiteVersion(db);
  return NextResponse.json(await getShare(db));
});
