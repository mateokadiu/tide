import 'server-only';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { magicLink } from 'better-auth/plugins';
import { db } from '@/db/client';
import { accounts, sessions, users, verifications } from '@/db/schema/users';
import { env } from '@/lib/env';
import { sendMagicLinkEmail } from '@/lib/email/magic-link';

const providers: Parameters<typeof betterAuth>[0]['socialProviders'] = {};

if (env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET) {
  providers.github = {
    clientId: env.GITHUB_CLIENT_ID,
    clientSecret: env.GITHUB_CLIENT_SECRET,
  };
}
if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
  // Workspace + consumer accounts both work. Scopes default to openid email profile.
  providers.google = {
    clientId: env.GOOGLE_CLIENT_ID,
    clientSecret: env.GOOGLE_CLIENT_SECRET,
  };
}

export const auth = betterAuth({
  database: drizzleAdapter(db(), {
    provider: env.DATABASE_DRIVER === 'sqlite' ? 'sqlite' : 'pg',
    schema: { users, sessions, accounts, verifications },
    usePlural: true,
  }),
  advanced: {
    // Schema columns are `uuid` with `defaultRandom()` — let Postgres assign IDs.
    generateId: false,
  },
  secret: env.AUTH_SECRET,
  baseURL: env.NEXT_PUBLIC_APP_URL,
  emailAndPassword: { enabled: false },
  socialProviders: providers,
  plugins: [
    magicLink({
      sendMagicLink: async ({ email, url }) => {
        await sendMagicLinkEmail({ email, url });
      },
    }),
  ],
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 days
    updateAge: 60 * 60 * 24, // refresh once per day
  },
  trustedOrigins: [env.NEXT_PUBLIC_APP_URL],
});

export type Auth = typeof auth;
export type Session = Awaited<ReturnType<typeof auth.api.getSession>>;
