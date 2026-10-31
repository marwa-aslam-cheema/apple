"use client";

import { useRouter } from "next/navigation";
import { APP_BONUS_SPINS } from "@/lib/config";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Icon } from "./Icon";

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

interface PwaState {
  installed: boolean;
  /** Installing still earns the free spins (the player has not had them yet). */
  installBonus: boolean;
  /** Start the install: the browser's own "Add to Home screen" prompt when available, otherwise show steps. */
  install: () => Promise<void>;
  bannerVisible: boolean;
  later: () => void;
}

const Ctx = createContext<PwaState>({ installed: true, installBonus: false, install: async () => undefined, bannerVisible: false, later: () => undefined });
export const useInstall = () => useContext(Ctx);

const DISMISS_KEY = "la_install_later";
const DISMISS_DAYS = 7;

const isStandalone = () => window.matchMedia("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone === true;
const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

export function PwaProvider({ children, installBonus = false }: { children: React.ReactNode; installBonus?: boolean }) {
  const router = useRouter();
  const [deferred, setDeferred] = useState<InstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(true); // assume installed until the browser tells us otherwise (no flash of the banner)
  const [dismissed, setDismissed] = useState(true);
  const [help, setHelp] = useState<"ios" | "other" | null>(null);

  useEffect(() => {
    setInstalled(isStandalone());
    try {
      const t = Number(localStorage.getItem(DISMISS_KEY) ?? 0);
      setDismissed(Date.now() - t < DISMISS_DAYS * 86400_000);
    } catch {
      setDismissed(false);
    }
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }
    const onPrompt = (e: Event) => {
      e.preventDefault(); // keep the event so our own "Install app" button can trigger it
      setDeferred(e as InstallPromptEvent);
    };
    // The app is installed (or opened from the home screen): the server gives the 2 free spins once per player.
    const claimSpins = () => {
      if (!installBonus) return;
      fetch("/api/bonus/install", { method: "POST" }).then((r) => r.json()).then((d: { granted?: boolean }) => d.granted && router.refresh()).catch(() => undefined);
    };
    if (isStandalone()) claimSpins();
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
      claimSpins();
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, [installBonus, router]);

  const install = useCallback(async () => {
    if (deferred) {
      await deferred.prompt();
      const { outcome } = await deferred.userChoice;
      setDeferred(null);
      if (outcome === "accepted") setInstalled(true);
      return;
    }
    setHelp(isIos() ? "ios" : "other");
  }, [deferred]);

  const later = useCallback(() => {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      /* private mode: it will just come back next visit */
    }
  }, []);

  const value = useMemo<PwaState>(() => ({ installed, installBonus, install, bannerVisible: !installed && !dismissed, later }), [installed, installBonus, install, dismissed, later]);

  return (
    <Ctx.Provider value={value}>
      {children}
      {help && <InstallHelp kind={help} bonus={installBonus} onClose={() => setHelp(null)} />}
    </Ctx.Provider>
  );
}

function InstallHelp({ kind, bonus, onClose }: { kind: "ios" | "other"; bonus: boolean; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div role="dialog" aria-modal="true" aria-label="How to install the app" className="fixed inset-0 z-[70] flex items-end justify-center p-3 sm:items-center">
      <button className="absolute inset-0 bg-black/70" aria-label="Close" tabIndex={-1} onClick={onClose} />
      <div className="card relative w-full max-w-sm space-y-3 p-6">
        <h2 className="gold-text text-2xl font-extrabold uppercase">{bonus ? `Install Lucky Arena and get ${APP_BONUS_SPINS} free spins` : "Install Lucky Arena"}</h2>
        {kind === "ios" ? (
          <>
            <p className="text-sm text-muted">On iPhone and iPad the browser does not allow one-tap install, so it takes three taps:</p>
            <ol className="list-decimal space-y-1 pl-5 text-sm">
              <li>Open this page in <b>Safari</b> and tap the <b>Share</b> button (the square with the arrow) at the bottom.</li>
              <li>Scroll and tap <b>Add to Home Screen</b>.</li>
              <li>Tap <b>Add</b>. The Lucky Arena icon appears on your home screen.</li>
            </ol>
          </>
        ) : (
          <p className="text-sm text-muted">Open your browser menu (the three dots) and choose <b>Install app</b> or <b>Add to Home screen</b>. If you do not see it, open this page in Chrome (Android) or Safari (iPhone).</p>
        )}
        <button className="btn btn-gold w-full" onClick={onClose}>Got it</button>
      </div>
    </div>
  );
}

/** The bottom banner for new visitors: Install app, or Later (the sidebar keeps an "Install app" entry). */
export function InstallBanner() {
  const { bannerVisible, install, later, installBonus } = useInstall();
  if (!bannerVisible) return null;
  return (
    <section
      aria-label="Install the app"
      className="card fixed bottom-[4.75rem] left-2 right-20 z-40 flex flex-wrap items-center gap-x-3 gap-y-2 p-3 shadow-2xl sm:right-auto sm:w-[26rem] lg:bottom-4 lg:left-[17rem]"
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-b from-[#e0245a] to-[#7a0c2c] text-gold"><Icon name="download" className="h-6 w-6" /></div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-extrabold">{installBonus ? `Install Lucky Arena and get ${APP_BONUS_SPINS} free spins` : "Install Lucky Arena"}</p>
        <p className="text-xs text-muted">Play from your home screen</p>
      </div>
      <div className="flex w-full gap-2">
        <button className="btn btn-gold !min-h-10 flex-1 !px-3 !py-1.5 whitespace-nowrap" onClick={install}>Install app</button>
        <button className="btn btn-ghost !min-h-10 flex-1 !px-3 !py-1.5 whitespace-nowrap" onClick={later}>Later</button>
      </div>
    </section>
  );
}
