'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[tide] error boundary', error);
  }, [error]);

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="max-w-md w-full text-center space-y-4">
        <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
          tide · 500
        </p>
        <h1 className="font-mono text-2xl tracking-tight">that didn&apos;t work.</h1>
        <p className="text-sm text-muted-foreground">
          {error.digest ? (
            <>
              event ref <code className="font-mono">{error.digest}</code> — paste this in the
              issue if you file one.
            </>
          ) : (
            error.message
          )}
        </p>
        <div className="flex items-center justify-center gap-3">
          <Button onClick={reset} variant="outline">try again</Button>
          <Button asChild>
            <Link href="/library">back to library</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
