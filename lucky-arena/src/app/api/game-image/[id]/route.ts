import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { chatImages, games, walletOptions } from "@/db/schema";
import { AppError } from "@/lib/services";
import { route } from "@/lib/api";

/** Pictures the admin uploaded for game cards and wallet cards. Public, but only pictures that are actually in use. */
export const GET = route(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const id = Number((await ctx.params).id);
  if (!Number.isInteger(id)) throw new AppError("not_found", "Picture not found.", 404);
  const db = await getDb();
  const [used] = await db.select({ id: games.id }).from(games).where(eq(games.image, `/api/game-image/${id}`)).limit(1);
  const [usedByWallet] = used ? [] : await db.select({ id: walletOptions.id }).from(walletOptions).where(eq(walletOptions.image, `/api/game-image/${id}`)).limit(1);
  const [img] = used || usedByWallet ? await db.select().from(chatImages).where(eq(chatImages.id, id)) : [];
  if (!img) throw new AppError("not_found", "Picture not found.", 404);
  return new Response(new Uint8Array(Buffer.from(img.data, "base64")), {
    headers: { "Content-Type": img.mime, "Cache-Control": "public, max-age=3600", "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "default-src 'none'; sandbox" },
  });
});
