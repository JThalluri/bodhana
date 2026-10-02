/**
 * src/phonics/core/index.mjs
 *
 * Re-exports every public symbol from the phonics core modules.
 * Consumers can import from the package root or from individual modules.
 */

export { buildSortedPatterns, tokenize } from './tokenize.mjs';
export { buildVowelNucleiList, identifyVowelNuclei } from './vowelNuclei.mjs';
export {
  buildCompoundPartsSet,
  buildRootWordsSet,
  buildPatternCategoryMap,
  tryCompoundSplit,
  tryStripSuffix,
  splitSyllables,
  countSyllables,
  onsetRime,
} from './syllables.mjs';
export {
  buildExceptionMap,
  lookupException,
  vowelTeamSounds,
  findAllPatterns,
  computeDifficulty,
  decodabilityLevel,
} from './vowelSounds.mjs';
