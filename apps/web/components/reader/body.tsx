'use client';

import { useEffect, useRef, useState } from 'react';
import { createHighlight } from '@/app/reader/[id]/actions';

interface ReaderBodyProps {
  articleId: string;
  html: string;
  highlights: Array<{
    id: string;
    text: string;
    color: 'cyan' | 'yellow' | 'green' | 'blue' | 'pink';
    note: string | null;
  }>;
}

export function ReaderBody({ articleId, html, highlights }: ReaderBodyProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [selection, setSelection] = useState<{ text: string; x: number; y: number } | null>(null);

  useEffect(() => {
    function onSelectionChange() {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || !sel.rangeCount) {
        setSelection(null);
        return;
      }
      const range = sel.getRangeAt(0);
      const text = sel.toString().trim();
      if (!text || text.length < 4 || text.length > 4_000) {
        setSelection(null);
        return;
      }
      if (!ref.current?.contains(range.commonAncestorContainer)) {
        setSelection(null);
        return;
      }
      const rect = range.getBoundingClientRect();
      setSelection({ text, x: rect.left + rect.width / 2, y: rect.top - 8 });
    }
    document.addEventListener('selectionchange', onSelectionChange);
    return () => document.removeEventListener('selectionchange', onSelectionChange);
  }, []);

  async function onHighlight() {
    if (!selection) return;
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;
    const range = sel.getRangeAt(0);
    const xpath = (n: Node) => describeXPath(n, ref.current);
    await createHighlight({
      articleId,
      text: selection.text,
      startContainer: xpath(range.startContainer),
      endContainer: xpath(range.endContainer),
      startOffset: String(range.startOffset),
      endOffset: String(range.endOffset),
      color: 'cyan',
    });
    sel.removeAllRanges();
    setSelection(null);
    // optimistic: rely on revalidate, but also force a soft refresh
    if (typeof window !== 'undefined') location.reload();
  }

  // Apply highlight overlays after mount (the HTML is server-rendered, the
  // highlights are user-data layered on top).
  useEffect(() => {
    if (!ref.current || highlights.length === 0) return;
    for (const h of highlights) {
      // naive but reliable: wrap first text occurrence per highlight.
      try {
        wrapFirstMatch(ref.current, h.text, h.id);
      } catch {
        // ignore — re-extraction may change the DOM
      }
    }
  }, [highlights]);

  return (
    <>
      <div
        ref={ref}
        // biome-ignore lint/security/noDangerouslySetInnerHtml: server-sanitized
        dangerouslySetInnerHTML={{ __html: html }}
      />
      {selection ? (
        <button
          type="button"
          onClick={onHighlight}
          className="fixed z-50 -translate-x-1/2 -translate-y-full rounded-md bg-primary px-3 py-1.5 text-xs font-mono text-primary-foreground shadow-lg"
          style={{ left: selection.x, top: selection.y }}
        >
          highlight ↩
        </button>
      ) : null}
    </>
  );
}

function describeXPath(node: Node, root: HTMLElement | null): string {
  if (!root) return '';
  const parts: string[] = [];
  let n: Node | null = node;
  while (n && n !== root) {
    const p = n.parentNode;
    if (!p) break;
    const ix = Array.from(p.childNodes).indexOf(n as ChildNode);
    parts.unshift(String(ix));
    n = p;
  }
  return parts.join('/');
}

function wrapFirstMatch(root: HTMLElement, needle: string, hlId: string) {
  if (needle.length < 4) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node: Node | null;
  while ((node = walker.nextNode())) {
    const t = node as Text;
    const idx = t.data.indexOf(needle);
    if (idx >= 0) {
      const before = t.splitText(idx);
      const _after = before.splitText(needle.length);
      const span = document.createElement('mark');
      span.className = 'highlight';
      span.dataset.tideHl = hlId;
      span.textContent = needle;
      before.parentNode?.replaceChild(span, before);
      return;
    }
  }
}
