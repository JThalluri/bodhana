/**
 * vowelSounds.mjs — vowel-team sound resolution
 *
 * Permanent, shared, production code. No global state.
 */

/**
 * Build a word-keyed exception lookup map from the flat vowelTeamExceptions array.
 * Shape: { [word]: { [pattern]: sound } }
 *
 * @param {Array<{ word: string, pattern: string, sound: string }>} vowelTeamExceptions
 * @returns {Object}
 */
export function buildExceptionMap(vowelTeamExceptions) {
  const m = Object.create(null);
  for (const row of vowelTeamExceptions) {
    if (!m[row.word]) m[row.word] = Object.create(null);
    m[row.word][row.pattern] = row.sound;
  }
  return m;
}

/**
 * Three-tier exception lookup:
 *   1. Direct match (breathe)
 *   2. Suffix-stripped (breathes → breathe, believed → believe)
 *   3. Compound-scan (gingerbread → bread, overthrow → throw)
 *
 * @param {string} word
 * @param {string} pattern
 * @param {Object} exceptionMap  - from buildExceptionMap
 * @returns {string | null}      - sound key, or null if no exception found
 */
export function lookupException(word, pattern, exceptionMap) {
  // Tier 1: direct
  if (exceptionMap[word]?.[pattern]) return exceptionMap[word][pattern];

  // Tier 2: suffix-stripped
  const suffixes = ['ing', 'est', 'ed', 'er', 'ly', 's', 'd', 'es'];
  for (const s of suffixes) {
    if (word.length > s.length + 2 && word.endsWith(s)) {
      const stem = word.slice(0, -s.length);
      if (exceptionMap[stem]?.[pattern]) return exceptionMap[stem][pattern];
    }
  }

  // Tier 3: compound-scan
  for (let j = 3; j <= word.length - 3; j++) {
    const prefix = word.slice(0, j);
    if (exceptionMap[prefix]?.[pattern]) return exceptionMap[prefix][pattern];
    const suffix = word.slice(j);
    if (exceptionMap[suffix]?.[pattern]) return exceptionMap[suffix][pattern];
  }

  return null;
}

/**
 * Return an array of { pattern, sound, label, is_default } for every vowel
 * team token found in the word.
 *
 * @param {string} word
 * @param {string[]} tokens           - from tokenize()
 * @param {Object}   exceptionMap     - from buildExceptionMap
 * @param {Object}   defaultVowelSound - { [pattern]: soundKey }
 * @param {Object}   soundLabels       - { [soundKey]: displayLabel }
 * @returns {Array<{ pattern: string, sound: string, label: string, is_default: boolean }>}
 */
export function vowelTeamSounds(word, tokens, exceptionMap, defaultVowelSound, soundLabels) {
  const out = [];
  for (const t of tokens) {
    if (defaultVowelSound[t] === undefined) continue; // not a vowel team token
    const ex = lookupException(word, t, exceptionMap);
    const sound = ex ?? defaultVowelSound[t];
    if (!sound) continue;
    out.push({
      pattern:    t,
      sound,
      label:      soundLabels[sound] ?? sound,
      is_default: sound === defaultVowelSound[t],
    });
  }
  return out;
}

/**
 * Find all patterns (by category) that appear as substrings in a word.
 * Used for secondary pattern detection.
 *
 * @param {string} word
 * @param {{ pattern: string, category: string }[]} sortedPatterns
 * @returns {Object}  - { [category]: string[] }
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
 * Compute the word difficulty score (1–3) based on which pattern categories
 * are present.
 *
 * @param {Object} buckets - { clusters3: [], trigraphs: [], vowelTeams: [], ...}
 * @param {string[]} tokens
 * @returns {number}
 */
export function computeDifficulty(buckets, tokens) {
  if (buckets.clusters3?.length) return 3;
  if (buckets.trigraphs?.length) return 2;
  const last = tokens[tokens.length - 1];
  const FINAL = new Set(['mp','nt','nk','nd','ft','lt','lk','ld','lp','lf','pt','ct','xt']);
  if (last && FINAL.has(last)) return 2;
  if (buckets.vowelTeams?.length || buckets.rControlled?.length || buckets.rControlled3?.length) return 2;
  return 1;
}

/**
 * Compute the decodability level — the highest pattern level seen in this word.
 *
 * @param {string[]} tokens
 * @param {Object}   patternLevelMap  - { [pattern]: level } (built from constructs)
 * @returns {number}
 */
export function decodabilityLevel(tokens, patternLevelMap) {
  let maxLevel = 1;
  for (const t of tokens) {
    if (patternLevelMap[t]) maxLevel = Math.max(maxLevel, patternLevelMap[t]);
  }
  return maxLevel;
}
