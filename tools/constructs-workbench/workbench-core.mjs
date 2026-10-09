/**
 * workbench-core.mjs — pure logic for the Constructs Workbench.
 *
 * Zero file I/O. All functions are stateless transforms on plain objects.
 * Importable by both the browser UI (app.js) and the Node.js test suite.
 *
 * Depends on:
 *   ../../scripts/constructs-compile-core.mjs  — compileConstructs()
 *   ../../scripts/constructs-validate.mjs      — validateAll(), ValidationError
 *   ../../src/phonics/core/vowelSounds.mjs     — buildExceptionMap etc.
 *   ../../src/phonics/core/tokenize.mjs        — buildSortedPatterns, tokenize
 *   ../../src/phonics/core/syllables.mjs       — tryCompoundSplit, tryStripSuffix, splitSyllables etc.
 *   ../../src/phonics/core/vowelNuclei.mjs     — buildVowelNucleiList
 */

import {
  buildExceptionMap,
  lookupExceptionWithTier,
  soundForVowelTeam,
} from '../../src/phonics/core/vowelSounds.mjs';

import {
  buildSortedPatterns,
  tokenize,
} from '../../src/phonics/core/tokenize.mjs';

import {
  tryCompoundSplit,
  tryStripSuffix,
  splitSyllables,
  buildCompoundPartsSet,
  buildRootWordsSet,
  buildPatternCategoryMap,
} from '../../src/phonics/core/syllables.mjs';

import {
  buildVowelNucleiList,
} from '../../src/phonics/core/vowelNuclei.mjs';

// ── Patch schema ─────────────────────────────────────────────────────────────

const ALLOWED_OPS = new Set(['add', 'modify', 'remove']);
const FORBIDDEN_KEYS = [
  'patternCategories', 'defaultVowelSound', 'compoundParts', 'rootWords',
  'suffixStripRules', 'patternCategoryDefaultLevels', 'patternLevelOverrides',
  'scopeLevels', 'soundLabels',
];

/**
 * Validate and normalise a raw patch object.
 *
 * Accepts `{ patch: { add?, modify?, remove? } }` (LLM output with wrapper)
 * or the bare `{ add?, modify?, remove? }` form.
 *
 * Throws with a specific message on any schema violation.
 *
 * @param {object} patchRaw
 * @returns {{ add?: Array, modify?: Array, remove?: Array }}
 */
export function validatePatchSchema(patchRaw) {
  if (!patchRaw || typeof patchRaw !== 'object') {
    throw new Error('Patch must be a YAML object');
  }

  // Unwrap optional outer `patch:` wrapper key
  const keys = Object.keys(patchRaw);
  const patch = (keys.length === 1 && patchRaw.patch !== undefined)
    ? patchRaw.patch
    : patchRaw;

  if (!patch || typeof patch !== 'object' || Array.isArray(patch)) {
    throw new Error('Patch must be an object with "add", "modify", and/or "remove" keys');
  }

  for (const key of Object.keys(patch)) {
    if (FORBIDDEN_KEYS.includes(key)) {
      throw new Error(
        `Patch schema violation: key "${key}" is not allowed in Phase 1 patches — ` +
        `only "add", "modify", "remove" under "patch:" may target vowelTeamExceptions`
      );
    }
    if (!ALLOWED_OPS.has(key)) {
      throw new Error(
        `Patch schema violation: unknown key "${key}" — ` +
        `only "add", "modify", "remove" are valid patch operations`
      );
    }
  }

  for (const op of ['add', 'modify', 'remove']) {
    const items = patch[op];
    if (items === undefined) continue;
    if (!Array.isArray(items)) {
      throw new Error(`patch.${op} must be an array`);
    }
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item || typeof item !== 'object') {
        throw new Error(`patch.${op}[${i}] must be an object`);
      }
      if (!item.word || typeof item.word !== 'string') {
        throw new Error(`patch.${op}[${i}] must have a "word" string field`);
      }
      if (!item.pattern || typeof item.pattern !== 'string') {
        throw new Error(`patch.${op}[${i}] must have a "pattern" string field`);
      }
      if (op !== 'remove' && (!item.sound || typeof item.sound !== 'string')) {
        throw new Error(`patch.${op}[${i}] (word="${item.word}") must have a "sound" string field`);
      }
    }
  }

  return patch;
}

// ── Patch apply ───────────────────────────────────────────────────────────────

