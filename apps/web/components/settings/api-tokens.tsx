import { eq, desc } from 'drizzle-orm';
import { db } from '@/db/client';
import { apiTokens } from '@/db/schema/api-tokens';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { NewTokenForm } from './new-token-form';

export async function ApiTokensPanel({ userId }: { userId: string }) {
  const tokens = await db()
    .select({
      id: apiTokens.id,
      name: apiTokens.name,
      prefix: apiTokens.prefix,
      scopes: apiTokens.scopes,
      lastUsedAt: apiTokens.lastUsedAt,
      createdAt: apiTokens.createdAt,
    })
    .from(apiTokens)
    .where(eq(apiTokens.userId, userId))
    .orderBy(desc(apiTokens.createdAt));

  return (
    <Card>
      <CardHeader>
        <CardTitle>api tokens</CardTitle>
        <CardDescription>
          bearer tokens for POST /api/v1/articles. shown once at creation, never again.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <NewTokenForm />

        {tokens.length === 0 ? (
          <p className="text-sm text-muted-foreground">no tokens yet.</p>
        ) : (
          <ul className="divide-y divide-border border border-border rounded-md">
            {tokens.map((t) => (
              <li key={t.id} className="flex items-center justify-between px-3 py-2 text-sm">
                <div>
                  <p className="font-medium">{t.name}</p>
                  <p className="font-mono text-[11px] text-muted-foreground">
                    {t.prefix}… · {t.scopes}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground font-mono">
                  {t.lastUsedAt ? `last used ${t.lastUsedAt.toISOString().slice(0, 10)}` : 'never used'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
