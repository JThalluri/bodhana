/**
 * AC 2 — Phase 5 CSV round-trip: pre-parsed CSV from Dictionary Builder's
 * Export Phonics CSV loads into Phonics Worksheets with zero data loss and
 * no recomputation.
 *
 * Tests use the exact parseCSVLine + parseCSV implementation from ui.js
 * (mirrored here, same approach as Phase 4 cache tests).
 */

import { describe, it, expect } from 'vitest';
import PhonicsEngine from '../../src/phonics/PhonicsEngine.mjs';
import { DEFAULT_COMMON_WORDS } from '../../src/shared/default-common-words.js';

// ── Mirror of ui.js parseCSVLine + parseCSV ───────────────────────────────────

function parseCSVLine(line) {
  const cells = [];
  let i = 0;
  while (i < line.length) {
    if (line[i] === '"') {
      i++;
      let val = '';
      while (i < line.length) {
        if (line[i] === '"' && line[i + 1] === '"') { val += '"'; i += 2; }
        else if (line[i] === '"') { i++; break; }
        else val += line[i++];
      }
      cells.push(val);
      if (line[i] === ',') i++;
    } else {
      const end = line.indexOf(',', i);
      if (end === -1) { cells.push(line.slice(i)); break; }
      cells.push(line.slice(i, end));
      i = end + 1;
    }
  }
  return cells;
}

function parseCSV(text) {
  const lines = text.split('\n').map(l => l.trimEnd()).filter(l => l);
  if (lines.length < 2) return [];
  const headers = parseCSVLine(lines[0]);
  const numericFields = new Set(['phoneme_count', 'difficulty', 'letter_count', 'syllable_count', 'level']);
  const booleanFields = new Set(['is_common']);
  return lines.slice(1).map(line => {
    const vals = parseCSVLine(line);
    const obj = Object.create(null);
    headers.forEach((h, idx) => {
      const v = vals[idx] ?? '';
      if (booleanFields.has(h)) {
        obj[h] = v === 'true' ? true : v === 'false' ? false : v;
      } else {
        obj[h] = numericFields.has(h) && v !== '' ? Number(v) : v;
      }
    });
    obj.tokens = (obj.graphemes || '').split('|').filter(Boolean);
    return obj;
  });
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function exportAsDict(records) {
  return PhonicsEngine.toCSV(
    records.map(r => ({ ...r, is_common: DEFAULT_COMMON_WORDS.has(r.word.toLowerCase()) })),
    { extended: true, extraColumns: ['is_common'] }
  );
}

// ── AC 2 tests ────────────────────────────────────────────────────────────────

describe('AC 2 — CSV round-trip: Dictionary Builder export → Phonics Worksheets load', () => {

  it('isPreParsedCSV detects the toCSV output correctly', () => {
    const csv = exportAsDict([PhonicsEngine.parseWord('ship')]);
    expect(PhonicsEngine.isPreParsedCSV(csv)).toBe(true);
    expect(PhonicsEngine.isPreParsedCSV('ship\ncatch\nphone')).toBe(false);
  });

  it('cookie: vowel_team_sounds with commas survives quoted-field round-trip', () => {
    const original = PhonicsEngine.parseWord('cookie');
    // cookie has oo:oo_short,ie:long_e — comma in the field, csvCell will quote it
    expect(original.vowel_team_sounds).toContain(',');

    const csv = exportAsDict([original]);
    const [parsed] = parseCSV(csv);

    expect(parsed.vowel_team_sounds).toBe(original.vowel_team_sounds);
  });

  it('numeric fields are coerced back to numbers on CSV load', () => {
    const original = PhonicsEngine.parseWord('gingerbread');
    const csv = exportAsDict([original]);
    const [parsed] = parseCSV(csv);

    expect(typeof parsed.phoneme_count).toBe('number');
    expect(typeof parsed.difficulty).toBe('number');
    expect(typeof parsed.letter_count).toBe('number');
    expect(typeof parsed.syllable_count).toBe('number');
    expect(typeof parsed.level).toBe('number');

    expect(parsed.phoneme_count).toBe(original.phoneme_count);
    expect(parsed.difficulty).toBe(original.difficulty);
    expect(parsed.letter_count).toBe(original.letter_count);
    expect(parsed.syllable_count).toBe(original.syllable_count);
    expect(parsed.level).toBe(original.level);
  });

  it('all string fields survive round-trip without modification', () => {
    const original = PhonicsEngine.parseWord('gingerbread');
    const csv = exportAsDict([original]);
    const [parsed] = parseCSV(csv);

    expect(parsed.word).toBe(original.word);
    expect(parsed.graphemes).toBe(original.graphemes);
    expect(parsed.digraphs).toBe(original.digraphs);
    expect(parsed.trigraphs).toBe(original.trigraphs);
    expect(parsed.blends).toBe(original.blends);
    expect(parsed.vowel_teams).toBe(original.vowel_teams);
    expect(parsed.r_controlled).toBe(original.r_controlled);
    expect(parsed.onset).toBe(original.onset);
    expect(parsed.rime).toBe(original.rime);
    expect(parsed.vowel_team_sounds).toBe(original.vowel_team_sounds);
  });

  it('tokens array is reconstructed from graphemes column', () => {
    const original = PhonicsEngine.parseWord('stretch');
    const csv = exportAsDict([original]);
    const [parsed] = parseCSV(csv);

    expect(parsed.tokens).toEqual(original.graphemes.split('|'));
    expect(parsed.tokens).toEqual(original.tokens);
  });

  it('is_common field is preserved as a column and matches DEFAULT_COMMON_WORDS', () => {
    // 'the' is in DEFAULT_COMMON_WORDS; 'gingerbread' is not
    const the = PhonicsEngine.parseWord('the');
    const ginger = PhonicsEngine.parseWord('gingerbread');
    const csv = exportAsDict([the, ginger]);
    const parsed = parseCSV(csv);

    expect(parsed[0].is_common).toBe(true);    // boolean after coercion
    expect(parsed[1].is_common).toBe(false);
    expect(DEFAULT_COMMON_WORDS.has('the')).toBe(true);
    expect(DEFAULT_COMMON_WORDS.has('gingerbread')).toBe(false);
  });

  it('full demo list round-trips with zero data loss across all 12 words', () => {
    const DEMO_WORDS = [
      'ship', 'catch', 'phone', 'sing', 'finger',
      'three', 'night', 'school', 'queen',
      'rain', 'storm', 'gingerbread',
    ];
    const originals = PhonicsEngine.parseWords(DEMO_WORDS);
    const csv = exportAsDict(originals);
    const parsed = parseCSV(csv);

    expect(parsed.length).toBe(originals.length);
    originals.forEach((orig, i) => {
      expect(parsed[i].word).toBe(orig.word);
      expect(parsed[i].phoneme_count).toBe(orig.phoneme_count);
      expect(parsed[i].graphemes).toBe(orig.graphemes);
      expect(parsed[i].vowel_team_sounds).toBe(orig.vowel_team_sounds);
      expect(parsed[i].tokens).toEqual(orig.graphemes.split('|'));
    });
  });

});
