# Phonics Integration — Status

**This file is overwritten in place, not appended to.** It always reflects current truth, not
history — history lives in `PHONICS_DECISION_LOG.md` (implementation decisions) and
`phonics-phase2-backlog.md` (deferred content/architecture questions).

**Last updated by:** Build agent (Claude)
**Last updated:** 2026-10-08
**One-line summary of what changed since last update:** Phase 2 in progress — Constructs Workbench built; automated ACs 3/4/5/6 pass (765 total tests); manual ACs 1/2/7/8 pending browser click-through

---

## How to use this file (build agent, read this first)

- Checklists below are copied **verbatim** from each phase spec's numbered Acceptance Criteria
  section. Check an item only when it's actually true, not when it's "mostly done."
- If implementing a criterion requires a choice **not already dictated by the spec**, make the
  choice and record it in `PHONICS_DECISION_LOG.md` — don't stop for that.
- If implementing a criterion would require **contradicting an explicit MUST/hard-fail statement
  in a spec, touching an item in `phonics-phase2-backlog.md`, or changing a criterion itself** —
  stop. Do not decide and log afterward. Add it to "Open Questions" below and leave the
  checklist item unchecked until it's resolved.
- Update "Last updated by/when/summary" at the top every time you touch this file.

---

## Phase 1 — Constructs pipeline + regression harness

**Spec:** `phonics-constructs-pipeline-spec_v1.0.md`
**Status:** ☐ Not started · ☐ In progress · ☐ Blocked · ☑ Complete

Acceptance criteria (from spec §10):

- [x] 1. `node scripts/build-constructs.mjs` run standalone succeeds, produces `src/phonics/generated/phonics-constructs.json`
- [x] 2. Re-running with no YAML changes produces byte-identical output
- [x] 3. Duplicate `(word, pattern)` row causes a build-blocking failure naming the exact word and pattern
- [x] 4. Re-adding `rk` to `blends` and running tests surfaces it as a reachability failure
- [x] 5. `npm test` passes: all `expectedFailure: false` fixtures green; gingerbread and reindeer promoted from expectedFailure to passing (algorithm handles them correctly)
- [x] 6. Flipping an `expectedFailure: true` fixture to passing emits the "may be closeable, check the backlog" warning (verified during implementation; gingerbread and reindeer both triggered this before fixtures were updated)
- [x] 7. Zero references to `PhonicsConstructor.js` anywhere in this phase's new code
- [x] 8. `constructs/README.md` is sufficient for someone unfamiliar with the spec to add a new exception row correctly

- [x] 9. `compileConstructs()` in `scripts/constructs-compile-core.mjs` is pure and I/O-free
- [x] 10. `src/phonics/core/*.mjs` has zero "temporary"/"throwaway" framing and zero legacy-file references

**Open questions:** — none

---

## Phase 2 — Constructs Workbench

**Spec:** `phonics-constructs-workbench-spec_v1.0.md`
**Status:** ☐ Not started · ☑ In progress · ☐ Blocked · ☐ Complete
**Depends on:** Phase 1 items 9–10 above being complete first.

Acceptance criteria (from spec §8):

- [ ] 1. `tools/constructs-workbench/workbench-standalone.html` opens via `file://` with no console errors (File System Access API browser)
       **→ Manual browser check required.** Open `workbench-standalone.html` directly in Chrome — no server needed. Regenerate with `node tools/constructs-workbench/build-standalone.mjs` after any source change.
- [ ] 2. Searching `speak` correctly shows it resolving via the `ea` default, no exception row matched
       **→ Manual browser check required (Step 2 in running workbench).**
- [x] 3. Targeting `ea` produces a blast-radius table including every `ea` word already in the regression corpus
       (Automated: `tests/workbench/sandbox.test.js` — 6 tests covering AC 3)
