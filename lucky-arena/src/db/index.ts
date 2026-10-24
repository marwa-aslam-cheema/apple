import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { sql } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { DDL } from "./ddl";
import * as schema from "./schema";
import { seed } from "./seed";

export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;

interface CreateOpts {
  /** PostgreSQL connection string. When absent a PGlite (embedded Postgres) database is used. */
  url?: string;
  /** PGlite data directory, or "memory://" for an in-memory database (tests). */
  dir?: string;
  seed?: boolean;
}

export async function createDb(opts: CreateOpts = {}): Promise<Db> {
  let db: Db;
  if (opts.url) {
    const { Pool } = await import("pg");
    const { drizzle } = await import("drizzle-orm/node-postgres");
    const pool = new Pool({ connectionString: opts.url, max: 5 });
    db = drizzle(pool, { schema }) as unknown as Db;
  } else {
    if (process.env.NODE_ENV === "production" && opts.dir === undefined && !process.env.ALLOW_LOCAL_DB) {
      throw new Error(
        "DATABASE_URL is not set. Production needs a PostgreSQL database (see .env.example and README).",
      );
    }
    const { PGlite } = await import("@electric-sql/pglite");
    const { drizzle } = await import("drizzle-orm/pglite");
    const dir = opts.dir ?? process.env.PGLITE_DIR ?? ".data/pg";
    // PGlite creates the data directory but not its parents (".data" does not exist on a fresh checkout).
    if (!dir.includes("://")) mkdirSync(dirname(dir), { recursive: true });
    const client = new PGlite(dir);
    db = drizzle(client, { schema }) as unknown as Db;
  }
  for (const stmt of DDL) await db.execute(sql.raw(stmt));
  if (opts.seed !== false) await seed(db);
  return db;
}

const g = globalThis as unknown as { __luckyDb?: Promise<Db> };

/** One shared database per server process (survives hot reloads in dev). */
export function getDb(): Promise<Db> {
  g.__luckyDb ??= createDb({ url: process.env.DATABASE_URL || undefined });
  return g.__luckyDb;
}

export { schema };
