export function countWords(text: string): number {
  if (!text) return 0;
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/** 235 wpm — slightly above Pocket's 220 default; matches Instapaper's. */
export function estimateReadingMinutes(wordCount: number, wpm = 235): number {
  if (wordCount <= 0) return 0;
  return Math.max(1, Math.round(wordCount / wpm));
}