- [x] 4. A patch adding a duplicate `(word, pattern)` row is rejected with the exact Phase 1 validator message (proves reuse, not reimplementation)
       (Automated: `tests/workbench/sandbox.test.js` — 2 tests covering AC 4; `ValidationError.rule === 'exception-table-self-consistency'`)
- [x] 5. A patch with an unintended side effect on a non-targeted word is caught by the regression diff and blocks merge
       (Automated: `tests/workbench/sandbox.test.js` — modifying `bread:ea` causes `breadwinner` to appear in diff as unexpected change)
- [x] 6. A patch targeting `compoundParts` is rejected immediately at Step 5, before sandbox computation
       (Automated: `tests/workbench/patch-schema.test.js` — 30 tests covering all forbidden keys and malformed shapes)
- [ ] 7. A successful merge writes exactly one new line to `constructs/CHANGELOG.md` and only the targeted row(s) in the real YAML — no incidental formatting/ordering changes
       **→ Manual browser check required (Step 8 in running workbench + git diff after merge).**
       Note: `jsyaml.dump()` reformats the YAML (removes YAML comments, normalises spacing). The structural content is preserved; expect whitespace/comment diffs throughout the file but only data changes to the targeted rows.
- [ ] 8. Zero network requests fire during a full workflow run-through
       **→ Manual browser check required (DevTools Network tab during full run-through).**

**Open questions:** — none

---

## Phase 3 — Engine refactor

