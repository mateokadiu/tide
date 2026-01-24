import 'dotenv/config';
import { migrate as migratePg } from 'drizzle-orm/postgres-js/migrator';
import { migrate as migrateSqlite } from 'drizzle-orm/better-sqlite3/migrator';
import { drizzle as drizzlePg } from 'drizzle-orm/postgres-js';
import { drizzle as drizzleSqlite } from 'drizzle-orm/better-sqlite3';
import postgres from 'postgres';
import Database from 'better-sqlite3';

const driver = (process.env.DATABASE_DRIVER ?? 'postgres') as 'postgres' | 'sqlite';

async function main() {
  if (driver === 'postgres') {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error('DATABASE_URL required');
    const sql = postgres(url, { max: 1 });
    const db = drizzlePg(sql);
    console.info(`[migrate] postgres → ${url.replace(/:[^@]+@/, ':***@')}`);
    await migratePg(db, { migrationsFolder: './db/migrations' });
    await sql.end();
    console.info('[migrate] done');
    return;
  }

  const file = process.env.DATABASE_FILE ?? './data/tide.sqlite';
  const sqlite = new Database(file);
  const db = drizzleSqlite(sqlite);
  console.info(`[migrate] sqlite → ${file}`);
  migrateSqlite(db, { migrationsFolder: './db/migrations' });
  sqlite.close();
  console.info('[migrate] done');
}

main().catch((err) => {
  console.error('[migrate] failed', err);
  process.exit(1);
});
