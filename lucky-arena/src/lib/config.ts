// Central, non-secret app settings. All credits are virtual and have no cash value.
export const APP_NAME = "Lucky Arena";
export const SIGNUP_BONUS = 1000;
export const REFERRAL_BONUS = 500; // paid to both the new user and the referrer
export const REFERRAL_MAX_REWARDS = 20; // cap on referrer rewards (prototype abuse guard)
export const SPIN_COST = 50;
export const SPIN_XP = 10;
export const DAILY_BONUS_BASE = 100;
export const DAILY_COOLDOWN_MS = 20 * 60 * 60 * 1000;

export const CATEGORIES = ["Featured", "Wheel", "Cards", "Arcade", "Puzzle", "Trivia"] as const;
