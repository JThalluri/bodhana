/**
 * syllables.mjs — syllable splitting + helper functions
 *
 * Permanent, shared, production code. No global state.
 * All lookup data (compoundParts, rootWords, suffixRules, etc.) is passed
 * explicitly so this module has zero side effects.
 */

import { identifyVowelNuclei } from './vowelNuclei.mjs';

function clean(word) {
  return String(word == null ? '' : word).toLowerCase().replace(/[^a-z]/g, '');
}

function isVowelChar(ch) {
  return 'aeiou'.indexOf(ch) !== -1;
}

/**
 * Build the compound-parts lookup set from the raw array.
 * Entries shorter than 2 characters are excluded at this point (compiler
 * already hard-fails on them; this is a runtime safety net only).
 *
 * @param {string[]} list
 * @returns {Set<string>}
 */
export function buildCompoundPartsSet(list) {
  const s = new Set();
  for (const w of list) {
    if (w.length >= 2) s.add(w);
  }
  return s;
}

/**
 * Build the root-words lookup set from the raw array.
 * Entries shorter than 3 characters are excluded (compiler enforces minimum).
 *
 * @param {string[]} list
 * @returns {Set<string>}
 */
export function buildRootWordsSet(list) {
  const s = new Set();
  for (const w of list) {
    if (w.length >= 3) s.add(w);
  }
  return s;
}

/**
 * Build the pattern-category map used by the VCCV fallback.
 * Maps each pattern string → its category name.
 *
 * @param {Object} patternCategories
 * @returns {Map<string, string>}
 */
export function buildPatternCategoryMap(patternCategories) {
  const m = new Map();
  for (const [cat, patterns] of Object.entries(patternCategories)) {
    for (const p of patterns) {
      if (!m.has(p)) m.set(p, cat);
    }
  }
  return m;
}

/**
 * Attempt to split word into two compound halves.
 * Both halves must be >= 3 chars and present in compoundPartsSet.
 * Tries longest-left-half first so 'something' → ['some','thing'],
 * not ['so','mething'].
 *
 * @param {string} word
 * @param {Set<string>} compoundPartsSet
 * @returns {string[] | null}
 */
export function tryCompoundSplit(word, compoundPartsSet) {
  if (word.length < 5) return null;
  // Right half must be ≥ 2 chars; left half must be ≥ 3 chars.
  for (let i = word.length - 2; i >= 3; i--) {
    const left  = word.slice(0, i);
    const right = word.slice(i);
    if (compoundPartsSet.has(left) && compoundPartsSet.has(right)) {
      return [left, right];
    }
  }
  return null;
}

/**
 * Attempt to strip a suffix from a word. Returns { stem, suffix } or null.
 * Includes un-doubling logic (running→run+ning, bigger→big+ger).
 * The '-ed' rule only fires when the stem ends in 't' or 'd' (wanted, needed).
 *
 * @param {string} word
 * @param {object[]} suffixStripRules  - from compiled constructs
 * @param {Set<string>} rootWordsSet
 * @returns {{ stem: string, suffix: string } | null}
 */
export function tryStripSuffix(word, suffixStripRules, rootWordsSet) {
  for (const r of suffixStripRules) {
    if (word.length < r.suffix.length + r.minStem) continue;
    if (!word.endsWith(r.suffix)) continue;

    let stem = word.slice(0, -r.suffix.length);
    let actualSuffix = r.suffix;
    let didUndouble = false;

    // '-ed' only adds a syllable after t or d
    if (r.edOnly) {
      const lastCh = stem[stem.length - 1];
      if (lastCh !== 't' && lastCh !== 'd') continue;
    }

    // Stem must contain a vowel
    if (!/[aeiouy]/.test(stem)) continue;

    // Un-double final consonant only when the un-doubled form is a known root
    if (r.undouble && stem.length >= 3) {
      const c1 = stem[stem.length - 1];
      const c2 = stem[stem.length - 2];
      if (c1 === c2 && !/[aeiou]/.test(c1) && c1 !== 'l' && c1 !== 's' && c1 !== 'f') {
        const candidate = stem.slice(0, -1);
        if (rootWordsSet.has(candidate)) {
          actualSuffix = c1 + r.suffix;
          stem = candidate;
          didUndouble = true;
        }
      }
    }

    // When always:false, only strip if undoubling fired OR the stem is a known root.
    // Also accept stem+'e' so that e-drop roots (believe→believ, achieve→achiev)
    // match when the final-e was elided before the suffix was added.
    if (!r.always && !didUndouble &&
        !rootWordsSet.has(stem) && !rootWordsSet.has(stem + 'e')) continue;

    return { stem, suffix: actualSuffix };
  }
  return null;
}

/**
 * Split a word into syllables. Heuristic, compound/suffix-aware.
 *
 * @param {string} word
 * @param {SyllableCtx} ctx   - pre-built lookup structures (see below)
 * @param {number} [depth]    - recursion guard, start at 0
 * @returns {string[]}
 *
 * @typedef {{ vowelNucleiList: string[], compoundPartsSet: Set<string>,
 *             rootWordsSet: Set<string>, suffixStripRules: object[],
 *             patternCategoryMap: Map<string,string> }} SyllableCtx
 */