/**
 * Apply a validated patch to a raw parsed YAML constructs object.
 * Returns a deep-copied new object — never mutates rawObj.
 *
 * @param {object} rawObj  - result of jsyaml.load(constructsYamlText)
 * @param {object} patch   - normalised patch from validatePatchSchema()
 * @returns {object}
 */
export function applyPatchToRaw(rawObj, patch) {
  const newRaw = JSON.parse(JSON.stringify(rawObj));
  const exceptions = newRaw.vowelTeamExceptions || [];

  for (const item of patch.remove || []) {
    const idx = exceptions.findIndex(r => r.word === item.word && r.pattern === item.pattern);
    if (idx >= 0) exceptions.splice(idx, 1);
  }

  for (const item of patch.modify || []) {
    const row = exceptions.find(r => r.word === item.word && r.pattern === item.pattern);
    if (!row) {
      throw new Error(`patch.modify: no existing row for word="${item.word}" pattern="${item.pattern}"`);
    }
    row.sound = item.sound;
    if (item.note !== undefined) row.note = item.note ?? null;
  }

  for (const item of patch.add || []) {
    exceptions.push({
      word:    String(item.word),
      pattern: String(item.pattern),
      sound:   String(item.sound),
      note:    item.note != null ? String(item.note) : null,
    });
  }

  newRaw.vowelTeamExceptions = exceptions;
  return newRaw;
}

// ── Blast radius ──────────────────────────────────────────────────────────────

/**
 * Find every word in the fixture corpus and exception table that contains
 * `pattern` as a substring, and compute each word's current resolved sound
 * and lookup tier against `compiledObj`.
 *
 * @param {string} pattern
 * @param {object} compiledObj
 * @param {object} fixturesObj  - { tokenizer, syllableSplit, vowelTeamSounds }
 * @returns {Array<{ word: string, sound: string|null, tier: string }>}
 */
export function computeBlastRadius(pattern, compiledObj, fixturesObj) {
  const wordSet = new Set();

  for (const f of fixturesObj.vowelTeamSounds || []) {
    if (f.pattern === pattern) wordSet.add(String(f.word));
  }
  for (const row of compiledObj.vowelTeamExceptions || []) {
    if (row.pattern === pattern) wordSet.add(String(row.word));
  }
  for (const f of [
    ...(fixturesObj.vowelTeamSounds || []),
    ...(fixturesObj.syllableSplit   || []),
    ...(fixturesObj.tokenizer        || []),
  ]) {
    const word = f.word ? String(f.word) : null;
    if (word && word.includes(pattern)) wordSet.add(word);
  }

  const exMap        = buildExceptionMap(compiledObj.vowelTeamExceptions || []);
  const defaultSound = compiledObj.defaultVowelSound?.[pattern] ?? null;
  // Build sorted patterns once — required to verify the pattern is a genuine
  // tokenized vowel-team token in each word (not merely a substring match).
  // e.g. bear/beard contain 'ea' as a substring but tokenize as b|ear/b|ear|d;
  // 'ear' (r-controlled) wins at that position and 'ea' is never produced.
  const sortedPats = buildSortedPatterns(compiledObj.patternCategories || {});

  return [...wordSet]
    .filter(w => w.includes(pattern))
    .filter(w => tokenize(w, sortedPats).includes(pattern))
    .sort()
    .map(word => {
      const result = lookupExceptionWithTier(word, pattern, exMap);
      const sound  = result?.sound ?? defaultSound;
      const tier   = result?.tier  ?? (sound ? 'default' : null);
      return { word, sound, tier };
    });
}

// ── Regression diff ───────────────────────────────────────────────────────────

/**
 * Re-run every vowelTeamSounds fixture against two compiled objects and
 * return only the rows where the resolved sound changed.
 *
 * @param {object} oldCompiled
 * @param {object} newCompiled
 * @param {object} fixturesObj
 * @returns {Array<{ word, pattern, expected, oldSound, newSound }>}
 */
export function runRegressionDiff(oldCompiled, newCompiled, fixturesObj) {
  const oldExMap   = buildExceptionMap(oldCompiled.vowelTeamExceptions || []);
  const newExMap   = buildExceptionMap(newCompiled.vowelTeamExceptions || []);
  const oldDefault = oldCompiled.defaultVowelSound || {};
  const newDefault = newCompiled.defaultVowelSound || {};

  const diffs = [];
  for (const f of fixturesObj.vowelTeamSounds || []) {
    const oldSound = soundForVowelTeam(f.word, f.pattern, oldExMap, oldDefault);
    const newSound = soundForVowelTeam(f.word, f.pattern, newExMap, newDefault);
    if (oldSound !== newSound) {
      // A known-failure fixture (expectedFailure: true) that now resolves to its documented
      // correct target is good news — surface it distinctly, do not block merge.
      const nowPassing = f.expectedFailure === true && newSound === String(f.sound);
      diffs.push({ word: String(f.word), pattern: String(f.pattern), expected: String(f.sound), oldSound, newSound, nowPassing });
    }
  }
  return diffs;
}

