import type { NextRequest } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { redis } from '@/lib/jobs/queue';

/**
 * Server-Sent Events fan-out for the notification surface.
 *
 * Wire format:
 *   event: notification
 *   data: {"kind":"extract.ok","articleId":"...","ms":1234}
 *
 * Backed by a Redis pub/sub channel — workers publish, this endpoint forwards.
 */
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session?.user) {
    return new Response('unauthorized', { status: 401 });
  }
  const userId = session.user.id;
  const channel = `tide:notifications:${userId}`;

  const encoder = new TextEncoder();
  const sub = redis().duplicate();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      function send(event: string, data: string) {
        controller.enqueue(encoder.encode(`event: ${event}\n`));
        controller.enqueue(encoder.encode(`data: ${data}\n\n`));
      }

      send('ready', JSON.stringify({ userId, ts: Date.now() }));

      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(':\n\n'));
        } catch {
          clearInterval(heartbeat);
        }
      }, 25_000);

      await sub.subscribe(channel);
      sub.on('message', (_ch, payload) => {
        try {
          send('notification', payload);
        } catch {
          // controller closed
        }
      });

      req.signal.addEventListener('abort', () => {
        clearInterval(heartbeat);
        void sub.unsubscribe(channel);
        void sub.quit();
        controller.close();
      });
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      'content-type': 'text/event-stream',
      'cache-control': 'no-cache, no-transform',
      connection: 'keep-alive',
      'x-accel-buffering': 'no',
    },
  });
}
