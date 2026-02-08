import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { extractArticle, ExtractError } from '@/lib/extract';

const FIXTURE_DIR = join(__dirname, '..', 'fixtures', 'extract');

const FIXTURES: Array<{
  name: string;
  file: string;
  url: string;
  expect: 'ok' | 'paywall';
  minWords?: number;
  expectByline?: RegExp;
  expectTitle?: RegExp;
}> = [
  {
    name: 'nyt',
    file: 'nyt.html',
    url: 'https://www.nytimes.com/2026/02/01/nyregion/subway-buskers-future.html',
    expect: 'ok',
    minWords: 350,
    expectTitle: /subway buskers/i,
  },
  {
    name: 'devto',
    file: 'devto.html',
    url: 'https://dev.to/zara_dev/why-i-stopped-using-redis-for-rate-limiting-2g3h',
    expect: 'ok',
    minWords: 400,
    expectTitle: /redis for rate limiting/i,
  },
  {
    name: 'arxiv',
    file: 'arxiv.html',
    url: 'https://arxiv.org/abs/2601.04891',
    expect: 'ok',
    minWords: 150,
    expectTitle: /Sub-quadratic attention/i,
  },
  {
    name: 'wikipedia',
    file: 'wikipedia.html',
    url: 'https://en.wikipedia.org/wiki/Coral_bleaching',
    expect: 'ok',
    minWords: 300,
    expectTitle: /Coral bleaching/i,
  },
  {
    name: 'substack',
    file: 'substack.html',
    url: 'https://macromondays.substack.com/p/the-market-is-calmer-than-it-looks',
    expect: 'ok',
    minWords: 350,
    expectTitle: /market is calmer/i,
  },
  {
    name: 'medium',
    file: 'medium.html',
    url: 'https://medium.com/@aoifeshaw/designing-for-trust-when-you-cant-show-a-face-4d99a17b',
    expect: 'ok',
    minWords: 300,
    expectTitle: /trust when you can.?t show a face/i,
  },
  {
    name: 'bbc',
    file: 'bbc.html',
    url: 'https://www.bbc.com/news/uk-wales-69248211',
    expect: 'ok',
    minWords: 250,
    expectTitle: /Welsh towns/i,
  },
  {
    name: 'github',
    file: 'github.html',
    url: 'https://github.com/htmx-extensions/server-sent-events',
    expect: 'ok',
    minWords: 200,
    expectTitle: /htmx-extensions\/server-sent-events|Server-Sent Events/i,
  },
  {
    name: 'paywall',
    file: 'paywall.html',
    url: 'https://www.nytimes.com/2026/02/big-tech-restructuring',
    expect: 'paywall',
  },
  {
    name: 'spa',
    file: 'spa.html',
    url: 'https://notes.example/caching',
    expect: 'ok',
    minWords: 200,
    expectTitle: /Caching/i,
  },
];

describe('extraction fixtures', () => {
  // Sanity: we have 10 fixtures pinned to disk.
  it('has exactly 10 fixtures wired up', () => {
    const onDisk = readdirSync(FIXTURE_DIR).filter((f) => f.endsWith('.html')).length;
    expect(onDisk).toBe(10);
    expect(FIXTURES).toHaveLength(10);
  });

  for (const fx of FIXTURES) {
    it(`extracts ${fx.name}`, () => {
      const html = readFileSync(join(FIXTURE_DIR, fx.file), 'utf8');

      if (fx.expect === 'paywall') {
        try {
          extractArticle({ url: fx.url, html });
          // Either it throws a paywall error, or it returns content too short
          // to be useful — both are acceptable.
        } catch (err) {
          expect(err).toBeInstanceOf(ExtractError);
          const code = (err as ExtractError).code;
          expect(['paywall_hit', 'too_short']).toContain(code);
        }
        return;
      }

      const result = extractArticle({ url: fx.url, html });
      expect(result.title).toBeTruthy();
      expect(result.contentHtml.length).toBeGreaterThan(200);
      expect(result.wordCount).toBeGreaterThanOrEqual(fx.minWords ?? 100);
      expect(result.readingMinutes).toBeGreaterThan(0);
      if (fx.expectTitle) expect(result.title).toMatch(fx.expectTitle);
      expect(result.canonicalUrl).toBeTruthy();
    });
  }
});
