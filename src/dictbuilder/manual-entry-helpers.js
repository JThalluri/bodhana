/**
 * Pure helpers for the manual word-entry section of Dictionary Builder.
 * No DOM or state dependencies — importable by vitest directly.
 */

/** Lowercase a token and strip all non-letter characters. Returns null if nothing remains. */
export function cleanManualToken(raw) {
  const cleaned = String(raw).toLowerCase().replace(/[^a-z]/g, '');
  return cleaned || null;
}

/**
 * Split a raw input string on whitespace/commas, clean each token,
 * and return only the tokens that produce a non-empty cleaned word.
 *
 * @param {string} raw
 * @returns {{ raw: string, cleaned: string }[]}
 */
export function tokenizeManualInput(raw) {
  return String(raw)
    .split(/[\s,]+/)
    .filter(Boolean)
    .map(tok => ({ raw: tok, cleaned: cleanManualToken(tok) }))
    .filter(t => t.cleaned !== null);
}
