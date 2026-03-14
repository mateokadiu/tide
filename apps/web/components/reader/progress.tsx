'use client';

import { useEffect, useRef } from 'react';
import { updateProgress } from '@/app/reader/[id]/actions';

export function ReaderProgress({ articleId, initial }: { articleId: string; initial: number }) {
  const lastSent = useRef(initial);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initial > 0 && initial < 1) {
      // restore scroll position on mount
      const target = window.scrollY + (initial * document.body.scrollHeight - window.scrollY);
      window.scrollTo({ top: Math.max(0, target - 80), behavior: 'auto' });
    }

    function onScroll() {
      const max = document.body.scrollHeight - window.innerHeight;
      const ratio = max <= 0 ? 0 : Math.min(1, Math.max(0, window.scrollY / max));
      if (barRef.current) barRef.current.style.width = `${ratio * 100}%`;
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        if (Math.abs(ratio - lastSent.current) > 0.04 || (ratio >= 0.98 && lastSent.current < 0.98)) {
          lastSent.current = ratio;
          void updateProgress(articleId, ratio);
        }
      }, 1000);
    }
    document.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      document.removeEventListener('scroll', onScroll);
      if (timer.current) clearTimeout(timer.current);
    };
  }, [articleId, initial]);

  return (
    <div className="fixed top-0 left-0 z-40 h-0.5 w-full bg-transparent">
      <div ref={barRef} className="h-full bg-primary transition-[width] duration-150" style={{ width: `${initial * 100}%` }} />
    </div>
  );
}
