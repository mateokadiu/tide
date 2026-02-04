export function extractLeadImage(doc: Document, base: string, articleHtml: string): string | null {
  const og = doc.querySelector('meta[property="og:image"]')?.getAttribute('content');
  if (og) return absolutize(og, base);

  const twitter = doc.querySelector('meta[name="twitter:image"]')?.getAttribute('content');
  if (twitter) return absolutize(twitter, base);

  // Fallback: first <img> in the parsed article body.
  const match = /<img[^>]+src=["']([^"']+)["']/i.exec(articleHtml);
  if (match?.[1]) return absolutize(match[1], base);

  return null;
}

function absolutize(url: string, base: string): string {
  try {
    return new URL(url, base).toString();
  } catch {
    return url;
  }
}
