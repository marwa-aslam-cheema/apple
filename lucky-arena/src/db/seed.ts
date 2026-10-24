import bcrypt from "bcryptjs";
import { and, count, eq } from "drizzle-orm";
import type { Db } from "./index";
import { games, promotions, quickReplies, users, wheelSegments } from "./schema";

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

// Main wheel: 12 slices, each with its own emoji. Weighted so the expected return stays below the 50 credit spin cost
// (about 83%, see tests/wheel.test.ts). Rarer = bigger.
const SEGMENTS = [
  { label: "Try Again", icon: "🔄", credits: 0, weight: 50, color: "#17101c" },
  { label: "10", icon: "🍒", credits: 10, weight: 52, color: "#b3123f" },
  { label: "20", icon: "🍋", credits: 20, weight: 44, color: "#0e6b4c" },
  { label: "40", icon: "🔔", credits: 40, weight: 36, color: "#2a1a33" },
  { label: "Try Again", icon: "🔄", credits: 0, weight: 36, color: "#17101c" },
  { label: "60", icon: "🍀", credits: 60, weight: 24, color: "#1e5aa8" },
  { label: "80", icon: "💎", credits: 80, weight: 20, color: "#d6336c" },
  { label: "100", icon: "👑", credits: 100, weight: 14, color: "#e0a526" },
  { label: "150", icon: "🎁", credits: 150, weight: 10, color: "#0e6b4c" },
  { label: "200", icon: "⭐", credits: 200, weight: 8, color: "#b3123f" },
  { label: "500", icon: "🏆", credits: 500, weight: 2, color: "#2a1a33" },
  { label: "JACKPOT 1000", icon: "🎰", credits: 1000, weight: 1, color: "#ff3b3b" },
];
// The first release's default wheel (no icons). Databases that still hold exactly this get the new wheel.
const OLD_MAIN_LABELS = ["Try Again", "20", "40", "80", "Try Again", "120", "300", "JACKPOT 1000"];
const WELCOME_ICONS: Record<string, string> = { "Try next time": "🍀", "1 credit": "🪙", "2 credits": "💰" };

// Welcome wheel for brand-new players: tiny prizes, mostly "try next time" (each player only gets WELCOME_SPINS spins).
const WELCOME_SEGMENTS = [
  { label: "Try next time", icon: "🍀", credits: 0, weight: 30, color: "#17101c" },
  { label: "1 credit", icon: "🪙", credits: 1, weight: 30, color: "#b3123f" },
  { label: "Try next time", icon: "🍀", credits: 0, weight: 30, color: "#2a1a33" },
  { label: "2 credits", icon: "💰", credits: 2, weight: 10, color: "#e0a526" },
];

// Ready-made admin chat replies (editable in Admin > Replies or saved straight from the chat box).
const QUICK_REPLIES = [
  { title: "Hello", body: "Hello! How can I help you today?" },
  { title: "Wait a moment", body: "Please wait a moment, I am checking this for you." },
  { title: "Credits added", body: "Done! The credits have been added to your wallet." },
  { title: "Password reset", body: "Your password has been reset. Please log in with the new password and change it after." },
  { title: "Need details", body: "Could you please send me your username so I can find your account?" },
  { title: "Thanks", body: "Thanks for your patience. Enjoy the games!" },
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

  const main = await db.select().from(wheelSegments).where(eq(wheelSegments.kind, "main")).orderBy(wheelSegments.sortOrder, wheelSegments.id);
  const isFirstReleaseWheel = main.length === OLD_MAIN_LABELS.length && main.every((m, i) => m.label === OLD_MAIN_LABELS[i] && m.icon === "");
  if (main.length === 0 || isFirstReleaseWheel) {
    if (isFirstReleaseWheel) await db.delete(wheelSegments).where(eq(wheelSegments.kind, "main"));
    await db.insert(wheelSegments).values(SEGMENTS.map((s, i) => ({ ...s, kind: "main", sortOrder: i })));
  }
  const [{ value: welcomeCount }] = await db.select({ value: count() }).from(wheelSegments).where(eq(wheelSegments.kind, "welcome"));
  if (welcomeCount === 0) await db.insert(wheelSegments).values(WELCOME_SEGMENTS.map((s, i) => ({ ...s, kind: "welcome", sortOrder: i })));
  // Welcome segments created before icons existed get the matching icon (custom labels are left alone).
  for (const [label, icon] of Object.entries(WELCOME_ICONS)) {
    await db.update(wheelSegments).set({ icon }).where(and(eq(wheelSegments.kind, "welcome"), eq(wheelSegments.label, label), eq(wheelSegments.icon, "")));
  }
  const [{ value: replyCount }] = await db.select({ value: count() }).from(quickReplies);
  if (replyCount === 0) await db.insert(quickReplies).values(QUICK_REPLIES.map((r, i) => ({ ...r, sortOrder: i })));
}
