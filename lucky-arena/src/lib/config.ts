// Central, non-secret app settings. All credits are virtual and have no cash value.
export const APP_NAME = "Lucky Arena";
export const SIGNUP_BONUS = 0; // new players start at zero and earn their first credits on the welcome wheel
export const WELCOME_SPINS = 2; // free welcome-wheel spins per new player (so at most 2 small prizes each)
export const REFERRAL_BONUS = 500; // paid to both the new user and the referrer
export const REFERRAL_MAX_REWARDS = 20; // cap on referrer rewards (prototype abuse guard)
export const SPIN_COST = 50; // the reference bet: a wheel segment's "credits" is what it pays at this bet
export const MIN_BET = 1;
export const MAX_BET = 1000;
// Levels rise slowly: 1 XP for every 50 credits played and 1 XP for every 10 credits the admin loads.
export const SPIN_XP = 1;
export const CREDITS_PER_XP = 10;
export const DAILY_BONUS_BASE = 1; // the daily bonus is small: 1 credit, 2 at most (see the VIP tiers)
export const GOOGLE_SIGNUP_BONUS = 0; // credits for a new player who signs up with Google (the admin can set it in Texts & bonuses; new players ask for free credits in the welcome popup instead)
export const DAILY_COOLDOWN_MS = 20 * 60 * 60 * 1000;

export const CATEGORIES = ["Featured", "Wheel", "Cards", "Arcade", "Puzzle", "Trivia"] as const;
