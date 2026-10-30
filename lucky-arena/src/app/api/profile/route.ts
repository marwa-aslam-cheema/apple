import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { chatImages, users } from "@/db/schema";
import { AppError } from "@/lib/services";
import { rateLimit, route } from "@/lib/api";
import { requireUserApi } from "@/lib/session";

const body = z.object({
  nickname: z.string().trim().max(20, "The nickname can be 20 characters at most.").refine((v) => !/[\u0000-\u001f<>]/.test(v), "That nickname has characters that are not allowed."),
  avatar: z.string().trim().max(200).refine((v) => v === "" || /^\/api\/game-image\/\d+$/.test(v), "Pick a picture file."),
});

/** The player edits their own nickname and profile picture. */
export const PATCH = route(async (req: Request) => {
  const user = await requireUserApi();
  rateLimit(`profile:${user.id}`, 20, 60_000);
  const b = body.parse(await req.json());
  const db = await getDb();
  if (b.avatar) {
    // Only a picture this player uploaded themselves.
    const [img] = await db.select({ id: chatImages.id }).from(chatImages).where(and(eq(chatImages.id, Number(b.avatar.split("/").pop())), eq(chatImages.ownerId, user.id)));
    if (!img) throw new AppError("invalid", "That picture cannot be used.");
  }
  await db.update(users).set({ nickname: b.nickname, avatar: b.avatar }).where(eq(users.id, user.id));
  return NextResponse.json({ ok: true, nickname: b.nickname, avatar: b.avatar });
});
