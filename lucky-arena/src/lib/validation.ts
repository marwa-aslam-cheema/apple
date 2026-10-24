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
  // Optional picture for the game card: a direct http(s) image address (png/jpg/webp/svg).
  image: z.string().trim().max(500).refine((v) => v === "" || /^https?:\/\/[^\s]+$/i.test(v), "Image must be a link starting with http:// or https://").default(""),
  hue: z.coerce.number().int().min(0).max(360).default(260),
  featured: z.boolean().default(false),
  playable: z.boolean().default(false),
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
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Colour must look like #7c5cff."),
  sortOrder: z.coerce.number().int().min(0).max(999).default(0),
  active: z.boolean().default(true),
});

export const userAdminSchema = z.object({
  adjust: z.coerce.number().int().min(-1000000).max(1000000).optional(),
  note: z.string().trim().max(80).optional(),
  banned: z.boolean().optional(),
  newPassword: z.string().min(8, "Password must be at least 8 characters.").max(72).optional(),
  role: z.enum(["user", "admin"]).optional(),
});

export const forgotSchema = z.object({
  identifier: z.string().trim().min(1, "Enter your email or username.").max(120),
});
export const requestStatusSchema = z.object({ status: z.enum(["open", "done", "dismissed"]) });
