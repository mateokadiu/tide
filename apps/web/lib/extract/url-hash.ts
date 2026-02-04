import { createHash } from 'node:crypto';

/**
 * Canonicalise a URL for idempotency:
 * - lowercase host
 * - drop default ports
 * - drop common tracking params (utm_*, gclid, fbclid, ref, ref_src)
 * - sort remaining query params
 * - drop trailing slashes
 * - drop fragment
 */
const TRACKING_PARAMS = new Set([
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
  'gclid', 'fbclid', 'mc_cid', 'mc_eid', 'igshid',
  'ref', 'ref_src', 'ref_url', 'source', 'cmpid', 'spm',
]);

export function canonicalizeUrl(input: string): string {
  const u = new URL(input);
  u.hostname = u.hostname.toLowerCase();
  if ((u.protocol === 'http:' && u.port === '80') || (u.protocol === 'https:' && u.port === '443')) {
    u.port = '';
  }
  u.hash = '';
  const keep: [string, string][] = [];
  u.searchParams.forEach((value, key) => {
    if (!TRACKING_PARAMS.has(key.toLowerCase())) keep.push([key, value]);
  });
  keep.sort(([a], [b]) => a.localeCompare(b));
  u.search = '';
  for (const [k, v] of keep) u.searchParams.append(k, v);
  let s = u.toString();
  s = s.replace(/\/$/, '');
  return s;
}

export function urlHash(url: string): string {
  return createHash('sha256').update(canonicalizeUrl(url)).digest('hex');
}
