// Saves every table of the site's database into ONE file: backups/latest.json (the old file is replaced by the new one).
//   Live site (Neon):  npm run backup -- "postgresql://...your DATABASE_URL..."
//   Local copy:        npm run backup            (reads .data/pg, the database ./start.sh uses)
import { mkdirSync, renameSync, statSync, writeFileSync, existsSync } from "node:fs";

const url = process.argv[2] || process.env.DATABASE_URL || "";
const dir = process.env.PGLITE_DIR || ".data/pg";

let query, close;
if (url) {
  const { default: pg } = await import("pg");
  const pool = new pg.Pool({ connectionString: url, max: 1 });
  query = async (text) => (await pool.query(text)).rows;
  close = () => pool.end();
} else {
  if (!existsSync(dir)) {
    console.error(`No database found at ${dir}. Start the site once (./start.sh), or pass your DATABASE_URL:\n  npm run backup -- "postgresql://..."`);
    process.exit(1);
  }
  const { PGlite } = await import("@electric-sql/pglite");
  const client = new PGlite(dir);
  query = async (text) => (await client.query(text)).rows;
  close = () => client.close();
}

try {
  const tables = (await query("select table_name from information_schema.tables where table_schema = 'public' and table_type = 'BASE TABLE' order by table_name")).map((r) => r.table_name);
  const data = {};
  let rows = 0;
  for (const t of tables) {
    data[t] = await query(`select * from "${t}"`);
    rows += data[t].length;
  }
  mkdirSync("backups", { recursive: true });
  const tmp = "backups/latest.json.tmp";
  writeFileSync(tmp, JSON.stringify({ savedAt: new Date().toISOString(), source: url ? "live database" : "local database", tables: data }, null, 1));
  renameSync(tmp, "backups/latest.json"); // the old backup is replaced only once the new one is fully written
  console.log(`Backup saved: backups/latest.json  (${tables.length} tables, ${rows} rows, ${Math.round(statSync("backups/latest.json").size / 1024)} KB)`);
  console.log("This file holds players' emails and password hashes. Keep it private: do not share it or put it on GitHub.");
} finally {
  await close();
}
