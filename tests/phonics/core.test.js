/**
 * Direct tests for core/ functions relocated during Phase 3:
 *   computeDifficulty, decodabilityLevel  (difficulty.mjs)
 *   findAllPatterns, findSecondaryPatterns (patterns.mjs)
 *   findMinimalPairs                       (syllables.mjs)
 *
 * These functions are also exercised indirectly through parseWord() in
 * engine.test.js; these tests verify the core contract directly so a
 * regression in the core layer is caught at the right level.
 */

import { describe, it, expect } from 'vitest';
import { computeDifficulty, decodabilityLevel } from '../../src/phonics/core/difficulty.mjs';
import { findAllPatterns, findSecondaryPatterns } from '../../src/phonics/core/patterns.mjs';
import { findMinimalPairs } from '../../src/phonics/core/syllables.mjs';

// ---------------------------------------------------------------------------
// computeDifficulty
// ---------------------------------------------------------------------------
describe('computeDifficulty', () => {
  it('returns 1 for simple CVC with no special patterns', () => {
    expect(computeDifficulty({}, ['c', 'a', 't'])).toBe(1);
  });

  it('returns 2 when a vowel team is present', () => {
    expect(computeDifficulty({ vowelTeams: ['ea'] }, ['r', 'ea', 'd'])).toBe(2);
  });

  it('returns 2 when rControlled is present', () => {
    expect(computeDifficulty({ rControlled: ['er'] }, ['t', 'er', 'n'])).toBe(2);
  });

  it('returns 2 when rControlled3 is present', () => {
    expect(computeDifficulty({ rControlled3: ['air'] }, ['f', 'air'])).toBe(2);
  });

  it('returns 2 when a trigraph is present', () => {
    expect(computeDifficulty({ trigraphs: ['tch'] }, ['c', 'a', 'tch'])).toBe(2);
  });

  it('returns 2 when last token is a final blend', () => {
    expect(computeDifficulty({}, ['c', 'a', 'mp'])).toBe(2);
  });

  it('returns 3 when a 3-cluster is present', () => {
    expect(computeDifficulty({ clusters3: ['str'] }, ['str', 'e', 'tch'])).toBe(3);
  });

  it('clusters3 beats trigraphs — returns 3 not 2', () => {
    expect(computeDifficulty({ clusters3: ['str'], trigraphs: ['tch'] }, ['str', 'e', 'tch'])).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// decodabilityLevel
// ---------------------------------------------------------------------------
describe('decodabilityLevel', () => {
  it('returns 1 for tokens with no pattern-level entries', () => {
    expect(decodabilityLevel(['c', 'a', 't'], {})).toBe(1);
  });

  it('returns the max level across tokens', () => {
    const map = { sh: 2, ea: 5 };
    expect(decodabilityLevel(['sh', 'ea', 'd'], map)).toBe(5);
  });

  it('ignores tokens not in the map', () => {
    const map = { sh: 2 };
    expect(decodabilityLevel(['sh', 'i', 'p'], map)).toBe(2);
  });

  it('returns 1 when all tokens are unknown to the map', () => {
    expect(decodabilityLevel(['a', 'b', 'c'], {})).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// findAllPatterns
// ---------------------------------------------------------------------------
describe('findAllPatterns', () => {
  const sortedPatterns = [
    { pattern: 'tch', category: 'trigraphs' },
    { pattern: 'ch',  category: 'digraphs'  },
    { pattern: 'sh',  category: 'digraphs'  },
    { pattern: 'igh', category: 'trigraphs' },
    { pattern: 'gh',  category: 'digraphs'  },
    { pattern: 'ea',  category: 'vowelTeams' },
    { pattern: 'bl',  category: 'blends'    },
  ];

  it('returns empty object for a word with no patterns', () => {
    expect(findAllPatterns('cat', sortedPatterns)).toEqual({});
  });

  it('finds a digraph by substring', () => {
    const result = findAllPatterns('ship', sortedPatterns);
    expect(result.digraphs).toContain('sh');
  });

  it('finds both trigraph and hidden digraph for catch', () => {
    const result = findAllPatterns('catch', sortedPatterns);
    expect(result.trigraphs).toContain('tch');
    expect(result.digraphs).toContain('ch');
  });

  it('finds both igh (trigraph) and gh (digraph) in night', () => {
    const result = findAllPatterns('night', sortedPatterns);
    expect(result.trigraphs).toContain('igh');
    expect(result.digraphs).toContain('gh');
  });

  it('does not duplicate patterns within a category', () => {
    const result = findAllPatterns('catching', sortedPatterns);
    const count = result.trigraphs?.filter(p => p === 'tch').length ?? 0;
    expect(count).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// findSecondaryPatterns
// ---------------------------------------------------------------------------
describe('findSecondaryPatterns', () => {
  it('returns empty for a word where all bucket patterns are tokens', () => {
    const tokens  = ['sh', 'i', 'p'];
    const buckets = { digraphs: ['sh'] };
    expect(findSecondaryPatterns(tokens, buckets)).toEqual([]);
  });

  it('identifies ch hidden inside tch token', () => {
    const tokens  = ['c', 'a', 'tch'];
    const buckets = { trigraphs: ['tch'], digraphs: ['ch'] };
    expect(findSecondaryPatterns(tokens, buckets)).toContain('ch');
    expect(findSecondaryPatterns(tokens, buckets)).not.toContain('tch');
  });

  it('identifies gh hidden inside igh token', () => {
    const tokens  = ['n', 'igh', 't'];
    const buckets = { trigraphs: ['igh'], digraphs: ['gh'] };
    const secondary = findSecondaryPatterns(tokens, buckets);
    expect(secondary).toContain('gh');
    expect(secondary).not.toContain('igh');
  });

  it('returns empty for a plain CVC', () => {
    expect(findSecondaryPatterns(['c', 'a', 't'], {})).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// findMinimalPairs
// ---------------------------------------------------------------------------
describe('findMinimalPairs', () => {
  const pool = ['cat', 'bat', 'hat', 'map', 'cap', 'tap'];

  it('finds words sharing the same rime as cat', () => {
    const pairs = findMinimalPairs('cat', pool);
    const rimeShares = pairs.filter(p => p.sharedRime);
    expect(rimeShares.map(p => p.word)).toEqual(expect.arrayContaining(['bat', 'hat']));
  });

  it('finds words sharing the same onset as cat', () => {
    const pairs = findMinimalPairs('cat', pool);
    const onsetShares = pairs.filter(p => p.sharedOnset);
    expect(onsetShares.map(p => p.word)).toEqual(expect.arrayContaining(['cap']));
  });

  it('does not include the word itself', () => {
    const pairs = findMinimalPairs('cat', ['cat', 'bat']);
    expect(pairs.map(p => p.word)).not.toContain('cat');
  });

  it('returns empty array when pool has no matches', () => {
    expect(findMinimalPairs('cat', ['dog', 'run', 'fly'])).toEqual([]);
  });

  it('returns empty array for empty pool', () => {
    expect(findMinimalPairs('cat', [])).toEqual([]);
  });

  it('sharedRime and sharedOnset flags are accurate', () => {
    const [batResult] = findMinimalPairs('cat', ['bat']);
    expect(batResult.sharedRime).toBe(true);
    expect(batResult.sharedOnset).toBe(false);

    const [capResult] = findMinimalPairs('cat', ['cap']);
    expect(capResult.sharedOnset).toBe(true);
    expect(capResult.sharedRime).toBe(false);
  });
});
