import 'server-only';
import { anthropic, ANTHROPIC_MODEL } from './anthropic';

export interface SummaryInput {
  title: string;
  byline?: string | null;
  text: string;
}

const SYSTEM_PROMPT = [
  'You write tight 3-sentence summaries of a single article.',
  'Plain prose, no bullets. Active voice. Avoid hedging.',
  'Lead with the concrete claim of the piece. Second sentence is the key evidence or argument.',
  'Third sentence is the so-what — why this matters or who it changes things for.',
  'Never invent details, attributions, or numbers not in the source.',
  'Output the summary only — no preamble, no quotes around it.',
].join(' ');

/**
 * Stream a 3-sentence summary as an async iterator of text chunks.
 * Used by the Suspense boundary in the reader footer.
 */
export async function* streamSummary(input: SummaryInput): AsyncGenerator<string> {
  const userText = [
    `Title: ${input.title}`,
    input.byline ? `Byline: ${input.byline}` : undefined,
    '',
    'Article:',
    input.text.slice(0, 18_000),
  ]
    .filter(Boolean)
    .join('\n');

  const stream = await anthropic().messages.stream({
    model: ANTHROPIC_MODEL,
    max_tokens: 400,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userText }],
  });

  for await (const event of stream) {
    if (
      event.type === 'content_block_delta' &&
      event.delta.type === 'text_delta'
    ) {
      yield event.delta.text;
    }
  }
}

/** Block-style summary — used by the digest job and the API. */
export async function summarize(input: SummaryInput): Promise<string> {
  let out = '';
  for await (const chunk of streamSummary(input)) {
    out += chunk;
  }
  return out.trim();
}
