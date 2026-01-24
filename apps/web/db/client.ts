import 'server-only';
import { drizzle as drizzlePg } from 'drizzle-orm/postgres-js';
import { drizzle as drizzleSqlite } from 'drizzle-orm/better-sqlite3';
import postgres from 'postgres';
import Database from 'better-sqlite3';
import { env } from '@/lib/env';
import * as schema from './schema';

type DrizzlePg = ReturnType<typeof drizzlePg<typeof schema>>;
type DrizzleSqlite = ReturnType<typeof drizzleSqlite<typeof schema>>;

let cached: { db: DrizzlePg | DrizzleSqlite; driver: 'postgres' | 'sqlite' } | null = null;

export function db() {
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
  // biome-ignore lint/suspicious/noExplicitAny: drizzle schema is wired against pg-core
  const d = drizzleSqlite(sqlite, { schema: schema as any });
  cached = { db: d as unknown as DrizzleSqlite, driver: 'sqlite' };
  return cached.db;
}

export function driver(): 'postgres' | 'sqlite' {
  if (!cached) db();
  return cached?.driver ?? env.DATABASE_DRIVER;
}

export const supportsVector = (): boolean => driver() === 'postgres';
export const supportsFts = (): boolean => driver() === 'postgres';
