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
