'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils/cn';

const FILTERS = [
  { key: 'inbox', label: 'inbox' },
  { key: 'archived', label: 'archive' },
  { key: 'starred', label: 'starred' },
  { key: 'highlighted', label: 'highlighted' },
] as const;

export function LibraryFilters({ active }: { active: string }) {
  const path = usePathname();
  const sp = useSearchParams();

  return (
    <nav className="flex flex-wrap gap-1 text-xs font-mono">
      {FILTERS.map((f) => {
        const params = new URLSearchParams(sp);
        if (f.key === 'inbox') params.delete('filter');
        else params.set('filter', f.key);
        const href = `${path}?${params.toString()}`;
        return (
          <Link
            key={f.key}
            href={href}
            className={cn(
              'rounded-md px-3 py-1.5 transition',
              active === f.key
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            {f.label}
          </Link>
        );
      })}
    </nav>
  );
}
