import type { Metadata, Viewport } from "next";
import { Shell } from "@/components/Shell";
import { getCurrentUser } from "@/lib/session";
import "./globals.css";

const SITE_URL = process.env.SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "Lucky Arena - Join and get free spins", template: "%s - Lucky Arena" },
  description: "Join Lucky Arena, spin the welcome wheel for free and play with friends. Virtual demo credits only, no real money.",
  openGraph: { type: "website", siteName: "Lucky Arena", title: "Join Lucky Arena and get free spins", description: "Spin the welcome wheel, climb the VIP ladder and play with friends. Virtual demo credits only." },
  twitter: { card: "summary_large_image", title: "Join Lucky Arena and get free spins" },
};
export const viewport: Viewport = { themeColor: "#0a0b1e", width: "device-width", initialScale: 1 };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  return (
    <html lang="en">
      <body>
        <Shell user={user ? { username: user.username, balance: user.balance, role: user.role } : null}>{children}</Shell>
      </body>
    </html>
  );
}
