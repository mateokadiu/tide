import 'server-only';
import OpenAI from 'openai';
import { env } from '@/lib/env';

const VOYAGE_DIM = 1024;
const OPENAI_DIM = 1536;

/** Storage dimension is fixed (pgvector column is `vector(1024)`). */
export const EMBED_DIM = VOYAGE_DIM;

let openaiClient: OpenAI | null = null;

function openai(): OpenAI {
  if (openaiClient) return openaiClient;
  if (!env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY not configured');
  openaiClient = new OpenAI({ apiKey: env.OPENAI_API_KEY });
  return openaiClient;
}

async function embedViaVoyage(text: string): Promise<number[] | null> {
  if (!env.VOYAGE_API_KEY) return null;
  try {
    const res = await fetch('https://api.voyageai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${env.VOYAGE_API_KEY}`,
      },
      body: JSON.stringify({
        input: text,
        model: env.VOYAGE_MODEL,
        input_type: 'document',
      }),
    });
    if (!res.ok) {
      console.warn(`[embed] voyage returned ${res.status} — falling back`);
      return null;
    }
    const json = (await res.json()) as { data?: { embedding: number[] }[] };
    return json.data?.[0]?.embedding ?? null;
  } catch (err) {
    console.warn('[embed] voyage threw — falling back', err);
    return null;
  }
}

async function embedViaOpenAI(text: string): Promise<number[] | null> {
  if (!env.OPENAI_API_KEY) return null;
  try {
    const res = await openai().embeddings.create({
      input: text,
      model: env.OPENAI_EMBEDDING_MODEL,
    });
    const v = res.data[0]?.embedding;
    if (!v) return null;

    // OpenAI returns 1536-d; project down to 1024-d using head-truncation + L2 renorm.
    // Voyage 3.5 also returns 1024-d, so we can store both shapes in the same column.
    if (v.length === VOYAGE_DIM) return v;
    if (v.length < VOYAGE_DIM) return null;
    const truncated = v.slice(0, VOYAGE_DIM);
    const norm = Math.sqrt(truncated.reduce((s, x) => s + x * x, 0));
    return norm === 0 ? truncated : truncated.map((x) => x / norm);
  } catch (err) {
    console.warn('[embed] openai failed', err);
    return null;
  }
}

export async function embedText(text: string): Promise<number[] | null> {
  const voyage = await embedViaVoyage(text);
  if (voyage) {
    if (voyage.length === VOYAGE_DIM) return voyage;
    console.warn(`[embed] voyage returned unexpected dim=${voyage.length}; falling back`);
  }
  return embedViaOpenAI(text);
}

export async function embedQuery(text: string): Promise<number[] | null> {
  // Voyage uses input_type=query for retrieval-side prompts. We bias toward
  // semantic match rather than document-style indexing.
  if (env.VOYAGE_API_KEY) {
    try {
      const res = await fetch('https://api.voyageai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${env.VOYAGE_API_KEY}`,
        },
        body: JSON.stringify({
          input: text,
          model: env.VOYAGE_MODEL,
          input_type: 'query',
        }),
      });
      if (res.ok) {
        const json = (await res.json()) as { data?: { embedding: number[] }[] };
        const v = json.data?.[0]?.embedding;
        if (v && v.length === VOYAGE_DIM) return v;
      }
    } catch {
      // fall through
    }
  }
  return embedViaOpenAI(text);
}

// Suppress unused-warning for OPENAI_DIM since it documents the upstream shape.
void OPENAI_DIM;
