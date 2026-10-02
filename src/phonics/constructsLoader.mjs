/**
 * constructsLoader.mjs
 *
 * Loads the compiled phonics-constructs.json, validates schemaVersion, and
 * derives all lookup tables once. This is the single point of contact with
 * the compiled data — core functions receive derived structures, not the raw
 * JSON. If the JSON shape ever changes, only this file and PhonicsEngine.mjs
 * need to know.
 */

import rawConstructs from './generated/phonics-constructs.json';
import { buildExceptionMap } from './core/vowelSounds.mjs';

const EXPECTED_SCHEMA_VERSION = '1.0.0';

/**
 * Load, validate, and transform the compiled constructs.
 * Throws synchronously on schemaVersion mismatch — never degrades silently.
 *
 * @param {object} [raw] - optional override for testing (defaults to compiled JSON)
 * @returns {object} fully-derived constructs object
 */
export function loadConstructs(raw = rawConstructs) {
  if (raw.schemaVersion !== EXPECTED_SCHEMA_VERSION) {
    throw new Error(
      `phonics-constructs.json schemaVersion mismatch: expected ${EXPECTED_SCHEMA_VERSION}, ` +
      `got ${raw.schemaVersion}. Re-run the Phase 1 compiler (node scripts/build-constructs.mjs) ` +
      `or update EXPECTED_SCHEMA_VERSION in constructsLoader.mjs if this is an intentional shape change.`
    );
  }

  // patternCategory: { [pattern]: category }
  const patternCategory = Object.create(null);
  for (const [cat, patterns] of Object.entries(raw.patternCategories)) {
    for (const p of patterns) {
      patternCategory[p] = cat;
    }
  }

  // patternLevels: { [pattern]: 1..8 } — category default, overridden per-pattern where specified
  const patternLevels = Object.create(null);
  for (const [cat, patterns] of Object.entries(raw.patternCategories)) {
    const base = raw.patternCategoryDefaultLevels[cat] ?? 1;
    for (const p of patterns) {
      patternLevels[p] = raw.patternLevelOverrides[p] ?? base;
    }
  }

  // vowelTeamExceptionsByWord: { [word]: { [pattern]: sound } } — one pass over the flat array
  const vowelTeamExceptionsByWord = buildExceptionMap(raw.vowelTeamExceptions);

  return {
    patternCategories:         raw.patternCategories,
    patternCategory,
    patternLevels,
    scopeLevels:               raw.scopeLevels,
    soundLabels:               raw.soundLabels,
    defaultVowelSound:         raw.defaultVowelSound,
    vowelTeamExceptionsByWord,
    compoundParts:             raw.compoundParts,
    rootWords:                 raw.rootWords,
    suffixStripRules:          raw.suffixStripRules,
    meta: {
      schemaVersion: raw.schemaVersion,
      sourceHash:    raw.sourceHash,
      generatedAt:   raw.generatedAt,
    },
  };
}
