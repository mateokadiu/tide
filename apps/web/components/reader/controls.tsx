'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils/cn';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/components/theme-provider';

export type ReaderPrefs = {
  font: 'serif' | 'sans' | 'mono';
  size: 'sm' | 'md' | 'lg' | 'xl';
  width: 'narrow' | 'medium' | 'wide';
  theme: 'dark' | 'light' | 'sepia';
  justified: boolean;
  bionic: boolean;
};

const FONTS = ['serif', 'sans', 'mono'] as const;
const SIZES = ['sm', 'md', 'lg', 'xl'] as const;
const WIDTHS = ['narrow', 'medium', 'wide'] as const;
const THEMES = ['dark', 'light', 'sepia'] as const;

export function ReaderControls({ initial }: { initial: ReaderPrefs }) {
  const [open, setOpen] = useState(false);
  const [prefs, setPrefs] = useState<ReaderPrefs>(initial);
  const { setTheme } = useTheme();

  useEffect(() => {
    const stored = localStorage.getItem('tide.reader');
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as ReaderPrefs;
        setPrefs(parsed);
        applyPrefs(parsed);
      } catch {
        // ignore
      }
    } else {
      applyPrefs(initial);
    }
  }, [initial]);

  function update(next: Partial<ReaderPrefs>) {
    const merged: ReaderPrefs = { ...prefs, ...next };
    setPrefs(merged);
    localStorage.setItem('tide.reader', JSON.stringify(merged));
    applyPrefs(merged);
    if (next.theme) setTheme(next.theme);
  }

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="sm"
        className="font-mono text-xs"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        Aa
      </Button>
      {open ? (
        <dialog
          open
          className="absolute right-0 top-10 z-40 w-72 rounded-lg border border-border bg-popover p-4 shadow-xl block static"
          aria-label="reader controls"
        >
          <Row label="font">
            {FONTS.map((f) => (
              <Pill key={f} active={prefs.font === f} onClick={() => update({ font: f })}>
                {f}
              </Pill>
            ))}
          </Row>
          <Row label="size">
            {SIZES.map((s) => (
              <Pill key={s} active={prefs.size === s} onClick={() => update({ size: s })}>
                {s}
              </Pill>
            ))}
          </Row>
          <Row label="width">
            {WIDTHS.map((w) => (
              <Pill key={w} active={prefs.width === w} onClick={() => update({ width: w })}>
                {w}
              </Pill>
            ))}
          </Row>
          <Row label="theme">
            {THEMES.map((t) => (
              <Pill key={t} active={prefs.theme === t} onClick={() => update({ theme: t })}>
                {t}
              </Pill>
            ))}
          </Row>
          <Row label="extras">
            <Pill active={prefs.justified} onClick={() => update({ justified: !prefs.justified })}>
              justified
            </Pill>
            <Pill active={prefs.bionic} onClick={() => update({ bionic: !prefs.bionic })}>
              bionic
            </Pill>
          </Row>
        </dialog>
      ) : null}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[3.5rem_1fr] items-center gap-2 py-1.5">
      <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      <div className="flex flex-wrap gap-1">{children}</div>
    </div>
  );
}

function Pill({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-md px-2 py-1 font-mono text-[11px] transition-colors',
        active
          ? 'bg-primary text-primary-foreground'
          : 'bg-muted text-muted-foreground hover:text-foreground',
      )}
    >
      {children}
    </button>
  );
}

function applyPrefs(p: ReaderPrefs) {
  const el = document.querySelector<HTMLElement>('.reader-prose');
  if (!el) return;
  el.dataset.font = p.font;
  el.dataset.size = p.size;
  el.dataset.width = p.width;
  el.dataset.justified = String(p.justified);
  el.classList.toggle('bionic', p.bionic);
  if (p.bionic) bionicTransform(el);
  document.documentElement.dataset.theme = p.theme;
}

function bionicTransform(root: HTMLElement) {
  // mark mid-word text nodes with <em> on the first half of each word.
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  let node = walker.nextNode();
  while (node) {
    nodes.push(node as Text);
    node = walker.nextNode();
  }
  for (const t of nodes) {
    if (t.parentElement?.classList.contains('bionic-applied')) continue;
    const parts = t.data.split(/(\s+)/);
    if (parts.length === 1) continue;
    const frag = document.createDocumentFragment();
    for (const part of parts) {
      if (/\s+/.test(part) || part.length < 3) {
        frag.appendChild(document.createTextNode(part));
        continue;
      }
      const half = Math.ceil(part.length / 2);
      const em = document.createElement('em');
      em.textContent = part.slice(0, half);
      frag.appendChild(em);
      frag.appendChild(document.createTextNode(part.slice(half)));
    }
    const wrapper = document.createElement('span');
    wrapper.classList.add('bionic-applied');
    wrapper.appendChild(frag);
    t.replaceWith(wrapper);
  }
}
