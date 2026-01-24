import { defineConfig } from 'drizzle-kit';

const driver = (process.env.DATABASE_DRIVER ?? 'postgres') as 'postgres' | 'sqlite';

export default defineConfig({
  dialect: driver === 'sqlite' ? 'sqlite' : 'postgresql',
  schema: './db/schema/index.ts',
  out: './db/migrations',
  dbCredentials:
    driver === 'sqlite'
      ? { url: process.env.DATABASE_FILE ?? './data/tide.sqlite' }
      : { url: process.env.DATABASE_URL ?? 'postgres://tide:tide@localhost:5432/tide_dev' },
  strict: true,
  verbose: true,
});
