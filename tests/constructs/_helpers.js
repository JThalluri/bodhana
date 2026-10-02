/**
 * Shared helpers for the constructs regression harness.
 * Loads the compiled JSON and fixtures once; exports the fully-initialised
 * lookup structures so individual test files stay clean.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import { load as yamlLoad } from 'js-yaml';

import {
  buildSortedPatterns,
  buildVowelNucleiList,
  buildCompoundPartsSet,
  buildRootWordsSet,
  buildPatternCategoryMap,
  buildExceptionMap,
} from '../../src/phonics/core/index.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');

// Load artifacts (compiled JSON was already written by pretest hook)
const constructs = JSON.parse(
  readFileSync(join(root, 'src/phonics/generated/phonics-constructs.json'), 'utf8')
);
const fixtures = yamlLoad(
  readFileSync(join(root, 'constructs/fixtures/phonics-regression-fixtures.v2.yaml'), 'utf8')
);

// Build lookup structures once
const sortedPatterns    = buildSortedPatterns(constructs.patternCategories);
const vowelNucleiList   = buildVowelNucleiList(constructs.patternCategories);
const compoundPartsSet  = buildCompoundPartsSet(constructs.compoundParts);
const rootWordsSet      = buildRootWordsSet(constructs.rootWords);
const patternCategoryMap = buildPatternCategoryMap(constructs.patternCategories);
const exceptionMap      = buildExceptionMap(constructs.vowelTeamExceptions);

/** Context object passed to splitSyllables */
const syllableCtx = {
  vowelNucleiList,
  compoundPartsSet,
  rootWordsSet,
  suffixStripRules: constructs.suffixStripRules,
  patternCategoryMap,
};

export { constructs, fixtures, sortedPatterns, vowelNucleiList, exceptionMap, syllableCtx };
