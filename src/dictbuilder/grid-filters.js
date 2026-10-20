export const GRID_FILTERS = [
  { key: 'difficulty', label: 'Difficulty' },
  { key: 'level', label: 'Level' },
  { key: 'syllable_count', label: 'Syllables' },
  { key: 'phoneme_count', label: 'Groups' },
];

export function emptyGridFilters() {
  return Object.fromEntries(GRID_FILTERS.map(({ key }) => [key, []]));
}

export function filterValue(record, key) {
  return record?.[key] == null ? 'unknown' : String(record[key]);
}

export function filterGridWords(words, records, filters) {
  return words.filter(word => GRID_FILTERS.every(({ key }) =>
    !filters[key]?.length || filters[key].includes(filterValue(records[word], key))));
}

export function gridFilterOptions(words, records, key) {
  return [...new Set(words.map(word => filterValue(records[word], key)))]
    .sort((a, b) => a === 'unknown' ? 1 : b === 'unknown' ? -1 : Number(a) - Number(b));
}

// Hidden session words must never remove or replace existing base entries.
export function combineDictionaryWords(base, visible, active, { updateBase = false, sortNewWords = false } = {}) {
  const key = word => word.toLowerCase();
  const baseKeys = new Set(base.map(key));
  if (!updateBase) {
    const added = active.filter(word => !baseKeys.has(key(word)));
    if (sortNewWords) added.sort((a, b) => a.localeCompare(b));
    return [...base, ...added];
  }
  const visibleKeys = new Set(visible.map(key));
  const activeByKey = new Map(active.map(word => [key(word), word]));
  const kept = base.filter(word => !visibleKeys.has(key(word)) || activeByKey.has(key(word)))
    .map(word => visibleKeys.has(key(word)) ? activeByKey.get(key(word)) : word);
  const emitted = new Set(kept.map(key));
  const added = active.filter(word => !emitted.has(key(word))).sort((a, b) => a.localeCompare(b));
  return [...kept, ...added];
}
