import { ImageResponse } from "next/og";
import { WidePost } from "@/lib/share-art";
import { headers } from "next/headers";

export const alt = "Lucky Arena: join and get free spins";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  const host = (await headers()).get("host") ?? "luckyarena";
  return new ImageResponse(<WidePost host={host} />, size);
}