export function splitSyllables(word, ctx, depth = 0) {
  const w = clean(word);
  if (!w) return [];
  if (depth > 4) return [w]; // runaway recursion guard

  // 1. Compound split: some|thing, rain|bow, any|one
  const compound = tryCompoundSplit(w, ctx.compoundPartsSet);
  if (compound) {
    return [
      ...splitSyllables(compound[0], ctx, depth + 1),
      ...splitSyllables(compound[1], ctx, depth + 1),
    ];
  }

  // 2. -Cle ending: ta|ble, lit|tle, ap|ple
  let stem = w;
  let cleSuffix = '';
  if (w.length > 4 && w.endsWith('le')) {
    const cIdx = w.length - 3;
    const c = w[cIdx];
    if (!isVowelChar(c) && c !== 'l') {
      cleSuffix = w.slice(cIdx);
      stem = w.slice(0, cIdx);
    }
  }

  // 3. Suffix strip: a|maz|ing, run|ning, teach|er
  const stripped = tryStripSuffix(stem, ctx.suffixStripRules, ctx.rootWordsSet);
  if (stripped && stripped.stem.length >= 2) {
    const stemSyls = splitSyllables(stripped.stem, ctx, depth + 1);
    const withSuffix = [...stemSyls, stripped.suffix];
    return cleSuffix ? [...withSuffix, cleSuffix] : withSuffix;
  }

  // 4. Pattern-based fallback
  const nuclei = identifyVowelNuclei(stem, ctx.vowelNucleiList);
  if (nuclei.length <= 1) {
    return cleSuffix ? [stem, cleSuffix] : [stem];
  }

  const boundaries = [];
  for (let n = 0; n < nuclei.length - 1; n++) {
    const cur = nuclei[n];
    const nxt = nuclei[n + 1];
    const between = stem.slice(cur.end, nxt.start);
    const len = between.length;
    let split;

    if (len === 0) {
      // Adjacent vowels → hiatus (cre·ate, play·er)
      split = cur.end;
    } else if (len === 1) {
      // VCV → split before the consonant (o·pen, ti·ger)
      split = cur.end;
      // Guard against bare-consonant syllable
      if (split < 1 || !/[aeiouy]/.test(stem.slice(0, split))) {
        split = cur.end + 1;
      }
    } else if (len === 2) {
      // VCCV: keep digraphs together (fa·ther), split other pairs (rab·bit)
      if (between === 'th' || between === 'sh' || between === 'ch' || between === 'wh') {
        split = cur.end;
      } else {
        split = cur.end + 1;
      }
    } else {
      // VCCCV+: keep last two together if they form a blend/digraph/cluster
      const lastTwo = between.slice(-2);
      const cat = ctx.patternCategoryMap.get(lastTwo);
      if (cat === 'blends' || cat === 'digraphs' || cat === 'clusters3') {
        split = nxt.start - 2;
      } else {
        split = nxt.start - 1;
      }
    }

    const prevBoundary = boundaries.length ? boundaries[boundaries.length - 1] : 0;
    if (split > prevBoundary) boundaries.push(split);
  }

  const syllables = [];
  let start = 0;
  for (const b of boundaries) {
    if (b > start) syllables.push(stem.slice(start, b));
    start = b;
  }
  if (start < stem.length) syllables.push(stem.slice(start));
  if (cleSuffix) syllables.push(cleSuffix);

  return syllables.length ? syllables : [w];
}

/**
 * Count syllables in a word using a fast vowel-nucleus heuristic.
 * This is independent of splitSyllables and does not require the full ctx.
 *
 * @param {string} word
 * @returns {number}
 */
export function countSyllables(word) {
  const w = String(word == null ? '' : word).toLowerCase().replace(/[^a-z]/g, '');
  if (!w) return 0;
  if (w.length <= 3) return 1;
  let cleaned = w;
  if (cleaned.endsWith('e') && cleaned.length > 2) {
    const isLe = cleaned[cleaned.length - 2] === 'l' &&
                 cleaned.length > 3 &&
                 !isVowelChar(cleaned[cleaned.length - 3]);
    if (!isLe) cleaned = cleaned.slice(0, -1);
  }
  let count = 0;
  let prev = false;
  for (const ch of cleaned) {
    const v = isVowelChar(ch);
    if (v && !prev) count++;
    prev = v;
  }
  return Math.max(1, count);
}

/**
 * Compute onset (initial consonants) and rime (vowel + everything after).
 *
 * @param {string} word
 * @returns {{ onset: string, rime: string }}
 */
export function onsetRime(word) {
  const w = String(word == null ? '' : word).toLowerCase().replace(/[^a-z]/g, '');
  let i = 0;
  while (i < w.length && !isVowelChar(w[i])) i++;
  return { onset: w.slice(0, i), rime: w.slice(i) };
}
