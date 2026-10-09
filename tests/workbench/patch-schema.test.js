/**
 * AC 6 — Patch schema validation
 *
 * Verifies that validatePatchSchema accepts valid patches and rejects:
 *   - Any key targeting forbidden construct sections (compoundParts, patternCategories, etc.)
 *   - Unknown keys
 *   - Malformed item structure (missing word / pattern / sound)
 *
 * AC spec: "Submitting a patch with a key targeting compoundParts is rejected
 * immediately at Step 5, before any sandbox computation runs."
 */

import { describe, it, expect } from 'vitest';
import { validatePatchSchema } from '../../tools/constructs-workbench/workbench-core.mjs';

// ── Valid patches ─────────────────────────────────────────────────────────────

describe('AC 6 — validatePatchSchema: valid patches', () => {
  it('accepts a bare add patch', () => {
    const patch = validatePatchSchema({
      add: [{ word: 'speak', pattern: 'ea', sound: 'long_e', note: 'anchor' }],
    });
    expect(patch.add).toHaveLength(1);
    expect(patch.add[0].word).toBe('speak');
  });

  it('accepts a wrapped patch: { patch: { add: [...] } }', () => {
    const patch = validatePatchSchema({
      patch: { add: [{ word: 'weak', pattern: 'ea', sound: 'long_e' }] },
    });
    expect(patch.add[0].word).toBe('weak');
  });

  it('accepts a modify patch', () => {
    const patch = validatePatchSchema({
      modify: [{ word: 'bread', pattern: 'ea', sound: 'long_e', note: 'test' }],
    });
    expect(patch.modify[0].sound).toBe('long_e');
  });

  it('accepts a remove patch (no sound required)', () => {
    const patch = validatePatchSchema({
      remove: [{ word: 'bread', pattern: 'ea' }],
    });
    expect(patch.remove[0].word).toBe('bread');
  });

  it('accepts a combined add+modify+remove patch', () => {
    const patch = validatePatchSchema({
      add:    [{ word: 'speak', pattern: 'ea', sound: 'long_e' }],
      modify: [{ word: 'bread', pattern: 'ea', sound: 'long_e' }],
      remove: [{ word: 'dead',  pattern: 'ea' }],
    });
    expect(patch.add).toHaveLength(1);
    expect(patch.modify).toHaveLength(1);
    expect(patch.remove).toHaveLength(1);
  });

  it('accepts an empty patch object', () => {
    const patch = validatePatchSchema({});
    expect(patch).toEqual({});
  });
});

// ── Forbidden section keys ────────────────────────────────────────────────────

describe('AC 6 — validatePatchSchema: forbidden section keys', () => {
  const forbidden = [
    'compoundParts',
    'patternCategories',
    'defaultVowelSound',
    'rootWords',
    'suffixStripRules',
    'soundLabels',
    'scopeLevels',
  ];

  for (const key of forbidden) {
    it(`rejects key "${key}"`, () => {
      expect(() =>
        validatePatchSchema({ [key]: ['anything'] })
      ).toThrow(new RegExp(key));
    });

    it(`rejects key "${key}" even inside patch: wrapper`, () => {
      expect(() =>
        validatePatchSchema({ patch: { [key]: ['anything'] } })
      ).toThrow(new RegExp(key));
    });
  }
});

// ── Unknown keys ──────────────────────────────────────────────────────────────

describe('AC 6 — validatePatchSchema: unknown keys', () => {
  it('rejects an arbitrary unknown key', () => {
    expect(() =>
      validatePatchSchema({ upsert: [{ word: 'speak', pattern: 'ea', sound: 'long_e' }] })
    ).toThrow(/unknown key/i);
  });

  it('rejects "update" (common LLM alias for modify)', () => {
    expect(() =>
      validatePatchSchema({ update: [{ word: 'speak', pattern: 'ea', sound: 'long_e' }] })
    ).toThrow();
  });
});

// ── Malformed item structure ──────────────────────────────────────────────────

describe('AC 6 — validatePatchSchema: malformed item structure', () => {
  it('rejects add item missing sound', () => {
    expect(() =>
      validatePatchSchema({ add: [{ word: 'speak', pattern: 'ea' }] })
    ).toThrow(/sound/);
  });

  it('rejects add item missing pattern', () => {
    expect(() =>
      validatePatchSchema({ add: [{ word: 'speak', sound: 'long_e' }] })
    ).toThrow(/pattern/);
  });

  it('rejects add item missing word', () => {
    expect(() =>
      validatePatchSchema({ add: [{ pattern: 'ea', sound: 'long_e' }] })
    ).toThrow(/word/);
  });

  it('rejects modify item missing sound', () => {
    expect(() =>
      validatePatchSchema({ modify: [{ word: 'bread', pattern: 'ea' }] })
    ).toThrow(/sound/);
  });

  it('allows remove item to omit sound', () => {
    expect(() =>
      validatePatchSchema({ remove: [{ word: 'bread', pattern: 'ea' }] })
    ).not.toThrow();
  });

  it('rejects a non-array op value', () => {
    expect(() =>
      validatePatchSchema({ add: { word: 'speak', pattern: 'ea', sound: 'long_e' } })
    ).toThrow(/array/);
  });

  it('rejects null input', () => {
    expect(() => validatePatchSchema(null)).toThrow();
  });

  it('rejects a string input', () => {
    expect(() => validatePatchSchema('patch: ...')).toThrow();
  });
});
