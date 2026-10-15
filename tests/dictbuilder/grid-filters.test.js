import { describe, expect, it } from 'vitest';
import { combineDictionaryWords, emptyGridFilters, filterGridWords, gridFilterOptions } from '../../src/dictbuilder/grid-filters.js';

const words = ['cat', 'boat', 'description', 'unknown'];
const records = {
  cat: { difficulty: 1, level: 1, syllable_count: 1, phoneme_count: 3 },
  boat: { difficulty: 2, level: 4, syllable_count: 1, phoneme_count: 3 },
  description: { difficulty: 3, level: 8, syllable_count: 3, phoneme_count: 10 },
};

describe('Dictionary word grid filters', () => {
  it('preserves all words and their order when filters are clear', () => {
    expect(filterGridWords(words, records, emptyGridFilters())).toEqual(words);
  });
  it('combines criteria and handles numeric metadata', () => {
    const filters = { ...emptyGridFilters(), difficulty: ['2'], syllable_count: ['1'], phoneme_count: ['3'] };
    expect(filterGridWords(words, records, filters)).toEqual(['boat']);
    expect(filterGridWords(words, records, { ...filters, level: ['1'] })).toEqual([]);
  });
  it('does not accidentally match unenriched words to numeric filters', () => {
    expect(filterGridWords(words, records, { ...emptyGridFilters(), difficulty: ['1'] })).toEqual(['cat']);
    expect(filterGridWords(words, records, { ...emptyGridFilters(), difficulty: ['unknown'] })).toEqual(['unknown']);
  });
  it('sorts distinct available values numerically with Unknown last', () => {
    expect(gridFilterOptions(words, records, 'phoneme_count')).toEqual(['3', '10', 'unknown']);
  });
  it('updates progressively as metadata becomes available', () => {
    const filters = { ...emptyGridFilters(), syllable_count: ['1'] };
    expect(filterGridWords(words, {}, filters)).toEqual([]);
    expect(filterGridWords(words, records, filters)).toEqual(['cat', 'boat']);
  });
});

describe('Filtered dictionary merge and append', () => {
  const base = ['zebra', 'cat', 'boat'];
  it('keeps the original base and appends only visible included new words', () => {
    expect(combineDictionaryWords(base, ['cat', 'new', 'excluded'], ['cat', 'new'])).toEqual([...base, 'new']);
  });
  it('sorts the appended delta without reordering the base', () => {
    expect(combineDictionaryWords(base, ['zero', 'apple'], ['zero', 'apple'], { sortNewWords: true })).toEqual([...base, 'apple', 'zero']);
  });
  it('applies exclusions only to visible base words when updating the base', () => {
    expect(combineDictionaryWords(base, ['cat', 'description'], ['description'], { updateBase: true })).toEqual(['zebra', 'boat', 'description']);
  });
  it('preserves a hidden excluded base word and replaces visible spelling', () => {
    expect(combineDictionaryWords(base, ['CAT'], ['CAT'], { updateBase: true })).toEqual(['zebra', 'CAT', 'boat']);
  });
  it('leaves the base untouched when no words match', () => {
    expect(combineDictionaryWords(base, [], [], { updateBase: true })).toEqual(base);
  });
});
