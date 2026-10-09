/**
 * Tests for src/dictbuilder/manual-entry-helpers.js
 *
 * Covers B.4 acceptance criteria verifiable at the pure-function level:
 *   B.4.2 — multiple space/comma-separated words tokenize to one row each
 *   B.4.3 — duplicate prevention relies on state check, not the helpers themselves;
 *            but addManualWord is guarded — verified via code review
 *   B.4.4 — plural-exclusion state unchanged: addManualWord deliberately does NOT
 *            call findPossiblePlurals/applyPluralExclusions (verified by code review
 *            of the comment in ui.js §B.3)
 */

import { describe, it, expect } from 'vitest';
import { cleanManualToken, tokenizeManualInput } from '../../src/dictbuilder/manual-entry-helpers.js';

// ── cleanManualToken ──────────────────────────────────────────────────────────

describe('cleanManualToken', () => {
  it('lowercases letters', () => {
    expect(cleanManualToken('Caveat')).toBe('caveat');
    expect(cleanManualToken('REACT')).toBe('react');
  });

  it('strips non-letter characters', () => {
    expect(cleanManualToken('word123')).toBe('word');
    expect(cleanManualToken("don't")).toBe('dont');
    expect(cleanManualToken('café')).toBe('caf');
  });

  it('returns null for empty result after stripping', () => {
    expect(cleanManualToken('')).toBeNull();
    expect(cleanManualToken('123')).toBeNull();
    expect(cleanManualToken('   ')).toBeNull();
    expect(cleanManualToken('!!!')).toBeNull();
  });

  it('handles a plain lowercase word unchanged', () => {
    expect(cleanManualToken('theater')).toBe('theater');
  });

  it('coerces non-string input via String()', () => {
    expect(cleanManualToken(42)).toBeNull(); // '42' → '' → null
  });
});

// ── tokenizeManualInput ───────────────────────────────────────────────────────

describe('tokenizeManualInput', () => {
  it('splits on whitespace', () => {
    const result = tokenizeManualInput('caveat react');
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ raw: 'caveat', cleaned: 'caveat' });
    expect(result[1]).toEqual({ raw: 'react',  cleaned: 'react'  });
  });

  it('splits on commas', () => {
    const result = tokenizeManualInput('create,theater,idea');
    expect(result.map(t => t.cleaned)).toEqual(['create', 'theater', 'idea']);
  });

  it('splits on mixed whitespace and commas', () => {
    const result = tokenizeManualInput('caveat, react  theater');
    expect(result.map(t => t.cleaned)).toEqual(['caveat', 'react', 'theater']);
  });

  it('filters out tokens that clean to empty (B.4.2 invalid row suppression)', () => {
    const result = tokenizeManualInput('  react 123  !!  theater  ');
    expect(result.map(t => t.cleaned)).toEqual(['react', 'theater']);
  });

  it('returns raw alongside cleaned so the caller can display the original input', () => {
    const result = tokenizeManualInput('React');
    expect(result[0].raw).toBe('React');
    expect(result[0].cleaned).toBe('react');
  });

  it('returns empty array for blank input', () => {
    expect(tokenizeManualInput('')).toHaveLength(0);
    expect(tokenizeManualInput('   ')).toHaveLength(0);
    expect(tokenizeManualInput(',,')).toHaveLength(0);
  });

  it('handles a single word', () => {
    const result = tokenizeManualInput('caveat');
    expect(result).toHaveLength(1);
    expect(result[0].cleaned).toBe('caveat');
  });

  it('deduplication is NOT done here — the caller owns that concern', () => {
    const result = tokenizeManualInput('react react');
    expect(result).toHaveLength(2);
    expect(result.every(t => t.cleaned === 'react')).toBe(true);
  });
});
