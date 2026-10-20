/** Exact-word American pronunciation entries; never infer suffix/compound matches. */
export function buildPronunciationMap(entries = []) {
  return new Map(entries.map(entry => [entry.word, entry]));
}
