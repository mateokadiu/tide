import { describe, expect, it } from 'vitest';
import { canonicalizeUrl, urlHash } from '@/lib/extract/url-hash';

describe('canonicalizeUrl', () => {
  it('lowercases the host', () => {
    expect(canonicalizeUrl('https://Example.COM/page')).toBe('https://example.com/page');
  });

  it('strips default ports', () => {
    expect(canonicalizeUrl('http://example.com:80/page')).toBe('http://example.com/page');
    expect(canonicalizeUrl('https://example.com:443/page')).toBe('https://example.com/page');
  });

  it('drops fragments', () => {
    expect(canonicalizeUrl('https://example.com/page#section')).toBe('https://example.com/page');
  });

  it('drops trailing slashes', () => {
    expect(canonicalizeUrl('https://example.com/path/')).toBe('https://example.com/path');
  });

  it('strips utm_* + gclid + fbclid + ref tracking params', () => {
    const out = canonicalizeUrl(
      'https://example.com/x?utm_source=newsletter&utm_medium=email&gclid=xx&id=1',
    );
    expect(out).toBe('https://example.com/x?id=1');
  });

  it('sorts remaining query params deterministically', () => {
    expect(canonicalizeUrl('https://example.com/x?z=1&a=2&m=3')).toBe(
      'https://example.com/x?a=2&m=3&z=1',
    );
  });
});

describe('urlHash', () => {
  it('returns the same hash for equivalent URLs after canonicalisation', () => {
    const a = urlHash('https://Example.com/x?utm_source=foo');
    const b = urlHash('https://example.com/x');
    expect(a).toBe(b);
  });

  it('returns a different hash for materially different URLs', () => {
    expect(urlHash('https://example.com/a')).not.toBe(urlHash('https://example.com/b'));
  });

  it('is 64 hex chars', () => {
    const h = urlHash('https://example.com/x');
    expect(h).toMatch(/^[a-f0-9]{64}$/);
  });
});
