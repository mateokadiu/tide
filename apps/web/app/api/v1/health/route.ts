import { NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { db, driver } from '@/db/client';
import { redis } from '@/lib/jobs/queue';

interface HealthReport {
  ok: boolean;
  ts: string;
  uptime_s: number;
  db: { ok: boolean; driver: string; ms: number | null; error?: string };
  redis: { ok: boolean; ms: number | null; error?: string };
  version: string;
}

const START = Date.now();
const VERSION = process.env.npm_package_version ?? '0.1.0';

async function timed<T>(fn: () => Promise<T>): Promise<{ ok: boolean; ms: number; error?: string }> {
  const start = Date.now();
  try {
    await fn();
    return { ok: true, ms: Date.now() - start };
  } catch (err) {
    return {
      ok: false,
      ms: Date.now() - start,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function GET() {
  const [dbCheck, redisCheck] = await Promise.all([
    timed(async () => {
      await db().execute(sql`SELECT 1`);
    }),
    timed(async () => {
      await redis().ping();
    }),
  ]);

  const report: HealthReport = {
    ok: dbCheck.ok && redisCheck.ok,
    ts: new Date().toISOString(),
    uptime_s: Math.floor((Date.now() - START) / 1000),
    db: {
      ok: dbCheck.ok,
      driver: driver(),
      ms: dbCheck.ms,
      ...(dbCheck.error ? { error: dbCheck.error } : {}),
    },
    redis: {
      ok: redisCheck.ok,
      ms: redisCheck.ms,
      ...(redisCheck.error ? { error: redisCheck.error } : {}),
    },
    version: VERSION,
  };
  return NextResponse.json(report, { status: report.ok ? 200 : 503 });
}
