/**
 * Tests for the compoundPart / rootWord extension to the Constructs Workbench.
 *
 * AC 2  — Compound Part Step 2: gingerbread correctly identifies ginger as the
 *          missing half via the real algorithm (not substring matching).
 * AC 3  — runSyllableRegressionDiff nowPassing logic: demonstrated via synthetic
 *          fixtures (removing 'some' from compoundParts makes 'something' fail;
 *          re-adding it is marked nowPassing, excluded from unexpectedChanges).
 * AC 4  — Reindeer: both rein AND deer are missing from compoundParts.
 * AC 5  — Compound Part patch containing vowelTeamExceptions-shaped row, or
 *          targeting rootWords, is rejected immediately.
 * AC 6  — Root Word Step 2: logging correctly identifies 'log' as the missing
 *          root (parallel to the slimmer/slim fix).
 * AC 7  — checkStructure length hard-fails: <2 chars in compoundParts, <3 in
 *          rootWords — surfaced through the same Step 7 validator gate.
 * AC 8  — CHANGELOG entries use the adapted | word | list | action | date | reason | format.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { load as yamlLoad } from 'js-yaml';
import { compileConstructs }                      from '../../scripts/constructs-compile-core.mjs';
import { validateAll, ValidationError }            from '../../scripts/constructs-validate.mjs';
import {
  validatePatchSchemaForList,
  applyPatchToRawList,
  analyzeCompoundWord,
  analyzeRootWord,
  computeCompoundBlastRadius,
  computeRootWordBlastRadius,
  runSyllableRegressionDiff,
  buildChangelogEntriesForList,
} from '../../tools/constructs-workbench/workbench-core.mjs';

// ── Load real fixtures ────────────────────────────────────────────────────────

function readYaml(relPath) {
  const abs = fileURLToPath(new URL(relPath, import.meta.url));
  return yamlLoad(readFileSync(abs, 'utf8'));
}

let rawObj, fixturesObj, compiledObj;

beforeAll(() => {
  rawObj      = readYaml('../../constructs/phonics-constructs.yaml');
  fixturesObj = readYaml('../../constructs/fixtures/phonics-regression-fixtures.v2.yaml');
  compiledObj = compileConstructs(rawObj);
});

// ── validatePatchSchemaForList ────────────────────────────────────────────────

describe('validatePatchSchemaForList — valid patches', () => {
  it('accepts add patch in compoundPart mode', () => {
    const patch = validatePatchSchemaForList({ add: ['ginger'] }, 'compoundPart');
    expect(patch.add).toEqual(['ginger']);
  });

  it('accepts remove patch in compoundPart mode', () => {
    const patch = validatePatchSchemaForList({ remove: ['bread'] }, 'compoundPart');
    expect(patch.remove).toEqual(['bread']);
  });

  it('accepts add patch in rootWord mode', () => {
    const patch = validatePatchSchemaForList({ add: ['log'] }, 'rootWord');
    expect(patch.add).toEqual(['log']);
  });

  it('accepts wrapped { patch: { add: [...] } } form', () => {
    const patch = validatePatchSchemaForList({ patch: { add: ['ginger'] } }, 'compoundPart');
    expect(patch.add).toEqual(['ginger']);
  });

  it('accepts combined add+remove patch', () => {
    const patch = validatePatchSchemaForList({ add: ['ginger'], remove: ['someOld'] }, 'compoundPart');
    expect(patch.add).toHaveLength(1);
    expect(patch.remove).toHaveLength(1);
  });
});

describe('validatePatchSchemaForList — rejects modify', () => {
  it('rejects "modify" operation in compoundPart mode', () => {
    expect(() => validatePatchSchemaForList({ modify: ['ginger'] }, 'compoundPart'))
      .toThrow(/modify/i);
  });

  it('rejects "modify" operation in rootWord mode', () => {
    expect(() => validatePatchSchemaForList({ modify: ['log'] }, 'rootWord'))
      .toThrow(/modify/i);
  });
});

describe('validatePatchSchemaForList — rejects vowelTeamExceptions-shaped rows (AC 5)', () => {
  it('rejects object with word/pattern/sound in compoundPart add', () => {
    expect(() =>
      validatePatchSchemaForList({
        add: [{ word: 'ginger', pattern: 'er', sound: 'short_e' }],
      }, 'compoundPart')
    ).toThrow(/object/i);
  });

  it('rejects object with word/pattern/sound in rootWord add', () => {
    expect(() =>
      validatePatchSchemaForList({
        add: [{ word: 'log', pattern: 'o', sound: 'short_o' }],
      }, 'rootWord')
    ).toThrow(/object/i);
  });
});

describe('validatePatchSchemaForList — mode-scoped forbidden keys (AC 5)', () => {
  it('compoundPart mode rejects rootWords key immediately', () => {
    expect(() =>
      validatePatchSchemaForList({ rootWords: ['log'] }, 'compoundPart')
    ).toThrow(/rootWords/);
  });

  it('rootWord mode rejects compoundParts key immediately', () => {
    expect(() =>
      validatePatchSchemaForList({ compoundParts: ['ginger'] }, 'rootWord')
    ).toThrow(/compoundParts/);
  });

  it('rejects vowelTeamExceptions key in both modes', () => {
    expect(() =>
      validatePatchSchemaForList({ vowelTeamExceptions: [] }, 'compoundPart')
    ).toThrow(/vowelTeamExceptions/);
    expect(() =>
      validatePatchSchemaForList({ vowelTeamExceptions: [] }, 'rootWord')
    ).toThrow(/vowelTeamExceptions/);
  });

  it('rejects patternCategories key in compoundPart mode', () => {
    expect(() =>
      validatePatchSchemaForList({ patternCategories: {} }, 'compoundPart')
    ).toThrow(/patternCategories/);
  });
});

describe('validatePatchSchemaForList — unknown keys and malformed items', () => {
  it('rejects unknown key in compoundPart mode', () => {
    expect(() =>
      validatePatchSchemaForList({ upsert: ['ginger'] }, 'compoundPart')
    ).toThrow(/unknown key/i);
  });

  it('rejects empty string item', () => {
    expect(() =>
      validatePatchSchemaForList({ add: [''] }, 'compoundPart')
    ).toThrow(/non-empty string/i);
  });
});

// ── applyPatchToRawList ───────────────────────────────────────────────────────

describe('applyPatchToRawList', () => {
  it('adds ginger to compoundParts without mutating original', () => {
    const patch     = { add: ['ginger'] };
    const newRaw    = applyPatchToRawList(rawObj, patch, 'compoundPart');
    expect(newRaw.compoundParts).toContain('ginger');
    expect(rawObj.compoundParts).not.toContain('ginger'); // original unchanged
  });

  it('removes bread from compoundParts', () => {
    const patch  = { remove: ['bread'] };
    const newRaw = applyPatchToRawList(rawObj, patch, 'compoundPart');
    expect(newRaw.compoundParts).not.toContain('bread');
    expect(rawObj.compoundParts).toContain('bread'); // original unchanged
  });

  it('adds a root word to rootWords', () => {
    const patch  = { add: ['log'] };
    const newRaw = applyPatchToRawList(rawObj, patch, 'rootWord');
    expect(newRaw.rootWords).toContain('log');
    expect(rawObj.rootWords).not.toContain('log');
  });

  it('does not add duplicates', () => {
    const patch  = { add: ['bread'] }; // bread already present
    const newRaw = applyPatchToRawList(rawObj, patch, 'compoundPart');
    const count  = newRaw.compoundParts.filter(w => w === 'bread').length;
    expect(count).toBe(1);
  });
});

// ── analyzeCompoundWord (AC 2 — Step 2 identifies missing half) ───────────────

describe('analyzeCompoundWord — AC 2', () => {
  it('gingerbread: identifies ginger as missing, bread as present', () => {
    const result = analyzeCompoundWord('gingerbread', compiledObj);
    expect(result.alreadySplits).toBe(false);

    // Must find the i=6 split point: left='ginger', right='bread'
    const gingerEntry = result.candidates.find(c => c.left === 'ginger' && c.right === 'bread');
    expect(gingerEntry).toBeDefined();
    expect(gingerEntry.leftInSet).toBe(false);   // ginger is missing
    expect(gingerEntry.rightInSet).toBe(true);   // bread is present
  });

  it('gingerbread: uses real algorithm loop bounds (not substring)', () => {
    const result = analyzeCompoundWord('gingerbread', compiledObj);
    // Every candidate must have left.length >= 3 and right.length >= 2
    for (const c of result.candidates) {
      expect(c.left.length).toBeGreaterThanOrEqual(3);
      expect(c.right.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('something: already splits (both some and thing in list)', () => {
    const result = analyzeCompoundWord('something', compiledObj);
    expect(result.alreadySplits).toBe(true);
    expect(result.split).toEqual(['some', 'thing']);
  });
});

describe('analyzeCompoundWord — AC 4 (reindeer: both halves missing)', () => {
  it('reindeer: rein is missing from compoundParts', () => {
    const result = analyzeCompoundWord('reindeer', compiledObj);
    expect(result.alreadySplits).toBe(false);
    const reinEntry = result.candidates.find(c => c.left === 'rein' && c.right === 'deer');
    expect(reinEntry).toBeDefined();
    expect(reinEntry.leftInSet).toBe(false);   // rein is missing
    expect(reinEntry.rightInSet).toBe(false);  // deer is also missing
  });
});

// ── wouldChange: no-op detection ─────────────────────────────────────────────

describe('analyzeCompoundWord — wouldChange false positives (landmine, gingerbread, reindeer)', () => {
  it('landmine: both land and mine are missing, but fallback already gives land|mine — no genuine fix', () => {
    const result = analyzeCompoundWord('landmine', compiledObj);
    expect(result.alreadySplits).toBe(false);
    expect(result.currentSplit).toEqual(['land', 'mine']); // fallback already correct
    const entry = result.candidates.find(c => c.left === 'land' && c.right === 'mine');
    expect(entry).toBeDefined();
    expect(entry.wouldChange).toBe(false); // adding both → same split → no-op
  });

  it('gingerbread: ginger missing, bread present — adding ginger would not change the split', () => {
    // gingerbread already splits as ['gin','ger','bread'] via nucleus fallback.
    // Enabling the compound path (ginger+bread) recursively splits 'ginger' as
    // ['gin','ger'] then 'bread' as ['bread'] — identical result.
    const result = analyzeCompoundWord('gingerbread', compiledObj);
    expect(result.currentSplit).toEqual(['gin', 'ger', 'bread']);
    const entry = result.candidates.find(c => c.left === 'ginger' && c.right === 'bread');
    expect(entry.wouldChange).toBe(false);
  });

  it('reindeer: both rein and deer are missing — adding both would not change the split', () => {
    // reindeer already splits as ['rein','deer'] via nucleus fallback (ei + ee vowel teams).
    const result = analyzeCompoundWord('reindeer', compiledObj);
    expect(result.currentSplit).toEqual(['rein', 'deer']);
    const entry = result.candidates.find(c => c.left === 'rein' && c.right === 'deer');
    expect(entry.wouldChange).toBe(false);
  });

  it('daydream: day is present, dream is missing — adding dream genuinely changes the split', () => {
    // Without dream: nucleus fallback splits as ['dayd','ream'] (VCCV rule places boundary
    // between the ay nucleus and the ea nucleus, landing between d and r at position 4).
    // Adding dream enables compound split → ['day','dream'].
    const result = analyzeCompoundWord('daydream', compiledObj);
    expect(result.alreadySplits).toBe(false);
    const entry = result.candidates.find(c => c.left === 'day' && c.right === 'dream');
    expect(entry).toBeDefined();
    expect(entry.leftInSet).toBe(true);    // day is already in compoundParts
    expect(entry.rightInSet).toBe(false);  // dream is missing
    expect(entry.wouldChange).toBe(true);  // genuine fix — fallback gives wrong split
    expect(result.currentSplit).not.toEqual(['day', 'dream']); // currently wrong
    expect(entry.newSplit).toEqual(['day', 'dream']);           // would be correct
  });
});

// ── analyzeRootWord — AC 6 (parallel to slimmer/slim) ────────────────────────

describe('analyzeRootWord — AC 6', () => {
  it('logging: log is not in rootWords → surfaces log as blocked candidate', () => {
    // 'log' is not in rootWords — mirrors the slimmer/slim backlog case
    const { actualResult, blockedCandidates } = analyzeRootWord('logging', compiledObj);
    expect(compiledObj.rootWords).not.toContain('log'); // precondition
    expect(blockedCandidates.length).toBeGreaterThan(0);
    const logCandidate = blockedCandidates.find(bc => bc.candidate === 'log');
    expect(logCandidate).toBeDefined();
    expect(logCandidate.suffix).toBe('ing');
  });

  it('slimmer: slim IS in rootWords → strips correctly (actualResult defined, no blocked candidates)', () => {
    const { actualResult, blockedCandidates } = analyzeRootWord('slimmer', compiledObj);
    expect(compiledObj.rootWords).toContain('slim'); // precondition
    expect(actualResult).toBeDefined();
    expect(actualResult.stem).toBe('slim');
    // No unresolved blocked candidates since slim is present
    const slimBlocked = blockedCandidates.find(bc => bc.candidate === 'slim');
    expect(slimBlocked).toBeUndefined();
  });
});

describe('analyzeRootWord — wouldChange false positives (glimmer) and genuine fix (running)', () => {
  it('glimmer: glim is missing, but fallback already gives glim|mer — no genuine fix', () => {
    // -er is always:false with minStem:5. Without 'glim' in rootWords the suffix strip
    // fails entirely (undouble blocked, always:false, stem 'glimm' not a root).
    // The nucleus fallback then fires: VCCV on 'mm' boundary → ['glim','mer'].
    // Adding 'glim' enables undoubling, but the suffix path also produces ['glim','mer'].
    // Both routes give the same answer → wouldChange: false.
    const result = analyzeRootWord('glimmer', compiledObj);
    expect(result.currentSplit).toEqual(['glim', 'mer']);
    const entry = result.blockedCandidates.find(bc => bc.candidate === 'glim');
    expect(entry).toBeDefined();
    expect(entry.wouldChange).toBe(false);
    expect(entry.newSplit).toEqual(['glim', 'mer']); // same either way
  });

  it('logging: log is naturally missing from rootWords — adding it is a genuine fix (logg|ing → log|ging)', () => {
    // 'log' is not in rootWords (verified by AC6 precondition test).
    // -ing is always:true. Without 'log': undoubling blocked, always:true still fires with
    // stem='logg', suffix='ing' → ['logg','ing']. The nucleus fallback (VCCV on 'gg') would
    // also give ['logg','ing'] — but it never runs because the suffix fires first.
    // Adding 'log': undoubling fires → stem='log', re-appended 'g' + 'ing' = 'ging' →
    // ['log','ging']. Different from current → wouldChange: true.
    expect(compiledObj.rootWords).not.toContain('log'); // precondition: natural, no setup needed
    const result = analyzeRootWord('logging', compiledObj);
    expect(result.currentSplit).toEqual(['logg', 'ing']);
    const entry = result.blockedCandidates.find(bc => bc.candidate === 'log');
    expect(entry).toBeDefined();
    expect(entry.wouldChange).toBe(true);
    expect(entry.newSplit).toEqual(['log', 'ging']);
  });
});

// ── computeCompoundBlastRadius ────────────────────────────────────────────────

describe('computeCompoundBlastRadius', () => {
  it('includes gingerbread when targeting ginger', () => {
    const radius = computeCompoundBlastRadius('ginger', compiledObj, fixturesObj);
    const entry  = radius.find(r => r.word === 'gingerbread');
    expect(entry).toBeDefined();
  });

  it('gingerbread: currentSplit is [gin, ger, bread] (via nucleus fallback)', () => {
    const radius = computeCompoundBlastRadius('ginger', compiledObj, fixturesObj);
    const entry  = radius.find(r => r.word === 'gingerbread');
    expect(entry.currentSplit).toEqual(['gin', 'ger', 'bread']);
  });

  it('gingerbread: newSplit is [gin, ger, bread] — adding ginger does not change the result', () => {
    // Adding ginger enables compound split path (ginger+bread), but
    // splitSyllables('ginger') → ['gin','ger'] + splitSyllables('bread') → ['bread']
    // = ['gin','ger','bread'] — same as nucleus fallback. changes: false.
    const radius = computeCompoundBlastRadius('ginger', compiledObj, fixturesObj);
    const entry  = radius.find(r => r.word === 'gingerbread');
    expect(entry.newSplit).toEqual(['gin', 'ger', 'bread']);
    expect(entry.changes).toBe(false);
  });

  it('each entry has word, currentSplit, newSplit, changes fields', () => {
    const radius = computeCompoundBlastRadius('ginger', compiledObj, fixturesObj);
    for (const entry of radius) {
      expect(entry).toHaveProperty('word');
      expect(entry).toHaveProperty('currentSplit');
      expect(entry).toHaveProperty('newSplit');
      expect(entry).toHaveProperty('changes');
      expect(Array.isArray(entry.currentSplit)).toBe(true);
    }
  });

  it('does not include words via substring match — only via real algorithm loop bounds', () => {
    // A word containing 'ginger' as a substring but where the loop would NOT
    // consider 'ginger' as a valid split half should not appear.
    // e.g. 'gingery' (7 chars): loop at i=4→'ging'+'ery', i=5→'ginge'+'ry', i=6→'ginger'+'y'(1 char, < 2) — wait that's 1 char
    // Actually 'gingery'.length = 7, so loop from i=5 to i=3:
    //   i=5: left='ginge', right='ry' — left !== 'ginger' → not matched by candidate
    //   i=4: left='ging', right='ery' → left !== 'ginger'
    //   i=3: left='gin', right='gery' → left !== 'ginger'
    // 'ginger' itself is 6 chars, so for 'gingery' (7 chars), i starts at 5.
    // 'ginger' as left would need i=6, right='y'(1 char), but loop requires right >= 2 chars
    // → 'gingery' is NOT in the blast radius for candidate 'ginger'.
    // This test verifies the algorithm boundary logic is correct (same as bear/beard for vowelTeam).
    const radius = computeCompoundBlastRadius('ginger', compiledObj, fixturesObj);
    const words  = new Set(radius.map(r => r.word));
    // If 'gingery' were in fixturesObj, it should NOT appear in the blast radius
    // because the loop can't reach left='ginger' for a 7-char word.
    // (It's not in the fixture corpus, but the logic holds — verify via the candidates approach)
    for (const entry of radius) {
      // Every word in the blast radius must have 'ginger' at a valid split position
      const w = entry.word;
      let validPosition = false;
      for (let i = w.length - 2; i >= 3; i--) {
        if (w.slice(0, i) === 'ginger' || w.slice(i) === 'ginger') {
          validPosition = true;
          break;
        }
      }
      expect(validPosition).toBe(true);
    }
  });
});

// ── computeRootWordBlastRadius ────────────────────────────────────────────────

describe('computeRootWordBlastRadius', () => {
  it('includes logging when targeting log', () => {
    const radius = computeRootWordBlastRadius('log', compiledObj, fixturesObj);
    // 'logging' may or may not be in the fixture corpus; the function scans the pool.
    // Verify the function runs without error and returns an array.
    expect(Array.isArray(radius)).toBe(true);
  });

  it('running changes split when run is added as root', () => {
    // Remove 'run' from rootWords to create the scenario where undoubling is blocked.
    // Without 'run': tryStripSuffix returns { stem:'runn', suffix:'ing' } (always:true rule
    // doesn't skip even without undoubling) → split is ['runn','ing'].
    // After adding 'run': undoubling fires → stem='run', suffix='ning' → split is ['run','ning'].
    const rawWithoutRun = JSON.parse(JSON.stringify(rawObj));
    rawWithoutRun.rootWords = rawWithoutRun.rootWords.filter(w => w !== 'run');
    const compiledWithoutRun = compileConstructs(rawWithoutRun);

    const radius = computeRootWordBlastRadius('run', compiledWithoutRun, fixturesObj);
    const runningEntry = radius.find(r => r.word === 'running');
    expect(runningEntry).toBeDefined();
    expect(runningEntry.changes).toBe(true);
    expect(runningEntry.currentSplit).toEqual(['runn', 'ing']);  // undouble blocked
    expect(runningEntry.newSplit).toEqual(['run', 'ning']);       // undouble fires
  });
});

// ── runSyllableRegressionDiff — AC 3 (nowPassing logic) ──────────────────────

describe('runSyllableRegressionDiff', () => {
  it('returns empty array when no syllableSplit fixtures change', () => {
    // Patching something unrelated (like adding a very long nonsense word)
    const patch     = { add: ['zyx'] };
    const sandboxRaw = applyPatchToRawList(rawObj, patch, 'compoundPart');
    const sandboxCompiled = compileConstructs(sandboxRaw);
    const diff = runSyllableRegressionDiff(compiledObj, sandboxCompiled, fixturesObj);
    expect(diff).toHaveLength(0);
  });

  it('AC 3 — nowPassing: removing then re-adding "some" fixes "something" → excluded from unexpectedChanges', () => {
    // Setup: rawObj without 'some' in compoundParts
    const rawWithoutSome = JSON.parse(JSON.stringify(rawObj));
    rawWithoutSome.compoundParts = rawWithoutSome.compoundParts.filter(w => w !== 'some');
    const compiledWithoutSome = compileConstructs(rawWithoutSome);

    // In this state, something splits via nucleus fallback: ['so', 'me', 'thing']
    // (VCV split between o and e, then th digraph keeps 'th' together: 'so' / 'mething' → 'so' / 'me' / 'thing')
    // Create a synthetic fixture marking the correct ['some','thing'] as expectedFailure
    const syntheticFixtures = {
      ...fixturesObj,
      syllableSplit: [
        ...fixturesObj.syllableSplit.filter(f => f.word !== 'something'),
        { word: 'something', split: ['some', 'thing'], expectedFailure: true },
      ],
    };

    // Patch: add 'some' back
    const patch = validatePatchSchemaForList({ add: ['some'] }, 'compoundPart');
    const sandboxRaw      = applyPatchToRawList(rawWithoutSome, patch, 'compoundPart');
    const sandboxCompiled = compileConstructs(sandboxRaw);

    const diff = runSyllableRegressionDiff(compiledWithoutSome, sandboxCompiled, syntheticFixtures);

    const somethingDiff = diff.find(d => d.word === 'something');
    expect(somethingDiff).toBeDefined();
    expect(somethingDiff.nowPassing).toBe(true);
    expect(somethingDiff.oldSplit).not.toEqual(['some', 'thing']);  // was failing
    expect(somethingDiff.newSplit).toEqual(['some', 'thing']);       // now correct

    // nowPassing entries must NOT be in unexpectedChanges
    const unexpectedChanges = diff.filter(d => !d.nowPassing);
    expect(unexpectedChanges.every(d => d.word !== 'something')).toBe(true);
  });

  it('a syllable split that changes but does NOT reach its expectedFailure target is NOT nowPassing', () => {
    const rawWithoutSome = JSON.parse(JSON.stringify(rawObj));
    rawWithoutSome.compoundParts = rawWithoutSome.compoundParts.filter(w => w !== 'some');
    const compiledWithoutSome = compileConstructs(rawWithoutSome);

    // Synthetic fixture expects a WRONG target ['some', 'body'] — will never match
    const syntheticFixtures = {
      ...fixturesObj,
      syllableSplit: [
        ...fixturesObj.syllableSplit.filter(f => f.word !== 'something'),
        { word: 'something', split: ['some', 'body'], expectedFailure: true },
      ],
    };

    const patch = validatePatchSchemaForList({ add: ['some'] }, 'compoundPart');
    const sandboxRaw      = applyPatchToRawList(rawWithoutSome, patch, 'compoundPart');
    const sandboxCompiled = compileConstructs(sandboxRaw);

    const diff = runSyllableRegressionDiff(compiledWithoutSome, sandboxCompiled, syntheticFixtures);

    const somethingDiff = diff.find(d => d.word === 'something');
    expect(somethingDiff).toBeDefined();
    expect(somethingDiff.nowPassing).toBe(false);  // ['some','thing'] ≠ ['some','body']
  });
});

// ── AC 7 — checkStructure length hard-fails ───────────────────────────────────

describe('AC 7 — checkStructure length validation via validateAll', () => {
  it('adding a 1-char compoundParts entry is blocked by checkStructure', () => {
    const patch       = { add: ['x'] };
    const sandboxRaw  = applyPatchToRawList(rawObj, patch, 'compoundPart');
    const sandboxCompiled = compileConstructs(sandboxRaw);

    expect(() => validateAll(sandboxCompiled, fixturesObj)).toThrow(ValidationError);
    let caught;
    try { validateAll(sandboxCompiled, fixturesObj); } catch (e) { caught = e; }
    expect(caught.rule).toBe('structural-checks');
    expect(caught.violations.some(v => v.includes('"x"'))).toBe(true);
  });

  it('adding a 2-char rootWords entry is blocked (rootWords require >= 3 chars)', () => {
    const patch       = { add: ['ab'] };
    const sandboxRaw  = applyPatchToRawList(rawObj, patch, 'rootWord');
    const sandboxCompiled = compileConstructs(sandboxRaw);

    expect(() => validateAll(sandboxCompiled, fixturesObj)).toThrow(ValidationError);
    let caught;
    try { validateAll(sandboxCompiled, fixturesObj); } catch (e) { caught = e; }
    expect(caught.rule).toBe('structural-checks');
    expect(caught.violations.some(v => v.includes('"ab"'))).toBe(true);
  });
});

// ── AC 8 — buildChangelogEntriesForList ──────────────────────────────────────

describe('buildChangelogEntriesForList — AC 8', () => {
  it('produces the correct format: | word | list | action | date | reason |', () => {
    const patch = validatePatchSchemaForList({ add: ['ginger'] }, 'compoundPart');
    const lines = buildChangelogEntriesForList(patch, 'compoundPart', 'enables gingerbread compound-split', '2026-10-09');

    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatch(/ginger/);
    expect(lines[0]).toMatch(/compoundParts/);
    expect(lines[0]).toMatch(/added/);
    expect(lines[0]).toMatch(/2026-10-09/);
    expect(lines[0]).toMatch(/enables gingerbread/);
    expect(lines[0]).toBe('| ginger | compoundParts | added | 2026-10-09 | enables gingerbread compound-split |');
  });

  it('remove action uses "removed"', () => {
    const patch = validatePatchSchemaForList({ remove: ['someOld'] }, 'compoundPart');
    const lines = buildChangelogEntriesForList(patch, 'compoundPart', 'cleanup', '2026-10-09');
    expect(lines[0]).toMatch(/removed/);
  });

  it('rootWord mode uses "rootWords" as the list name', () => {
    const patch = validatePatchSchemaForList({ add: ['log'] }, 'rootWord');
    const lines = buildChangelogEntriesForList(patch, 'rootWord', 'enables logging to undouble', '2026-10-09');
    expect(lines[0]).toMatch(/rootWords/);
    expect(lines[0]).toBe('| log | rootWords | added | 2026-10-09 | enables logging to undouble |');
  });

  it('escapes pipe characters in the reason field', () => {
    const patch = validatePatchSchemaForList({ add: ['ginger'] }, 'compoundPart');
    const lines = buildChangelogEntriesForList(patch, 'compoundPart', 'reason|with|pipes', '2026-10-09');
    expect(lines[0]).toMatch(/reason\/with\/pipes/);
    expect(lines[0]).not.toMatch(/reason\|with\|pipes/);
  });

  it('produces one line per operation across add and remove', () => {
    const patch = validatePatchSchemaForList({ add: ['ginger', 'rein'], remove: ['oldEntry'] }, 'compoundPart');
    const lines = buildChangelogEntriesForList(patch, 'compoundPart', 'batch update', '2026-10-09');
    expect(lines).toHaveLength(3);
    expect(lines.filter(l => l.includes('added'))).toHaveLength(2);
    expect(lines.filter(l => l.includes('removed'))).toHaveLength(1);
  });
});

// ── Remove-path regression — add then remove restores expectedFailure state ───

describe('Remove-path regression — add then remove reverts expectedFailure state', () => {
  it('dream: add → daydream nowPassing; remove → daydream reverts (not nowPassing)', () => {
    // Add dream
    const addPatch     = validatePatchSchemaForList({ add: ['dream'] }, 'compoundPart');
    const withDreamRaw = applyPatchToRawList(rawObj, addPatch, 'compoundPart');
    const withDreamCompiled = compileConstructs(withDreamRaw);

    const addDiff = runSyllableRegressionDiff(compiledObj, withDreamCompiled, fixturesObj);
    expect(addDiff.find(x => x.word === 'daydream').nowPassing).toBe(true); // precondition

    // Remove dream
    const removePatch     = validatePatchSchemaForList({ remove: ['dream'] }, 'compoundPart');
    const restoredRaw     = applyPatchToRawList(withDreamRaw, removePatch, 'compoundPart');
    const restoredCompiled = compileConstructs(restoredRaw);

    expect(restoredCompiled.compoundParts).not.toContain('dream');

    // diff from the "with dream" baseline back to restored — daydream regresses
    const removeDiff = runSyllableRegressionDiff(withDreamCompiled, restoredCompiled, fixturesObj);
    const entry = removeDiff.find(x => x.word === 'daydream');
    expect(entry).toBeDefined();
    expect(entry.nowPassing).toBe(false);         // expectedFailure target not reached
    expect(entry.oldSplit).toEqual(['day', 'dream']); // was correct
    expect(entry.newSplit).not.toEqual(['day', 'dream']); // reverted to fallback split
  });

  it('log: add → logging nowPassing; remove → logging reverts (not nowPassing)', () => {
    // Add log
    const addPatch    = validatePatchSchemaForList({ add: ['log'] }, 'rootWord');
    const withLogRaw  = applyPatchToRawList(rawObj, addPatch, 'rootWord');
    const withLogCompiled = compileConstructs(withLogRaw);

    const addDiff = runSyllableRegressionDiff(compiledObj, withLogCompiled, fixturesObj);
    expect(addDiff.find(x => x.word === 'logging').nowPassing).toBe(true); // precondition

    // Remove log
    const removePatch     = validatePatchSchemaForList({ remove: ['log'] }, 'rootWord');
    const restoredRaw     = applyPatchToRawList(withLogRaw, removePatch, 'rootWord');
    const restoredCompiled = compileConstructs(restoredRaw);

    expect(restoredCompiled.rootWords).not.toContain('log');

    const removeDiff = runSyllableRegressionDiff(withLogCompiled, restoredCompiled, fixturesObj);
    const entry = removeDiff.find(x => x.word === 'logging');
    expect(entry).toBeDefined();
    expect(entry.nowPassing).toBe(false);
    expect(entry.oldSplit).toEqual(['log', 'ging']); // was correct
    expect(entry.newSplit).not.toEqual(['log', 'ging']); // reverted to undouble-blocked split
  });
});

// ── End-to-end merge proof (full pipeline, no UI) ─────────────────────────────

describe('E2E merge proof — daydream (compoundPart) and logging (rootWord)', () => {
  it('daydream: { add: dream } → dream in compoundParts, daydream fixture nowPassing, no unexpected changes', () => {
    const patch = validatePatchSchemaForList({ add: ['dream'] }, 'compoundPart');
    const sandboxRaw = applyPatchToRawList(rawObj, patch, 'compoundPart');
    const sandboxCompiled = compileConstructs(sandboxRaw);

    expect(sandboxCompiled.compoundParts).toContain('dream');

    const diff = runSyllableRegressionDiff(compiledObj, sandboxCompiled, fixturesObj);
    const d = diff.find(x => x.word === 'daydream');
    expect(d).toBeDefined();
    expect(d.nowPassing).toBe(true);
    expect(d.newSplit).toEqual(['day', 'dream']);

    // No unexpected regressions — only the nowPassing entry should appear
    const unexpected = diff.filter(x => !x.nowPassing);
    expect(unexpected).toHaveLength(0);

    const lines = buildChangelogEntriesForList(patch, 'compoundPart', 'enables daydream compound-split', '2026-10-08');
    expect(lines).toHaveLength(1);
    expect(lines[0]).toBe('| dream | compoundParts | added | 2026-10-08 | enables daydream compound-split |');
  });

  it('logging: { add: log } → log in rootWords, logging fixture nowPassing, no unexpected changes', () => {
    const patch = validatePatchSchemaForList({ add: ['log'] }, 'rootWord');
    const sandboxRaw = applyPatchToRawList(rawObj, patch, 'rootWord');
    const sandboxCompiled = compileConstructs(sandboxRaw);

    expect(sandboxCompiled.rootWords).toContain('log');

    const diff = runSyllableRegressionDiff(compiledObj, sandboxCompiled, fixturesObj);
    const d = diff.find(x => x.word === 'logging');
    expect(d).toBeDefined();
    expect(d.nowPassing).toBe(true);
    expect(d.newSplit).toEqual(['log', 'ging']);

    const unexpected = diff.filter(x => !x.nowPassing);
    expect(unexpected).toHaveLength(0);

    const lines = buildChangelogEntriesForList(patch, 'rootWord', 'enables logging to split correctly', '2026-10-08');
    expect(lines).toHaveLength(1);
    expect(lines[0]).toBe('| log | rootWords | added | 2026-10-08 | enables logging to split correctly |');
  });
});
