/**
 * PhonicsEngine.mjs — public API for phonics analysis
 *
 * Orchestration + I/O + public API shape only.
 * All linguistic computation is delegated to src/phonics/core/*.mjs.
 * Zero phonics logic lives here.
 */

import { loadConstructs } from './constructsLoader.mjs';
import {
  buildSortedPatterns,
  tokenize as coreTokenize,
  buildVowelNucleiList,
  buildCompoundPartsSet,
  buildRootWordsSet,
  buildPatternCategoryMap,
  buildSyllableSplitOverridesMap,
  splitSyllables,
  countSyllables,
  onsetRime,
  identifyVowelNuclei,
  lookupException,
  soundForVowelTeam as coreSoundForVowelTeam,
  vowelTeamSounds as coreVowelTeamSounds,
  findAllPatterns,
  findSecondaryPatterns,
  computeDifficulty,
  decodabilityLevel,
  findMinimalPairs as coreFindMinimalPairs,
} from './core/index.mjs';

// ---------------------------------------------------------------------------
// Module initialization — throws synchronously on schemaVersion mismatch
// ---------------------------------------------------------------------------

const c = loadConstructs();

const sortedPatterns    = buildSortedPatterns(c.patternCategories);
const vowelNucleiList   = buildVowelNucleiList(c.patternCategories);
const compoundPartsSet  = buildCompoundPartsSet(c.compoundParts);
const rootWordsSet      = buildRootWordsSet(c.rootWords);
const patternCategoryMap = buildPatternCategoryMap(c.patternCategories);
const syllableSplitOverridesMap = buildSyllableSplitOverridesMap(c.syllableSplitOverrides || []);

const syllableCtx = {
  vowelNucleiList,
  compoundPartsSet,
  rootWordsSet,
  suffixStripRules: c.suffixStripRules,
  patternCategoryMap,
  syllableSplitOverridesMap,
};

// ---------------------------------------------------------------------------
// Exported constants
// ---------------------------------------------------------------------------

export const ENGINE_VERSION    = '3.0.0';
export const PHONICS_PATTERNS  = c.patternCategories;
export const PATTERN_CATEGORY  = c.patternCategory;
export const PATTERN_LEVELS    = c.patternLevels;
export const SCOPE_LEVELS      = c.scopeLevels;
export const SOUND_LABELS      = c.soundLabels;
export const DEFAULT_VOWEL_SOUND = c.defaultVowelSound;

// SORTED_PATTERNS: [{ pattern, category }] longest-first (from buildSortedPatterns)
export const SORTED_PATTERNS = sortedPatterns;

// ---------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------

function cleanWord(raw) {
  return String(raw == null ? '' : raw).toLowerCase().replace(/[^a-z]/g, '');
}

/**
 * @param {string} rawWord
 * @returns {object|null}
 */
export function parseWord(rawWord) {
  const word = cleanWord(rawWord);
  if (!word) return null;

  const tokens  = coreTokenize(word, sortedPatterns);
  const buckets = findAllPatterns(word, sortedPatterns);

  const r_controlled = [
    ...(buckets.rControlled  || []),
    ...(buckets.rControlled3 || []),
  ].join(',');

  const sounds = coreVowelTeamSounds(
    word, tokens, c.vowelTeamExceptionsByWord, c.defaultVowelSound, c.soundLabels
  );

  const difficulty     = computeDifficulty(buckets, tokens);
  const syllables      = splitSyllables(word, syllableCtx);
  const { onset, rime } = onsetRime(word);
  const level          = decodabilityLevel(tokens, c.patternLevels);

  return {
    word,
    graphemes:          tokens.join('|'),
    phoneme_count:      tokens.length,
    digraphs:           (buckets.digraphs   || []).join(','),
    trigraphs:          (buckets.trigraphs  || []).join(','),
    blends:             (buckets.blends     || []).join(','),
    difficulty,
    clusters3:          (buckets.clusters3  || []).join(','),
    vowel_teams:        (buckets.vowelTeams || []).join(','),
    r_controlled,
    floss:              (buckets.floss      || []).join(','),
    letter_count:       word.length,
    syllable_count:     syllables.length,
    onset,
    rime,
    level,
    secondary_patterns: findSecondaryPatterns(tokens, buckets).join(','),
    vowel_team_sounds:  sounds.map(s => `${s.pattern}:${s.sound}`).join(','),
    tokens,
  };
}

/**
 * @param {string[]} list
 * @returns {object[]}
 */
export function parseWords(list) {
  const out = [];
  for (const w of list) {
    const r = parseWord(w);
    if (r) out.push(r);
  }
  return out;
}

/**
 * @param {string} text
 * @returns {object[]}
 */
export function parseText(text) {
  const words = [...new Set(
    String(text).toLowerCase().replace(/[^a-z\s]/g, ' ').trim().split(/\s+/).filter(Boolean)
  )];
  return parseWords(words);
}

// ---------------------------------------------------------------------------
// Analysis pass-throughs to core/
// ---------------------------------------------------------------------------

/**
 * @param {string} word
 * @param {{ mergeDoubleConsonants?: boolean }} [opts]
 * @returns {string[]}
 */
export function tokenize(word, opts) {
  return coreTokenize(cleanWord(word), sortedPatterns, opts);
}

