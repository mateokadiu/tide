'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { saveArticle } from '@/app/(app)/save/actions';

export function SaveForm({ initialUrl }: { initialUrl?: string }) {
  const [url, setUrl] = useState(initialUrl ?? '');
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<
    | { kind: 'ok'; id: string; dedup: boolean }
    | { kind: 'err'; message: string }
    | null
  >(null);
  const router = useRouter();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await saveArticle({ url, source: 'web' });
      if (result.ok) {
        setFeedback({ kind: 'ok', id: result.value.id, dedup: result.value.deduplicated });
        setUrl('');
        // Bring the user to the library so they see the optimistic placeholder.
        setTimeout(() => router.push(`/library?just=${result.value.id}`), 250);
      } else {
        setFeedback({ kind: 'err', message: result.error.message });
      }
    });
  }

  return (
    <div className="mt-8 space-y-4">
      <form onSubmit={onSubmit} className="flex flex-col sm:flex-row gap-2">
        <Input
          type="url"
          required
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com/article"
          autoFocus
          className="flex-1"
        />
        <Button type="submit" disabled={isPending || !url}>
          {isPending ? 'saving…' : 'save'}
        </Button>
      </form>

      {feedback?.kind === 'ok' ? (
        <p className="text-xs text-muted-foreground">
          {feedback.dedup ? 'already saved — bumped to the top.' : 'queued for extraction.'}
        </p>
      ) : null}
      {feedback?.kind === 'err' ? (
        <p className="text-xs text-destructive">{feedback.message}</p>
      ) : null}

      <div className="rounded-md border border-border bg-card p-4 text-xs text-muted-foreground space-y-1">
        <p className="font-mono uppercase tracking-widest text-[10px]">tip</p>
        <p>install the browser extension to one-click-save from any tab.</p>
      </div>
    </div>
  );
}
