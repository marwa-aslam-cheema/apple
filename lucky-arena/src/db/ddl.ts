// Idempotent DDL, kept next to schema.ts. Runs on startup so the prototype needs no migration tool.
// For a real product, switch to drizzle-kit migrations.
export const DDL = [
  `CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user',
    balance INTEGER NOT NULL DEFAULT 0 CHECK (balance >= 0),
    xp INTEGER NOT NULL DEFAULT 0,
    referral_code TEXT NOT NULL UNIQUE,
    referred_by INTEGER,
    last_daily_at TIMESTAMP,
    banned BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    type TEXT NOT NULL,
    amount INTEGER NOT NULL,
    balance_after INTEGER NOT NULL,
    note TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
  )`,
  `CREATE INDEX IF NOT EXISTS transactions_user_idx ON transactions (user_id, id DESC)`,
  `CREATE TABLE IF NOT EXISTS games (
    id SERIAL PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    link TEXT NOT NULL DEFAULT '',
    image TEXT NOT NULL DEFAULT '',
    hue INTEGER NOT NULL DEFAULT 260,
    featured BOOLEAN NOT NULL DEFAULT FALSE,
    playable BOOLEAN NOT NULL DEFAULT FALSE,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order INTEGER NOT NULL DEFAULT 0
  )`,
  // Added after the first release: keeps databases created earlier working.
  `ALTER TABLE games ADD COLUMN IF NOT EXISTS link TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE games ADD COLUMN IF NOT EXISTS image TEXT NOT NULL DEFAULT ''`,
  `CREATE TABLE IF NOT EXISTS promotions (
    id SERIAL PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    reward_credits INTEGER NOT NULL DEFAULT 0,
    claimable BOOLEAN NOT NULL DEFAULT TRUE,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS promo_claims (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    promo_id INTEGER NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT promo_claims_user_promo UNIQUE (user_id, promo_id)
  )`,
  `CREATE TABLE IF NOT EXISTS wheel_segments (
    id SERIAL PRIMARY KEY,
    label TEXT NOT NULL,
    credits INTEGER NOT NULL DEFAULT 0,
    weight INTEGER NOT NULL DEFAULT 1,
    color TEXT NOT NULL DEFAULT '#7c5cff',
    sort_order INTEGER NOT NULL DEFAULT 0,
    active BOOLEAN NOT NULL DEFAULT TRUE
  )`,
  `CREATE TABLE IF NOT EXISTS spins (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    segment_id INTEGER NOT NULL,
    label TEXT NOT NULL,
    cost INTEGER NOT NULL,
    prize INTEGER NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
  )`,
];
