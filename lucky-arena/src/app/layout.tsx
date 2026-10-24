import type { Metadata, Viewport } from "next";
import { Shell } from "@/components/Shell";
import { getCurrentUser } from "@/lib/session";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Lucky Arena - Demo Gaming Lobby", template: "%s - Lucky Arena" },
  description: "A prototype gaming lobby with a lucky spin wheel, VIP club and referrals. Virtual demo credits only.",
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
