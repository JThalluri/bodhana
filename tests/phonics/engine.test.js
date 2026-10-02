/**
 * Phase 3 acceptance tests — PhonicsEngine public API
 *
 * Tests correspond to spec §4 acceptance criteria (AC 1–11; AC 12–13 are
 * code-review checks, not automatable). Also re-runs the Phase 1 regression
 * corpus through the public API to catch any orchestration-layer regressions.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import { load as yamlLoad } from 'js-yaml';

import {
  ENGINE_VERSION,
  parseWord,
  tokenize,
  splitSyllablesForWord,
  vowelTeamSounds,
  toCSV,
} from '../../src/phonics/PhonicsEngine.mjs';
import { loadConstructs } from '../../src/phonics/constructsLoader.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const fixtures = yamlLoad(
  readFileSync(join(root, 'constructs/fixtures/phonics-regression-fixtures.v2.yaml'), 'utf8')
);

// ---------------------------------------------------------------------------
// AC 1 — ENGINE_VERSION
// ---------------------------------------------------------------------------
describe('AC 1 — ENGINE_VERSION', () => {
  it("ENGINE_VERSION === '3.0.0'", () => {
    expect(ENGINE_VERSION).toBe('3.0.0');
  });
});

// ---------------------------------------------------------------------------
// AC 2 — tokenize
// ---------------------------------------------------------------------------
describe('AC 2 — tokenize(gingerbread)', () => {
  it("produces 'g|i|n|g|er|br|ea|d'", () => {
    expect(tokenize('gingerbread').join('|')).toBe('g|i|n|g|er|br|ea|d');
  });
});

// ---------------------------------------------------------------------------
// AC 3 — splitSyllables
// ---------------------------------------------------------------------------
describe('AC 3 — splitSyllables(understand)', () => {
  it("produces 'un·der·stand'", () => {
    expect(splitSyllablesForWord('understand').join('·')).toBe('un·der·stand');
  });
});

// ---------------------------------------------------------------------------
// AC 4 — vowel_team_sounds for breathe / breathes
// ---------------------------------------------------------------------------
describe('AC 4 — parseWord(breathe/breathes) vowel_team_sounds', () => {
  it("breathe → 'ea:long_e'", () => {
    expect(parseWord('breathe').vowel_team_sounds).toBe('ea:long_e');
  });
  it("breathes → 'ea:long_e'", () => {
    expect(parseWord('breathes').vowel_team_sounds).toBe('ea:long_e');
  });
});

// ---------------------------------------------------------------------------
// AC 5 — cookie / rookie sound order matches token order
// ---------------------------------------------------------------------------
describe('AC 5 — cookie / rookie vowel_team_sounds order', () => {
  it("cookie → 'oo:oo_short,ie:long_e'", () => {
    expect(parseWord('cookie').vowel_team_sounds).toBe('oo:oo_short,ie:long_e');
  });
  it("rookie → 'oo:oo_short,ie:long_e'", () => {
    expect(parseWord('rookie').vowel_team_sounds).toBe('oo:oo_short,ie:long_e');
  });
});

// ---------------------------------------------------------------------------
// AC 6 — gingerbread ea:short_e
// ---------------------------------------------------------------------------
describe('AC 6 — parseWord(gingerbread)', () => {
  it("vowel_team_sounds === 'ea:short_e'", () => {
    expect(parseWord('gingerbread').vowel_team_sounds).toBe('ea:short_e');
  });
});

// ---------------------------------------------------------------------------
// AC 7 — is_common must be absent from Record entirely
// ---------------------------------------------------------------------------
describe('AC 7 — no is_common key in Record', () => {
  it("'is_common' in parseWord('ship') === false", () => {
    const rec = parseWord('ship');
    expect('is_common' in rec).toBe(false);
    expect(Object.keys(rec)).not.toContain('is_common');
  });
});

// ---------------------------------------------------------------------------
// AC 8 — toCSV(extended:true) has no is_common column
// ---------------------------------------------------------------------------
describe('AC 8 — toCSV extended header has no is_common', () => {
  it('header row does not contain is_common', () => {
    const csv = toCSV([parseWord('cat')], { extended: true });
    const header = csv.split('\n')[0];
    expect(header).not.toContain('is_common');
    expect(header).toContain('vowel_team_sounds');
  });
});

// ---------------------------------------------------------------------------
// AC 9 — toCSV with extraColumns appends is_common last
// ---------------------------------------------------------------------------
describe('AC 9 — toCSV with extraColumns: [is_common]', () => {
  it('header ends with ...secondary_patterns,vowel_team_sounds,is_common', () => {
    const rows = [{ ...parseWord('cat'), is_common: true }];
    const csv = toCSV(rows, { extended: true, extraColumns: ['is_common'] });
    const header = csv.split('\n')[0];
    expect(header.endsWith(',secondary_patterns,vowel_team_sounds,is_common')).toBe(true);
  });
  it('data row includes is_common value', () => {
    const rows = [{ ...parseWord('cat'), is_common: true }];
    const csv = toCSV(rows, { extended: true, extraColumns: ['is_common'] });
    const dataRow = csv.split('\n')[1];
    expect(dataRow.endsWith(',true')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// AC 10 — corrupted schemaVersion throws synchronously
// ---------------------------------------------------------------------------
describe('AC 10 — schemaVersion mismatch throws', () => {
  it('throws with message naming both versions', () => {
    expect(() => loadConstructs({ schemaVersion: '0.0.0', patternCategories: {} })).toThrow(
      /schemaVersion mismatch.*expected 1\.0\.0.*got 0\.0\.0/
    );
  });
  it('error message mentions expected version', () => {
    let msg = '';
    try { loadConstructs({ schemaVersion: 'bad' }); } catch (e) { msg = e.message; }
    expect(msg).toContain('1.0.0');
    expect(msg).toContain('bad');
  });
});

// ---------------------------------------------------------------------------
// AC 11 — regression corpus via public API
// ---------------------------------------------------------------------------
describe('AC 11 — regression corpus via public API', () => {
  for (const f of fixtures.tokenizer) {
    if (f.expectedFailure) continue;
    it(`tokenize(${f.word}) → ${JSON.stringify(f.graphemes)}`, () => {
      expect(tokenize(f.word)).toEqual(f.graphemes.split('|'));
    });
  }

  for (const f of fixtures.syllableSplit) {
    if (f.expectedFailure) continue;
    it(`splitSyllables(${f.word}) → [${f.split.join('·')}]`, () => {
      expect(splitSyllablesForWord(f.word)).toEqual(f.split);
    });
  }

  for (const f of fixtures.vowelTeamSounds) {
    if (f.expectedFailure) continue;
    it(`vowelTeamSounds(${f.word}) has ${f.pattern}:${f.sound}`, () => {
      const hits = vowelTeamSounds(f.word);
      const hit = hits.find(h => h.pattern === f.pattern);
      expect(hit?.sound).toBe(f.sound);
    });
  }
});
