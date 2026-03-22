import 'server-only';
import { createHash, randomBytes } from 'node:crypto';
import { eq, and } from 'drizzle-orm';
import { db } from '@/db/client';
import { apiTokens } from '@/db/schema/api-tokens';

const PREFIX = 'tide_pat_';

function sha256(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

/** Mint a new token. The plaintext is shown ONCE to the user. */
export async function mintApiToken(opts: {
  userId: string;
  name: string;
  scopes?: string;
  expiresAt?: Date;
}): Promise<{ token: string; prefix: string; id: string }> {
  const nonce = randomBytes(24).toString('base64url');
  const token = `${PREFIX}${nonce}`;
  const prefix = token.slice(0, 16);
  const [row] = await db()
    .insert(apiTokens)
    .values({
      userId: opts.userId,
      name: opts.name,
      tokenHash: sha256(token),
      prefix,
      scopes: opts.scopes ?? 'articles:write',
      expiresAt: opts.expiresAt ?? null,
    })
    .returning({ id: apiTokens.id });
  if (!row) throw new Error('failed to mint api token');
  return { token, prefix, id: row.id };
}

/** Verify a bearer token. Returns the user_id or null. */
export async function verifyApiToken(
  token: string,
  requiredScope: 'articles:read' | 'articles:write',
): Promise<{ userId: string; tokenId: string } | null> {
  if (!token.startsWith(PREFIX)) return null;
  const hash = sha256(token);
  const rows = await db()
    .select({
      id: apiTokens.id,
      userId: apiTokens.userId,
      scopes: apiTokens.scopes,
      expiresAt: apiTokens.expiresAt,
    })
    .from(apiTokens)
    .where(eq(apiTokens.tokenHash, hash))
    .limit(1);

  const row = rows[0];
  if (!row) return null;
  if (row.expiresAt && row.expiresAt < new Date()) return null;
  if (!row.scopes.split(',').includes(requiredScope)) return null;

  // Fire-and-forget last_used_at update
  void db()
    .update(apiTokens)
    .set({ lastUsedAt: new Date() })
    .where(and(eq(apiTokens.id, row.id)))
    .catch(() => {});

  return { userId: row.userId, tokenId: row.id };
}
