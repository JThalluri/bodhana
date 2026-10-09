/**
 * Runs the five permanent validation rules against the compiled JSON +
 * fixture corpus. A hand-edited-but-not-recompiled JSON should fail here.
 *
 * Per spec §6: all validation rules run as part of npm test, not just
 * at compile time.
 */
import { describe, it, expect } from 'vitest';
import {
  checkReachability,
  checkNoCrossCategoryCollisions,
  checkSuffixAndExceptionBranchCoverage,
  checkExceptionTableSelfConsistency,
  checkStructure,
  checkGraphemeIntegrity,
} from '../../scripts/constructs-validate.mjs';
import { constructs, fixtures } from './_helpers.js';

describe('validation rules', () => {
  it('5.1 Reachability — every declared pattern appears in ≥1 tokenizer fixture', () => {
    expect(() => checkReachability(constructs, fixtures)).not.toThrow();
  });

  it('5.2 No cross-category pattern collisions', () => {
    expect(() => checkNoCrossCategoryCollisions(constructs)).not.toThrow();
  });

  it('5.3 Suffix/exception branch coverage', () => {
    expect(() => checkSuffixAndExceptionBranchCoverage(constructs, fixtures)).not.toThrow();
  });

  it('5.4 Exception table self-consistency (no duplicate word+pattern pairs, no typos)', () => {
    expect(() => checkExceptionTableSelfConsistency(constructs)).not.toThrow();
  });

  it('5.5 Structural checks (overrides, defaultSounds, compound/root lengths)', () => {
    expect(() => checkStructure(constructs)).not.toThrow();
  });

  it('5.6 Grapheme integrity — graphemes.split("|").join("") === word for every tokenizer fixture', () => {
    expect(() => checkGraphemeIntegrity(fixtures)).not.toThrow();
  });

  it('5.6 Grapheme integrity — catches a corrupted graphemes field', () => {
    const corruptedFixtures = {
      ...fixtures,
      tokenizer: fixtures.tokenizer.map((f, i) =>
        i === 0 ? { ...f, graphemes: f.graphemes + '|x' } : f
      ),
    };
    expect(() => checkGraphemeIntegrity(corruptedFixtures)).toThrow(
      /grapheme-integrity/
    );
  });
});
