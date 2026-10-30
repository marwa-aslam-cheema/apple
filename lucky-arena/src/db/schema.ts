import { sql } from "drizzle-orm";
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
  welcomeSpins: integer("welcome_spins").notNull().default(2),
  xp: integer("xp").notNull().default(0),
  referralCode: text("referral_code").notNull().unique(),
  referredBy: integer("referred_by"),
  lastDailyAt: timestamp("last_daily_at"),
  banned: boolean("banned").notNull().default(false),
  nickname: text("nickname").notNull().default(""), // the name the player chose to show
  avatar: text("avatar").notNull().default(""), // profile picture (an uploaded picture on this site)
  tag: text("tag").notNull().default(""), // admin's own note shown beside the name, e.g. the player's name inside a game
  lastSeenAt: timestamp("last_seen_at"),
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
  link: text("link").notNull().default(""),
  adminLink: text("admin_link").notNull().default(""), // the game's own back-office page: shown to admins only
  image: text("image").notNull().default(""),
  hue: integer("hue").notNull().default(260),
  featured: boolean("featured").notNull().default(false),
  playable: boolean("playable").notNull().default(false),
  active: boolean("active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  // "session": credits move into the game while the player is in it and come back when they leave. "none": the game does not touch credits.
  walletMode: text("wallet_mode").notNull().default("session"),
  // Secret the game's own server uses to read a session and report the final balance (never shown to players).
  apiKey: text("api_key").notNull().default(sql`md5(random()::text || clock_timestamp()::text)`),
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
  kind: text("kind").notNull().default("main"),
  icon: text("icon").notNull().default(""),
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

export const supportRequests = pgTable("support_requests", {
  id: serial("id").primaryKey(),
  kind: text("kind").notNull().default("password_reset"),
  identifier: text("identifier").notNull(),
  userId: integer("user_id"),
  status: text("status").notNull().default("open"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const chatMessages = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(), // the player this conversation belongs to
  sender: text("sender").notNull(), // "user" or "admin"
  body: text("body").notNull(),
  readByAdmin: boolean("read_by_admin").notNull().default(false),
  readByUser: boolean("read_by_user").notNull().default(false),
  imageId: integer("image_id"), // a picture attached to the message
  deletedAt: timestamp("deleted_at"), // older "deleted for everyone" messages stay as a grey line
  hiddenByUser: boolean("hidden_by_user").notNull().default(false), // the player deleted it from their own view
  hiddenByAdmin: boolean("hidden_by_admin").notNull().default(false), // the admin deleted it from their own view
  kind: text("kind").notNull().default("chat"), // "broadcast" = sent to everyone at once
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const quickReplies = pgTable("quick_replies", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  shortcut: text("shortcut").notNull().default(""),
  imageId: integer("image_id"), // optional picture sent together with the reply
  sortOrder: integer("sort_order").notNull().default(0),
});

/** Pictures sent in chat. Kept in the database (base64) so they work on any host. */
export const chatImages = pgTable("chat_images", {
  id: serial("id").primaryKey(),
  ownerId: integer("owner_id").notNull(), // who uploaded it
  mime: text("mime").notNull(),
  data: text("data").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/** One row (id 1): a counter that goes up whenever the admin changes what players see, so open pages know to reload. */
export const siteState = pgTable("site_state", {
  id: integer("id").primaryKey(),
  version: integer("version").notNull().default(0),
});

/** A phone (browser) that agreed to receive notifications. */
export const pushSubscriptions = pgTable("push_subscriptions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  endpoint: text("endpoint").notNull().unique(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/** Cards on the player\'s wallet page, written by the admin: "topup" options and "reward" options. */
export const walletOptions = pgTable("wallet_options", {
  id: serial("id").primaryKey(),
  kind: text("kind").notNull().default("topup"),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  code: text("code").notNull().default(""), // a short code the player copies and sends in the chat
  image: text("image").notNull().default(""),
  sortOrder: integer("sort_order").notNull().default(0),
  active: boolean("active").notNull().default(true),
});

/** One emoji reaction per side (the player, the admin) on a message. */
export const chatReactions = pgTable(
  "chat_reactions",
  {
    id: serial("id").primaryKey(),
    messageId: integer("message_id").notNull(),
    side: text("side").notNull(), // "user" or "admin"
    emoji: text("emoji").notNull(),
  },
  (t) => [unique("chat_reactions_message_side").on(t.messageId, t.side)],
);

/** Small admin-editable texts (for example the names of the two wallet buttons). */
export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

/** Social pages the admin shows to players (Facebook page, WhatsApp, Instagram...). */
export const socialLinks = pgTable("social_links", {
  id: serial("id").primaryKey(),
  kind: text("kind").notNull().default("Other"),
  label: text("label").notNull().default(""),
  url: text("url").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  active: boolean("active").notNull().default(true),
});

/** Credits a player has taken into a game. While a session is open the wallet shows less, and the game holds `balance`. */
export const gameSessions = pgTable("game_sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  gameId: integer("game_id").notNull(),
  token: text("token").notNull().unique(),
  stake: integer("stake").notNull(), // credits taken in
  balance: integer("balance").notNull(), // credits the player has in the game right now
  status: text("status").notNull().default("open"), // "open" | "closed"
  openedAt: timestamp("opened_at").notNull().defaultNow(),
  expiresAt: timestamp("expires_at").notNull(),
  closedAt: timestamp("closed_at"),
  returned: integer("returned"), // credits that went back to the wallet
});

/** The player's own login name inside a game that has its own accounts (saved here by the admin). */
export const gameAccounts = pgTable(
  "game_accounts",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull(),
    gameId: integer("game_id").notNull(),
    username: text("username").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [unique("game_accounts_user_game").on(t.userId, t.gameId)],
);

export type User = typeof users.$inferSelect;
export type Game = typeof games.$inferSelect;
export type Promotion = typeof promotions.$inferSelect;
export type WheelSegment = typeof wheelSegments.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;
