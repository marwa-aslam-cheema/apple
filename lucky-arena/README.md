# Lucky Arena (prototype)

A responsive gaming-lobby prototype built with **Next.js (App Router) + TypeScript + Tailwind CSS v4 + PostgreSQL (Drizzle ORM)**.

> **Virtual credits only.** There are no deposits, withdrawals, payment methods or real-money play anywhere in this project,
> and none should be added. Credits cannot be bought, cashed out or exchanged. Logos, artwork and copy are original.

## Features

| Area | What is included |
| --- | --- |
| Home & navigation | Hero, daily bonus, VIP progress, featured games. Fixed sidebar on desktop, slide-in drawer + bottom tab bar on mobile |
| Accounts | Register / login / logout, bcrypt hashing, signed httpOnly session cookie, login rate limiting, banned-user lockout. "Forgot password" files a request in the admin inbox (with the account email); the admin sets a new password |
| Games lobby | Search (debounced, URL-driven) and category chips; admin-managed catalogue. Lucky Spin is built in; any game can carry an optional https link to a game you own (opens in a new tab) |
| Welcome wheel | New players start at 0 credits and get 2 free spins on a small wheel (1 credit, 2 credits, "Try next time"), so at most 2 tiny prizes each. Segments editable in admin |
| Bet size | Pick any bet from 1 to 1,000 (type, slider, + / -, presets, Max). The wheel shows multipliers (0.2x ... 20x, JACKPOT 20x); a prize is bet x multiplier, with a fractional credit paid by chance so the wheel's return (about 83%) is the same at every bet. XP grows with the bet. The free welcome spins ignore the bet |
| Lucky Spin Wheel | 12 slices, each with its own emoji and a gold jackpot slice; labels are laid out by `src/lib/wheel-layout.ts` (tests prove nothing spills out of its slice); a celebration popup for every prize except "Try Again". SVG wheel, server-side weighted secure RNG, 50-credit cost, animated landing on the server's result, reduced-motion support |
| Demo wallet | Atomic balance changes, full transaction ledger (signup, spin cost/win, daily, promo, referral, admin) |
| Profile & dashboard | Stats, VIP tier, recent activity, sign out |
| Installable app (PWA) | Web app manifest, icons (any + maskable + Apple), a small service worker with an offline page, an "Install app / Later" banner for new visitors and a permanent "Install app" entry in the sidebar. Android/Chrome gets the native add-to-home-screen prompt; iPhone gets the Add to Home Screen steps (iOS has no one-tap install). Needs HTTPS when deployed |
| Home backdrop | Casino scene behind the home page: slot machines, playing cards, chips, dice and falling gold coins. It is part of the page, so it scrolls with it (see `src/components/CasinoBackdrop.tsx`) |
| Look & sound | "Vegas night" casino theme (velvet black, ruby, brass gold, marquee bulbs, chips). Quiet original lounge music generated in the browser (4 tracks, a new one each login, only while signed in, toggle in the top bar), wheel tick/win sounds and chat sounds. No audio files or third-party assets; master level is `LEVEL` in `src/lib/music.ts` |
| Quick replies | Admin chat has saved-message buttons above the box (click to fill, then Send), "Save as quick reply" for anything typed, optional shortcuts (type `ok` alone in the box and it fills the saved reply after a short pause; Backspace undoes it) and a Replies tab to edit or delete them |
| Player history | Admin > Users: every player card shows email and credits, a password reset, a History link and an Open chat link, with search by email or name. The History page shows join date, VIP, who invited them, games played, every game with cost and prize, credits spent / won / added by admin, and the full wallet ledger |
| Send to all | Admin chat has a "Send to all" button (also in the chat bubble): one message, with a confirm step showing how many players it reaches, lands in every active player's chat (admins and banned accounts skipped). Broadcasts do not flood the admin's conversation list |
| Credit requests | A "+" next to the balance opens the wallet, where "Request credits" posts "I want credits" in the player's chat. The admin adds credits from the chat (one click: adds them and sends "Added ... credits"). Credits stay virtual: no payment methods anywhere |
| Support chat | Floating chat bubble on every page for signed-in players and the admin (unread badge, admin sees a conversation list), plus a full Support Chat page and an admin Chat tab. Text only; polls every few seconds, no websockets needed |
| Invite post | Referral page builds a shareable casino-style picture ("Join & get free spins" with the player's code), an editable caption, download, copy and Facebook / WhatsApp / Telegram buttons. Shared links show the same picture as their preview (set `SITE_URL` once the site is online) |
| Promotions / VIP / Referral | One-time claimable promos, 5 XP-based VIP tiers (bigger daily bonus), referral links paying both sides (capped) |
| Admin dashboard | Overview (incl. actual vs expected wheel return), requests (password resets), users (adjust credits, ban, set password), games, promotions and wheel segments CRUD |

## Run locally

```bash
npm install
npm run dev          # http://localhost:3000
```

With no `DATABASE_URL`, an embedded PostgreSQL ([PGlite](https://pglite.dev)) stores data in `.data/`. In development the admin
account is `admin@luckyarena.test` / `admin12345` (seeded only when the database is empty and `NODE_ENV` is not production).

```bash
npm run typecheck
npm test                                   # unit + service tests on in-memory Postgres
TEST_DATABASE_URL=postgres://user:pw@host/emptydb npm test   # same suite on real PostgreSQL
```

## Configuration

See `.env.example`.

| Variable | Needed | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | production | PostgreSQL connection string |
| `SESSION_SECRET` | production | Signs session cookies (`openssl rand -base64 32`) |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | first deploy | Creates the first admin on an empty database |
| `COOKIE_SECURE=false` | only for plain-http prod testing | Cookies are `Secure` in production by default |

The server refuses to start in production without `SESSION_SECRET` and `DATABASE_URL`, so data is never silently lost.
Tables are created automatically on first start (`src/db/ddl.ts`); switch to `drizzle-kit` migrations before evolving the schema.

## Deploy

**Vercel (or any serverless host) + Neon/Supabase Postgres**
1. Create a Postgres database and copy its connection string.
2. Import the `lucky-arena` folder as the project root; set `DATABASE_URL`, `SESSION_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`.
3. Deploy. Log in with the admin email, then rotate the admin password.

**Docker / Render / Fly / Railway**
```bash
docker compose up --build        # app on :3000 with a local Postgres (edit the secrets first)
```
The `Dockerfile` builds a standalone Next.js server (`node server.js`). On a managed host, build from the `Dockerfile` and set the same env vars.

Note: the in-memory rate limiter is per instance; put a shared store (Redis) or edge rate limiting in front for multi-instance production.

## Design notes

The reference site (`winstar777.me`) could not be reached from the build environment (DNS failure), so **no analysis of it was possible**
and nothing was copied from it. The layout follows common game-lobby conventions instead: persistent sidebar navigation, a sticky
top bar with the balance, category chips, card grids, a bottom tab bar on phones, and a dark theme with one gold accent.
If you supply screenshots of the pages you want to be inspired by, the layout can be tuned toward them (still with original assets).

Original assets: SVG logo and favicon, generated gradient/glyph game art. No third-party game content.

## Project layout

```
src/app            pages + API route handlers
src/components     Shell (sidebar/drawer/tabs), SpinWheel, forms, admin editors
src/db             Drizzle schema, DDL, seed, driver selection (PGlite vs pg)
src/lib            services (wallet, spin, promos...), session, validation, wheel/VIP logic
tests              vitest suites
```
