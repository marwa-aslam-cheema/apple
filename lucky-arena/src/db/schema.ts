import {
  boolean,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull().default("user"),
  balance: integer("balance").notNull().default(0),
  xp: integer("xp").notNull().default(0),
  referralCode: text("referral_code").notNull().unique(),
  referredBy: integer("referred_by"),
  lastDailyAt: timestamp("last_daily_at"),
  banned: boolean("banned").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  type: text("type").notNull(),
  amount: integer("amount").notNull(),
  balanceAfter: integer("balance_after").notNull(),
  note: text("note").notNull().default(""),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const games = pgTable("games", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  category: text("category").notNull(),
  description: text("description").notNull().default(""),
  hue: integer("hue").notNull().default(260),
  featured: boolean("featured").notNull().default(false),
  playable: boolean("playable").notNull().default(false),
  active: boolean("active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const promotions = pgTable("promotions", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  rewardCredits: integer("reward_credits").notNull().default(0),
  claimable: boolean("claimable").notNull().default(true),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const promoClaims = pgTable(
  "promo_claims",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull(),
    promoId: integer("promo_id").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [unique("promo_claims_user_promo").on(t.userId, t.promoId)],
);

export const wheelSegments = pgTable("wheel_segments", {
  id: serial("id").primaryKey(),
  label: text("label").notNull(),
  credits: integer("credits").notNull().default(0),
  weight: integer("weight").notNull().default(1),
  color: text("color").notNull().default("#7c5cff"),
  sortOrder: integer("sort_order").notNull().default(0),
  active: boolean("active").notNull().default(true),
});

export const spins = pgTable("spins", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  segmentId: integer("segment_id").notNull(),
  label: text("label").notNull(),
  cost: integer("cost").notNull(),
  prize: integer("prize").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type User = typeof users.$inferSelect;
export type Game = typeof games.$inferSelect;
export type Promotion = typeof promotions.$inferSelect;
export type WheelSegment = typeof wheelSegments.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;
