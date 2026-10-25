import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/AuthForm";
import { googleEnabled } from "@/lib/google";
import { safeNext } from "@/lib/safe-next";
import { getCurrentUser } from "@/lib/session";

export async function generateMetadata({ searchParams }: { searchParams: Promise<{ ref?: string }> }): Promise<Metadata> {
  const { ref } = await searchParams;
  const code = ref && /^[A-Za-z0-9]{4,12}$/.test(ref) ? ref.toUpperCase() : undefined;
  const image = `/invite/image?format=wide${code ? `&code=${code}` : ""}`;
  return {
    title: "Join and get free spins",
    openGraph: { title: "Join Lucky Arena and get free spins", images: [{ url: image, width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image", images: [image] },
  };
}

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ ref?: string; next?: string }> }) {
  const { ref, next: rawNext } = await searchParams;
  const next = safeNext(rawNext);
  if (await getCurrentUser()) redirect(next ?? "/");
  return <AuthForm mode="register" refCode={ref?.slice(0, 20).toUpperCase()} next={next} google={googleEnabled()} />;
}
