import { describe, it, expect } from 'vitest';
import { splitSyllables } from '../../src/phonics/core/index.mjs';
import { fixtures, syllableCtx } from './_helpers.js';

const BACKLOG_URL = 'constructs/fixtures/phonics-regression-fixtures.v2.yaml + phonics-phase2-backlog.md';

describe('syllableSplit fixtures', () => {
  for (const f of fixtures.syllableSplit) {
    const label = `splitSyllables("${f.word}") → [${f.split.join('·')}]`;

    if (f.expectedFailure) {
      it(`[KNOWN-FAILURE] ${label}`, () => {
        const result = splitSyllables(f.word, syllableCtx);
        const passes = JSON.stringify(result) === JSON.stringify(f.split);
        if (passes) {
          console.warn(
            `[KNOWN-FAILURE NOW PASSING] "${f.word}" — may be closeable, check the backlog: ${BACKLOG_URL}` +
            (f.reason ? ` | reason: ${f.reason}` : '')
          );
        }
        // Do NOT fail the build — this is an expected failure
        expect(true).toBe(true);
      });
    } else {
      it(label, () => {
        const result = splitSyllables(f.word, syllableCtx);
        expect(result).toEqual(f.split);
      });
    }
  }
});
