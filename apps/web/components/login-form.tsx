'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type Providers = { github: boolean; google: boolean };

export function LoginForm({ providers }: { providers: Providers }) {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  async function onMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setState('sending');
    setError(null);
    try {
      const res = await fetch('/api/auth/sign-in/magic-link', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, callbackURL: '/library' }),
      });
      if (!res.ok) throw new Error(`${res.status}`);
      setState('sent');
    } catch (err) {
      setState('error');
      setError(err instanceof Error ? err.message : 'failed to send');
    }
  }

  function onProvider(provider: 'github' | 'google') {
    window.location.href = `/api/auth/sign-in/social?provider=${provider}&callbackURL=/library`;
  }

  if (state === 'sent') {
    return (
      <div className="mt-8 rounded-md border border-border bg-card p-4 text-sm">
        check your inbox at <span className="font-mono">{email}</span> for the link. it expires
        in 15 minutes.
      </div>
    );
  }

  return (
    <div className="mt-8 space-y-6">
      <form onSubmit={onMagicLink} className="space-y-3">
        <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
          email
        </label>
        <Input
          type="email"
          required
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
        />
        <Button type="submit" disabled={state === 'sending'} className="w-full">
          {state === 'sending' ? 'sending…' : 'send magic link'}
        </Button>
        {error ? <p className="text-xs text-destructive">{error}</p> : null}
      </form>

      {providers.github || providers.google ? (
        <div className="space-y-3">
          <div className="flex items-center gap-3 text-xs font-mono text-muted-foreground">
            <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
          </div>
          {providers.github ? (
            <Button variant="outline" className="w-full" onClick={() => onProvider('github')}>
              continue with github
            </Button>
          ) : null}
          {providers.google ? (
            <Button variant="outline" className="w-full" onClick={() => onProvider('google')}>
              continue with google
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
