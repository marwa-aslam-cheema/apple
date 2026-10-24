import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().trim().email("Enter a valid email.").max(120),
  username: z.string().trim().regex(/^[A-Za-z0-9_]{3,20}$/, "Username: 3-20 letters, numbers or underscores."),
  password: z.string().min(8, "Password must be at least 8 characters.").max(72),
  ref: z.string().trim().max(20).optional().nullable(),
});

export const loginSchema = z.object({
  identifier: z.string().trim().min(1, "Enter your email or username.").max(120),
  password: z.string().min(1, "Enter your password.").max(72),
});

const slug = z.string().trim().regex(/^[a-z0-9-]{2,40}$/, "Slug: lowercase letters, numbers, dashes.");

export const gameSchema = z.object({
  slug,
  title: z.string().trim().min(1).max(40),
  category: z.enum(["Wheel", "Cards", "Arcade", "Puzzle", "Trivia"]),
  description: z.string().trim().max(200).default(""),
  // Optional external link to a game you own. Only http(s) URLs are accepted (no javascript: or data: links).
  link: z.string().trim().max(300).refine((v) => v === "" || /^https?:\/\/[^\s]+$/i.test(v), "Link must start with http:// or https://").default(""),
  // Optional back-office page of the game (its own admin login). Only admins ever see or open it.
  adminLink: z.string().trim().max(300).refine((v) => v === "" || /^https?:\/\/[^\s]+$/i.test(v), "Admin link must start with http:// or https://").default(""),
  // Optional picture for the game card: a direct http(s) image address (png/jpg/webp/svg).
  image: z.string().trim().max(500).refine((v) => v === "" || /^https?:\/\/[^\s]+$/i.test(v) || /^\/api\/game-image\/\d+$/.test(v), "Image must be an uploaded picture or a link starting with http:// or https://").default(""),
  hue: z.coerce.number().int().min(0).max(360).default(260),
  featured: z.boolean().default(false),
  playable: z.boolean().default(false),
  walletMode: z.enum(["session", "none"]).default("session"),
  active: z.boolean().default(true),
  sortOrder: z.coerce.number().int().min(0).max(9999).default(0),
});

export const promoSchema = z.object({
  code: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{3,20}$/, "Code: 3-20 letters or numbers."),
  title: z.string().trim().min(1).max(60),
  description: z.string().trim().max(240).default(""),
  rewardCredits: z.coerce.number().int().min(0).max(100000).default(0),
  claimable: z.boolean().default(true),
  active: z.boolean().default(true),
});

export const segmentSchema = z.object({
  label: z.string().trim().min(1).max(20),
  credits: z.coerce.number().int().min(0).max(100000),
  weight: z.coerce.number().int().min(0).max(1000),
  kind: z.enum(["main", "welcome"]).default("main"),
  icon: z.string().trim().max(8).default(""),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Colour must look like #7c5cff."),
  sortOrder: z.coerce.number().int().min(0).max(999).default(0),
  active: z.boolean().default(true),
});

export const replySchema = z.object({
  title: z.string().trim().min(1, "Give the reply a short title.").max(30),
  body: z.string().trim().min(1, "Write the message.").max(1000),
  shortcut: z.string().trim().toLowerCase().max(20, "Shortcut: 20 characters at most.").regex(/^\S*$/, "A shortcut cannot contain spaces.").default(""),
  imageId: z.number().int().min(0).nullable().default(null).transform((v) => v || null), // 0 or empty = no picture
  sortOrder: z.coerce.number().int().min(0).max(999).default(0),
});

export const userAdminSchema = z.object({
  adjust: z.coerce.number().int().min(-1000000).max(1000000).optional(),
  note: z.string().trim().max(80).optional(),
  banned: z.boolean().optional(),
  newPassword: z.string().min(8, "Password must be at least 8 characters.").max(72).optional(),
  role: z.enum(["user", "admin"]).optional(),
  tag: z.string().trim().max(300).optional(),
});

export const forgotSchema = z.object({
  identifier: z.string().trim().min(1, "Enter your email or username.").max(120),
});
export const requestStatusSchema = z.object({ status: z.enum(["open", "done", "dismissed"]) });

export const SOCIAL_KINDS = ["Facebook", "WhatsApp", "Instagram", "Telegram", "TikTok", "YouTube", "Other"] as const;
export const socialSchema = z.object({
  kind: z.enum(SOCIAL_KINDS).default("Other"),
  label: z.string().trim().max(40).default(""),
  url: z.string().trim().max(300).refine((v) => /^https?:\/\/[^\s]+$/i.test(v), "Link must start with http:// or https://"),
  sortOrder: z.coerce.number().int().min(0).max(1000).default(0),
  active: z.boolean().default(true),
});

export const walletOptionSchema = z.object({
  kind: z.enum(["topup", "reward"]).default("topup"),
  title: z.string().trim().min(1, "Give the option a title.").max(40),
  description: z.string().trim().max(300).default(""),
  image: z.string().trim().max(500).refine((v) => v === "" || /^https?:\/\/[^\s]+$/i.test(v) || /^\/api\/game-image\/\d+$/.test(v), "Image must be an uploaded picture").default(""),
  sortOrder: z.coerce.number().int().min(0).max(1000).default(0),
  active: z.boolean().default(true),
});
