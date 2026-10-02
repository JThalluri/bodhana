/**
 * constructs-compile-core.mjs
 *
 * Pure YAML-object → compiled-JSON transform. Zero file I/O.
 * Exported as a named function so Phase 2's Constructs Workbench can import
 * and call it in-browser for sandbox-apply, without any Node built-in deps.
 *
 * Usage:
 *   import { compileConstructs } from './constructs-compile-core.mjs';
 *   const compiled = compileConstructs(parsedYamlObject, { sourceHash, generatedAt });
 */

/**
 * Normalise a raw parsed-YAML constructs object into the compiled JSON shape.
 *
 * @param {object} raw         - Result of js-yaml.load(yamlString)
 * @param {object} [meta]      - { sourceHash?: string, generatedAt?: string }
 * @returns {object}           - Compiled constructs object matching §4.2 shape
 */
export function compileConstructs(raw, meta = {}) {
  // Validate schemaVersion presence (content validation is the validator's job;
  // this just ensures the field survives the transform).
  if (!raw.schemaVersion) {
    throw new Error('compileConstructs: raw object has no schemaVersion');
  }

  // Normalise suffixStripRules: fill in optional boolean fields with defaults
  const suffixStripRules = (raw.suffixStripRules || []).map(r => ({
    suffix:   String(r.suffix),
    minStem:  Number(r.minStem),
    always:   Boolean(r.always),
    undouble: Boolean(r.undouble || false),
    edOnly:   Boolean(r.edOnly || false),
  }));

  // Normalise vowelTeamExceptions: ensure note field is null when absent
  const vowelTeamExceptions = (raw.vowelTeamExceptions || []).map(row => ({
    word:    String(row.word),
    pattern: String(row.pattern),
    sound:   String(row.sound),
    note:    row.note != null ? String(row.note) : null,
  }));

  return {
    schemaVersion: String(raw.schemaVersion),
    generatedAt:   meta.generatedAt || new Date().toISOString(),
    sourceHash:    meta.sourceHash  || null,

    patternCategories:            deepCopy(raw.patternCategories),
    patternCategoryDefaultLevels: deepCopy(raw.patternCategoryDefaultLevels),
    patternLevelOverrides:        deepCopy(raw.patternLevelOverrides),
    scopeLevels:                  deepCopy(raw.scopeLevels),
    soundLabels:                  deepCopy(raw.soundLabels),
    defaultVowelSound:            deepCopy(raw.defaultVowelSound),

    vowelTeamExceptions,

    compoundParts:    [...(raw.compoundParts || [])].map(String),
    rootWords:        [...(raw.rootWords     || [])].map(String),
    suffixStripRules,
  };
}

function deepCopy(v) {
  if (v === null || v === undefined) return v;
  return JSON.parse(JSON.stringify(v));
}
