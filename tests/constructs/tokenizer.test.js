import { describe, it, expect } from 'vitest';
import { tokenize } from '../../src/phonics/core/index.mjs';
import { constructs, fixtures, sortedPatterns } from './_helpers.js';

describe('tokenizer fixtures', () => {
  for (const f of fixtures.tokenizer) {
    it(`tokenize("${f.word}") → ${f.graphemes}`, () => {
      const result = tokenize(f.word, sortedPatterns).join('|');
      expect(result).toBe(f.graphemes);
    });
  }
});
