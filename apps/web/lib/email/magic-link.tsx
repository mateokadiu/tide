import 'server-only';
import { Resend } from 'resend';
import { env } from '@/lib/env';

const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

export async function sendMagicLinkEmail({ email, url }: { email: string; url: string }) {
  if (!resend) {
    // Dev fallback — log to stdout; never silently drop in prod.
    if (env.isProd) {
      throw new Error('RESEND_API_KEY required in production');
    }
    console.info(`[magic-link] ${email} → ${url}`);
    return;
  }
  await resend.emails.send({
    from: env.EMAIL_FROM,
    to: email,
    subject: 'sign in to tide',
    text: `Click to sign in:\n\n${url}\n\nIf you didn't request this, ignore the email.`,
    html: `<p>Click to sign in to tide:</p><p><a href="${url}">${url}</a></p><p style="color:#888;font-size:12px">If you didn't request this, ignore the email.</p>`,
  });
}
