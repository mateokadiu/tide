'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';

interface ListenButtonProps {
  articleId: string;
}

export function ListenButton({ articleId }: ListenButtonProps) {
  const [state, setState] = useState<'idle' | 'playing' | 'paused'>('idle');
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setSupported(false);
    }
    return () => {
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    };
  }, []);

  if (!supported) return null;

  function play() {
    const root = document.querySelector<HTMLElement>('.reader-prose');
    if (!root) return;
    const paras = Array.from(root.querySelectorAll<HTMLElement>('p, h2, h3, blockquote'));
    if (paras.length === 0) return;

    window.speechSynthesis.cancel();
    let idx = 0;
    function next() {
      if (idx >= paras.length) {
        setState('idle');
        return;
      }
      const node = paras[idx]!;
      idx++;
      const text = node.textContent?.trim() ?? '';
      if (!text) return next();
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 1.05;
      u.onend = () => {
        node.style.background = '';
        next();
      };
      node.style.background = 'oklch(0.78 0.13 195 / 0.1)';
      window.speechSynthesis.speak(u);
    }
    setState('playing');
    next();
    void articleId;
  }

  function pause() {
    if (state === 'playing') {
      window.speechSynthesis.pause();
      setState('paused');
    } else if (state === 'paused') {
      window.speechSynthesis.resume();
      setState('playing');
    }
  }

  function stop() {
    window.speechSynthesis.cancel();
    setState('idle');
  }

  return (
    <div className="flex items-center gap-1">
      {state === 'idle' ? (
        <Button size="sm" variant="ghost" onClick={play} aria-label="listen">
          ▶ listen
        </Button>
      ) : (
        <>
          <Button size="sm" variant="ghost" onClick={pause}>
            {state === 'paused' ? '▶' : '⏸'}
          </Button>
          <Button size="sm" variant="ghost" onClick={stop}>
            ◼
          </Button>
        </>
      )}
    </div>
  );
}
