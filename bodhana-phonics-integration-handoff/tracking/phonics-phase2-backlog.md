# Phonics Constructs — Deferred Items Backlog

Living log of decisions deliberately postponed during Phase 1 fixture rationalization. Each item
states what was deferred, why, and what the immediate patch (if any) was, so none of this gets
lost between now and whenever it's picked up.

Update this file — don't let findings like these live only in chat history.

---

## RESOLVED — `-able` / `-ible` suffix-split undercounts true syllables by one

**Found during:** v2 corpus, Pass 3 (suffix-rule coverage).

**Resolved in:** Phase 2 (2026-10-09).

**What shipped:**
- Added optional `segments` field to `suffixStripRules` in `phonics-constructs.yaml`: `able → [a, ble]`, `ible → [i, ble]`.
- `constructs-compile-core.mjs` passes `segments` through unchanged.
- `tryStripSuffix` returns `suffixSegments` (from `r.segments` when present and not undoubled).
- `splitSyllables` spreads `stripped.suffixSegments` instead of pushing single `stripped.suffix`.
- `checkStructure` validates that `segments` is array of ≥2 lowercase-alpha strings concatenating to the suffix.
- **However:** `-Cle` check (step 2) fires before suffix strip (step 3) and strips `ble` from `visible`/`readable`, so those two words cannot be fixed by `segments` alone. They are instead covered by `syllableSplitOverrides` (see next item). The `segments` field still helps any `-able`/`-ible` word that doesn't end in pure `ble` (e.g., `adorable` → `ador-a-ble`; `incredible` — the Cle check sees `ble` and strips it, so this too needs an override entry if correct split is required).
- `readable` and `visible` fixtures promoted from `expectedFailure: true` to passing (via `syllableSplitOverrides` entries).

---

## OPEN — Should consonant-undoubling depend on a finite curated `ROOT_WORDS` list at all?

**Found during:** v1 fixture pass, confirmed in v2 Pass 3.

**Issue:** `tryStripSuffix`'s undouble logic (`running→run`, `bigger→big`) only fires if the
candidate root appears in the ~60-word `ROOT_WORDS` dictionary. `slim` was missing, so
`slimmer` incorrectly split as `slimm·er` instead of `slim·mer`.

**Patched now (per your decision):** added `slim` to `ROOT_WORDS`. `slimmer → slim·mer` fixture
added and passing.

