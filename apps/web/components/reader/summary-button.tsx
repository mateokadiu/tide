'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { generateSummary } from '@/app/reader/[id]/summarize-action';

export function SummaryButton({ articleId }: { articleId: string }) {
  const [state, setState] = useState<'idle' | 'streaming' | 'done' | 'error'>('idle');
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function go() {
    setState('streaming');
    setText('');
    setError(null);
    try {
      const stream = await generateSummary(articleId);
      const reader = stream.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        setText((prev) => prev + decoder.decode(value, { stream: true }));
      }
      setState('done');
    } catch (err) {
      setState('error');
      setError(err instanceof Error ? err.message : 'summary failed');
    }
  }

  if (state === 'idle') {
    return (
      <div className="flex items-center gap-3">
        <Button onClick={go} variant="outline" size="sm">
          ✦ summarise (3 sentences)
        </Button>
        <span className="text-xs text-muted-foreground">on-demand · uses your anthropic key</span>
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className="space-y-2">
        <p className="text-sm text-destructive">summary failed — {error}</p>
        <Button onClick={go} variant="outline" size="sm">
          retry
        </Button>
      </div>
    );
  }

  return (
    <p className="text-base leading-relaxed whitespace-pre-wrap">
      {text}
      {state === 'streaming' ? (
        <span className="inline-block w-1.5 h-4 bg-primary ml-0.5 animate-pulse align-text-bottom" />
      ) : null}
    </p>
  );
}