// ── CHANGELOG entry builder ───────────────────────────────────────────────────

/**
 * Build markdown table rows for the CHANGELOG, one per changed exception row.
 *
 * @param {object} patch       - normalised patch
 * @param {object} oldCompiled
 * @param {string} reason      - free-text reason from Step 4
 * @param {string} date        - ISO date (YYYY-MM-DD)
 * @returns {string[]}
 */
export function buildChangelogEntries(patch, oldCompiled, reason, date) {
  const oldExMap   = buildExceptionMap(oldCompiled.vowelTeamExceptions || []);
  const oldDefault = oldCompiled.defaultVowelSound || {};
  const safeReason = (reason || '').replace(/\|/g, '/').trim() || '(no reason given)';

  const lines = [];
  for (const item of patch.add || []) {
    const old = soundForVowelTeam(item.word, item.pattern, oldExMap, oldDefault) ?? '(none)';
    lines.push(`| ${item.word} | ${old} | ${item.sound} | ${item.pattern} | ${date} | ${safeReason} |`);
  }
  for (const item of patch.modify || []) {
    const row = (oldCompiled.vowelTeamExceptions || []).find(r => r.word === item.word && r.pattern === item.pattern);
    const old = row?.sound ?? '(none)';
    lines.push(`| ${item.word} | ${old} | ${item.sound} | ${item.pattern} | ${date} | ${safeReason} |`);
  }
  for (const item of patch.remove || []) {
    const row = (oldCompiled.vowelTeamExceptions || []).find(r => r.word === item.word && r.pattern === item.pattern);
    const old = row?.sound ?? '(none)';
    lines.push(`| ${item.word} | ${old} | (removed) | ${item.pattern} | ${date} | ${safeReason} |`);
  }
  return lines;
}

// ── List mode — patch schema ──────────────────────────────────────────────────

const LIST_MODE_GLOBAL_FORBIDDEN = [
  'patternCategories', 'defaultVowelSound', 'suffixStripRules',
  'patternCategoryDefaultLevels', 'patternLevelOverrides',
  'scopeLevels', 'soundLabels', 'vowelTeamExceptions',
];

/**
 * Validate a patch for compoundPart or rootWord mode.
 *
 * Only "add" and "remove" are valid ops (no "modify").
 * Items must be plain strings — objects with word/pattern/sound are rejected immediately.
 * Mode-scoped: compoundPart patches may not touch rootWords, and vice versa.
 *
 * @param {object} patchRaw
 * @param {'compoundPart'|'rootWord'} mode
 * @returns {{ add?: string[], remove?: string[] }}
 */
export function validatePatchSchemaForList(patchRaw, mode) {
  if (!patchRaw || typeof patchRaw !== 'object') {
    throw new Error('Patch must be a YAML object');
  }

  const keys = Object.keys(patchRaw);
  const patch = (keys.length === 1 && patchRaw.patch !== undefined)
    ? patchRaw.patch
    : patchRaw;

  if (!patch || typeof patch !== 'object' || Array.isArray(patch)) {
    throw new Error('Patch must be an object with "add" and/or "remove" keys');
  }

  const targetList = mode === 'compoundPart' ? 'compoundParts' : 'rootWords';
  const otherList  = mode === 'compoundPart' ? 'rootWords' : 'compoundParts';

  for (const key of Object.keys(patch)) {
    if (LIST_MODE_GLOBAL_FORBIDDEN.includes(key)) {
      throw new Error(
        `Patch schema violation: key "${key}" is not allowed — ` +
        `only "add"/"remove" targeting ${targetList} are valid in ${mode} mode`
      );
    }
    if (key === otherList) {
      throw new Error(
        `Patch schema violation: "${key}" is not allowed in ${mode} mode — ` +
        `this patch targets the wrong list`
      );
    }
    if (key === 'modify') {
      throw new Error(
        `Patch schema violation: "modify" is not valid in ${mode} mode — ` +
        `${targetList} is a flat string list, use "add"/"remove" only`
      );
    }
    if (key !== 'add' && key !== 'remove') {
      throw new Error(
        `Patch schema violation: unknown key "${key}" — ` +
        `only "add" and "remove" are valid in ${mode} mode`
      );
    }
  }

  for (const op of ['add', 'remove']) {
    const items = patch[op];
    if (items === undefined) continue;
    if (!Array.isArray(items)) {
      throw new Error(`patch.${op} must be an array`);
    }
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item !== null && typeof item === 'object') {
        throw new Error(
          `patch.${op}[${i}] must be a string, not an object — ` +
          `${mode} mode patches are plain word entries, not word/pattern/sound rows`
        );
      }
      if (typeof item !== 'string' || !item.trim()) {
        throw new Error(`patch.${op}[${i}] must be a non-empty string`);
      }
    }
  }

  return patch;
}

