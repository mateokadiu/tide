/**
 * Lang detection — light heuristic, not a full identifier. Real ID lives in
 * the embedding pipeline.
 */
const COMMON_WORDS: Record<string, string[]> = {
  en: ['the', 'and', 'of', 'to', 'a', 'in', 'is', 'that', 'for', 'it'],
  es: ['de', 'la', 'que', 'el', 'en', 'y', 'a', 'los', 'se', 'del'],
  fr: ['de', 'la', 'le', 'et', 'les', 'des', 'en', 'un', 'une', 'que'],
  de: ['der', 'die', 'und', 'in', 'den', 'von', 'zu', 'das', 'mit', 'sich'],
  pt: ['de', 'a', 'o', 'que', 'e', 'do', 'da', 'em', 'um', 'para'],
  it: ['di', 'la', 'che', 'e', 'il', 'a', 'in', 'un', 'per', 'è'],
};

export function detectLang(text: string): string {
  const sample = text.toLowerCase().split(/\W+/).filter((w) => w.length > 1).slice(0, 600);
  if (sample.length < 30) return 'en';

  let best = 'en';
  let bestScore = 0;
  for (const [lang, words] of Object.entries(COMMON_WORDS)) {
    const score = sample.reduce((acc, w) => acc + (words.includes(w) ? 1 : 0), 0);
    if (score > bestScore) {
      bestScore = score;
      best = lang;
    }
  }
  return best;
}
