import { ImageResponse } from "next/og";
import { SquarePost, WidePost } from "@/lib/share-art";

/** The shareable invite picture. ?code=ABC123 prints the player's code, ?format=wide gives the link-preview size, ?download=1 saves it. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const raw = (url.searchParams.get("code") ?? "").toUpperCase();
  const code = /^[A-Z0-9]{4,12}$/.test(raw) ? raw : undefined;
  const wide = url.searchParams.get("format") === "wide";
  // Show the public address when SITE_URL is set (the request host can be an internal name behind a proxy).
  const host = process.env.SITE_URL ? new URL(process.env.SITE_URL).host : url.host;
  const res = new ImageResponse(wide ? <WidePost code={code} host={host} /> : <SquarePost code={code} host={host} />, wide ? { width: 1200, height: 630 } : { width: 1080, height: 1080 });
  res.headers.set("Cache-Control", "public, max-age=3600");
  if (url.searchParams.get("download")) res.headers.set("Content-Disposition", `attachment; filename="lucky-arena-invite${code ? "-" + code : ""}.png"`);
  return res;
}
