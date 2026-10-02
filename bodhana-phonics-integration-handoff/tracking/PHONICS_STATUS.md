# Phonics Integration — Status

**This file is overwritten in place, not appended to.** It always reflects current truth, not
history — history lives in `PHONICS_DECISION_LOG.md` (implementation decisions) and
`phonics-phase2-backlog.md` (deferred content/architecture questions).

**Last updated by:** Build agent (Claude)
**Last updated:** 2026-10-02
**One-line summary of what changed since last update:** Phase 1 complete (final) — 326 tests passing (325 normal + 1 expectedFailure): `several` reverted to expectedFailure; `zombie`/`brownie`/`selfie` added as normal fixtures; 4 decision-log entries backfilled; compound-split false-positive audit documented; backlog entry added for r-controlled VCV gap

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
**Status:** ☐ Not started · ☐ In progress · ☐ Blocked · ☐ Complete
**Depends on:** Phase 1 items 9–10 above being complete first.

Acceptance criteria (from spec §8):

- [ ] 1. `tools/constructs-workbench/index.html` opens via `file://` with no console errors (File System Access API browser)
- [ ] 2. Searching `speak` correctly shows it resolving via the `ea` default, no exception row matched
- [ ] 3. Targeting `ea` produces a blast-radius table including every `ea` word already in the regression corpus
- [ ] 4. A patch adding a duplicate `(word, pattern)` row is rejected with the exact Phase 1 validator message (proves reuse, not reimplementation)
- [ ] 5. A patch with an unintended side effect on a non-targeted word is caught by the regression diff and blocks merge
- [ ] 6. A patch targeting `compoundParts` is rejected immediately at Step 5, before sandbox computation
- [ ] 7. A successful merge writes exactly one new line to `constructs/CHANGELOG.md` and only the targeted row(s) in the real YAML — no incidental formatting/ordering changes
- [ ] 8. Zero network requests fire during a full workflow run-through

**Open questions:** — none yet

---

## Phase 3 — Engine refactor

