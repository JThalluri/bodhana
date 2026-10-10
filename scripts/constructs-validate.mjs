/**
 * constructs-validate.mjs
 *
 * Pure validation functions for phonics-constructs.yaml. No file I/O.
 * Importable by both the CLI compiler and the Phase 2 Constructs Workbench.
 *
 * Each exported function throws a ValidationError on failure (listing ALL
 * specific violations, not just the first).
 */

export class ValidationError extends Error {
  constructor(rule, violations) {
    super(`[${rule}] ${violations.length} violation(s):\n` +
      violations.map(v => `  - ${v}`).join('\n'));
    this.rule = rule;
    this.violations = violations;
  }
}

function fail(rule, violations) {
  throw new ValidationError(rule, violations);
}

/**
 * 5.1 Reachability — every pattern declared in patternCategories must appear
 * as an exact token in at least one tokenizer fixture's graphemes field.
 */
export function checkReachability(constructs, fixtures) {
  const declared = new Set(
    Object.values(constructs.patternCategories).flat()
  );
  const produced = new Set();
  for (const f of fixtures.tokenizer) {
    for (const tok of f.graphemes.split('|')) produced.add(tok);
  }
  const unreachable = [...declared].filter(p => !produced.has(p));
  if (unreachable.length) {
    fail('reachability', unreachable.map(p => `pattern "${p}" never appears as a token in any tokenizer fixture`));
  }
}

/**
 * 5.2 No cross-category pattern collisions — no pattern string may appear in
 * more than one category.
 */
export function checkNoCrossCategoryCollisions(constructs) {
  const seen = new Map(); // pattern -> category
  const violations = [];
  for (const [cat, patterns] of Object.entries(constructs.patternCategories)) {
    for (const p of patterns) {
      if (seen.has(p)) {
        violations.push(`"${p}" declared in both "${seen.get(p)}" and "${cat}"`);
      } else {
        seen.set(p, cat);
      }
    }
  }
  if (violations.length) fail('cross-category-collision', violations);
}

/**
 * 5.3 Suffix/exception branch coverage — every suffixStripRule must be
 * exercised by ≥1 syllableSplit fixture, and all three lookupException tiers
 * (direct, suffix-stripped, compound-scan) must be exercised by ≥1
 * vowelTeamSounds fixture.
 *
 * For Phase 1, the three-tier coverage is checked by replaying a simplified
 * version of lookupException's logic against the fixtures — this is validation
 * code only, not the shipped engine.
 */
export function checkSuffixAndExceptionBranchCoverage(constructs, fixtures) {
  // --- Suffix rule coverage ---
  const suffixesUsed = new Set();
  for (const f of fixtures.syllableSplit) {
    for (const r of constructs.suffixStripRules) {
      if (f.word.endsWith(r.suffix)) {
        suffixesUsed.add(r.suffix);
      }
    }
  }
  const missingSuffixes = constructs.suffixStripRules
    .map(r => r.suffix)
    .filter(s => !suffixesUsed.has(s));
  if (missingSuffixes.length) {
    fail('suffix-rule-coverage', missingSuffixes.map(s =>
      `suffix "${s}" has no syllableSplit fixture ending with it`));
  }

  // --- Three-tier lookup coverage ---
  // Build exception lookup map (word -> { pattern -> sound })
  const exceptByWord = {};
  for (const row of constructs.vowelTeamExceptions) {
    if (!exceptByWord[row.word]) exceptByWord[row.word] = {};
    exceptByWord[row.word][row.pattern] = row.sound;
  }

  const suffixes = ['ing', 'est', 'ed', 'er', 'ly', 's', 'd', 'es'];
  let directHit = false;
  let suffixHit = false;
  let compoundHit = false;

  for (const f of fixtures.vowelTeamSounds) {
    const word = f.word;
    const pattern = f.pattern;

    // Tier 1: direct
    if (exceptByWord[word]?.[pattern]) {
      directHit = true;
      continue;
    }
    // Tier 2: suffix-stripped
    let strippedHit = false;
    for (const s of suffixes) {
      if (word.length > s.length + 2 && word.endsWith(s)) {
        const stem = word.slice(0, -s.length);
        if (exceptByWord[stem]?.[pattern]) {
          suffixHit = true;
          strippedHit = true;
          break;
        }
      }
    }
    if (strippedHit) continue;
    // Tier 3: compound-scan
    for (let j = 3; j <= word.length - 3; j++) {
      const prefix = word.slice(0, j);
      const suffix = word.slice(j);
      if (exceptByWord[prefix]?.[pattern] || exceptByWord[suffix]?.[pattern]) {
        compoundHit = true;
        break;
      }
    }
  }

  const tierViolations = [];
  if (!directHit)   tierViolations.push('direct-lookup tier never exercised by any vowelTeamSounds fixture');
  if (!suffixHit)   tierViolations.push('suffix-stripped tier never exercised by any vowelTeamSounds fixture');
  if (!compoundHit) tierViolations.push('compound-scan tier never exercised by any vowelTeamSounds fixture');
  if (tierViolations.length) fail('exception-tier-coverage', tierViolations);
}

/**
 * 5.4 Exception-table self-consistency — every row is verified against its
 * own stated output, and no (word, pattern) pair appears twice.
 */
