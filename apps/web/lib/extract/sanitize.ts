import { JSDOM } from 'jsdom';
import createDOMPurify from 'dompurify';

/**
 * Server-side sanitiser. We render archived HTML on the server only after
 * this strips dangerous attributes and elements.
 */
export function sanitizeHtml(html: string): string {
  const window = new JSDOM('').window;
  // biome-ignore lint/suspicious/noExplicitAny: createDOMPurify accepts a JSDOM window
  const DOMPurify = createDOMPurify(window as any);
  return DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
    ALLOWED_TAGS: [
      'a', 'p', 'br', 'span', 'div', 'em', 'strong', 'b', 'i', 'u', 's',
      'ul', 'ol', 'li', 'blockquote', 'pre', 'code', 'hr', 'figure', 'figcaption',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'img', 'picture', 'source',
      'table', 'thead', 'tbody', 'tr', 'th', 'td', 'caption',
      'sup', 'sub', 'small', 'mark', 'cite', 'time', 'kbd', 'samp', 'var',
    ],
    ALLOWED_ATTR: [
      'href', 'src', 'srcset', 'sizes', 'alt', 'title',
      'class', 'id', 'lang', 'dir', 'rel', 'target',
      'colspan', 'rowspan', 'data-tide-hl',
      'loading', 'decoding', 'width', 'height',
    ],
    ADD_ATTR: ['target'],
    FORBID_ATTR: ['style', 'onload', 'onerror', 'onclick'],
    FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'input', 'button', 'textarea'],
    ALLOW_DATA_ATTR: false,
  });
}
