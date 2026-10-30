import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { rateLimit, route } from "@/lib/api";
import { requireUserApi } from "@/lib/session";
import { saveChatImage } from "@/lib/services";

/** Upload one picture for chat (as a data: URL). The picture is sent afterwards with the message. */
export const POST = route(async (req: Request) => {
  const user = await requireUserApi();
  rateLimit(`chat-image:${user.id}`, 20, 60_000);
  const { dataUrl } = z.object({ dataUrl: z.string().max(2_200_000) }).parse(await req.json());
  return NextResponse.json({ imageId: await saveChatImage(await getDb(), user.id, dataUrl) }, { status: 201 });
});
