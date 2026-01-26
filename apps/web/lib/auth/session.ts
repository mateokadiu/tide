import 'server-only';
import { cache } from 'react';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { auth } from './index';

/** Cached for the duration of an RSC render. */
export const getSession = cache(async () => {
  const session = await auth.api.getSession({ headers: await headers() });
  return session ?? null;
});

export async function requireUser() {
  const session = await getSession();
  if (!session?.user) redirect('/login');
  return session.user;
}

export async function getUserOrNull() {
  const session = await getSession();
  return session?.user ?? null;
}
