/**
 * vowelNuclei.mjs — vowel nucleus identification for syllable splitting
 *
 * Permanent, shared, production code. No global state.
 */

const VOWEL_CHARS = new Set(['a', 'e', 'i', 'o', 'u']);

function clean(word) {
  return String(word == null ? '' : word).toLowerCase().replace(/[^a-z]/g, '');
}

function isVowelChar(ch) {
  return VOWEL_CHARS.has(ch);
}

/**
 * 'y' is a consonant only when it starts the word and is immediately followed
 * by a vowel (yes, you, yacht). Otherwise it acts as a vowel (happy, gym, fly).
 */
function isYVowel(w, i) {
  if (i === 0 && i + 1 < w.length && isVowelChar(w[i + 1])) return false;
  return true;
}

/**
 * Build the vowel nuclei list from compiled constructs.
 * Combines rControlled3 + specific trigraphs-as-nuclei + vowelTeams, deduped,
 * sorted longest-first.
 *
 * @param {Object} patternCategories
 * @returns {string[]}
 */
export function buildVowelNucleiList(patternCategories) {
  // 'igh' acts as a vowel nucleus (night, fight) even though it is a trigraph
  const trigraphNuclei = ['igh'];
  const list = [
    ...patternCategories.rControlled3,
    ...patternCategories.vowelTeams.filter(p => p.length >= 3), // eigh, ough, augh first
    ...trigraphNuclei,
    ...patternCategories.vowelTeams.filter(p => p.length < 3),
  ];
  // Deduplicate, keep longest first
  const seen = new Set();
  const deduped = [];
  for (const p of list) {
    if (!seen.has(p)) { seen.add(p); deduped.push(p); }
  }
  return deduped.sort((a, b) => b.length - a.length);
}

/**
 * Identify vowel nuclei in a word — positions and patterns used for syllable
 * boundary detection.
 *
 * A nucleus is a maximal vowel-team match (longest-first), a bare vowel char,
 * or 'y' acting as a vowel. Silent final 'e' is dropped when the word has 2+
 * nuclei and the 'e' is preceded by a consonant (or followed only by s/d).
 *
 * @param {string} word
 * @param {string[]} vowelNucleiList  - sorted longest-first (from buildVowelNucleiList)
 * @returns {{ start: number, end: number, pattern: string }[]}
 */
export function identifyVowelNuclei(word, vowelNucleiList) {
  const w = clean(word);
  const nuclei = [];
  let i = 0;

  while (i < w.length) {
    // 'u' after 'q' is always consonantal — check before pattern matching so
    // that vowel-team patterns starting with 'u' (ue, ui) don't grab it.
    if (w[i] === 'u' && i > 0 && w[i - 1] === 'q') {
      i += 1;
      continue;
    }

    let matched = null;
    for (const p of vowelNucleiList) {
      if (w.substr(i, p.length) === p) {
        matched = p;
        break;
      }
    }
    if (matched) {
      nuclei.push({ start: i, end: i + matched.length, pattern: matched });
      i += matched.length;
      continue;
    }
    const ch = w[i];
    if (isVowelChar(ch) || (ch === 'y' && isYVowel(w, i))) {
      nuclei.push({ start: i, end: i + 1, pattern: ch });
      i += 1;
      continue;
    }
    i += 1;
  }

  // Drop silent final 'e' when the word has ≥2 nuclei and the 'e' is preceded
  // by a consonant. Applies to magic-e (flame, name) and inflected forms (cooked,
  // breathes). Words like maybe/steakhouse that should keep 'e' as a syllable
  // are handled earlier via compound-split before reaching this code.
  if (nuclei.length >= 2) {
    const last = nuclei[nuclei.length - 1];
    if (last.pattern === 'e' && last.start > 0 && !isVowelChar(w[last.start - 1])) {
      const after = w.slice(last.end);
      const isSilent = last.end === w.length ||
                       (after.length === 1 && (after === 's' || after === 'd'));
      if (isSilent) nuclei.pop();
    }
  }

  return nuclei;
}
