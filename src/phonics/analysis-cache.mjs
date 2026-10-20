import { ANALYSIS_REVISION, parseWord } from './PhonicsEngine.mjs';

// Keep user metadata (notably is_common) while replacing engine-derived fields.
export function refreshAnalysis(record, savedRevision) {
  if (savedRevision === ANALYSIS_REVISION) return record;
  const current = parseWord(record.word);
  return current ? {...record, ...current} : record;
}
