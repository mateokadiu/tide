import 'server-only';
import { drizzle as drizzlePg } from 'drizzle-orm/postgres-js';
import { drizzle as drizzleSqlite } from 'drizzle-orm/better-sqlite3';
import postgres from 'postgres';
import Database from 'better-sqlite3';
import { env } from '@/lib/env';
import * as schema from './schema';

type DrizzlePg = ReturnType<typeof drizzlePg<typeof schema>>;
type DrizzleSqlite = ReturnType<typeof drizzleSqlite<typeof schema>>;

/**
 * Drizzle's per-dialect types diverge enough that we expose the postgres type
 * publicly (the production path) and adapt sqlite at the boundary. Queries
 * that touch postgres-only features (vector, FTS) gate on `supportsVector()` /
 * `supportsFts()`.
 */
let cached: { db: DrizzlePg; driver: 'postgres' | 'sqlite' } | null = null;

export function db(): DrizzlePg {
  if (cached) return cached.db;

  if (env.DATABASE_DRIVER === 'postgres') {
    if (!env.DATABASE_URL) throw new Error('DATABASE_URL required for postgres driver');
    const sql = postgres(env.DATABASE_URL, {
      max: env.isProd ? 16 : 6,
      idle_timeout: 30,
      prepare: false,
    });
    const d = drizzlePg(sql, { schema });
    cached = { db: d, driver: 'postgres' };
    return d;
  }

  const sqlite = new Database(env.DATABASE_FILE);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');
  // biome-ignore lint/suspicious/noExplicitAny: cross-dialect adapter at the boundary
  const d = drizzleSqlite(sqlite, { schema: schema as any });
  cached = { db: d as unknown as DrizzlePg, driver: 'sqlite' };
  return cached.db;
}

export type Db = DrizzlePg;
export type DbSqlite = DrizzleSqlite;

export function driver(): 'postgres' | 'sqlite' {
  if (!cached) db();
  return cached?.driver ?? env.DATABASE_DRIVER;
}

export const supportsVector = (): boolean => driver() === 'postgres';
export const supportsFts = (): boolean => driver() === 'postgres';
