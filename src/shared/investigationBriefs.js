/**
 * investigationBriefs.js — generates Construct Investigation Brief markdown from
 * Dictionary Builder's flagged-words state.
 *
 * The §2 and §5 boilerplate text below must stay byte-identical (whitespace-normalized)
 * to the corresponding sections of CONSTRUCT_INVESTIGATION_BRIEF_TEMPLATE.md — a test
 * enforces this (see §B.4). If you edit the template, update this file's constants too.
 */

export const CLASSIFY_BOILERPLATE = `Trace the real algorithm by hand, or via a one-off script that imports the actual functions from src/phonics/core/*.mjs — never reimplement them for this check — against the word(s) above. Do this before assuming it's a bug. State explicitly which of the three it is:

(a) Not a bug. The algorithm traces correctly; the expectation in §1 was wrong. Explain why, with the trace, and stop there. (This is what happened with the "exchange" tokenizer/syllable trace — both the ng-before-e guard and the VCCCV digraph-split rule were already correct; the reported symptom didn't match what the code actually does.)
(b) A data gap. Fixable via vowelTeamExceptions / compoundParts / rootWords. Use the existing Workbench (Vowel Sound / Compound Part / Root Word mode) for this — do not hand-edit phonics-constructs.yaml directly, even for a single row.
(c) A genuine algorithm/structural bug. Requires a code change to src/phonics/core/*.mjs, scripts/constructs-validate.mjs, or scripts/constructs-compile-core.mjs. Only continue to §3 if this is actually the case.`;

export const CONTEXT_LOCATIONS_BOILERPLATE = `Compiled constructs: constructs/phonics-constructs.yaml
Regression fixtures: constructs/fixtures/phonics-regression-fixtures.v2.yaml
Core algorithm: src/phonics/core/*.mjs
Validator: scripts/constructs-validate.mjs
Compiler: scripts/constructs-compile-core.mjs
Deferred/known issues: phonics-phase2-backlog.md
History of prior decisions: PHONICS_DECISION_LOG.md`;

export function describeSuspectedArea(record) {
  if (!record) return '(record unavailable — recompute first, see §0)';
  const buckets = ['digraphs', 'trigraphs', 'blends', 'vowel_teams', 'r_controlled', 'clusters3', 'floss']
    .map(k => [k, record[k]])
    .filter(([, v]) => v);
  if (!buckets.length) return '(no pattern buckets populated on this record)';
  return buckets.map(([k, v]) => `${k}=${v}`).join('; ');
}

/**
 * @param {Array<{word, record, note, flaggedAt}>} flaggedWords
 * @returns {string} combined markdown — preamble once, then one brief per word. Empty string if no flags.
 *
 * Structure: shared preamble (§2 classify + §5 context, printed once) + compact per-word briefs
 * (§1 symptom + §4 suspected area only). Staleness instruction is in the preamble; timestamp
 * is in each brief header. This keeps token count proportional to the number of unique signals,
 * not to the number of flags.
 */
export function buildInvestigationBriefs(flaggedWords) {
  if (!flaggedWords?.length) return '';

  const n = flaggedWords.length;

  const preamble = `# Phonics Investigation Briefs

${n} flag${n !== 1 ? 's' : ''}.

**Staleness check (do this first for every brief):** Recompute the word fresh via \`PhonicsEngine.parseWord(word)\`. If the current output already matches the expected behavior in §1, the flag is already resolved — log it in \`PHONICS_DECISION_LOG.md\` and stop.

## Required first step — classify before proposing anything

${CLASSIFY_BOILERPLATE}

## Context locations (apply to all briefs)

${CONTEXT_LOCATIONS_BOILERPLATE}

---`;

  const briefs = flaggedWords.map(f => {
    const vts = (f.record?.vowel_team_sounds || '').split(',').filter(Boolean).join(', ');
    const expected = f.note?.trim()
      || '[no note given — contact the flagger for the expected behavior before proceeding]';

    return `## Brief: "${f.word}" — flagged ${f.flaggedAt}

### 1. Symptom

- **Expected behavior:** ${expected}
- **Actual/current behavior (at flag time):** vowel_team_sounds = "${f.record?.vowel_team_sounds || '(not computed)'}"${vts ? ` (${vts})` : ''}

### 4. Suspected area

${describeSuspectedArea(f.record)}

---`;
  }).join('\n\n');

  return preamble + '\n\n' + briefs + '\n';
}
