/**
 * Type-consistency check for is_common across both load paths.
 * Demonstrates the inconsistency before the fix, then confirms the fix.
 */

import { describe, it, expect } from 'vitest';
import PhonicsEngine from '../../src/phonics/PhonicsEngine.mjs';
import { DEFAULT_COMMON_WORDS } from '../../src/shared/default-common-words.js';

// Exact parseCSVLine + parseCSV from ui.js (BEFORE fix — no boolean coercion)
function parseCSVLineBefore(line) {
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
function parseCSVBefore(text) {
  const lines = text.split('\n').map(l => l.trimEnd()).filter(l => l);
  if (lines.length < 2) return [];
  const headers = parseCSVLineBefore(lines[0]);
  const numericFields = new Set(['phoneme_count', 'difficulty', 'letter_count', 'syllable_count', 'level']);
  return lines.slice(1).map(line => {
    const vals = parseCSVLineBefore(line);
    const obj = Object.create(null);
    headers.forEach((h, idx) => {
      const v = vals[idx] ?? '';
      obj[h] = numericFields.has(h) && v !== '' ? Number(v) : v;
    });
    obj.tokens = (obj.graphemes || '').split('|').filter(Boolean);
    return obj;
  });
}

// parseCSV AFTER fix — boolean coercion for is_common
function parseCSVAfter(text) {
  const lines = text.split('\n').map(l => l.trimEnd()).filter(l => l);
  if (lines.length < 2) return [];
  const headers = parseCSVLineBefore(lines[0]);
  const numericFields = new Set(['phoneme_count', 'difficulty', 'letter_count', 'syllable_count', 'level']);
  const booleanFields = new Set(['is_common']);
  return lines.slice(1).map(line => {
    const vals = parseCSVLineBefore(line);
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

function makeCSV(word, isCommonValue) {
  const record = PhonicsEngine.parseWord(word);
  return PhonicsEngine.toCSV(
    [{ ...record, is_common: isCommonValue }],
    { extended: true, extraColumns: ['is_common'] }
  );
}

describe('is_common type inconsistency — before fix', () => {
  it('plain-text path: is_common is a boolean', () => {
    // Mirrors: raw.map(r => ({ ...r, is_common: DEFAULT_COMMON_WORDS.has(...) }))
    const plainTextIsCommon = DEFAULT_COMMON_WORDS.has('cookie');
    expect(typeof plainTextIsCommon).toBe('boolean');
    expect(plainTextIsCommon).toBe(false);
  });

  it('CSV path (before fix): is_common is a string', () => {
    const csv = makeCSV('cookie', false); // csvCell(false) → 'false' (the string)
    const [parsed] = parseCSVBefore(csv);
    // Without boolean coercion, is_common comes out as the string 'false'
    expect(typeof parsed.is_common).toBe('string');
    expect(parsed.is_common).toBe('false');
  });

  it('demonstrates the mismatch: same word, same is_common value, different types', () => {
    const plainText = DEFAULT_COMMON_WORDS.has('cookie'); // false (boolean)
    const csv = makeCSV('cookie', false);
    const [parsed] = parseCSVBefore(csv);
    const fromCSV = parsed.is_common; // 'false' (string)

    expect(plainText).toBe(false);
    expect(fromCSV).toBe('false');
    expect(typeof plainText).toBe('boolean');
    expect(typeof fromCSV).toBe('string');
    // They are NOT equal — the inconsistency
    expect(plainText === fromCSV).toBe(false);
  });
});

describe('is_common type — after fix (boolean coercion in parseCSV)', () => {
  it('CSV path (after fix): is_common is a boolean', () => {
    const csv = makeCSV('cookie', false);
    const [parsed] = parseCSVAfter(csv);
    expect(typeof parsed.is_common).toBe('boolean');
    expect(parsed.is_common).toBe(false);
  });

  it('is_common true survives round-trip as boolean true', () => {
    const csv = makeCSV('the', true);
    const [parsed] = parseCSVAfter(csv);
    expect(typeof parsed.is_common).toBe('boolean');
    expect(parsed.is_common).toBe(true);
  });

  it('both paths agree in type and value after fix', () => {
    const plainText = DEFAULT_COMMON_WORDS.has('cookie');
    const csv = makeCSV('cookie', false);
    const [parsed] = parseCSVAfter(csv);
    expect(typeof plainText).toBe('boolean');
    expect(typeof parsed.is_common).toBe('boolean');
    expect(plainText === parsed.is_common).toBe(true);
  });
});
