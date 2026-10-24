"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { fmt } from "@/lib/format";
import { currentTrackName, musicPref, setMusicPref, startMusic, stopMusic, unlockAudio } from "@/lib/music";
import { ChatWidget } from "./ChatWidget";
import { Icon } from "./Icon";
import { ChipIcon, Logo } from "./Logo";

export interface ShellUser {
  username: string;
  balance: number;
  role: string;
}

const NAV = [
  { href: "/", label: "Home", icon: "home" },
  { href: "/games", label: "Games", icon: "grid" },
  { href: "/spin", label: "Lucky Spin", icon: "wheel" },
  { href: "/promotions", label: "Promotions", icon: "gift" },
  { href: "/vip", label: "VIP Club", icon: "crown" },
  { href: "/referral", label: "Referral", icon: "users" },
  { href: "/wallet", label: "Wallet", icon: "wallet" },
  { href: "/chat", label: "Support Chat", icon: "chat" },
  { href: "/profile", label: "Profile", icon: "user" },
];
const TABS = ["/", "/games", "/spin", "/wallet", "/profile"];

export function Shell({ user, children }: { user: ShellUser | null; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [musicOn, setMusicOn] = useState(false);
  const [trackName, setTrackName] = useState("");
  const signedIn = !!user;

  useEffect(() => setOpen(false), [pathname]);

  // Background music plays only while signed in. Browsers need a tap first, so a fresh page load starts it on the first touch.
  useEffect(() => {
    if (!signedIn) {
      stopMusic();
      setMusicOn(false);
      return;
    }
    const on = musicPref();
    setMusicOn(on);
    setTrackName(currentTrackName());
    if (!on) return;
    if (navigator.userActivation?.hasBeenActive) startMusic();
    const first = () => startMusic();
    window.addEventListener("pointerdown", first, { once: true });
    window.addEventListener("keydown", first, { once: true });
    return () => {
      window.removeEventListener("pointerdown", first);
      window.removeEventListener("keydown", first);
    };
  }, [signedIn]);

  function toggleMusic() {
    const next = !musicOn;
    setMusicOn(next);
    setMusicPref(next);
    if (next) {
      unlockAudio();
      startMusic();
    } else stopMusic();
  }
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const items = user?.role === "admin" ? [...NAV, { href: "/admin", label: "Admin", icon: "shield" }] : NAV;
  const active = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  async function logout() {
    stopMusic();
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  const nav = (
    <nav aria-label="Main" className="flex flex-col gap-1 p-3">
      {items.map((i) => (
        <Link
          key={i.href}
          href={i.href}
          aria-current={active(i.href) ? "page" : undefined}
          className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition-colors ${
            active(i.href) ? "bg-gradient-to-r from-[#e0245a] to-[#b3123f] text-white shadow-[0_0_18px_rgba(224,36,90,0.45)]" : "text-muted hover:bg-surface-2 hover:text-ink"
          }`}
        >
          <Icon name={i.icon} />
          {i.label}
        </Link>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen lg:pl-64">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-line bg-gradient-to-b from-[#26112a] via-[#150a18] to-[#0b0509] shadow-[inset_-1px_0_0_rgba(255,207,74,0.12)] lg:flex">
        <div className="p-5"><Link href="/" aria-label="Lucky Arena home"><Logo /></Link></div>
        <div className="flex-1 overflow-y-auto">{nav}</div>
        <p className="p-4 text-xs leading-relaxed text-muted">Demo credits only. No real money, no cash value.</p>
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <button className="absolute inset-0 bg-black/60" aria-label="Close menu" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 flex w-72 max-w-[85%] flex-col bg-surface shadow-2xl">
            <div className="flex items-center justify-between p-4">
              <Logo />
              <button className="rounded-lg p-2 hover:bg-surface-2" onClick={() => setOpen(false)} aria-label="Close menu"><Icon name="x" /></button>
            </div>
            <div className="flex-1 overflow-y-auto">{nav}</div>
          </div>
        </div>
      )}

      {/* Top bar */}
      <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-line bg-bg/85 px-4 py-3 backdrop-blur">
        <button className="rounded-lg p-2 hover:bg-surface-2 lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu" aria-expanded={open}>
          <Icon name="menu" />
        </button>
        <Link href="/" className="lg:hidden" aria-label="Lucky Arena home"><Logo /></Link>
        <div className="ml-auto flex items-center gap-2">
          {user ? (
            <>
              <button
                onClick={toggleMusic}
                aria-pressed={musicOn}
                aria-label={musicOn ? "Turn sound off" : "Turn sound on"}
                title={musicOn ? `Sound on (music: ${trackName})` : "Sound off"}
                className={`rounded-xl border bg-surface p-2.5 ${musicOn ? "border-gold text-gold" : "border-line text-muted"}`}
              >
                <Icon name={musicOn ? "music" : "mute"} className="h-5 w-5" />
              </button>
              <Link href="/wallet" className="flex items-center gap-2 rounded-xl border border-gold/60 bg-surface px-3 py-2 text-sm font-extrabold text-gold shadow-[0_0_14px_rgba(255,207,74,0.18)]" aria-label="Wallet balance">
                <ChipIcon size={20} />
                <span data-testid="balance">{fmt(user.balance)}</span>
              </Link>
              <button className="btn btn-ghost hidden sm:inline-flex" onClick={logout}>Sign out</button>
            </>
          ) : (
            <>
              <Link href="/login" className="btn btn-ghost">Log in</Link>
              <Link href="/register" className="btn btn-gold">Sign up</Link>
            </>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-28 pt-6 lg:pb-12">{children}</main>

      <footer className="mx-auto max-w-6xl px-4 pb-28 text-xs leading-relaxed text-muted lg:pb-10">
        <p>
          Lucky Arena is a prototype for demonstration. All credits are virtual, cannot be bought, withdrawn or exchanged, and have
          no cash value. This site involves no real-money gambling. 18+ recommended.
        </p>
      </footer>

      {user && !pathname.startsWith("/chat") && <ChatWidget role={user.role} />}

      {/* Mobile bottom tabs */}
      <nav aria-label="Quick" className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
        {NAV.filter((n) => TABS.includes(n.href)).map((i) => (
          <Link
            key={i.href}
            href={i.href}
            aria-current={active(i.href) ? "page" : undefined}
            className={`flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-semibold ${active(i.href) ? "text-gold" : "text-muted"}`}
          >
            <Icon name={i.icon} className="h-5 w-5" />
            {i.label === "Lucky Spin" ? "Spin" : i.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
