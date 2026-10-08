/**
 * AC 7 — Phase 5 filter pipeline: pattern and sound filters combine as
 * independent axes. Both must match when both are active.
 *
 * The matchesFilters logic is tested here by mirroring the exact filter
 * function from ui.js with an isolated, state-independent implementation —
 * the same approach used in Phase 4's dictbuilder-cache tests.
 */

import { describe, it, expect } from 'vitest';
import PhonicsEngine from '../../src/phonics/PhonicsEngine.mjs';

// Mirror the matchesFilters logic from ui.js exactly
function makeFilters(overrides = {}) {
  return {
    decodableOnly: false,
    maxLevel: 8,
    activePatterns: new Set(),
    activeSounds: new Set(),
    diffMin: 1, diffMax: 3,
    phonemeMin: 1, phonemeMax: 20,
    letterMin: 1, letterMax: 30,
    syllableMin: 1, syllableMax: 8,
    ...overrides,
  };
}

function matchesFilters(record, filters) {
  const f = filters;
  if (f.decodableOnly && record.level > f.maxLevel) return false;
  if (record.difficulty < f.diffMin || record.difficulty > f.diffMax) return false;
  if (record.phoneme_count < f.phonemeMin || record.phoneme_count > f.phonemeMax) return false;
  if (record.letter_count < f.letterMin || record.letter_count > f.letterMax) return false;
  const sc = record.syllable_count ?? 1;
  if (sc < f.syllableMin || sc > f.syllableMax) return false;
  if (f.activePatterns.size > 0) {
    const wordPats = new Set([
      ...(record.digraphs || '').split(',').filter(Boolean),
      ...(record.trigraphs || '').split(',').filter(Boolean),
      ...(record.blends || '').split(',').filter(Boolean),
      ...(record.vowel_teams || '').split(',').filter(Boolean),
      ...(record.r_controlled || '').split(',').filter(Boolean),
      ...(record.clusters3 || '').split(',').filter(Boolean),
      ...(record.floss || '').split(',').filter(Boolean),
    ]);
    if (![...f.activePatterns].some(p => wordPats.has(p))) return false;
  }
  if (f.activeSounds.size > 0) {
    const wordSounds = new Set(
      (record.vowel_team_sounds || '').split(',').filter(Boolean).map(s => s.split(':')[1])
    );
    if (![...f.activeSounds].some(s => wordSounds.has(s))) return false;
  }
  return true;
}

// ── AC 7 — independent filter axes ───────────────────────────────────────────

describe('AC 7 — pattern and sound filters are independent axes', () => {
  // "queen" has digraph=qu, vowel_team=ee, vowel_team_sounds=ee:long_e
  // "rain"  has vowel_team=ai, vowel_team_sounds=ai:long_a — no blend
  // "clamp" has blend=cl — no vowel team sounds

  const queen = PhonicsEngine.parseWord('queen');
  const rain  = PhonicsEngine.parseWord('rain');
  const clamp = PhonicsEngine.parseWord('clamp');

  it('no active filters: all words pass', () => {
    const f = makeFilters();
    expect(matchesFilters(queen, f)).toBe(true);
    expect(matchesFilters(rain, f)).toBe(true);
    expect(matchesFilters(clamp, f)).toBe(true);
  });

  it('pattern filter alone: word without pattern is excluded', () => {
    const f = makeFilters({ activePatterns: new Set(['cl']) });
    expect(matchesFilters(clamp, f)).toBe(true);   // has blend cl
    expect(matchesFilters(queen, f)).toBe(false);   // no cl
    expect(matchesFilters(rain, f)).toBe(false);    // no cl
  });

  it('sound filter alone: word without that sound is excluded', () => {
    const f = makeFilters({ activeSounds: new Set(['long_e']) });
    expect(matchesFilters(queen, f)).toBe(true);   // ee:long_e
    expect(matchesFilters(rain, f)).toBe(false);   // ai:long_a, not long_e
    expect(matchesFilters(clamp, f)).toBe(false);  // no vowel team sounds
  });

  it('pattern + sound both active: word must satisfy BOTH to pass', () => {
    // Only a word with vowel team "ee" AND sound "long_e" passes both
    const f = makeFilters({
      activePatterns: new Set(['ee']),
      activeSounds: new Set(['long_e']),
    });
    expect(matchesFilters(queen, f)).toBe(true);  // has ee pattern AND long_e sound
    expect(matchesFilters(rain, f)).toBe(false);  // has ai pattern but not ee; has long_a not long_e
    expect(matchesFilters(clamp, f)).toBe(false); // neither
  });

  it('pattern matches but sound does not: word is excluded (both axes required)', () => {
    // "queen" has ee pattern, but activate a sound it doesn't have
    const f = makeFilters({
      activePatterns: new Set(['ee']),
      activeSounds: new Set(['long_a']),
    });
    expect(matchesFilters(queen, f)).toBe(false); // has ee but not long_a sound
    expect(matchesFilters(rain, f)).toBe(false);  // has long_a sound but not ee pattern
  });

  it('sound matches but pattern does not: word is excluded (both axes required)', () => {
    // activate a pattern "cl" and a sound "long_e" — nothing has both
    const f = makeFilters({
      activePatterns: new Set(['cl']),
      activeSounds: new Set(['long_e']),
    });
    expect(matchesFilters(clamp, f)).toBe(false); // has cl but no vowel team sound at all
    expect(matchesFilters(queen, f)).toBe(false); // has long_e but no cl
  });
});

// ── Bounds filters ────────────────────────────────────────────────────────────

describe('AC 7 — bounds filters work correctly', () => {
  const ship  = PhonicsEngine.parseWord('ship');   // 3 phonemes, 4 letters, difficulty 1
  const gingerbread = PhonicsEngine.parseWord('gingerbread'); // 8 phonemes, 11 letters

  it('phoneme bounds excludes words outside range', () => {
    const f = makeFilters({ phonemeMin: 4, phonemeMax: 10 });
    expect(matchesFilters(ship, f)).toBe(false);        // 3 phonemes < 4
    expect(matchesFilters(gingerbread, f)).toBe(true);  // 8 phonemes in range
  });

  it('letter bounds excludes words outside range', () => {
    const f = makeFilters({ letterMin: 5, letterMax: 8 });
    expect(matchesFilters(ship, f)).toBe(false);        // 4 letters < 5
    expect(matchesFilters(gingerbread, f)).toBe(false); // 11 letters > 8
  });

  it('difficulty bounds excludes words outside range', () => {
    const f = makeFilters({ diffMin: 2, diffMax: 3 });
    expect(matchesFilters(ship, f)).toBe(false);        // ship is difficulty 1
  });

  it('syllable bounds excludes words outside range', () => {
    // ship = 1 syllable, gingerbread = 3 syllables
    const fHigh = makeFilters({ syllableMin: 2, syllableMax: 8 });
    expect(matchesFilters(ship, fHigh)).toBe(false);        // 1 syllable < 2
    expect(matchesFilters(gingerbread, fHigh)).toBe(true);  // 3 syllables in range

    const fLow = makeFilters({ syllableMin: 1, syllableMax: 2 });
    expect(matchesFilters(ship, fLow)).toBe(true);          // 1 syllable in range
    expect(matchesFilters(gingerbread, fLow)).toBe(false);  // 3 syllables > 2
  });
});
