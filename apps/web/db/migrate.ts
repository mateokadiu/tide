import 'dotenv/config';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import Database from 'better-sqlite3';
import postgres from 'postgres';

// Raw-SQL migrator. We deliberately avoid drizzle-orm/.../migrator because it
// requires a meta/_journal.json file that drizzle-kit generates alongside its
// own .sql output — we author the SQL files directly, so there's no journal
// to load. Tracking happens in a hand-rolled `_migrations` table keyed by
// filename + sha256, so re-running is idempotent.

const driver = (process.env.DATABASE_DRIVER ?? 'postgres') as 'postgres' | 'sqlite';
const MIGRATIONS_DIR = join(import.meta.dirname, 'migrations');

function migrationFiles(): { name: string; sql: string; hash: string }[] {
  return readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort()
    .map((name) => {
      const sql = readFileSync(join(MIGRATIONS_DIR, name), 'utf8');
      const hash = createHash('sha256').update(sql).digest('hex');
      return { name, sql, hash };
    });
}

async function migratePg(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL required for postgres driver');
  const sql = postgres(url, { max: 1, prepare: false });
  console.info(`[migrate] postgres → ${url.replace(/:[^@]+@/, ':***@')}`);

  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS _migrations (
      name        text PRIMARY KEY,
      hash        text NOT NULL,
      applied_at  timestamptz NOT NULL DEFAULT now()
    );
  `);

  for (const m of migrationFiles()) {
    const existing = await sql<{ hash: string }[]>`
      SELECT hash FROM _migrations WHERE name = ${m.name}
    `;
    if (existing.length > 0) {
      if (existing[0]!.hash !== m.hash) {
        throw new Error(
          `[migrate] hash mismatch for ${m.name} — applied SQL differs from on-disk version`,
        );
      }
      console.info(`[migrate] skip ${m.name}`);
      continue;
    }
    console.info(`[migrate] apply ${m.name}`);
    await sql.unsafe(m.sql);
    await sql`INSERT INTO _migrations (name, hash) VALUES (${m.name}, ${m.hash})`;
  }

  await sql.end();
  console.info('[migrate] done');
}

function migrateSqlite(): void {
  const file = process.env.DATABASE_FILE ?? './data/tide.sqlite';
  const sqlite = new Database(file);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');
  console.info(`[migrate] sqlite → ${file}`);

  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      name        text PRIMARY KEY,
      hash        text NOT NULL,
      applied_at  text NOT NULL DEFAULT (datetime('now'))
    );
  `);

  const check = sqlite.prepare('SELECT hash FROM _migrations WHERE name = ?');
  const insert = sqlite.prepare('INSERT INTO _migrations (name, hash) VALUES (?, ?)');

  for (const m of migrationFiles()) {
    const existing = check.get(m.name) as { hash: string } | undefined;
    if (existing) {
      if (existing.hash !== m.hash) {
        throw new Error(
          `[migrate] hash mismatch for ${m.name} — applied SQL differs from on-disk version`,
        );
      }
      console.info(`[migrate] skip ${m.name}`);
      continue;
    }
    console.info(`[migrate] apply ${m.name}`);
    sqlite.exec(m.sql);
    insert.run(m.name, m.hash);
  }

  sqlite.close();
  console.info('[migrate] done');
}

async function main(): Promise<void> {
  if (driver === 'postgres') {
    await migratePg();
  } else {
    migrateSqlite();
  }
}

main().catch((err) => {
  console.error('[migrate] failed', err);
  process.exit(1);
});
