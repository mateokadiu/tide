import Link from 'next/link';
import { Button } from '@/components/ui/button';

export function AppNav() {
  return (
    <nav className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/65">
      <div className="mx-auto max-w-6xl px-6 h-14 flex items-center justify-between">
        <Link href="/library" className="font-mono text-sm tracking-tight">
          ~/tide
        </Link>

        <div className="flex items-center gap-1 sm:gap-3 text-xs font-mono">
          <Link
            href="/library"
            className="px-2 py-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
          >
            library
          </Link>
          <Link
            href="/library?filter=archived"
            className="px-2 py-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground hidden sm:inline"
          >
            archive
          </Link>
          <Link
            href="/library?filter=highlighted"
            className="px-2 py-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground hidden sm:inline"
          >
            highlights
          </Link>
          <Link
            href="/settings"
            className="px-2 py-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
          >
            settings
          </Link>
          <Button asChild size="sm" className="ml-2">
            <Link href="/save">save</Link>
          </Button>
        </div>
      </div>
    </nav>
  );
}
