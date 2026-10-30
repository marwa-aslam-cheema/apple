import { getDb } from "@/db";
import { route } from "@/lib/api";
import { requireUserApi } from "@/lib/session";
import { readChatImage } from "@/lib/services";

export const GET = route(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const user = await requireUserApi();
  const img = await readChatImage(await getDb(), Number((await ctx.params).id), user);
  return new Response(new Uint8Array(img.bytes), {
    headers: {
      "Content-Type": img.mime,
      "Cache-Control": "private, max-age=86400",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
    },
  });
});
