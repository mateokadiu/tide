import { describe, expect, it } from 'vitest';
import {
  SaveArticleRequest,
  SaveArticleResponse,
  TideApiError,
  TideClient,
} from '../src/index';

describe('SaveArticleRequest schema', () => {
  it('accepts a minimal valid input', () => {
    const out = SaveArticleRequest.parse({ url: 'https://example.com/x' });
    expect(out.url).toBe('https://example.com/x');
  });

  it('rejects non-url strings', () => {
    expect(() => SaveArticleRequest.parse({ url: 'not-a-url' })).toThrow();
  });

  it('accepts the optional shape', () => {
    const out = SaveArticleRequest.parse({
      url: 'https://example.com/x',
      title: 'hi',
      tags: ['ops', 'systems'],
      starred: true,
      archived: false,
    });
    expect(out.tags).toEqual(['ops', 'systems']);
  });

  it('caps tag length', () => {
    expect(() =>
      SaveArticleRequest.parse({
        url: 'https://example.com/x',
        tags: Array.from({ length: 25 }, (_, i) => `t${i}`),
      }),
    ).toThrow();
  });
});

describe('SaveArticleResponse schema', () => {
  it('parses a server response', () => {
    const out = SaveArticleResponse.parse({
      id: '00000000-0000-0000-0000-000000000001',
      url: 'https://example.com/x',
      canonicalUrl: 'https://example.com/x',
      state: 'pending',
      createdAt: new Date().toISOString(),
      deduplicated: false,
    });
    expect(out.state).toBe('pending');
  });

  it('rejects unknown state', () => {
    expect(() =>
      SaveArticleResponse.parse({
        id: '00000000-0000-0000-0000-000000000001',
        url: 'https://example.com/x',
        canonicalUrl: 'https://example.com/x',
        state: 'gibberish',
        createdAt: new Date().toISOString(),
        deduplicated: false,
      }),
    ).toThrow();
  });
});

describe('TideClient', () => {
  it('sends a bearer token and parses the response', async () => {
    const fakeRes = {
      id: '00000000-0000-0000-0000-000000000001',
      url: 'https://example.com/x',
      canonicalUrl: 'https://example.com/x',
      state: 'pending' as const,
      createdAt: new Date().toISOString(),
      deduplicated: false,
    };
    const fetchMock = async (input: RequestInfo | URL, init?: RequestInit) => {
      const headers = init?.headers as Record<string, string>;
      expect(headers.authorization).toBe('Bearer tide_pat_abc');
      expect(String(input)).toBe('https://tide.test/api/v1/articles');
      return new Response(JSON.stringify(fakeRes), {
        status: 201,
        headers: { 'content-type': 'application/json' },
      });
    };
    const client = new TideClient({
      baseURL: 'https://tide.test',
      token: 'tide_pat_abc',
      fetch: fetchMock as unknown as typeof fetch,
    });
    const r = await client.saveArticle({ url: 'https://example.com/x' });
    expect(r.id).toBe(fakeRes.id);
    expect(r.state).toBe('pending');
  });

  it('throws TideApiError on non-2xx', async () => {
    const fetchMock = async () => new Response('rate limited', { status: 429 });
    const client = new TideClient({
      baseURL: 'https://tide.test',
      token: 'tide_pat_abc',
      fetch: fetchMock as unknown as typeof fetch,
    });
    await expect(client.saveArticle({ url: 'https://example.com/x' })).rejects.toBeInstanceOf(
      TideApiError,
    );
  });

  it('lists articles via GET /api/v1/articles', async () => {
    const fakeRes = {
      items: [
        {
          id: '00000000-0000-0000-0000-000000000001',
          url: 'https://example.com/x',
          canonicalUrl: 'https://example.com/x',
          title: 'x',
          excerpt: null,
          state: 'ready' as const,
          isRead: false,
          isStarred: false,
          isArchived: false,
          readingMinutes: 4,
          createdAt: new Date().toISOString(),
        },
      ],
      nextCursor: '2026-03-01T00:00:00Z:abc',
    };
    const fetchMock = async (input: RequestInfo | URL) => {
      expect(String(input)).toBe('https://tide.test/api/v1/articles?limit=10');
      return new Response(JSON.stringify(fakeRes), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    };
    const client = new TideClient({
      baseURL: 'https://tide.test',
      token: 'tide_pat_abc',
      fetch: fetchMock as unknown as typeof fetch,
    });
    const out = await client.listArticles({ limit: 10 });
    expect(out.items).toHaveLength(1);
    expect(out.nextCursor).toBeTruthy();
  });
});
