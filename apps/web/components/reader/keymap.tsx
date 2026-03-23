'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface KeymapProps {
  articleId: string;
  onArchive: () => void;
  onStar: () => void;
  onMarkRead: () => void;
}

/**
 * Reader keyboard shortcuts.
 *   j  → next paragraph
 *   k  → previous paragraph
 *   m  → mark as read
 *   a  → archive
 *   s  → star
 *   ?  → show shortcut help
 *   esc → back to library
 */
export function ReaderKeymap({ onArchive, onStar, onMarkRead }: KeymapProps) {
  const router = useRouter();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable) {
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      switch (e.key) {
        case 'j':
        case 'J':
          jump(1);
          break;
        case 'k':
        case 'K':
          jump(-1);
          break;
        case 'm':
        case 'M':
          onMarkRead();
          break;
        case 'a':
        case 'A':
          onArchive();
          break;
        case 's':
        case 'S':
          onStar();
          break;
        case 'Escape':
          router.push('/library');
          break;
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [router, onArchive, onStar, onMarkRead]);

  return null;
}

function jump(direction: 1 | -1) {
  const paras = Array.from(document.querySelectorAll<HTMLElement>('.reader-prose p, .reader-prose h2, .reader-prose h3'));
  if (paras.length === 0) return;
  const y = window.scrollY + 80;
  let idx = -1;
  for (let i = 0; i < paras.length; i++) {
    const node = paras[i];
    if (!node) continue;
    const top = node.getBoundingClientRect().top + window.scrollY;
    if (top > y) {
      idx = direction === 1 ? i : i - 2;
      break;
    }
  }
  if (idx < 0) idx = paras.length - 1;
  const target = paras[Math.max(0, Math.min(paras.length - 1, idx))];
  target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
