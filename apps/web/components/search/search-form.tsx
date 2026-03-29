'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils/cn';

const MODES = ['auto', 'fts', 'semantic'] as const;
type Mode = (typeof MODES)[number];

export function SearchForm({
  initialQuery,
  initialMode,
}: {
  initialQuery: string;
  initialMode: Mode;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [q, setQ] = useState(initialQuery);
  const [mode, setMode] = useState<Mode>(initialMode);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const sp = new URLSearchParams(params.toString());
    if (q.trim()) sp.set('q', q.trim());
    else sp.delete('q');
    if (mode !== 'auto') sp.set('mode', mode);
    else sp.delete('mode');
    router.push(`/search?${sp.toString()}`);
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3 sm:flex-row">
      <Input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="search your library…"
        className="font-mono flex-1"
        autoFocus
      />
      <div className="flex items-center gap-1 rounded-md border border-border bg-muted/30 p-1">
        {MODES.map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={cn(
              'rounded px-2 py-1 font-mono text-[11px] transition-colors',
              mode === m
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {m}
          </button>
        ))}
      </div>
      <Button type="submit" className="font-mono">
        search
      </Button>
    </form>
  );
}
