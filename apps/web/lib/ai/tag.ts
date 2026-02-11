import 'server-only';
import { anthropic, ANTHROPIC_MODEL } from './anthropic';
import { env } from '@/lib/env';

export interface TagInput {
  title: string;
  excerpt?: string | null;
  text: string;
}

const SYSTEM_PROMPT = [
  'You assign at most 3 topical tags to a single article.',
  'Tags are short (1-2 words), lowercase, kebab-case, broad enough to group related articles.',
  'Prefer concrete topical tags ("machine-learning", "rate-limiting", "real-estate") over generic ones ("technology", "news").',
  'Output ONLY a JSON array of strings. Nothing else. Example: ["postgres","rate-limiting","ops"]',
].join(' ');

export async function inferTags(input: TagInput): Promise<string[]> {
  if (!env.ANTHROPIC_API_KEY) return [];

  try {
    const userText = [
      `Title: ${input.title}`,
      input.excerpt ? `Excerpt: ${input.excerpt}` : undefined,
      '',
      input.text.slice(0, 6_000),
    ]
      .filter(Boolean)
      .join('\n');

    const res = await anthropic().messages.create({
      model: ANTHROPIC_MODEL,
      max_tokens: 80,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userText }],
    });

    const text = res.content
      .filter((c): c is { type: 'text'; text: string } => c.type === 'text')
      .map((c) => c.text)
      .join('');

    const match = /\[[^\]]*\]/.exec(text);
    if (!match) return [];
    const parsed: unknown = JSON.parse(match[0]);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((t) => (typeof t === 'string' ? t.toLowerCase().trim() : null))
      .filter((t): t is string => !!t && t.length > 0 && t.length <= 32)
      .slice(0, 3);
  } catch (err) {
    console.warn('[tag] inference failed', err);
    return [];
  }
}
