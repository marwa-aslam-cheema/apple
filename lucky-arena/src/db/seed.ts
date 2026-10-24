import bcrypt from "bcryptjs";
import { count, eq } from "drizzle-orm";
import type { Db } from "./index";
import { games, promotions, users, wheelSegments } from "./schema";

const GAMES = [
  { slug: "lucky-spin", title: "Lucky Spin Wheel", category: "Wheel", hue: 262, featured: true, playable: true, description: "Spin the wheel with demo credits. Fully playable in this prototype." },
  { slug: "star-fortune", title: "Star Fortune", category: "Wheel", hue: 330, featured: true, playable: false, description: "A cosmic bonus wheel with sparkling multipliers. Prototype listing." },
  { slug: "card-quest", title: "Card Quest", category: "Cards", hue: 200, featured: true, playable: false, description: "Match pairs against the clock. Prototype listing." },
  { slug: "memory-mint", title: "Memory Mint", category: "Cards", hue: 160, featured: false, playable: false, description: "Flip and remember. Prototype listing." },
  { slug: "tower-stack", title: "Tower Stack", category: "Arcade", hue: 30, featured: true, playable: false, description: "Stack blocks as high as you can. Prototype listing." },
  { slug: "comet-run", title: "Comet Run", category: "Arcade", hue: 12, featured: false, playable: false, description: "Dodge asteroids for bonus stars. Prototype listing." },
  { slug: "pixel-pop", title: "Pixel Pop", category: "Arcade", hue: 300, featured: false, playable: false, description: "Pop colour clusters. Prototype listing." },
  { slug: "word-orbit", title: "Word Orbit", category: "Puzzle", hue: 120, featured: false, playable: false, description: "Find words in a rotating ring. Prototype listing." },
  { slug: "tile-tango", title: "Tile Tango", category: "Puzzle", hue: 80, featured: false, playable: false, description: "Slide tiles into order. Prototype listing." },
  { slug: "quiz-galaxy", title: "Quiz Galaxy", category: "Trivia", hue: 230, featured: true, playable: false, description: "General-knowledge rounds. Prototype listing." },
  { slug: "history-hunt", title: "History Hunt", category: "Trivia", hue: 45, featured: false, playable: false, description: "Guess the year. Prototype listing." },
  { slug: "number-nest", title: "Number Nest", category: "Puzzle", hue: 180, featured: false, playable: false, description: "Sum the numbers. Prototype listing." },
];

const PROMOS = [
  { code: "WELCOME500", title: "Welcome Boost", description: "Claim 500 extra demo credits once, as a thank-you for joining.", rewardCredits: 500, claimable: true },
  { code: "WEEKEND250", title: "Weekend Refill", description: "A one-time 250 credit refill to keep the spins going.", rewardCredits: 250, claimable: true },
  { code: "FRIENDS", title: "Invite Friends", description: "Share your referral link. You and your friend each get bonus credits when they join.", rewardCredits: 0, claimable: false },
  { code: "VIPCLUB", title: "VIP Club", description: "Earn XP with every spin to unlock higher tiers and bigger daily bonuses.", rewardCredits: 0, claimable: false },
];

// Weighted so the expected return is slightly below the spin cost, like a real balanced prize wheel.
const SEGMENTS = [
  { label: "Try Again", credits: 0, weight: 48, color: "#17101c" },
  { label: "20", credits: 20, weight: 48, color: "#b3123f" },
  { label: "40", credits: 40, weight: 40, color: "#0e6b4c" },
  { label: "80", credits: 80, weight: 24, color: "#1e5aa8" },
  { label: "Try Again", credits: 0, weight: 16, color: "#17101c" },
  { label: "120", credits: 120, weight: 12, color: "#d6336c" },
  { label: "300", credits: 300, weight: 5, color: "#e0a526" },
  { label: "JACKPOT 1000", credits: 1000, weight: 1, color: "#ff3b3b" },
]; // expected return ~87% of the 50 credit spin cost (see tests/wheel.test.ts)

// Welcome wheel for brand-new players: tiny prizes, mostly "try next time" (each player only gets WELCOME_SPINS spins).
const WELCOME_SEGMENTS = [
  { label: "Try next time", credits: 0, weight: 30, color: "#17101c" },
  { label: "1 credit", credits: 1, weight: 30, color: "#b3123f" },
  { label: "Try next time", credits: 0, weight: 30, color: "#2a1a33" },
  { label: "2 credits", credits: 2, weight: 10, color: "#e0a526" },
];

export async function seed(db: Db) {
  const [{ value: userCount }] = await db.select({ value: count() }).from(users);
  if (userCount === 0) {
    const prod = process.env.NODE_ENV === "production";
    const email = process.env.ADMIN_EMAIL ?? (prod ? "" : "admin@luckyarena.test");
    const password = process.env.ADMIN_PASSWORD ?? (prod ? "" : "admin12345");
    if (email && password) {
      await db.insert(users).values({
        email: email.toLowerCase(),
        username: "admin",
        passwordHash: await bcrypt.hash(password, 10),
        role: "admin",
        balance: 10000,
        referralCode: "ADMIN001",
      });
    } else {
      console.warn("[seed] No ADMIN_EMAIL/ADMIN_PASSWORD set; no admin account created.");
    }
  }

  const [{ value: gameCount }] = await db.select({ value: count() }).from(games);
  if (gameCount === 0) await db.insert(games).values(GAMES.map((g, i) => ({ ...g, sortOrder: i })));

  const [{ value: promoCount }] = await db.select({ value: count() }).from(promotions);
  if (promoCount === 0) await db.insert(promotions).values(PROMOS);

  const [{ value: mainCount }] = await db.select({ value: count() }).from(wheelSegments).where(eq(wheelSegments.kind, "main"));
  if (mainCount === 0) await db.insert(wheelSegments).values(SEGMENTS.map((s, i) => ({ ...s, kind: "main", sortOrder: i })));
  const [{ value: welcomeCount }] = await db.select({ value: count() }).from(wheelSegments).where(eq(wheelSegments.kind, "welcome"));
  if (welcomeCount === 0) await db.insert(wheelSegments).values(WELCOME_SEGMENTS.map((s, i) => ({ ...s, kind: "welcome", sortOrder: i })));
}
