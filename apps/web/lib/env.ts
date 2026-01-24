import 'server-only';
import { z } from 'zod';

const trueish = (v: string | undefined) => v === '1' || v === 'true';

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),

  AUTH_SECRET: z.string().min(32, 'AUTH_SECRET must be 32+ chars'),

  DATABASE_DRIVER: z.enum(['postgres', 'sqlite']).default('postgres'),
  DATABASE_URL: z.string().optional(),
  DATABASE_FILE: z.string().default('./data/tide.sqlite'),

  REDIS_URL: z.string().default('redis://localhost:6379'),

  UPSTASH_REDIS_REST_URL: z.string().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),

  GITHUB_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),

  ANTHROPIC_API_KEY: z.string().optional(),
  ANTHROPIC_MODEL: z.string().default('claude-haiku-4-5-20251001'),

  VOYAGE_API_KEY: z.string().optional(),
  VOYAGE_MODEL: z.string().default('voyage-3.5'),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_EMBEDDING_MODEL: z.string().default('text-embedding-3-small'),

  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().default('tide <hello@tide.example>'),
  EMAIL_INBOUND_DOMAIN: z.string().default('tide.example'),
  RESEND_INBOUND_WEBHOOK_SECRET: z.string().optional(),

  STORAGE_DRIVER: z.enum(['r2', 'minio', 's3', 'local']).default('local'),
  STORAGE_LOCAL_DIR: z.string().default('./data/archive'),
  STORAGE_S3_ENDPOINT: z.string().optional(),
  STORAGE_S3_REGION: z.string().default('auto'),
  STORAGE_S3_BUCKET: z.string().default('tide-archive'),
  STORAGE_S3_ACCESS_KEY: z.string().optional(),
  STORAGE_S3_SECRET_KEY: z.string().optional(),

  SAVE_RATE_LIMIT_PER_USER_HOURLY: z.coerce.number().int().positive().default(120),
  SAVE_RATE_LIMIT_PER_IP_HOURLY: z.coerce.number().int().positive().default(240),

  FLAG_BIONIC_READING: z.string().optional(),
  FLAG_LISTEN_MODE: z.string().optional(),
  FLAG_PUBLIC_SHARING: z.string().optional(),
  FLAG_WEEKLY_DIGEST: z.string().optional(),
});

type RawEnv = z.infer<typeof EnvSchema>;

function parse(): RawEnv {
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const flat = parsed.error.flatten().fieldErrors;
    const msg = Object.entries(flat)
      .map(([k, v]) => `  ${k}: ${(v ?? []).join(', ')}`)
      .join('\n');
    throw new Error(`tide: env validation failed\n${msg}`);
  }
  if (parsed.data.DATABASE_DRIVER === 'postgres' && !parsed.data.DATABASE_URL) {
    throw new Error('tide: DATABASE_URL required when DATABASE_DRIVER=postgres');
  }
  return parsed.data;
}

const raw = parse();

export const env = {
  ...raw,
  flags: {
    bionicReading: trueish(raw.FLAG_BIONIC_READING),
    listenMode: trueish(raw.FLAG_LISTEN_MODE),
    publicSharing: trueish(raw.FLAG_PUBLIC_SHARING),
    weeklyDigest: trueish(raw.FLAG_WEEKLY_DIGEST),
  },
  isProd: raw.NODE_ENV === 'production',
  isTest: raw.NODE_ENV === 'test',
};

export type Env = typeof env;
