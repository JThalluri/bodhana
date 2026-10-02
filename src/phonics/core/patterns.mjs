/**
 * patterns.mjs — pattern detection and secondary-pattern analysis
 *
 * Permanent, shared, production code. No global state.
 */

/**
 * Find all patterns (by category) that appear as substrings in a word.
 * Uses substring search, not tokenization — a pattern may appear even if the
 * tokenizer absorbed it into a longer token.
 *
 * @param {string} word
 * @param {{ pattern: string, category: string }[]} sortedPatterns - longest-first
 * @returns {Object} - { [category]: string[] }
 */
export function findAllPatterns(word, sortedPatterns) {
  const found = {};
  for (const { pattern, category } of sortedPatterns) {
    if (word.includes(pattern)) {
      if (!found[category]) found[category] = [];
      if (!found[category].includes(pattern)) found[category].push(pattern);
    }
  }
  return found;
}

/**
 * Find patterns present in the buckets (via substring search) that are NOT
 * represented as independent tokens in the tokenizer output — i.e., patterns
 * hidden inside longer tokens (e.g. 'ch' inside 'tch', 'gh' inside 'igh').
 *
 * @param {string[]} tokens  - from tokenize()
 * @param {Object}   buckets - from findAllPatterns()
 * @returns {string[]}
 */
export function findSecondaryPatterns(tokens, buckets) {
  const tokenSet = new Set(tokens);
  const secondary = [];
  for (const patsInCat of Object.values(buckets)) {
    for (const p of patsInCat) {
      if (!tokenSet.has(p)) secondary.push(p);
    }
  }
  return secondary;
}