export function findAllPatternsForWord(word) {
  return findAllPatterns(word, sortedPatterns);
}

/**
 * Find words in pool that are minimal pairs of word (same rime or same onset).
 * @param {string} word
 * @param {string[]} pool
 * @returns {{ word: string, sharedOnset: boolean, sharedRime: boolean }[]}
 */
export function findMinimalPairs(word, pool) {
  return coreFindMinimalPairs(cleanWord(word), pool.map(cleanWord));
}

export function countSyllablesForWord(word) {
  return countSyllables(word);
}

export function onsetRimeForWord(word) {
  return onsetRime(cleanWord(word));
}

export function splitSyllablesForWord(word) {
  return splitSyllables(cleanWord(word), syllableCtx);
}

export function identifyVowelNucleiForWord(word) {
  return identifyVowelNuclei(cleanWord(word), vowelNucleiList);
}

export function decodabilityLevelForRecord(record) {
  return decodabilityLevel(record.tokens, c.patternLevels);
}

export function soundForVowelTeam(word, pattern) {
  return coreSoundForVowelTeam(
    cleanWord(word), pattern, c.vowelTeamExceptionsByWord, c.defaultVowelSound
  );
}

export function vowelTeamSounds(word, tokens) {
  const w = cleanWord(word);
  const toks = tokens ?? coreTokenize(w, sortedPatterns);
  return coreVowelTeamSounds(w, toks, c.vowelTeamExceptionsByWord, c.defaultVowelSound, c.soundLabels);
}

export function lookupExceptionForWord(word, pattern) {
  return lookupException(cleanWord(word), pattern, c.vowelTeamExceptionsByWord);
}

// ---------------------------------------------------------------------------
// CSV
// ---------------------------------------------------------------------------

const BASE_COLUMNS = [
  'word', 'graphemes', 'phoneme_count', 'digraphs', 'trigraphs', 'blends', 'difficulty',
];

const EXTENDED_COLUMNS = [
  'clusters3', 'vowel_teams', 'r_controlled', 'floss', 'letter_count',
  'syllable_count', 'onset', 'rime', 'level',
  'secondary_patterns', 'vowel_team_sounds',
];

function csvCell(v) {
  const s = v == null ? '' : String(v);
  return /[,"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/**
 * @param {object[]} rows
 * @param {{ extended?: boolean, extraColumns?: string[] }} [opts]
 * @returns {string}
 */
export function toCSV(rows, { extended = false, extraColumns = [] } = {}) {
  const cols = extended
    ? [...BASE_COLUMNS, ...EXTENDED_COLUMNS, ...extraColumns]
    : [...BASE_COLUMNS];
  const lines = [cols.join(',')];
  for (const row of rows) {
    lines.push(cols.map(c => csvCell(row[c])).join(','));
  }
  return lines.join('\n');
}

/**
 * Trigger a browser CSV download. No-op outside browser environments.
 * @param {string} csv
 * @param {string} [filename]
 */
export function downloadCSV(csv, filename = 'phonics-export.csv') {
  if (typeof document === 'undefined') return;
  const blob = new Blob([csv], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

/**
 * Detect whether text is a pre-parsed CSV from a previous toCSV() call.
 * @param {string} text
 * @returns {boolean}
 */
export function isPreParsedCSV(text) {
  return typeof text === 'string' &&
    text.trimStart().startsWith('word,graphemes,phoneme_count,');
}

// ---------------------------------------------------------------------------
// Debug
// ---------------------------------------------------------------------------

export function selfTest() {
  const ship = parseWord('ship');
  return [
    `ENGINE_VERSION: ${ENGINE_VERSION}`,
    `schemaVersion: ${c.meta.schemaVersion}`,
    `sourceHash: ${c.meta.sourceHash}`,
    `generatedAt: ${c.meta.generatedAt}`,
    `ship.digraphs: ${ship?.digraphs}`,
    `ship.vowel_team_sounds: "${ship?.vowel_team_sounds}"`,
    `is_common absent: ${'is_common' in (ship ?? {})}`,
  ].join('\n');
}

// ---------------------------------------------------------------------------
// Default export — convenience aggregation for consumers preferring one import
// ---------------------------------------------------------------------------

export default {
  ENGINE_VERSION,
  PHONICS_PATTERNS,
  PATTERN_CATEGORY,
  PATTERN_LEVELS,
  SCOPE_LEVELS,
  SORTED_PATTERNS,
  SOUND_LABELS,
  DEFAULT_VOWEL_SOUND,
  parseWord,
  parseWords,
  parseText,
  tokenize: (word, opts) => tokenize(word, opts),
  findAllPatterns: findAllPatternsForWord,
  findMinimalPairs,
  countSyllables:       countSyllablesForWord,
  onsetRime:            onsetRimeForWord,
  splitSyllables:       splitSyllablesForWord,
  identifyVowelNuclei:  identifyVowelNucleiForWord,
  decodabilityLevel:    decodabilityLevelForRecord,
  soundForVowelTeam,
  vowelTeamSounds,
  lookupException:      lookupExceptionForWord,
  toCSV,
  downloadCSV,
  isPreParsedCSV,
  selfTest,
};
