import 'server-only';
import { JSDOM, VirtualConsole } from 'jsdom';
import { Readability } from '@mozilla/readability';
import { detectSiteOverride, type SiteOverride } from './overrides';
import { estimateReadingMinutes, countWords } from './stats';
import { extractLeadImage } from './lead-image';
import { detectLang } from './lang';

export interface ExtractInput {
  url: string;
  html: string;
}

export interface ExtractedArticle {
  title: string;
  byline: string | null;
  siteName: string | null;
  lang: string;
  excerpt: string | null;
  leadImageUrl: string | null;
  contentHtml: string;
  contentText: string;
  wordCount: number;
  readingMinutes: number;
  canonicalUrl: string;
  override: SiteOverride | null;
}

export class ExtractError extends Error {
  constructor(
    message: string,
    public code: 'parse_failed' | 'too_short' | 'paywall_hit' | 'unknown',
  ) {
    super(message);
    this.name = 'ExtractError';
  }
}

const MIN_CHARS = 200;

export function extractArticle({ url, html }: ExtractInput): ExtractedArticle {
  const override = detectSiteOverride(url);

  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', () => {});
  // jsdom doesn't ship a network fetcher in our path — we feed in raw html.
  const dom = new JSDOM(html, { url, virtualConsole });
  const doc = dom.window.document;

  // Drop the obvious noise before Readability sees it (overrides supply their own list).
  const noisySelectors = override?.dropSelectors ?? [
    'script', 'style', 'noscript', 'iframe', 'svg.icon', '.newsletter',
    '.related-posts', '.paywall', '.subscribe', '.ad', '.advert',
    '[data-component="ad"]', '[aria-label*="advert" i]',
  ];
  for (const sel of noisySelectors) {
    doc.querySelectorAll(sel).forEach((el) => el.remove());
  }

  const canonical =
    doc.querySelector('link[rel="canonical"]')?.getAttribute('href') ??
    doc.querySelector('meta[property="og:url"]')?.getAttribute('content') ??
    url;

  const siteName =
    doc.querySelector('meta[property="og:site_name"]')?.getAttribute('content') ?? null;

  const reader = new Readability(doc, {
    charThreshold: override?.charThreshold ?? MIN_CHARS,
    keepClasses: false,
  });
  const result = reader.parse();

  if (!result || !result.content || result.length < MIN_CHARS) {
    if (override?.paywall && detectPaywall(html)) {
      throw new ExtractError(`paywall detected for ${url}`, 'paywall_hit');
    }
    throw new ExtractError(`extraction returned no usable content for ${url}`, 'too_short');
  }

  const lang =
    result.lang ?? doc.documentElement.lang?.trim() ?? detectLang(result.textContent ?? '');

  const leadImageUrl = extractLeadImage(doc, url, result.content);
  const wordCount = countWords(result.textContent ?? '');
  const readingMinutes = estimateReadingMinutes(wordCount);

  return {
    title: (override?.titleOverride?.(doc) ?? result.title ?? '').trim() || 'Untitled',
    byline: result.byline?.trim() || null,
    siteName: siteName?.trim() || result.siteName?.trim() || null,
    lang,
    excerpt: result.excerpt?.trim() || null,
    leadImageUrl,
    contentHtml: result.content,
    contentText: (result.textContent ?? '').trim(),
    wordCount,
    readingMinutes,
    canonicalUrl: canonical,
    override: override ?? null,
  };
}

function detectPaywall(html: string): boolean {
  const cues = [
    'subscribe to read',
    'subscribe to continue',
    'this article is for subscribers',
    'register to read',
    'paywall',
  ];
  const lc = html.toLowerCase();
  return cues.some((cue) => lc.includes(cue));
}
