import { z } from 'zod';

export const SaveArticleRequest = z.object({
  url: z.string().url(),
  title: z.string().min(1).max(500).optional(),
  tags: z.array(z.string().min(1).max(64)).max(20).optional(),
  archived: z.boolean().optional(),
  starred: z.boolean().optional(),
});

export type SaveArticleRequest = z.infer<typeof SaveArticleRequest>;

export const SaveArticleResponse = z.object({
  id: z.string().uuid(),
  url: z.string().url(),
  canonicalUrl: z.string().url(),
  state: z.enum(['pending', 'extracting', 'ready', 'failed']),
  createdAt: z.string(),
  deduplicated: z.boolean(),
});

export type SaveArticleResponse = z.infer<typeof SaveArticleResponse>;

export class TideApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
  ) {
    super(message);
    this.name = 'TideApiError';
  }
}

export interface TideClientOptions {
  baseURL: string;
  token: string;
  fetch?: typeof fetch;
}

export class TideClient {
  private readonly baseURL: string;
  private readonly token: string;
  private readonly fetcher: typeof fetch;

  constructor(opts: TideClientOptions) {
    this.baseURL = opts.baseURL.replace(/\/$/, '');
    this.token = opts.token;
    this.fetcher = opts.fetch ?? fetch;
  }

  async saveArticle(input: SaveArticleRequest): Promise<SaveArticleResponse> {
    const body = SaveArticleRequest.parse(input);
    const res = await this.fetcher(`${this.baseURL}/api/v1/articles`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${this.token}`,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new TideApiError(text || res.statusText, res.status);
    }
    const json: unknown = await res.json();
    return SaveArticleResponse.parse(json);
  }
}

export default TideClient;
