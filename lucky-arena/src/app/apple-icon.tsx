import { ImageResponse } from "next/og";
import { IconArt } from "@/lib/pwa-art";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(<IconArt size={180} scale={0.82} />, size);
}
