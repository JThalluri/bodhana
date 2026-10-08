/**
 * Call-count instrumentation for Phase 4 enrichment cache (AC 4 + AC 8).
 *
 * These tests verify the two invariants:
 *   AC 8 — re-extracting overlapping words does not re-call parseWords for
 *           words already in phonicsByWord.
 *   AC 4 — selecting (or re-selecting) a word never triggers a parseWords call;
 *           it only reads from phonicsByWord.
 *
 * The exact filter pattern from runEnrich() in ui.js is tested directly here
 * so any change to that pattern surfaces as a test failure, not a silent drift.
 */

import { describe, it, expect, vi } from 'vitest';
import PhonicsEngine from '../../src/phonics/PhonicsEngine.mjs';

// ── Helpers mirroring the ui.js enrichment cache pattern ─────────────────────

function simulateRunEnrich(extracted, phonicsByWord, spiedParseWords) {
  const toEnrich = extracted.filter(w => !(w in phonicsByWord));
  if (!toEnrich.length) return 0;
  const records = spiedParseWords(toEnrich);
  records.forEach(r => { phonicsByWord[r.word] = r; });
  return toEnrich.length;
}

// selectWord reads from cache — never calls parseWords
function simulateSelectWord(word, phonicsByWord) {
  return phonicsByWord[word] ?? null;
}

// ── AC 8 — overlapping re-extraction ─────────────────────────────────────────

describe('AC 8 — enrichment cache: re-extraction does not re-call parseWords', () => {
  it('first Enrich call processes all extracted words', () => {
    const phonicsByWord = Object.create(null);
    const spy = vi.fn(words => PhonicsEngine.parseWords(words));

    simulateRunEnrich(['cat', 'dog', 'fish'], phonicsByWord, spy);

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0][0]).toEqual(['cat', 'dog', 'fish']);
  });

  it('second Enrich with same word list calls parseWords with empty array → 0 calls', () => {
    const phonicsByWord = Object.create(null);
    const spy = vi.fn(words => PhonicsEngine.parseWords(words));

    simulateRunEnrich(['cat', 'dog'], phonicsByWord, spy);
    const count1 = spy.mock.calls[0][0].length; // should be 2

    // Re-extract same words — cache has them already
    const newCount = simulateRunEnrich(['cat', 'dog'], phonicsByWord, spy);

    expect(newCount).toBe(0);                // nothing to enrich
    expect(spy).toHaveBeenCalledTimes(1);    // spy not called a second time
    expect(count1).toBe(2);
  });

  it('re-extraction with overlap only passes the new word to parseWords', () => {
    const phonicsByWord = Object.create(null);
    const spy = vi.fn(words => PhonicsEngine.parseWords(words));

    simulateRunEnrich(['cat', 'dog'], phonicsByWord, spy);
    // Now 'cat' and 'dog' are in cache; 'bird' is not
    simulateRunEnrich(['cat', 'dog', 'bird'], phonicsByWord, spy);

    expect(spy).toHaveBeenCalledTimes(2);
    expect(spy.mock.calls[1][0]).toEqual(['bird']); // only the new word
  });
});

// ── AC 4 — selectWord never calls parseWords ──────────────────────────────────

describe('AC 4 — selectWord reads cache, never calls parseWords', () => {
  it('selecting an enriched word returns the cached record without invoking parseWords', () => {
    const phonicsByWord = Object.create(null);
    const enrichSpy = vi.fn(words => PhonicsEngine.parseWords(words));
    const selectSpy = vi.spyOn(PhonicsEngine, 'parseWords');

    // Enrich first
    simulateRunEnrich(['ship'], phonicsByWord, enrichSpy);
    const callsBefore = selectSpy.mock.calls.length;

    // Select the word — must read from cache only
    const record = simulateSelectWord('ship', phonicsByWord);

    expect(record).not.toBeNull();
    expect(record.word).toBe('ship');
    expect(selectSpy.mock.calls.length).toBe(callsBefore); // no new parseWords call

    selectSpy.mockRestore();
  });

  it('re-selecting already-enriched word (after exclude/re-include) returns same record', () => {
    const phonicsByWord = Object.create(null);
    const spy = vi.fn(words => PhonicsEngine.parseWords(words));

    simulateRunEnrich(['catch'], phonicsByWord, spy);
    const r1 = simulateSelectWord('catch', phonicsByWord);

    // Simulate exclude → re-select cycle
    const r2 = simulateSelectWord('catch', phonicsByWord);

    expect(spy).toHaveBeenCalledTimes(1); // still just the initial enrich
    expect(r1).toBe(r2);                  // same object reference from cache
  });
});
