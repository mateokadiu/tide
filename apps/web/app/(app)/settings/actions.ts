'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { mintApiToken } from '@/lib/auth/api-token';
import { requireUser } from '@/lib/auth/session';
import { err, ok, type Result } from '@/lib/types/result';

const NameSchema = z.string().min(1).max(80);

export async function createApiToken(
  rawName: string,
): Promise<Result<{ token: string; prefix: string; id: string }>> {
  const user = await requireUser();
  const parsed = NameSchema.safeParse(rawName);
  if (!parsed.success) return err('invalid_input', 'token name is required');

  const minted = await mintApiToken({
    userId: user.id,
    name: parsed.data,
    scopes: 'articles:write,articles:read',
  });
  revalidatePath('/settings');
  return ok(minted);
}