// ── List mode — patch apply ───────────────────────────────────────────────────

/**
 * Apply a validated list-mode patch to a raw constructs object.
 * Returns a deep-copied new object — never mutates rawObj.
 *
 * @param {object} rawObj
 * @param {{ add?: string[], remove?: string[] }} patch
 * @param {'compoundPart'|'rootWord'} mode
 * @returns {object}
 */
export function applyPatchToRawList(rawObj, patch, mode) {
  const newRaw = JSON.parse(JSON.stringify(rawObj));
  const listKey = mode === 'compoundPart' ? 'compoundParts' : 'rootWords';
  const list = [...(newRaw[listKey] || [])];

  for (const word of patch.remove || []) {
    const idx = list.indexOf(word);
    if (idx >= 0) list.splice(idx, 1);
  }

  for (const word of patch.add || []) {
    if (!list.includes(word)) list.push(word);
  }

  newRaw[listKey] = list;
  return newRaw;
}

// ── List mode — Step 2 analysis ───────────────────────────────────────────────

/**
 * Analyse a word for Compound Part mode (Step 2).
 *
 * Runs the real tryCompoundSplit against the word. If it already splits,
 * returns { alreadySplits: true, split }. If not, enumerates every candidate
 * split point the real algorithm's loop would consider and shows which halves
 * are already in compoundPartsSet.
 *
 * Each candidate includes wouldChange: whether enabling the compound path at
 * that boundary (by adding whichever halves are missing) would actually produce
 * a different syllable split from what pattern-fallback already gives today.
 * When wouldChange is false the addition is a no-op and the Target button
 * should not be shown.
 *
 * @param {string} word
 * @param {object} compiledObj
 * @returns {{ alreadySplits: boolean, split: string[]|null, currentSplit: string[], candidates?: Array }}
 */
export function analyzeCompoundWord(word, compiledObj) {
  const w = word.toLowerCase().replace(/[^a-z]/g, '');
  const compoundPartsSet = buildCompoundPartsSet(compiledObj.compoundParts || []);
  const split = tryCompoundSplit(w, compoundPartsSet);
  const ctx = buildSyllableCtx(compiledObj);
  const currentSplit = splitSyllables(w, ctx);

  if (split) {
    return { alreadySplits: true, split, currentSplit };
  }

  const candidates = [];
  if (w.length >= 5) {
    for (let i = w.length - 2; i >= 3; i--) {
      const left  = w.slice(0, i);
      const right = w.slice(i);
      const leftInSet  = compoundPartsSet.has(left);
      const rightInSet = compoundPartsSet.has(right);

      // Simulate enabling the compound path at this boundary: add whichever
      // halves are missing, then re-run the full splitSyllables pipeline.
      const testSet = new Set([...compoundPartsSet, left, right]);
      const testCtx = { ...ctx, compoundPartsSet: testSet };
      const newSplit    = splitSyllables(w, testCtx);
      const wouldChange = JSON.stringify(newSplit) !== JSON.stringify(currentSplit);

      candidates.push({ left, right, leftInSet, rightInSet, wouldChange, newSplit });
    }
  }

  return { alreadySplits: false, split: null, currentSplit, candidates };
}

/**
 * Analyse a word for Root Word mode (Step 2).
 *
 * Runs the real tryStripSuffix against the word. Returns the match result,
 * the word's current split, and any candidates where undoubling was blocked
 * by a missing root entry.
 *
 * Each blocked candidate includes wouldChange: whether adding it to rootWords
 * would actually produce a different syllable split from what the algorithm
 * already gives today. When wouldChange is false the addition is a no-op.
 *
 * @param {string} word
 * @param {object} compiledObj
 * @returns {{ actualResult: object|null, currentSplit: string[], blockedCandidates: Array }}
 */