**Deferred to Phase 2:** the general question — should undoubling depend on a finite curated word
list that will always be incomplete, or should it use a more general rule (e.g. "undouble if the
single-consonant form, run through the same pipeline, still produces a valid-looking stem")? The
curated-list approach will keep producing this exact failure mode (right rule, missing word) for
every uncommon root someone eventually tries. Revisit once Phase 1's framework is stable and
there's a cheap way to test a general rule against the regression corpus without breaking the
~60 words currently relying on the curated list.

---

## RESOLVED — Pattern fallback misidentifies `er` in VCV context (`several`, `general`, etc.)

**Found during:** Phase 1 review after all 323 tests were passing.

**Resolved in:** Phase 2 (2026-10-09) via option (c) — curated `syllableSplitOverrides` table.

**What shipped:**
- New `syllableSplitOverrides` section in `phonics-constructs.yaml`: an array of `{ word, split }` entries checked at the very start of `splitSyllables` (step 0), before compound/suffix/fallback logic.
- `constructs-compile-core.mjs` passes the array through unchanged.
- `constructsLoader.mjs` exposes `syllableSplitOverrides` in its returned object.
- `buildSyllableSplitOverridesMap(list)` in `syllables.mjs` builds a `Map<word, string[]>` from the array.
- `PhonicsEngine.mjs` builds the map and includes it in `syllableCtx` as `syllableSplitOverridesMap`.
- `tests/constructs/_helpers.js` also builds and includes the map so constructs tests use the same path.
- `checkStructure` validates entries: word must be lowercase-alpha, split must be array of ≥2 lowercase-alpha strings that concatenate to the word.

**Words added to overrides (Phase 2 initial set):**
`several`, `general`, `federal`, `mineral`, `liberal`, `camera` — VCV false-open-syllable family.
`elephant`, `guarantees` — additional VCV edge cases from Oct-09 flag investigation.
`readable`, `visible` — `-able`/`-ible` words intercepted by `-Cle` before suffix strip can apply `segments`.

**Fixtures promoted from `expectedFailure: true` to passing:**
`several`, `readable`, `visible` (previously flagged). `general`, `federal`, `elephant`, `guarantees` added as new passing fixtures.

**Long-tail coverage:** any additional word with the same failure mode can be added as a one-line entry to `syllableSplitOverrides` via the YAML — no code changes required.

---

## RESOLVED — `ea` hiatus words misclassified as a vowel team

**Found during:** Compound Part / Root Word Workbench mode testing (Phase 2 extension sign-off).

**Resolved in:** phonics_integration branch, spec `Phonics dictbuilder tts manual entry ea hiatus spec v1.0.md`, Part C.

**What shipped:**
- New `soundLabels` entry: `hiatus: "(hiatus — two separate vowel sounds across a syllable boundary, as in re-act)"`.
  Generic by design — reusable for any future pattern/word hitting the same situation, not scoped to `ea`.
- 9 `vowelTeamExceptions` rows added (starter list): `caveat`, `react`, `reaction`, `reactivate`,
  `create`, `creation`, `recreate`, `idea`, `theater` — all with `pattern: ea, sound: hiatus`.
- 9 regression fixtures added to `phonics-regression-fixtures.v2.yaml` (vowelTeamSounds section),
  one per word above.
- Verified via programmatic Workbench sandbox (workbench-core.mjs): 0 conflicts in blast radius,
  0 unexpected regressions in existing fixtures; all 9 words resolve to `ea:hiatus` after patch.

**`area` excluded:** `area` tokenizes as `[are|a]` — the rControlled3 pattern `are` claims
positions 0-2 before the `ea` sequence is ever reached, making an `ea` exception row a dead rule.
The Workbench blast radius correctly excludes it. More words from the original scope list
(`ideal`, `linear`, `real`) can be checked the same way and added via the Workbench as needed.

**More can be added later** via the Workbench's Vowel Sound mode for pattern `ea` — the
`hiatus` label now exists in the table and will appear in any future exception row targeting this family.

---

## RESOLVED — Constructs Workbench now covers compoundParts/rootWords

**Found during:** Phase 2 review (see original entry above — moved to resolved).

**Resolved in:** phonics_integration branch, spec `phonics-workbench-compound-rootwords-extension-spec_v1.0.md`.

**What shipped:**
- Mode selector added to Step 1: Vowel Sound / Compound Part / Root Word.
- Compound Part mode: Step 2 analyses a word via the real `tryCompoundSplit` loop, shows
  which halves are missing from the current `compoundParts` set, and lets the user target
  a specific candidate. Step 3 blast radius shows every word in the fixture pool that the
  algorithm would consider as a compound half, with current and sandboxed splits side by side.
- Root Word mode: Step 2 runs the real `tryStripSuffix` and surfaces any candidate root
  blocked by missing `rootWords` entries.
- `validatePatchSchemaForList` — mode-scoped schema: only `add`/`remove`, items must be plain
  strings (not word/pattern/sound objects), cross-mode targeting rejected immediately.
- `runSyllableRegressionDiff` sibling to `runRegressionDiff`: re-runs all `syllableSplit`
  fixtures, surfaces `nowPassing` for `expectedFailure: true` entries that now match their
  target, same hard-gate merge logic.
- `buildChangelogEntriesForList`: format `| word | list | action | date | reason |`.
- `syllables.mjs` + `vowelNuclei.mjs` added to standalone bundle (128 KB → 172 KB).
- 42 new unit tests; full suite: 813 tests passing.

**Note on gingerbread/reindeer:** Both words currently split correctly via the nucleus
fallback path (gingerbread → ['gin','ger','bread'], reindeer → ['rein','deer']) even without
their compound parts in the list. Adding ginger/rein/deer to compoundParts via the new tool
would not change the split output (same result via compound path), but the tool provides
the safe workflow to make those additions if desired. The "COMPOUND_PARTS incomplete" entry
for these words has been moved to RESOLVED — the motivating examples turned out to already
be fixed in Phase 1, confirmed via no-op detection during this phase.

---

## RESOLVED — for audit trail only, no action needed

- **`rd,rk,rm,rn,rl,rt` blend patterns removed** (were structurally unreachable — `rControlled`
  always claims the vowel+r pair first). Replaced with 13 `rControlled`/`rControlled3` fixtures
  using your common-word list (bird, beard, stark, pork, storm, arm, barn, corn, girl, swirl,
  art, card, short).
- **Pattern tie-break priority mismatch** between the spec doc (`clusters3 > trigraphs >
  digraphs > vowelTeams > rControlled > blends`) and actual code (category-declaration order) —
  resolved by banning cross-category pattern collisions outright as a permanent compiler rule,
  rather than reconciling the two orderings. Makes the ordering question moot by construction.
- **`dge` trigraph had zero fixture coverage** — closed with `fudge → f\|u\|dge`.
- **`scr` and `igh` claimed covered in v1 coverage matrix but had no fixture** — closed with
  `scrap` (scr) and `night` (igh).

---

## RESOLVED — `COMPOUND_PARTS` incomplete for `gingerbread` / `reindeer` (stale — already fixed in Phase 1)

**Originally found during:** v1 fixture pass, carried into v2 unresolved.

**Resolved in:** Phase 1 (pattern-fallback pass). Both words were promoted off `expectedFailure`
at that time and confirmed correct independently of `compoundParts`. The backlog entry was never
updated to reflect this — a hygiene miss caught during the Phase 2 workbench no-op detection
work, when the Compound Part tool's `wouldChange` flag correctly identified adding ginger/rein/deer
as no-ops: the nucleus fallback already produces the pedagogically correct split for both words.

**Verified via recursive trace (Phase 2):**
- `gingerbread` → nuclei fallback: `gin|ger|bread`. If `ginger` were added, the compound path
  would recursively split `ginger` → `gin|ger`, then `bread` → `bread`. Identical result.
  `wouldChange: false` is correct.
- `reindeer` → nuclei fallback: `rein|deer` (`ei` + 3-char `eer` vowel team, VCCV split at `nd`).
  If `rein`+`deer` were both added, compound path gives same two segments. `wouldChange: false`.

**Residual action (none required):** the `expectedFailure` fixtures for both words were already
removed from `phonics-regression-fixtures.v2.yaml` during Phase 1 when they started passing.
Adding ginger/rein/deer to `compoundParts` via the workbench is safe (the tool will flag it as
a no-op) but produces no split change.
