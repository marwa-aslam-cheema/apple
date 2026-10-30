import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { route } from "@/lib/api";
import { getSiteVersion } from "@/lib/site-version";

/** Cheap number the open pages poll: it changes when the admin edits games, promotions, the wheel or social links. */
export const GET = route(async () => NextResponse.json({ v: await getSiteVersion(await getDb()) }, { headers: { "Cache-Control": "no-store" } }));