export function analyzeRootWord(word, compiledObj) {
  const w = word.toLowerCase().replace(/[^a-z]/g, '');
  const rootWordsSet = buildRootWordsSet(compiledObj.rootWords || []);
  const rules = compiledObj.suffixStripRules || [];
  const ctx = buildSyllableCtx(compiledObj);
  const currentSplit = splitSyllables(w, ctx);

  const actualResult = tryStripSuffix(w, rules, rootWordsSet);

  const blockedCandidates = [];
  for (const r of rules) {
    if (w.length < r.suffix.length + r.minStem) continue;
    if (!w.endsWith(r.suffix)) continue;

    const stem = w.slice(0, -r.suffix.length);

    if (r.edOnly) {
      const lastCh = stem[stem.length - 1];
      if (lastCh !== 't' && lastCh !== 'd') continue;
    }

    if (!/[aeiouy]/.test(stem)) continue;

    if (r.undouble && stem.length >= 3) {
      const c1 = stem[stem.length - 1];
      const c2 = stem[stem.length - 2];
      if (c1 === c2 && !/[aeiou]/.test(c1) && c1 !== 'l' && c1 !== 's' && c1 !== 'f') {
        const candidate = stem.slice(0, -1);
        if (!rootWordsSet.has(candidate)) {
          const testSet  = new Set([...rootWordsSet, candidate]);
          const testCtx  = { ...ctx, rootWordsSet: testSet };
          const newSplit    = splitSyllables(w, testCtx);
          const wouldChange = JSON.stringify(newSplit) !== JSON.stringify(currentSplit);
          blockedCandidates.push({
            suffix: r.suffix,
            undoubledSuffix: c1 + r.suffix,
            candidate,
            wouldChange,
            newSplit,
          });
        }
      }
    }
  }

  return { actualResult, currentSplit, blockedCandidates };
}

// ── List mode — blast radius ──────────────────────────────────────────────────

function buildSyllableCtx(compiledObj) {
  return {
    vowelNucleiList:    buildVowelNucleiList(compiledObj.patternCategories || {}),
    compoundPartsSet:   buildCompoundPartsSet(compiledObj.compoundParts || []),
    rootWordsSet:       buildRootWordsSet(compiledObj.rootWords || []),
    suffixStripRules:   compiledObj.suffixStripRules || [],
    patternCategoryMap: buildPatternCategoryMap(compiledObj.patternCategories || {}),
  };
}

function listModeWordPool(fixturesObj) {
  const wordSet = new Set();
  for (const f of [
    ...(fixturesObj.vowelTeamSounds || []),
    ...(fixturesObj.syllableSplit   || []),
    ...(fixturesObj.tokenizer        || []),
  ]) {
    if (f.word) wordSet.add(String(f.word).toLowerCase().replace(/[^a-z]/g, ''));
  }
  return wordSet;
}

/**
 * Compute the blast radius for adding/removing a compoundParts candidate.
 *
 * Scans the full word pool for every word where the real tryCompoundSplit loop
 * would consider `candidate` as a valid half (respecting ≥3/≥2 char bounds).
 * For each match, computes current split and what split would be with candidate
 * toggled into the set.
 *
 * @param {string} candidate
 * @param {object} compiledObj
 * @param {object} fixturesObj
 * @returns {Array<{ word, currentSplit, newSplit, changes }>}
 */
export function computeCompoundBlastRadius(candidate, compiledObj, fixturesObj) {
  const wordSet = listModeWordPool(fixturesObj);

  const affected = [...wordSet].filter(word => {
    if (word.length < 5) return false;
    for (let i = word.length - 2; i >= 3; i--) {
      if (word.slice(0, i) === candidate || word.slice(i) === candidate) return true;
    }
    return false;
  });

  const oldCtx = buildSyllableCtx(compiledObj);
  const newCompoundPartsSet = new Set([...oldCtx.compoundPartsSet, candidate]);
  const newCtx = { ...oldCtx, compoundPartsSet: newCompoundPartsSet };

  return affected.sort().map(word => {
    const currentSplit = splitSyllables(word, oldCtx);
    const newSplit     = splitSyllables(word, newCtx);
    const changes      = JSON.stringify(currentSplit) !== JSON.stringify(newSplit);
    return { word, currentSplit, newSplit, changes };
  });
}

