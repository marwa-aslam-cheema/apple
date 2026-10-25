"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { fmt } from "@/lib/format";
import { currentTrackName, musicPref, setMusicPref, startMusic, stopMusic, unlockAudio } from "@/lib/music";
import { ChatWidget } from "./ChatWidget";
import { InstallBanner, useInstall } from "./pwa";
import { LiveRefresh } from "./LiveRefresh";
import { PromoPopup } from "./PromoPopup";
import { Ticker } from "./Ticker";
import { PushToggle } from "./PushToggle";
import { SocialBar } from "./SocialBar";
import { Icon } from "./Icon";
import { ChipIcon, Logo } from "./Logo";

export interface ShellUser {
  username: string;
  balance: number;
  role: string;
  nickname: string;
  avatar: string;
  /** Credits are inside a game: the wallet reads 0 until the player leaves it. */
  inGame: { title: string; balance: number; external: boolean } | null;
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

export function Shell({ user, site, children }: { user: ShellUser | null; site: { name: string; logo: string }; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const pwa = useInstall();
  const [open, setOpen] = useState(false);
  const [musicOn, setMusicOn] = useState(false);
  const [trackName, setTrackName] = useState("");
  const signedIn = !!user;
  const [chatUnread, setChatUnread] = useState(0);
  useEffect(() => {
    const on = (e: Event) => setChatUnread((e as CustomEvent<number>).detail);
    window.addEventListener("la:chat-unread", on);
    return () => window.removeEventListener("la:chat-unread", on);
  }, []);

  useEffect(() => setOpen(false), [pathname]);

  // Credits inside a game on this site come back when the player leaves that page; a game on another address
  // is left by tapping the banner (or on its own, when the game reports it is done or the session runs out).
  const inGame = user?.inGame ?? null;
  const lastPath = useRef(pathname);
  // Opening the wallet with nothing in it quietly tells the admin "I need a top-up" (the server does not repeat it while it is unanswered).
  function walletTap() {
    if (!user || user.role === "admin" || user.balance > 0 || inGame) return;
    void fetch("/api/credits/request", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}", keepalive: true }).catch(() => undefined);
  }
  async function leaveGame() {
    await fetch("/api/game/exit", { method: "POST" }).catch(() => undefined);
    router.refresh();
  }
  useEffect(() => {
    const was = lastPath.current;
    lastPath.current = pathname;
    if (inGame && !inGame.external && was.startsWith("/spin") && !pathname.startsWith("/spin")) void leaveGame();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);
  useEffect(() => {
    if (!inGame) return;
    const refresh = () => document.visibilityState === "visible" && router.refresh();
    const beat = setInterval(() => void fetch("/api/game/heartbeat", { method: "POST" }), 5 * 60_000);
    const bye = () => !inGame.external && navigator.sendBeacon("/api/game/exit");
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("la:wallet-refresh", refresh);
    window.addEventListener("pagehide", bye);
    return () => {
      clearInterval(beat);
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("la:wallet-refresh", refresh);
      window.removeEventListener("pagehide", bye);
    };
  }, [inGame, router]);

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
      {!pwa.installed && (
        <button
          onClick={() => { setOpen(false); void pwa.install(); }}
          className="mt-2 flex items-center gap-3 rounded-xl border border-dashed border-gold/60 px-3 py-3 text-left text-sm font-semibold text-gold transition-colors hover:bg-surface-2"
        >
          <Icon name="download" />
          Install app
        </button>
      )}
      {user && <PushToggle className="mt-2" />}
      <SocialBar className="mt-3 border-t border-line px-3 pt-3" />
    </nav>
  );

  return (
    <div className="min-h-screen overflow-x-clip lg:pl-64">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-line bg-gradient-to-b from-[#26112a] via-[#150a18] to-[#0b0509] shadow-[inset_-1px_0_0_rgba(255,207,74,0.12)] lg:flex">
        <div className="p-5"><Link href="/" aria-label={`${site.name} home`}><Logo name={site.name} logo={site.logo} /></Link></div>
        <div className="flex-1 overflow-y-auto">{nav}</div>
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <button className="absolute inset-0 bg-black/60" aria-label="Close menu" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 flex w-72 max-w-[85%] flex-col bg-surface shadow-2xl">
            <div className="flex items-center justify-between p-4">
              <Logo name={site.name} logo={site.logo} />
              <button className="rounded-lg p-2 hover:bg-surface-2" onClick={() => setOpen(false)} aria-label="Close menu"><Icon name="x" /></button>
            </div>
            <div className="flex-1 overflow-y-auto">{nav}</div>
          </div>
        </div>
      )}

      {/* Top bar */}
      <header className="sticky top-0 z-20 flex items-center gap-2 border-b border-line bg-bg/85 px-3 py-3 backdrop-blur sm:gap-3 sm:px-4">
        <button className="rounded-lg p-2 hover:bg-surface-2 lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu" aria-expanded={open}>
          <Icon name="menu" />
        </button>
        <Link href="/" className="lg:hidden" aria-label={`${site.name} home`}><Logo name={site.name} logo={site.logo} /></Link>
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
              <Link href="/profile" aria-label="Your profile" title={user.nickname || user.username} className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-gold/60 bg-gradient-to-br from-violet to-pink text-sm font-extrabold sm:h-10 sm:w-10">
                {user.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={user.avatar} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span aria-hidden="true">{(user.nickname || user.username)[0]?.toUpperCase()}</span>
                )}
              </Link>
              <Link href="/wallet" onClick={walletTap} className="flex items-center gap-1.5 rounded-xl border border-gold/60 bg-surface px-2.5 py-2 text-sm font-extrabold sm:gap-2 sm:px-3 text-gold shadow-[0_0_14px_rgba(255,207,74,0.18)]" aria-label="Wallet balance">
                <ChipIcon size={20} />
                <span data-testid="balance">{fmt(user.balance)}</span>
              </Link>
              {inGame && (
                <span className="rounded-xl border border-teal/60 bg-surface px-2.5 py-2 text-xs font-bold text-teal" data-testid="game-balance" title={`Your credits inside ${inGame.title}`}>
                  {inGame.title}: {fmt(inGame.balance)}
                </span>
              )}
              {inGame && inGame.external && (
                <button type="button" onClick={leaveGame} className="rounded-xl border border-teal/60 bg-surface px-2.5 py-2 text-xs font-bold text-teal" data-testid="in-game" title={`In ${inGame.title}. Tap to bring your credits back.`}>
                  In {inGame.title}: back to wallet
                </button>
              )}
              {user.role !== "admin" && (
                <button
                  type="button"
                  aria-label="Ask the admin to load credits"
                  title="Ask the admin to load credits"
                  onClick={() => {
                    // Straight to the admin's chat as "I need a top-up", then show the player the message that was sent.
                    void fetch("/api/credits/request", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" })
                      .then(() => window.dispatchEvent(new Event("la:open-chat")))
                      .catch(() => undefined);
                  }}
                  className="-ml-1 flex h-9 w-9 items-center justify-center rounded-full border border-gold/60 bg-gradient-to-b from-[#ffe58f] to-[#d38f08] text-xl font-extrabold leading-none text-[#2a1700] shadow-[0_0_14px_rgba(255,207,74,0.3)] sm:h-10 sm:w-10"
                >+</button>
              )}
              <button className="btn btn-ghost hidden sm:inline-flex" onClick={logout}>Sign out</button>
            </>
          ) : (
            <>
              <Link href="/login" className="btn btn-ghost whitespace-nowrap !px-3">Log in</Link>
              <Link href="/register" className="btn btn-gold whitespace-nowrap !px-3">Sign up</Link>
            </>
          )}
        </div>
      </header>
      {!(pathname === "/" && !user) && <Ticker editable={user?.role === "admin"} />} {/* the visitor home page shows the strip inside its own layout */}

