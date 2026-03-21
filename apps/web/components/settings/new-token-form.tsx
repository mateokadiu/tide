'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createApiToken } from '@/app/(app)/settings/actions';

export function NewTokenForm() {
  const [name, setName] = useState('');
  const [created, setCreated] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await createApiToken(name);
      if (res.ok) setCreated(res.value.token);
      setName('');
    });
  }

  return (
    <div className="space-y-3">
      <form onSubmit={onSubmit} className="flex gap-2">
        <Input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="shortcuts.app, my-script.py, …"
          maxLength={80}
        />
        <Button type="submit" disabled={isPending || !name}>
          new token
        </Button>
      </form>
      {created ? (
        <div className="rounded-md border border-primary/40 bg-primary/5 p-3 text-xs">
          <p className="font-mono mb-2 text-muted-foreground">copy now — won't be shown again</p>
          <code className="block break-all bg-card px-2 py-1.5 rounded">{created}</code>
        </div>
      ) : null}
    </div>
  );
}