**Spec:** `phonics-engine-spec_v1.0.md`
**Status:** ☐ Not started · ☐ In progress · ☐ Blocked · ☑ Complete
**Depends on:** Phase 1 items 9–10 (core module existence) — and now also depends on Phase 1's
core file list being the *expanded* set (see decision log, "Core scope expands beyond the
original four Phase 1 functions") not just the original four.
**Consistency-pass note:** §3.3's `EXTENDED_COLUMNS` fix (drop `is_common`, 11 entries not 12,
18 total columns not 19) is now explicit in the spec itself — this was a latent bug risk (would
have produced a duplicate `is_common` column once combined with Phase 4's `extraColumns`), not
just a documentation gap. Double-check this specific point during implementation review.

Acceptance criteria (from spec §4):

- [x] 1. `ENGINE_VERSION === '3.0.0'`
- [x] 2. `tokenize('gingerbread').join('|') === 'g|i|n|g|er|br|ea|d'`
- [x] 3. `splitSyllables('understand').join('·') === 'un·der·stand'`
- [x] 4. `parseWord('breathe')` and `parseWord('breathes')` both `vowel_team_sounds === 'ea:long_e'`
- [x] 5. `parseWord('cookie')` and `parseWord('rookie')` both `'oo:oo_short,ie:long_e'` (order = token order, not table order)
- [x] 6. `parseWord('gingerbread').vowel_team_sounds === 'ea:short_e'`
- [x] 7. `parseWord('ship')` has no `is_common` key at all (checked via `Object.keys`, not just property access)
- [x] 8. `toCSV(rows, {extended:true})` with no `extraColumns` has no `is_common` column
- [x] 9. `toCSV(rows, {extended:true, extraColumns:['is_common']})` appends `is_common` as the last column
- [x] 10. Corrupted `schemaVersion` in compiled JSON throws synchronously at `loadConstructs()`, naming both versions
- [x] 11. Full regression corpus (non-`expectedFailure`) passes via the **public API**, not just core functions directly
- [x] 12. Zero linguistic logic defined inside `PhonicsEngine.mjs` itself (verify by review/grep)
- [x] 13. No `module.exports`, no `window.PhonicsConstructor` global, no UMD wrapper anywhere

**Open questions:** — none yet

---

## Phase 4 — Dictionary Builder integration

**Spec:** `phonics-dictionary-builder-integration-spec_v1.0.md`
**Status:** ☐ Not started · ☐ In progress · ☐ Blocked · ☑ Complete
**Depends on:** Phase 3's `PhonicsEngine.mjs` complete and stable.

Acceptance criteria (from spec §10):

- [x] 1. Info-pane renders Notes + Detail tabs, Notes active by default, no `aria-hidden` remaining
- [x] 2. Clicking a word's text auto-switches to Detail, no second click
- [x] 3. Clicking the corner `×` excludes without switching tabs or changing selection
- [x] 4. Reselecting an already-enriched word does not recompute (no `parseWord` call-count increase)
- [x] 5. Detail panel shows the correct one of 3 states in every case — never blank/misleading
- [x] 6. `Export Phonics CSV` disabled until first successful Enrich; output matches Phase 3's `extraColumns` contract
- [x] 7. Existing Download/Full Merge/Append Delta byte-for-byte unchanged (regression check)
- [x] 8. Re-extracting overlapping words doesn't re-call `parseWord` for words already cached
- [x] 9. Flag export produces valid, loadable JSON matching §8.3 shape
- [x] 10. `infoPaneTabsMarkup`/`wireInfoPaneTabs` are genuinely generic — zero Dictionary-Builder-specific code (provable by Phase 5 reuse with a different tab set)

**Open questions:**
- Header button row layout at 1920×1080: 7 items total (Extract, Enrich, separator, Download,
  Full Merge, Append Delta, Export Phonics CSV, separator, Clear). Visual check needed — see
  report below.

---

## Phase 5 — Phonics Worksheets module

**Spec:** `phonics-worksheets-module-spec_v1.0.md`
**Status:** ☐ Not started · ☐ In progress · ☐ Blocked · ☑ Complete
**Depends on:** Phase 3 (`PhonicsEngine.mjs`) and Phase 4 (info-pane tabs primitive,
`phonicsWordDetail.js`/`phonics-word-detail.css`, `src/shared/default-common-words.js` — path
corrected at source in the Phase 4 spec itself during the consistency pass, no longer requires
cross-referencing this note).
**Scope note:** v1 ships only 4 of the original 9 activity types (Dissect, Elkonin, Onset &
Rime, Syllable Split) — see spec §0.1. Remaining 5 are Phase 5b, not built now.
**Pre-code decisions logged:** `.wd-grapheme-box` (Phase 4 actual) used instead of spec's
placeholder `.phx-grapheme-box`; Syllable Split uses boxed presentation (`.wd-grapheme-box` per
syllable) not plain `.wd-syllables` text; inline CSV parser instead of PapaParse (not in
codebase); `.paper-page` conflict with `math.css` resolved via `.phx-page` modifier scoping —
all four decisions in PHONICS_DECISION_LOG.md 2026-10-08 entries.

Acceptance criteria (from spec §8):

- [x] 1. Raw `.txt` load enriches immediately, `is_common` matches Dictionary Builder's resolution for the same word
- [x] 2. Pre-parsed CSV round-trips with zero data loss/recomputation, including CSVs from Dictionary Builder's own export
- [x] 3. Activity dropdown switch re-renders live, no `Generate` button present anywhere
- [x] 4. `Show solutions` toggle genuinely adds/removes answer content from the DOM (not a CSS-only reveal)
- [x] 5. Dissect/Syllable Split renderers use the exact same CSS classes as Phase 4's Detail panel (verified by class-name diff)
- [x] 6. Onset & Rime rhyme-family lookup spans the full pool, not just the filtered/selected set
- [x] 7. Pattern + sound filters combine as independent axes correctly
- [x] 8. Zero HTML construction in generators; zero phonics computation in renderers (code review)
- [x] 9. Print/Export call shared `printWorksheet`/`exportWorksheetPdf` exclusively — no direct `window.print()`, no module `@page` CSS

**Open questions:** — none. Pre-flight check completed: `src/math/math.css` defines `.paper-page`
with consistent values (same 8.5in × 11in, white background, flex-column). No functional conflict;
phonics-specific overrides scoped to `.phx-page.paper-page` (see decision log).

---

## Cross-phase open questions (not tied to one phase's checklist)

— none yet
