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
| Lucky Spin Wheel | 12 slices, each with its own emoji and a gold jackpot slice; labels are laid out by `src/lib/wheel-layout.ts` (tests prove nothing spills out of its slice); a celebration popup for every prize except "Try Again". SVG wheel, server-side weighted secure RNG, 50-credit cost, animated landing on the server's result, reduced-motion support |
| Demo wallet | Atomic balance changes, full transaction ledger (signup, spin cost/win, daily, promo, referral, admin) |
| Profile & dashboard | Stats, VIP tier, recent activity, sign out |
| Look & sound | "Vegas night" casino theme (velvet black, ruby, brass gold, marquee bulbs, chips). Quiet original lounge music generated in the browser (4 tracks, a new one each login, only while signed in, toggle in the top bar), wheel tick/win sounds and chat sounds. No audio files or third-party assets; master level is `LEVEL` in `src/lib/music.ts` |
| Support chat | Floating chat bubble on every page for signed-in players and the admin (unread badge, admin sees a conversation list), plus a full Support Chat page and an admin Chat tab. Text only; polls every few seconds, no websockets needed |
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
