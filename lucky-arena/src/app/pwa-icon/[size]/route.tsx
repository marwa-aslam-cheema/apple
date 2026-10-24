import { ImageResponse } from "next/og";
import { IconArt } from "@/lib/pwa-art";

/** /pwa-icon/192 and /pwa-icon/512 (add ?maskable=1 for the Android "adaptive" version with extra padding). */
export async function GET(req: Request, ctx: { params: Promise<{ size: string }> }) {
  const n = Number((await ctx.params).size);
  const size = n === 192 ? 192 : 512;
  const maskable = new URL(req.url).searchParams.has("maskable");
  const res = new ImageResponse(<IconArt size={size} scale={maskable ? 0.6 : 0.82} />, { width: size, height: size });
  res.headers.set("Cache-Control", "public, max-age=86400");
  return res;
}
