import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/AuthForm";
import { googleEnabled } from "@/lib/google";
import { mailEnabled } from "@/lib/mail";
import { safeNext } from "@/lib/safe-next";
import { getCurrentUser } from "@/lib/session";
import { getDb } from "@/db";
import { fillCaption, getShare, getSite } from "@/lib/site";

export async function generateMetadata({ searchParams }: { searchParams: Promise<{ ref?: string }> }): Promise<Metadata> {
  const { ref } = await searchParams;
  const code = ref && /^[A-Za-z0-9]{4,12}$/.test(ref) ? ref.toUpperCase() : undefined;
  const db = await getDb();
  const [share, site] = [await getShare(db), await getSite(db)];
  // the admin's own picture and words win over the automatic ones
  const image = share.image || `/invite/image?format=wide${code ? `&code=${code}` : ""}`;
  const text = fillCaption(share.caption, { site: site.name, code: code ?? "", bonus: share.bonus });
  return {
    title: "Join and get free spins",
    openGraph: { title: `Join ${site.name} and get free spins`, description: text, images: [{ url: image, width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image", description: text, images: [image] },
  };
}

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ ref?: string; next?: string }> }) {
  const { ref, next: rawNext } = await searchParams;
  const next = safeNext(rawNext);
  if (await getCurrentUser()) redirect(next ?? "/");
  return <AuthForm mode="register" refCode={ref?.slice(0, 20).toUpperCase()} next={next} google={googleEnabled()} mail={mailEnabled()} />;
}