export function checkExceptionTableSelfConsistency(constructs) {
  const seenPairs = new Set();
  const violations = [];

  for (const row of constructs.vowelTeamExceptions) {
    const key = `${row.word}|${row.pattern}`;
    if (seenPairs.has(key)) {
      violations.push(`duplicate-exception-row: "${row.word}" + "${row.pattern}" appears more than once`);
    }
    seenPairs.add(key);

    if (!row.word.includes(row.pattern)) {
      violations.push(`exception-pattern-not-in-word: word "${row.word}" does not contain pattern "${row.pattern}"`);
    }
    if (!constructs.soundLabels[row.sound]) {
      violations.push(`exception-unknown-sound: "${row.sound}" in row for "${row.word}" has no soundLabels entry`);
    }
    if (!constructs.patternCategories.vowelTeams.includes(row.pattern)) {
      violations.push(`exception-pattern-not-a-vowel-team: "${row.pattern}" in row for "${row.word}" is not in patternCategories.vowelTeams`);
    }
  }

  if (violations.length) fail('exception-table-self-consistency', violations);
}

/**
 * 5.6 Grapheme integrity — for every tokenizer fixture, the graphemes field
 * must join back to the original word with no gaps or extra characters.
 * Invariant: graphemes.split('|').join('') === word
 */
export function checkGraphemeIntegrity(fixtures) {
  const failures = [];
  for (const f of fixtures.tokenizer || []) {
    const joined = f.graphemes.split('|').join('');
    if (joined !== f.word) {
      failures.push(`${f.word}: graphemes "${f.graphemes}" joins to "${joined}", not "${f.word}"`);
    }
  }
  if (failures.length) {
    throw new ValidationError('grapheme-integrity', failures);
  }
}

/**
 * 5.5 Additional structural checks.
 */
export function checkStructure(constructs) {
  const violations = [];
  const allPatterns = new Set(Object.values(constructs.patternCategories).flat());

  // patternLevelOverrides keys must exist in some patternCategories list
  for (const p of Object.keys(constructs.patternLevelOverrides)) {
    if (!allPatterns.has(p)) {
      violations.push(`patternLevelOverrides key "${p}" not found in any patternCategories list`);
    }
  }

  // defaultVowelSound keys must be in vowelTeams
  const vowelTeamSet = new Set(constructs.patternCategories.vowelTeams);
  for (const p of Object.keys(constructs.defaultVowelSound)) {
    if (!vowelTeamSet.has(p)) {
      violations.push(`defaultVowelSound key "${p}" is not in patternCategories.vowelTeams`);
    }
  }

  // Every sound referenced anywhere must have a soundLabels entry
  for (const sound of Object.values(constructs.defaultVowelSound)) {
    if (!constructs.soundLabels[sound]) {
      violations.push(`defaultVowelSound value "${sound}" has no soundLabels entry`);
    }
  }
  for (const row of constructs.vowelTeamExceptions) {
    if (!constructs.soundLabels[row.sound]) {
      violations.push(`vowelTeamExceptions sound "${row.sound}" (word: ${row.word}) has no soundLabels entry`);
    }
  }

  // compoundParts: length >= 2
  for (const w of constructs.compoundParts) {
    if (w.length < 2) {
      violations.push(`compoundParts entry "${w}" is shorter than 2 characters (hard-fail — do not silently drop)`);
    }
  }

  // rootWords: length >= 3
  for (const w of constructs.rootWords) {
    if (w.length < 3) {
      violations.push(`rootWords entry "${w}" is shorter than 3 characters (hard-fail — do not silently drop)`);
    }
  }

  // suffixStripRules: non-empty lowercase-alpha suffix, positive integer minStem,
  // optional segments must be a non-empty array of lowercase-alpha strings
  for (const r of constructs.suffixStripRules) {
    if (!r.suffix || !/^[a-z]+$/.test(r.suffix)) {
      violations.push(`suffixStripRules entry has invalid suffix: "${r.suffix}"`);
    }
    if (!Number.isInteger(r.minStem) || r.minStem < 1) {
      violations.push(`suffixStripRules entry for "${r.suffix}" has invalid minStem: ${r.minStem}`);
    }
    if (r.segments !== undefined) {
      if (!Array.isArray(r.segments) || r.segments.length < 2 ||
          r.segments.some(s => !/^[a-z]+$/.test(s))) {
        violations.push(`suffixStripRules entry for "${r.suffix}" has invalid segments: must be array of ≥2 lowercase-alpha strings`);
      } else if (r.segments.join('') !== r.suffix) {
        violations.push(`suffixStripRules entry for "${r.suffix}": segments "${r.segments.join(',')}" do not concatenate to suffix`);
      }
    }
  }

  // syllableSplitOverrides: each entry must have a non-empty word and a split array of ≥2 segments
  for (const entry of constructs.syllableSplitOverrides || []) {
    if (!entry.word || !/^[a-z]+$/.test(entry.word)) {
      violations.push(`syllableSplitOverrides entry has invalid word: "${entry.word}"`);
    }
    if (!Array.isArray(entry.split) || entry.split.length < 2 ||
        entry.split.some(s => !/^[a-z]+$/.test(s))) {
      violations.push(`syllableSplitOverrides entry for "${entry.word}" has invalid split: must be array of ≥2 lowercase-alpha strings`);
    } else if (entry.split.join('') !== entry.word) {
      violations.push(`syllableSplitOverrides entry for "${entry.word}": split segments don't concatenate to word`);
    }
  }

  if (violations.length) fail('structural-checks', violations);
}

/**
 * Run all validation checks. Throws on the first failing check (but each
 * individual check reports ALL its violations before throwing).
 */
export function validateAll(constructs, fixtures) {
  checkNoCrossCategoryCollisions(constructs);
  checkStructure(constructs);
  checkExceptionTableSelfConsistency(constructs);
  checkReachability(constructs, fixtures);
  checkSuffixAndExceptionBranchCoverage(constructs, fixtures);
  checkGraphemeIntegrity(fixtures);
}