      <LiveRefresh />
      <PromoPopup signedIn={!!user} role={user?.role ?? ""} />
      <main className="mx-auto max-w-6xl px-4 pb-28 pt-6 lg:pb-12">{children}</main>

      <footer className="mx-auto max-w-6xl px-4 pb-28 text-xs leading-relaxed text-muted lg:pb-10">
        <p>
          Lucky Arena
        </p>
      </footer>

      {user?.role !== "admin" && <InstallBanner />} {/* the admin has the sidebar entry and works at a desk: no nag over the forms */}
      {!pathname.startsWith("/chat") && <ChatWidget role={user ? user.role : "guest"} />}

      {/* Mobile bottom tabs: Home, Games, Wallet, Chat */}
      <nav aria-label="Quick" className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-gold/30 bg-surface/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-6px_24px_rgba(0,0,0,.45)] backdrop-blur lg:hidden">
        {[
          { href: "/", label: "Home", emoji: "🏠" },
          { href: "/games", label: "Games", emoji: "🎮" },
          { href: "/wallet", label: "Wallet", emoji: "💰" },
          { href: "#chat", label: "Chat", emoji: "💬" },
        ].map((t) => {
          const isChat = t.href === "#chat";
          const on = !isChat && active(t.href);
          const cls = `relative flex min-h-16 flex-col items-center justify-center gap-0.5 text-[11px] font-bold transition-colors ${on ? "text-gold" : "text-muted"}`;
          const inner = (
            <>
              <span className={`text-2xl leading-none transition-transform ${on ? "-translate-y-0.5 scale-125 drop-shadow-[0_0_8px_rgba(255,207,74,.8)]" : ""}`} aria-hidden="true">{t.emoji}</span>
              {t.label}
              {isChat && chatUnread > 0 && <span className="absolute right-[26%] top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-gold px-1 text-[10px] font-extrabold text-black" data-testid="chat-tab-badge">{chatUnread > 9 ? "9+" : chatUnread}</span>}
              {on && <span className="absolute inset-x-6 top-0 h-0.5 rounded-full bg-gold" aria-hidden="true" />}
            </>
          );
          return isChat ? (
            <button key={t.label} type="button" className={cls} onClick={() => window.dispatchEvent(new Event("la:open-chat"))}>{inner}</button>
          ) : (
            <Link key={t.href} href={t.href} onClick={t.href === "/wallet" ? walletTap : undefined} aria-current={on ? "page" : undefined} className={cls}>{inner}</Link>
          );
        })}
      </nav>
    </div>
  );
}
