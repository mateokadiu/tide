import 'server-only';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { env } from '@/lib/env';

interface Limiter {
  limit(key: string): Promise<{ success: boolean; remaining: number; reset: number }>;
}

class MemoryLimiter implements Limiter {
  private hits = new Map<string, { count: number; resetAt: number }>();
  constructor(
    private readonly max: number,
    private readonly windowMs: number,
  ) {}

  async limit(key: string) {
    const now = Date.now();
    const rec = this.hits.get(key);
    if (!rec || rec.resetAt < now) {
      this.hits.set(key, { count: 1, resetAt: now + this.windowMs });
      return { success: true, remaining: this.max - 1, reset: now + this.windowMs };
    }
    rec.count++;
    return {
      success: rec.count <= this.max,
      remaining: Math.max(0, this.max - rec.count),
      reset: rec.resetAt,
    };
  }
}

let savePerUser: Limiter | null = null;
let savePerIp: Limiter | null = null;

function build(prefix: string, max: number): Limiter {
  if (env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN) {
    const redis = new Redis({
      url: env.UPSTASH_REDIS_REST_URL,
      token: env.UPSTASH_REDIS_REST_TOKEN,
    });
    const rl = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(max, '1 h'),
      prefix,
      analytics: false,
    });
    return {
      async limit(key: string) {
        const r = await rl.limit(key);
        return { success: r.success, remaining: r.remaining, reset: r.reset };
      },
    };
  }
  if (env.isProd) {
    console.warn(`[rate-limit] UPSTASH creds missing — falling back to in-process limiter for ${prefix}`);
  }
  return new MemoryLimiter(max, 60 * 60 * 1000);
}

export function rlSavePerUser(): Limiter {
  if (!savePerUser) savePerUser = build('tide:save:user', env.SAVE_RATE_LIMIT_PER_USER_HOURLY);
  return savePerUser;
}

export function rlSavePerIp(): Limiter {
  if (!savePerIp) savePerIp = build('tide:save:ip', env.SAVE_RATE_LIMIT_PER_IP_HOURLY);
  return savePerIp;
}
