import 'server-only';

export interface SiteOverride {
  hostMatch: RegExp;
  charThreshold?: number;
  paywall?: boolean;
  dropSelectors?: string[];
  titleOverride?: (doc: Document) => string | null;
  notes?: string;
}

const OVERRIDES: SiteOverride[] = [
  {
    hostMatch: /(^|\.)substack\.com$/i,
    charThreshold: 120,
    dropSelectors: [
      '.subscribe-widget',
      '.subscription-widget',
      '.share-dialog',
      '.post-end-share',
      '.button.primary',
      'div[class*="paywall"]',
    ],
    notes: 'substack — strip subscribe widgets, lower char threshold for short newsletters.',
  },
  {
    hostMatch: /(^|\.)medium\.com$/i,
    charThreshold: 180,
    dropSelectors: [
      '[data-source="post_navigation_button"]',
      '[aria-label="responses"]',
      '.bubble',
      '.signin-prompt',
      '[data-testid="audioPlayButton"]',
    ],
    notes: 'medium — strip clap buttons, audio player, responses bubble.',
  },
  {
    hostMatch: /(^|\.)nytimes\.com$/i,
    paywall: true,
    dropSelectors: [
      '[data-testid="onsite-messaging-unit"]',
      '[aria-label="Subscribe"]',
      '.subscribe-block',
    ],
    notes: 'nyt — known paywall; flag it so the worker can fall back to archive view.',
  },
  {
    hostMatch: /(^|\.)wsj\.com$/i,
    paywall: true,
    notes: 'wsj — hard paywall; same fallback as nyt.',
  },
  {
    hostMatch: /(^|\.)dev\.to$/i,
    charThreshold: 140,
    dropSelectors: ['.crayons-card--secondary', '#articles-list', '.spec__followers'],
    notes: 'dev.to — strip sidebar follow widgets.',
  },
  {
    hostMatch: /(^|\.)arxiv\.org$/i,
    charThreshold: 80,
    titleOverride: (doc) => {
      const t = doc.querySelector('.title')?.textContent;
      return t?.replace(/^Title:\s*/, '').trim() ?? null;
    },
    notes: 'arxiv — pull title from .title node, lower threshold for abstracts.',
  },
  {
    hostMatch: /(^|\.)bbc\.(co\.uk|com)$/i,
    dropSelectors: ['.ssrcss-1xeh4nm-PromoContainer', '[data-component="links-block"]'],
    notes: 'bbc — strip promo / related blocks.',
  },
  {
    hostMatch: /(^|\.)github\.com$/i,
    titleOverride: (doc) => {
      const t = doc.querySelector('h1.entry-title')?.textContent;
      return t?.trim() ?? null;
    },
    notes: 'github readme — prefer the repo name as title.',
  },
];

export function detectSiteOverride(urlStr: string): SiteOverride | undefined {
  try {
    const host = new URL(urlStr).hostname;
    return OVERRIDES.find((o) => o.hostMatch.test(host));
  } catch {
    return undefined;
  }
}

export function listOverrides(): readonly SiteOverride[] {
  return OVERRIDES;
}
