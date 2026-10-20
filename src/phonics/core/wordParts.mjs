import { tryCompoundSplit } from './syllables.mjs';

/** Respect only compound boundaries supported by the curated constructs. */
export function splitKnownCompoundParts(word, compoundPartsSet) {
  if (!compoundPartsSet) return [word];
  const split = tryCompoundSplit(word, compoundPartsSet);
  return split ? split.flatMap(part => splitKnownCompoundParts(part, compoundPartsSet)) : [word];
}
