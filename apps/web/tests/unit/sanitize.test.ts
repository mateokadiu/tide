import { describe, expect, it } from 'vitest';
import { sanitizeHtml } from '@/lib/extract/sanitize';

describe('sanitizeHtml', () => {
  it('strips script tags', () => {
    expect(sanitizeHtml('<p>ok</p><script>alert(1)</script>')).toBe('<p>ok</p>');
  });

  it('removes inline event handlers', () => {
    const out = sanitizeHtml('<a href="https://x.test" onclick="alert(1)">x</a>');
    expect(out).not.toContain('onclick');
    expect(out).toContain('href="https://x.test"');
  });

  it('keeps article-ish tags', () => {
    const out = sanitizeHtml(
      '<h2>Heading</h2><p>body <strong>bold</strong> <em>em</em></p><blockquote>q</blockquote><pre><code>x</code></pre>',
    );
    expect(out).toContain('<h2>Heading</h2>');
    expect(out).toContain('<blockquote>');
    expect(out).toContain('<pre>');
    expect(out).toContain('<code>');
    expect(out).toContain('<strong>');
  });

  it('drops iframes and forms', () => {
    expect(sanitizeHtml('<p>x</p><iframe src="https://evil.test"></iframe>')).toBe('<p>x</p>');
    expect(sanitizeHtml('<p>x</p><form><input/></form>')).toBe('<p>x</p>');
  });

  it('drops style attributes (XSS surface)', () => {
    const out = sanitizeHtml('<p style="background: url(javascript:alert(1))">x</p>');
    expect(out).not.toContain('style');
  });
});
