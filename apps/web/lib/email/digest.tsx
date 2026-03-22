import 'server-only';
import { Resend } from 'resend';
import { env } from '@/lib/env';

const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

export interface DigestUnreadItem {
  id: string;
  title: string;
  siteName: string | null;
  excerpt: string | null;
  readingMinutes: number | null;
}

export interface DigestEmail {
  to: string;
  saved: number;
  read: number;
  unread: DigestUnreadItem[];
}

export async function sendDigestEmail(payload: DigestEmail): Promise<void> {
  if (!resend) {
    if (env.isProd) throw new Error('RESEND_API_KEY required in production');
    console.info('[digest] would send to', payload.to, 'saved=', payload.saved, 'read=', payload.read);
    return;
  }
  const subject = `tide weekly · ${payload.saved} saved, ${payload.read} read`;
  const text = renderText(payload);
  const html = renderHtml(payload);
  await resend.emails.send({
    from: env.EMAIL_FROM,
    to: payload.to,
    subject,
    text,
    html,
  });
}

function renderText(p: DigestEmail): string {
  const lines: string[] = [
    'your tide week',
    '',
    `saved: ${p.saved}`,
    `read:  ${p.read}`,
    '',
    'top unread:',
  ];
  for (const u of p.unread) {
    lines.push(
      `  · ${u.title}${u.siteName ? ` — ${u.siteName}` : ''}${u.readingMinutes ? ` (${u.readingMinutes} min)` : ''}`,
    );
  }
  lines.push('', `${env.NEXT_PUBLIC_APP_URL}/library`);
  return lines.join('\n');
}

function renderHtml(p: DigestEmail): string {
  const items = p.unread
    .map(
      (u) => `
        <li style="margin:8px 0;font-family:-apple-system,BlinkMacSystemFont,sans-serif">
          <a href="${env.NEXT_PUBLIC_APP_URL}/reader/${u.id}" style="color:#0aa;text-decoration:none;font-weight:500">${escapeHtml(u.title)}</a>
          ${u.siteName ? `<div style="color:#888;font-size:12px;margin-top:2px">${escapeHtml(u.siteName)}${u.readingMinutes ? ` · ${u.readingMinutes} min` : ''}</div>` : ''}
        </li>`,
    )
    .join('');

  return `<!doctype html>
<html><body style="background:#111;color:#eee;font-family:-apple-system,BlinkMacSystemFont,sans-serif;padding:32px">
<div style="max-width:560px;margin:auto">
  <h1 style="font-family:'JetBrains Mono',monospace;font-size:18px;font-weight:500">~/tide · weekly</h1>
  <p style="color:#bbb;line-height:1.6">saved <b>${p.saved}</b> · read <b>${p.read}</b></p>
  <h2 style="font-family:'JetBrains Mono',monospace;font-size:13px;color:#888;text-transform:uppercase;letter-spacing:0.05em;margin-top:24px">top unread</h2>
  <ul style="list-style:none;padding:0">${items}</ul>
  <p style="margin-top:32px"><a href="${env.NEXT_PUBLIC_APP_URL}/library" style="color:#0aa">open library →</a></p>
</div>
</body></html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
