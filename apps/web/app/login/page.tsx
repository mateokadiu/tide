import Link from 'next/link';
import { LoginForm } from '@/components/login-form';
import { env } from '@/lib/env';

export const metadata = { title: 'sign in' };

export default function LoginPage() {
  const providers = {
    github: !!env.GITHUB_CLIENT_ID,
    google: !!env.GOOGLE_CLIENT_ID,
  };

  return (
    <main className="mx-auto max-w-md px-6 pt-24 pb-16">
      <Link href="/" className="font-mono text-sm text-muted-foreground hover:text-foreground">
        ← back
      </Link>

      <h1 className="font-mono text-3xl mt-8 tracking-tight">sign in</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        magic links keep things simple. no passwords.
      </p>

      <LoginForm providers={providers} />

      <p className="mt-6 text-xs text-muted-foreground">
        new here?{' '}
        <Link href="/signup" className="text-foreground underline underline-offset-4">
          create an account
        </Link>
      </p>
    </main>
  );
}
