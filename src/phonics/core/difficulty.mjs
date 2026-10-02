/**
 * difficulty.mjs — word difficulty and decodability level
 *
 * Permanent, shared, production code. No global state.
 */

/**
 * Compute the word difficulty score (1–3) based on which pattern categories
 * are present in the word.
 *
 * @param {Object}   buckets - { [category]: string[] } from findAllPatterns
 * @param {string[]} tokens  - from tokenize()
 * @returns {1|2|3}
 */
export function computeDifficulty(buckets, tokens) {
  if (buckets.clusters3?.length) return 3;
  if (buckets.trigraphs?.length) return 2;
  const last = tokens[tokens.length - 1];
  const FINAL_BLENDS = new Set([
    'mp','nt','nk','nd','ft','lt','lk','ld','lp','lf','pt','ct','xt',
  ]);
  if (last && FINAL_BLENDS.has(last)) return 2;
  if (buckets.vowelTeams?.length || buckets.rControlled?.length || buckets.rControlled3?.length) {
    return 2;
  }
  return 1;
}

/**
 * Compute the decodability level — the highest pattern level seen across all
 * tokens in the word.
 *
 * @param {string[]} tokens         - from tokenize()
 * @param {Object}   patternLevelMap - { [pattern]: level } built from constructs
 * @returns {number}
 */
export function decodabilityLevel(tokens, patternLevelMap) {
  let maxLevel = 1;
  for (const t of tokens) {
    if (patternLevelMap[t]) maxLevel = Math.max(maxLevel, patternLevelMap[t]);
  }
  return maxLevel;
}
