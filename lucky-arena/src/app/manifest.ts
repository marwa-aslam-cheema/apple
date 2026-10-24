import type { MetadataRoute } from "next";
import { getDb } from "@/db";
import { getSite } from "@/lib/site";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const { name } = await getSite(await getDb());
  return {
    name,
    short_name: name.slice(0, 12),
    description: "Spin the welcome wheel and play casino games with friends. Play-money fun, 18+.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0a0509",
    theme_color: "#0a0509",
    categories: ["games", "entertainment"],
    icons: [
      { src: "/pwa-icon/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/pwa-icon/512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/pwa-icon/512?maskable=1", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
