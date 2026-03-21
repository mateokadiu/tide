import { Suspense } from 'react';
import { requireUser } from '@/lib/auth/session';
import { ApiTokensPanel } from '@/components/settings/api-tokens';
import { ReaderDefaults } from '@/components/settings/reader-defaults';
import { IntegrationsPanel } from '@/components/settings/integrations';
import { env } from '@/lib/env';

export const metadata = { title: 'settings' };

export default async function SettingsPage() {
  const user = await requireUser();
  const inboundEmail = `save+${'inboundSlug' in user ? (user as { inboundSlug?: string }).inboundSlug ?? user.id : user.id}@${env.EMAIL_INBOUND_DOMAIN}`;

  return (
    <main className="space-y-12">
      <header>
        <h1 className="font-mono text-2xl tracking-tight">settings</h1>
        <p className="text-xs text-muted-foreground font-mono mt-1">{user.email}</p>
      </header>

      <ReaderDefaults />

      <IntegrationsPanel inboundEmail={inboundEmail} />

      <Suspense fallback={<div className="h-32 animate-pulse rounded-lg bg-muted/30" />}>
        <ApiTokensPanel userId={user.id} />
      </Suspense>
    </main>
  );
}
