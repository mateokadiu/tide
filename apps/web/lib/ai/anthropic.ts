import 'server-only';
import Anthropic from '@anthropic-ai/sdk';
import { env } from '@/lib/env';

let client: Anthropic | null = null;

export function anthropic(): Anthropic {
  if (!env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY not configured');
  }
  if (client) return client;
  client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  return client;
}

export const ANTHROPIC_MODEL = env.ANTHROPIC_MODEL;
