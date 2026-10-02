import { describe, it, expect } from 'vitest';
import { tokenize, vowelTeamSounds } from '../../src/phonics/core/index.mjs';
import { constructs, fixtures, sortedPatterns, exceptionMap } from './_helpers.js';

const { defaultVowelSound, soundLabels } = constructs;

describe('vowelTeamSounds fixtures', () => {
  // Group fixtures by word so we can tokenize once per word
  const byWord = new Map();
  for (const f of fixtures.vowelTeamSounds) {
    if (!byWord.has(f.word)) byWord.set(f.word, []);
    byWord.get(f.word).push(f);
  }

  for (const [word, expectations] of byWord) {
    it(`vowelTeamSounds("${word}")`, () => {
      const tokens = tokenize(word, sortedPatterns);
      const results = vowelTeamSounds(word, tokens, exceptionMap, defaultVowelSound, soundLabels);
      const resultMap = new Map(results.map(r => [r.pattern, r.sound]));
      for (const f of expectations) {
        expect(resultMap.get(f.pattern), `word="${word}" pattern="${f.pattern}"`).toBe(f.sound);
      }
    });
  }
});
