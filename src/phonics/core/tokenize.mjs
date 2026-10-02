/**
 * tokenize.mjs — grapheme tokenizer
 *
 * Permanent, shared, production code. No global state — all lookup data is
 * passed explicitly as parameters so this module has zero side effects and
 * is safe to use in any environment.
 */

const CONSONANT_RE = /[bcdfghjklmnpqrstvwxyz]/;

function clean(word) {
  return String(word == null ? '' : word).toLowerCase().replace(/[^a-z]/g, '');
}

/**
 * Build the sorted patterns array from a patternCategories map.
 * Returns an array of { pattern, category }, longest-first.
 * Call once per compiled constructs load; pass result to tokenize().
 *
 * @param {Object} patternCategories - e.g. { digraphs: ['ch',...], blends: [...], ... }
 * @returns {{ pattern: string, category: string }[]}
 */
export function buildSortedPatterns(patternCategories) {
  const seen = new Set();
  const patterns = [];
  for (const [cat, list] of Object.entries(patternCategories)) {
    for (const p of list) {
      if (!seen.has(p)) {
        seen.add(p);
        patterns.push({ pattern: p, category: cat });
      }
    }
  }
  return patterns.sort((a, b) => b.pattern.length - a.pattern.length);
}

/**
 * Tokenise a word into an array of grapheme strings.
 *
 * Rules:
 * - Greedy longest-match-first against sortedPatterns.
 * - 'ng' is only a digraph at the end of a syllable: when immediately followed
 *   by 'e', the n and g belong to different syllables (fin·ger, long·er, gin·ger)
 *   so the 'ng' match is skipped and they tokenise individually.
 * - Double consonants that match no pattern are merged (e.g. 'll', 'ss', 'ff')
 *   unless mergeDoubleConsonants:false is passed in opts.
 *
 * @param {string} word
 * @param {{ pattern: string, category: string }[]} sortedPatterns
 * @param {{ mergeDoubleConsonants?: boolean }} [opts]
 * @returns {string[]}
 */
export function tokenize(word, sortedPatterns, opts = {}) {
  const mergeDoubles = opts.mergeDoubleConsonants !== false;
  const w = clean(word);
  const tokens = [];
  let i = 0;

  while (i < w.length) {
    let matched = null;

    for (const { pattern } of sortedPatterns) {
      if (pattern.length > w.length - i) continue;
      if (w.substr(i, pattern.length) !== pattern) continue;

      // 'ng' guard: skip when immediately followed by 'e' (gin·ger, fin·ger)
      if (pattern === 'ng' && i + 2 < w.length && w[i + 2] === 'e') continue;

      matched = pattern;
      break;
    }

    if (matched) {
      tokens.push(matched);
      i += matched.length;
      continue;
    }

    if (mergeDoubles &&
        i + 1 < w.length &&
        w[i] === w[i + 1] &&
        CONSONANT_RE.test(w[i])) {
      tokens.push(w[i] + w[i + 1]);
      i += 2;
      continue;
    }

    tokens.push(w[i]);
    i += 1;
  }

  return tokens;
}