**Spec:** `phonics-engine-spec_v1.0.md`
**Status:** ☐ Not started · ☐ In progress · ☐ Blocked · ☐ Complete
**Depends on:** Phase 1 items 9–10 (core module existence) — and now also depends on Phase 1's
core file list being the *expanded* set (see decision log, "Core scope expands beyond the
original four Phase 1 functions") not just the original four.
**Consistency-pass note:** §3.3's `EXTENDED_COLUMNS` fix (drop `is_common`, 11 entries not 12,
18 total columns not 19) is now explicit in the spec itself — this was a latent bug risk (would
have produced a duplicate `is_common` column once combined with Phase 4's `extraColumns`), not
just a documentation gap. Double-check this specific point during implementation review.

Acceptance criteria (from spec §4):

- [ ] 1. `ENGINE_VERSION === '3.0.0'`
- [ ] 2. `tokenize('gingerbread').join('|') === 'g|i|n|g|er|br|ea|d'`
- [ ] 3. `splitSyllables('understand').join('·') === 'un·der·stand'`
- [ ] 4. `parseWord('breathe')` and `parseWord('breathes')` both `vowel_team_sounds === 'ea:long_e'`
- [ ] 5. `parseWord('cookie')` and `parseWord('rookie')` both `'oo:oo_short,ie:long_e'` (order = token order, not table order)
- [ ] 6. `parseWord('gingerbread').vowel_team_sounds === 'ea:short_e'`
- [ ] 7. `parseWord('ship')` has no `is_common` key at all (checked via `Object.keys`, not just property access)
- [ ] 8. `toCSV(rows, {extended:true})` with no `extraColumns` has no `is_common` column
- [ ] 9. `toCSV(rows, {extended:true, extraColumns:['is_common']})` appends `is_common` as the last column
- [ ] 10. Corrupted `schemaVersion` in compiled JSON throws synchronously at `loadConstructs()`, naming both versions
- [ ] 11. Full regression corpus (non-`expectedFailure`) passes via the **public API**, not just core functions directly
- [ ] 12. Zero linguistic logic defined inside `PhonicsEngine.mjs` itself (verify by review/grep)
- [ ] 13. No `module.exports`, no `window.PhonicsConstructor` global, no UMD wrapper anywhere

**Open questions:** — none yet

---

## Phase 4 — Dictionary Builder integration

**Spec:** `phonics-dictionary-builder-integration-spec_v1.0.md`
**Status:** ☐ Not started · ☐ In progress · ☐ Blocked · ☐ Complete
**Depends on:** Phase 3's `PhonicsEngine.mjs` complete and stable.

Acceptance criteria (from spec §10):

- [ ] 1. Info-pane renders Notes + Detail tabs, Notes active by default, no `aria-hidden` remaining
- [ ] 2. Clicking a word's text auto-switches to Detail, no second click
- [ ] 3. Clicking the corner `×` excludes without switching tabs or changing selection
- [ ] 4. Reselecting an already-enriched word does not recompute (no `parseWord` call-count increase)
- [ ] 5. Detail panel shows the correct one of 3 states in every case — never blank/misleading
- [ ] 6. `Export Phonics CSV` disabled until first successful Enrich; output matches Phase 3's `extraColumns` contract
- [ ] 7. Existing Download/Full Merge/Append Delta byte-for-byte unchanged (regression check)
- [ ] 8. Re-extracting overlapping words doesn't re-call `parseWord` for words already cached
- [ ] 9. Flag export produces valid, loadable JSON matching §8.3 shape
- [ ] 10. `infoPaneTabsMarkup`/`wireInfoPaneTabs` are genuinely generic — zero Dictionary-Builder-specific code (provable by Phase 5 reuse with a different tab set)

**Open questions:**
- Header button row grows to 6 buttons + Clear (`Extract, Enrich, Download, Full Merge, Append
  Delta, Export Phonics CSV, Clear`). Should fit at 1920×1080 per the existing 5-button row's
  spare room, but flagged for a quick visual check once built — not a blocker, just don't skip
  looking at it.

---

## Phase 5 — Phonics Worksheets module

**Spec:** `phonics-worksheets-module-spec_v1.0.md`
**Status:** ☐ Not started · ☐ In progress · ☐ Blocked · ☐ Complete
**Depends on:** Phase 3 (`PhonicsEngine.mjs`) and Phase 4 (info-pane tabs primitive,
`phonicsWordDetail.js`/`phonics-word-detail.css`, `src/shared/default-common-words.js` — path
corrected at source in the Phase 4 spec itself during the consistency pass, no longer requires
cross-referencing this note).
**Scope note:** v1 ships only 4 of the original 9 activity types (Dissect, Elkonin, Onset &
Rime, Syllable Split) — see spec §0.1. Remaining 5 are Phase 5b, not built now.

Acceptance criteria (from spec §8):

- [ ] 1. Raw `.txt` load enriches immediately, `is_common` matches Dictionary Builder's resolution for the same word
- [ ] 2. Pre-parsed CSV round-trips with zero data loss/recomputation, including CSVs from Dictionary Builder's own export
- [ ] 3. Activity dropdown switch re-renders live, no `Generate` button present anywhere
- [ ] 4. `Show solutions` toggle genuinely adds/removes answer content from the DOM (not a CSS-only reveal)
- [ ] 5. Dissect/Syllable Split renderers use the exact same CSS classes as Phase 4's Detail panel (verified by class-name diff)
- [ ] 6. Onset & Rime rhyme-family lookup spans the full pool, not just the filtered/selected set
- [ ] 7. Pattern + sound filters combine as independent axes correctly
- [ ] 8. Zero HTML construction in generators; zero phonics computation in renderers (code review)
- [ ] 9. Print/Export call shared `printWorksheet`/`exportWorksheetPdf` exclusively — no direct `window.print()`, no module `@page` CSS

**Open questions:** — none blocking. §7 resolved against the real `print.js`/`export-pdf.js`:
`.paper-page` is reused as-is, zero shared-file edits needed (see decision log). One cheap,
non-blocking pre-flight check remains: confirm no other module (`worksheets/` or
`math-worksheets/`, neither reviewed) already defines `.paper-page` with conflicting assumptions
— low risk, and cheap to catch immediately if it happens, not something to chase down in advance.

---

## Cross-phase open questions (not tied to one phase's checklist)

— none yet
