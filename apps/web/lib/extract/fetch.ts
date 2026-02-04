import 'server-only';

const USER_AGENT =
  'Mozilla/5.0 (compatible; tide-bot/0.1; +https://github.com/mateokadiu/tide)';

const TIMEOUT_MS = 15_000;

export interface FetchedPage {
  html: string;
  finalUrl: string;
  status: number;
  contentType: string | null;
}

export async function fetchPage(url: string): Promise<FetchedPage> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: {
        'user-agent': USER_AGENT,
        accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'accept-language': 'en-US,en;q=0.8',
      },
      redirect: 'follow',
      signal: controller.signal,
    });
    const html = await res.text();
    return {
      html,
      finalUrl: res.url,
      status: res.status,
      contentType: res.headers.get('content-type'),
    };
  } finally {
    clearTimeout(t);
  }
}
