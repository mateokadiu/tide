'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface NotificationPayload {
  kind: 'extract.ok' | 'extract.failed' | 'summary.ready' | 'digest.ready' | 'embed.ok';
  articleId?: string;
  message?: string;
  ms?: number;
}

/**
 * Mounts an EventSource against the per-user SSE channel and toasts the
 * notifications. The library page revalidates when "extract.ok" arrives so the
 * pending placeholder flips into a ready row without a manual refresh.
 */
export function SseListener() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window === 'undefined' || !('EventSource' in window)) return;

    const es = new EventSource('/api/sse/notifications', { withCredentials: true });
    es.addEventListener('notification', (e) => {
      let payload: NotificationPayload;
      try {
        payload = JSON.parse((e as MessageEvent).data) as NotificationPayload;
      } catch {
        return;
      }
      if (payload.kind === 'extract.ok' || payload.kind === 'extract.failed') {
        router.refresh();
      }
      window.dispatchEvent(
        new CustomEvent('tide:notification', { detail: payload }),
      );
    });

    es.onerror = () => {
      // EventSource auto-reconnects; quietly let it.
    };

    return () => es.close();
  }, [router]);

  return null;
}
