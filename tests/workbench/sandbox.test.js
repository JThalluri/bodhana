/**
 * AC 3 — Blast radius for 'ea' includes all fixture corpus words.
 * AC 4 — Duplicate-row patch is caught by Phase 1 validator (proves real reuse).
 * AC 5 — Patch that changes 'bread' also causes 'breadwinner' to change via
 *         compound-scan — the unintended side-effect surfaces in runRegressionDiff.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { load as yamlLoad } from 'js-yaml';
import { compileConstructs } from '../../scripts/constructs-compile-core.mjs';
import { validateAll, ValidationError } from '../../scripts/constructs-validate.mjs';
import {
  validatePatchSchema,
  applyPatchToRaw,
  computeBlastRadius,
  runRegressionDiff,
  buildChangelogEntries,
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

// ── AC 3 — Blast radius ───────────────────────────────────────────────────────

describe('AC 3 — computeBlastRadius for pattern "ea"', () => {
  it('includes all vowelTeamSounds fixture words with pattern ea', () => {
    const radius = computeBlastRadius('ea', compiledObj, fixturesObj);
    const radiusWords = new Set(radius.map(r => r.word));

    const fixtureEaWords = fixturesObj.vowelTeamSounds
      .filter(f => f.pattern === 'ea')
      .map(f => f.word);

    for (const word of fixtureEaWords) {
      expect(radiusWords).toContain(word);
    }
    expect(fixtureEaWords.length).toBeGreaterThan(0);
  });

  it('includes words from exception table with pattern ea', () => {
    const radius = computeBlastRadius('ea', compiledObj, fixturesObj);
    const radiusWords = new Set(radius.map(r => r.word));

    const exWords = compiledObj.vowelTeamExceptions
      .filter(r => r.pattern === 'ea')
      .map(r => r.word);

    for (const word of exWords) {
      expect(radiusWords).toContain(word);
    }
  });

  it('each entry has word, sound, and tier', () => {
    const radius = computeBlastRadius('ea', compiledObj, fixturesObj);
    for (const entry of radius) {
      expect(entry).toHaveProperty('word');
      expect(entry).toHaveProperty('sound');
      expect(entry).toHaveProperty('tier');
      expect(typeof entry.word).toBe('string');
    }
  });

  it('bread resolves via direct exception with sound short_e', () => {
    const radius = computeBlastRadius('ea', compiledObj, fixturesObj);
    const breadEntry = radius.find(r => r.word === 'bread');
    expect(breadEntry).toBeDefined();
    expect(breadEntry.sound).toBe('short_e');
    expect(breadEntry.tier).toBe('direct');
  });

  it('breadwinner resolves via compound-scan (inherits from bread)', () => {
    const radius = computeBlastRadius('ea', compiledObj, fixturesObj);
    const entry = radius.find(r => r.word === 'breadwinner');
    expect(entry).toBeDefined();
    expect(entry.sound).toBe('short_e');
    expect(entry.tier).toBe('compound-scan');
  });

  it('speak resolves via default (long_e, no exception row)', () => {
    const radius = computeBlastRadius('ea', compiledObj, fixturesObj);
    const entry = radius.find(r => r.word === 'speak');
    expect(entry).toBeDefined();
    expect(entry.sound).toBe('long_e');
    expect(entry.tier).toBe('default');
  });
});

// ── AC 4 — Duplicate row caught by validator ──────────────────────────────────

describe('AC 4 — duplicate (word, pattern) row caught by Phase 1 validator', () => {
  it('adding an existing (dead, ea) row creates duplicate caught by checkExceptionTableSelfConsistency', () => {
    // 'dead' already has ea:short_e in the constructs table
    const patch = validatePatchSchema({
      add: [{ word: 'dead', pattern: 'ea', sound: 'long_e', note: 'test duplicate' }],
    });

    const sandboxRaw      = applyPatchToRaw(rawObj, patch);
    const sandboxCompiled = compileConstructs(sandboxRaw);

    expect(() => validateAll(sandboxCompiled, fixturesObj))
      .toThrow(ValidationError);

    let caught;
    try {
      validateAll(sandboxCompiled, fixturesObj);
    } catch (e) {
      caught = e;
    }
    expect(caught.rule).toBe('exception-table-self-consistency');
    expect(caught.violations.some(v => v.includes('duplicate-exception-row'))).toBe(true);
    expect(caught.violations.some(v => v.includes('dead'))).toBe(true);
  });

  it('adding two identical rows in a single add patch also creates a duplicate', () => {
    const patch = validatePatchSchema({
      add: [
        { word: 'steal', pattern: 'ea', sound: 'long_a', note: 'first' },
        { word: 'steal', pattern: 'ea', sound: 'long_e', note: 'second' },
      ],
    });

    const sandboxRaw      = applyPatchToRaw(rawObj, patch);
    const sandboxCompiled = compileConstructs(sandboxRaw);

    expect(() => validateAll(sandboxCompiled, fixturesObj))
      .toThrow(ValidationError);

    let caught;
    try {
      validateAll(sandboxCompiled, fixturesObj);
    } catch (e) {
      caught = e;
    }
    expect(caught.rule).toBe('exception-table-self-consistency');
    expect(caught.violations.some(v => v.includes('steal'))).toBe(true);
  });
});

// ── AC 5 — Unintended side-effect caught by regression diff ──────────────────

describe('AC 5 — compound-scan side-effect surfaces in runRegressionDiff', () => {
  it('modifying bread:ea to long_e also changes breadwinner via compound-scan', () => {
    // bread has ea:short_e; breadwinner resolves via compound-scan on bread.
    // Changing bread:ea to long_e causes breadwinner to also change — an
    // unintended side-effect that the regression diff must surface.
    const patch = validatePatchSchema({
      modify: [{ word: 'bread', pattern: 'ea', sound: 'long_e', note: 'test side-effect' }],
    });

    const sandboxRaw      = applyPatchToRaw(rawObj, patch);
    const sandboxCompiled = compileConstructs(sandboxRaw);
    const diff            = runRegressionDiff(compiledObj, sandboxCompiled, fixturesObj);

    // bread itself should be in the diff
    const breadDiff = diff.find(d => d.word === 'bread' && d.pattern === 'ea');
    expect(breadDiff).toBeDefined();
    expect(breadDiff.oldSound).toBe('short_e');
    expect(breadDiff.newSound).toBe('long_e');

    // breadwinner should ALSO appear — it's the unintended side-effect
    const bwDiff = diff.find(d => d.word === 'breadwinner' && d.pattern === 'ea');
    expect(bwDiff).toBeDefined();
    expect(bwDiff.oldSound).toBe('short_e');
    expect(bwDiff.newSound).toBe('long_e');

    // The hard-gate logic: breadwinner is NOT in the patch → unexpected change
    const expectedWords = new Set(patch.modify.map(r => r.word));
    const unexpected = diff.filter(d => !expectedWords.has(d.word));
    expect(unexpected.some(d => d.word === 'breadwinner')).toBe(true);
  });

  it('a well-scoped add-only patch produces no unexpected changes (diff matches expected words)', () => {
    // Adding speak:ea:long_e should only affect 'speak' in the diff.
    // 'speak' has no compound relationships that affect other fixture words.
    const patch = validatePatchSchema({
      add: [{ word: 'speak', pattern: 'ea', sound: 'long_e', note: 'explicit anchor' }],
    });

    const sandboxRaw      = applyPatchToRaw(rawObj, patch);
    const sandboxCompiled = compileConstructs(sandboxRaw);
    const diff            = runRegressionDiff(compiledObj, sandboxCompiled, fixturesObj);

    const expectedWords = new Set(patch.add.map(r => r.word));
    const unexpected = diff.filter(d => !expectedWords.has(d.word));

    // No unexpected side-effects
    expect(unexpected).toHaveLength(0);
  });
});

// ── nowPassing — expectedFailure fixtures that become correct ─────────────────

describe('nowPassing — expectedFailure fixture that starts passing', () => {
  it('a side-effect that fixes an expectedFailure fixture is nowPassing and excluded from unexpectedChanges', () => {
    // breadwinner:ea currently resolves to short_e (compound-scan from bread:short_e).
    // Synthetic fixture documents the DESIRED state as long_e with expectedFailure: true.
    // When bread:ea is patched to long_e, breadwinner now resolves to long_e → nowPassing.
    const syntheticFixtures = {
      ...fixturesObj,
      vowelTeamSounds: [
        ...fixturesObj.vowelTeamSounds.filter(f => !(f.word === 'breadwinner' && f.pattern === 'ea')),
        { word: 'breadwinner', pattern: 'ea', sound: 'long_e', expectedFailure: true },
      ],
    };

    const patch = validatePatchSchema({
      modify: [{ word: 'bread', pattern: 'ea', sound: 'long_e', note: 'nowPassing test' }],
    });

    const sandboxRaw      = applyPatchToRaw(rawObj, patch);
    const sandboxCompiled = compileConstructs(sandboxRaw);
    const diff            = runRegressionDiff(compiledObj, sandboxCompiled, syntheticFixtures);

    const bwDiff = diff.find(d => d.word === 'breadwinner' && d.pattern === 'ea');
    expect(bwDiff).toBeDefined();
    expect(bwDiff.nowPassing).toBe(true);

    // breadwinner is NOT in the patch, but nowPassing → must not be in unexpectedChanges
    const expectedWords = new Set(patch.modify.map(r => r.word));
    const unexpected = diff.filter(d => !expectedWords.has(d.word) && !d.nowPassing);
    expect(unexpected.some(d => d.word === 'breadwinner')).toBe(false);
  });

  it('a changed expectedFailure fixture that does NOT reach its documented target is still unexpected', () => {
    // breadwinner:ea currently resolves to short_e.
    // Synthetic fixture expects short_a with expectedFailure: true.
    // After patching bread:ea → long_e, breadwinner resolves to long_e (not short_a).
    // nowPassing must be false — and it still counts as unexpected.
    const syntheticFixtures = {
      ...fixturesObj,
      vowelTeamSounds: [
        ...fixturesObj.vowelTeamSounds.filter(f => !(f.word === 'breadwinner' && f.pattern === 'ea')),
        { word: 'breadwinner', pattern: 'ea', sound: 'short_a', expectedFailure: true },
      ],
    };

    const patch = validatePatchSchema({
      modify: [{ word: 'bread', pattern: 'ea', sound: 'long_e', note: 'test' }],
    });

    const sandboxRaw      = applyPatchToRaw(rawObj, patch);
    const sandboxCompiled = compileConstructs(sandboxRaw);
    const diff            = runRegressionDiff(compiledObj, sandboxCompiled, syntheticFixtures);

    const bwDiff = diff.find(d => d.word === 'breadwinner' && d.pattern === 'ea');
    expect(bwDiff).toBeDefined();
    expect(bwDiff.nowPassing).toBe(false); // long_e !== short_a

    const expectedWords = new Set(patch.modify.map(r => r.word));
    const unexpected = diff.filter(d => !expectedWords.has(d.word) && !d.nowPassing);
    expect(unexpected.some(d => d.word === 'breadwinner')).toBe(true);
  });

  it('a regular (non-expectedFailure) fixture diff always has nowPassing = false', () => {
    const patch = validatePatchSchema({
      modify: [{ word: 'bread', pattern: 'ea', sound: 'long_e', note: 'test' }],
    });

    const sandboxRaw      = applyPatchToRaw(rawObj, patch);
    const sandboxCompiled = compileConstructs(sandboxRaw);
    const diff            = runRegressionDiff(compiledObj, sandboxCompiled, fixturesObj);

    const breadDiff = diff.find(d => d.word === 'bread' && d.pattern === 'ea');
    expect(breadDiff).toBeDefined();
    expect(breadDiff.nowPassing).toBe(false);

    const bwDiff = diff.find(d => d.word === 'breadwinner' && d.pattern === 'ea');
    expect(bwDiff).toBeDefined();
    expect(bwDiff.nowPassing).toBe(false);
  });
});

// ── buildChangelogEntries ─────────────────────────────────────────────────────

describe('buildChangelogEntries', () => {
  it('produces one line per changed row in the correct format', () => {
    const patch = validatePatchSchema({
      add: [{ word: 'speak', pattern: 'ea', sound: 'long_e', note: 'anchor' }],
    });
    const lines = buildChangelogEntries(patch, compiledObj, 'anchor speak as long_e', '2026-10-08');

    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatch(/speak/);
    expect(lines[0]).toMatch(/long_e/);
    expect(lines[0]).toMatch(/ea/);
    expect(lines[0]).toMatch(/2026-10-08/);
  });

  it('records old sound for modify', () => {
    const patch = validatePatchSchema({
      modify: [{ word: 'bread', pattern: 'ea', sound: 'long_e', note: 'test' }],
    });
    const lines = buildChangelogEntries(patch, compiledObj, 'test', '2026-10-08');

    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatch(/short_e/); // old sound
    expect(lines[0]).toMatch(/long_e/);  // new sound
  });

  it('records (removed) for remove', () => {
    const patch = validatePatchSchema({
      remove: [{ word: 'bread', pattern: 'ea' }],
    });
    const lines = buildChangelogEntries(patch, compiledObj, 'remove test', '2026-10-08');

    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatch(/\(removed\)/);
  });
});