/**
 * Compute the blast radius for adding/removing a rootWords candidate.
 *
 * Scans the full word pool for every word ending in any suffixStripRules suffix
 * whose stripped-and-undoubled stem equals the candidate.
 *
 * @param {string} candidate
 * @param {object} compiledObj
 * @param {object} fixturesObj
 * @returns {Array<{ word, currentSplit, newSplit, changes }>}
 */
export function computeRootWordBlastRadius(candidate, compiledObj, fixturesObj) {
  const wordSet = listModeWordPool(fixturesObj);
  const rules   = compiledObj.suffixStripRules || [];

  const affected = [...wordSet].filter(word => {
    for (const r of rules) {
      if (word.length < r.suffix.length + r.minStem) continue;
      if (!word.endsWith(r.suffix)) continue;

      const stem = word.slice(0, -r.suffix.length);

      if (r.edOnly) {
        const lastCh = stem[stem.length - 1];
        if (lastCh !== 't' && lastCh !== 'd') continue;
      }

      if (!/[aeiouy]/.test(stem)) continue;

      if (r.undouble && stem.length >= 3) {
        const c1 = stem[stem.length - 1];
        const c2 = stem[stem.length - 2];
        if (c1 === c2 && !/[aeiou]/.test(c1) && c1 !== 'l' && c1 !== 's' && c1 !== 'f') {
          if (stem.slice(0, -1) === candidate) return true;
        }
      }

      if (stem === candidate) return true;
    }
    return false;
  });

  const oldCtx = buildSyllableCtx(compiledObj);
  const newRootWordsSet = new Set([...oldCtx.rootWordsSet, candidate]);
  const newCtx = { ...oldCtx, rootWordsSet: newRootWordsSet };

  return affected.sort().map(word => {
    const currentSplit = splitSyllables(word, oldCtx);
    const newSplit     = splitSyllables(word, newCtx);
    const changes      = JSON.stringify(currentSplit) !== JSON.stringify(newSplit);
    return { word, currentSplit, newSplit, changes };
  });
}

// ── Syllable regression diff ──────────────────────────────────────────────────

/**
 * Re-run every syllableSplit fixture against two compiled objects and return
 * rows where the resulting split array differs.
 *
 * Sibling to runRegressionDiff; reuses the same nowPassing/expectedFailure
 * logic — a syllableSplit fixture with expectedFailure: true that now matches
 * its documented target split is marked nowPassing and excluded from the
 * merge-blocking set.
 *
 * @param {object} oldCompiled
 * @param {object} newCompiled
 * @param {object} fixturesObj
 * @returns {Array<{ word, target, oldSplit, newSplit, nowPassing }>}
 */
export function runSyllableRegressionDiff(oldCompiled, newCompiled, fixturesObj) {
  const oldCtx = buildSyllableCtx(oldCompiled);
  const newCtx = buildSyllableCtx(newCompiled);

  const diffs = [];
  for (const f of fixturesObj.syllableSplit || []) {
    const word     = String(f.word);
    const oldSplit = splitSyllables(word, oldCtx);
    const newSplit = splitSyllables(word, newCtx);
    if (JSON.stringify(oldSplit) !== JSON.stringify(newSplit)) {
      const target     = f.split;
      const nowPassing = f.expectedFailure === true &&
                         JSON.stringify(newSplit) === JSON.stringify(target);
      diffs.push({ word, target, oldSplit, newSplit, nowPassing });
    }
  }
  return diffs;
}

// ── List mode — CHANGELOG entry builder ──────────────────────────────────────

/**
 * Build markdown table rows for the CHANGELOG in list mode.
 * Format: | word | list | action | date | reason |
 *
 * @param {{ add?: string[], remove?: string[] }} patch
 * @param {'compoundPart'|'rootWord'} mode
 * @param {string} reason
 * @param {string} date  - ISO date (YYYY-MM-DD)
 * @returns {string[]}
 */
export function buildChangelogEntriesForList(patch, mode, reason, date) {
  const listName   = mode === 'compoundPart' ? 'compoundParts' : 'rootWords';
  const safeReason = (reason || '').replace(/\|/g, '/').trim() || '(no reason given)';
  const lines = [];
  for (const word of patch.add || []) {
    lines.push(`| ${word} | ${listName} | added | ${date} | ${safeReason} |`);
  }
  for (const word of patch.remove || []) {
    lines.push(`| ${word} | ${listName} | removed | ${date} | ${safeReason} |`);
  }
  return lines;
}
