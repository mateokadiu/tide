import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="max-w-md w-full text-center space-y-4">
        <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
          tide · 404
        </p>
        <h1 className="font-mono text-2xl tracking-tight">that&apos;s not in your library.</h1>
        <p className="text-sm text-muted-foreground">
          the article may have been deleted, archived without a slug, or never existed.
        </p>
        <Button asChild>
          <Link href="/library">back to library</Link>
        </Button>
      </div>
    </main>
  );
}
