# Phonics Constructs — Deferred Items Backlog

Living log of decisions deliberately postponed during Phase 1 fixture rationalization. Each item
states what was deferred, why, and what the immediate patch (if any) was, so none of this gets
lost between now and whenever it's picked up.

Update this file — don't let findings like these live only in chat history.

---

## OPEN — `-able` / `-ible` suffix-split undercounts true syllables by one

**Found during:** v2 corpus, Pass 3 (suffix-rule coverage).

**Issue:** every `always:true` rule in `tryStripSuffix` (`tion,sion,ment,ness,less,able,ible,ous,ful`)
splits the suffix off as exactly one segment. This is correct for most of them (`-tion`, `-ness`,
`-ment`, `-less`, `-ous`, `-ful` are genuinely one syllable), but `-able` and `-ible` are two
syllables each (a·ble, i·ble). Current behavior: `readable` → `read\|able` (2 segments). Correct
pedagogical target: `read\|a\|ble` (3).

**Not patched yet.** Options: (a) special-case `-able`/`-ible` to split into two further segments
rather than one, (b) leave as a documented simplification of the heuristic and accept the
undercount, (c) re-split the returned suffix segment through `identifyVowelNuclei` recursively
like any other stem. Needs a decision before the v2 fixture corpus can assert a final target for
`readable`/`visible` — currently pinned to the correct 3-syllable target with a note that the
splitter is expected to fail this until fixed.

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

## OPEN — `COMPOUND_PARTS` incomplete for `gingerbread` / `reindeer`

**Found during:** v1 fixture pass, carried into v2 unresolved. (Flagged twice in the fixture docs
but never actually logged here until now — exactly the kind of drift this file exists to prevent.)

**Issue:** `tryCompoundSplit` requires BOTH halves of a word to be ≥3-char entries in
`COMPOUND_PARTS`. `bread` is present, `ginger` is not → `gingerbread` cannot compound-split.
Neither `rein` nor `deer` is present → `reindeer` cannot compound-split either.

**Not patched.** These are listed in the regression corpus as fixtures with an `expectedFailure`
flag (see `phonics-regression-fixtures.v2.yaml`) rather than silently passing or silently being
dropped — the corpus should keep asserting the *correct* target split even while it's known to
fail, so this doesn't quietly disappear once Phase 1 is running clean. Revisit as part of the
general `COMPOUND_PARTS`/`ROOT_WORDS` completeness audit already noted as out-of-scope-for-now in
both fixture docs (§7 of v2).

---

## OPEN — Pattern fallback misidentifies `er` in VCV context (`several`, `general`, etc.)

**Found during:** Phase 1 review after all 323 tests were passing.

**Issue:** `identifyVowelNuclei` deliberately excludes 2-char r-controlled patterns (`ar`, `er`,
`ir`, `or`, `ur`) from its nucleus list — only `rControlled3` (3-char patterns like `ear`, `air`,
`oor`) are included. This is correct for most words: the bare `er` token is usually not itself a
vowel nucleus for syllable-boundary purposes. But in words like `several` (sev-er-al) or `general`
(gen-er-al), the `e` before the `r` and the `e` after are both detected as single-vowel nuclei,
and the VCV rule fires between them, producing `se|ve|ral` instead of `sev|er|al`.

**Immediate patch:** `several` fixture is now `expectedFailure: true` — the correct split
`[sev, er, al]` is asserted as the target even though the algorithm currently fails.

**Not yet patched.** Options:
(a) Extend the VCV condition to detect when the nucleus-preceding consonant is `r` AND there is
    another vowel nucleus immediately after — treat `Vr` + `V` as an `r`-controlled vowel team
    rather than two adjacent bare nuclei. Risk: this is essentially re-adding `er`/`ar`/etc. to
    the nucleus list for boundary purposes only, which was originally excluded for good reasons.
(b) Add `er`/`ar`/`or`/`ir`/`ur` back to `vowelNucleiList` but only for the purposes of
    `identifyVowelNuclei`, not for vowelTeam pattern matching. Risk: changes syllable-boundary
    results for `every` (should compound-split, but if `er` is a nucleus, `ev|ery`?) — needs
    careful audit against the full corpus before touching.
(c) Curated exception list: add `several`, `general`, `federal`, `liberal`, etc. as explicit
    exceptions with pre-computed splits. Low risk, limited scope, misses long tail.

**Related words:** `general`, `federal`, `camera`, `liberal`, `mineral` — any word where a bare
`er`/`ar`/`or` appears between two vowels in an unstressed medial syllable.

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
would not change the split output (same result via compound path), but the tool now provides
the safe workflow to make those additions if desired. See the "COMPOUND_PARTS incomplete"
entry above for the open tracking item.

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
