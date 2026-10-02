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
 * Return the resolved sound key for a specific vowel-team pattern in a word,
 * using the same three-tier lookup as vowelTeamSounds.
 *
 * @param {string} word
 * @param {string} pattern
 * @param {Object} exceptionMap     - from buildExceptionMap
 * @param {Object} defaultVowelSound - { [pattern]: soundKey }
 * @returns {string|null}
 */
export function soundForVowelTeam(word, pattern, exceptionMap, defaultVowelSound) {
  const ex = lookupException(word, pattern, exceptionMap);
  return ex ?? defaultVowelSound[pattern] ?? null;
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

