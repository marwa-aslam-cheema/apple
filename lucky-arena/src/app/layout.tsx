import type { Metadata, Viewport } from "next";
import { PwaProvider } from "@/components/pwa";
import { Shell } from "@/components/Shell";
import { getDb } from "@/db";
import { getOpenSession } from "@/lib/game-sessions";
import { CurrencyProvider } from "@/components/Currency";
import { getTexts } from "@/lib/texts";
import { getSite } from "@/lib/site";
import { getCurrentUser } from "@/lib/session";
import "./globals.css";

const SITE_URL = process.env.SITE_URL ?? "http://localhost:3000";

export async function generateMetadata(): Promise<Metadata> {
  const { name } = await getSite(await getDb());
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: `${name} - Join and get free spins`, template: `%s - ${name}` },
    description: `Join ${name}, spin the welcome wheel for free and play casino games with friends.`,
    openGraph: { type: "website", siteName: name, title: `Join ${name} and get free spins`, description: "Spin the welcome wheel, climb the VIP ladder and play with friends." },
    twitter: { card: "summary_large_image", title: `Join ${name} and get free spins` },
    applicationName: name,
    appleWebApp: { capable: true, title: name, statusBarStyle: "black-translucent" },
  };
}
export const viewport: Viewport = { themeColor: "#0a0b1e", width: "device-width", initialScale: 1 };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  const site = await getSite(await getDb());
  const texts = await getTexts(await getDb());
  const open = user ? await getOpenSession(await getDb(), user.id) : null;
  return (
    <html lang="en">
      <body>
        <PwaProvider>
          <CurrencyProvider value={{ currency: texts.currency, currencyOne: texts.currencyOne }}>
          <Shell site={site} user={user ? { username: user.username, balance: user.balance, role: user.role, nickname: user.nickname, avatar: user.avatar, inGame: open ? { title: open.gameTitle, balance: open.balance, external: open.external } : null } : null}>{children}</Shell>
        </CurrencyProvider>
        </PwaProvider>
      </body>
    </html>
  );
}
