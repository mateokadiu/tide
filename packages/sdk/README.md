# @tide/sdk

Typed client for the [tide](https://github.com/mateokadiu/tide) REST API.
Mint a bearer token at `/settings`, then:

```ts
import { TideClient } from '@tide/sdk';

const tide = new TideClient({
  baseURL: 'https://your-tide.example',
  token: process.env.TIDE_TOKEN!,
});

await tide.saveArticle({
  url: 'https://danluu.com/cocktail-ideas/',
  tags: ['essays'],
});

const { items, nextCursor } = await tide.listArticles({ limit: 20 });
```

## API

### `new TideClient({ baseURL, token, fetch? })`

Constructs a client. `fetch` is overridable for environments without a global
fetch (e.g. older Node) or for instrumentation.

### `client.saveArticle(input): Promise<SaveArticleResponse>`

POSTs to `/api/v1/articles`. Returns the article id, canonical URL, and the
state (`pending` initially). Idempotent on `(user_id, canonical_url)` —
saving the same URL twice returns `deduplicated: true`.

### `client.listArticles({ limit?, cursor? }): Promise<ListArticlesResponse>`

GETs from `/api/v1/articles`. Cursor-paged on `(created_at desc, id desc)`.
The response's `nextCursor` is `null` once the library is exhausted.

## Errors

The client throws `TideApiError` for any non-2xx response. It carries the
HTTP status as `error.status`.

```ts
import { TideApiError } from '@tide/sdk';

try {
  await tide.saveArticle({ url: '…' });
} catch (err) {
  if (err instanceof TideApiError && err.status === 429) {
    // rate limited — back off and retry
  }
  throw err;
}
```

## License

MIT — same as the main repo.
