import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { route } from "@/lib/api";
import { requireAdminApi } from "@/lib/session";
import { chatConversations } from "@/lib/services";

export const GET = route(async () => {
  await requireAdminApi();
  return NextResponse.json({ conversations: await chatConversations(await getDb()) });
});
