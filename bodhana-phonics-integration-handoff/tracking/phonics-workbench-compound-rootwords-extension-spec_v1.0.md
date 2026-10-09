Constructs Workbench — compoundParts / rootWords Extension

Target consumer: IDE build agent. What this is: extending the Constructs Workbench's safe-enrichment workflow to cover compoundParts and rootWords, closing the backlog item logged during Phase 2 review ("Constructs Workbench patch mechanism doesn't cover compoundParts/rootWords"). This directly enables fixing the open gingerbread/reindeer backlog item through the tool, rather than by hand-editing the YAML with no safety net. Depends on: the Phase 2 Workbench exactly as currently shipped and approved, including the computeBlastRadius tokenization fix and the nowPassing/expectedFailure regression-diff logic — both reused here, not reimplemented. Spec version: 1.0.0

0. Scope boundary, restated from the backlog entry

compoundParts and rootWords get this treatment because they're flat lists requiring per-word judgment — the same shape of risk vowelTeamExceptions had. blends, digraphs, trigraphs, clusters3, and floss are not in scope — they're category-membership lists with no per-word nuance, and nothing about this extension should touch them.

1. Mode selector — additive, existing vowel-sound flow unchanged

Add a mode choice at the start of the workflow (Step 1, after files load, or as a new Step 1.5): "What do you want to fix?" — Vowel Sound (existing flow, byte-for-byte unchanged) / Compound Part / Root Word. The sidebar's 8-step list adapts its labels slightly per mode (e.g. "Target" step becomes "Target a word" for the new modes, since there's no pattern concept), but the step count and the hard-gate structure (validator → regression diff → blast-radius diff → merge) stay identical across all three modes.

Do not duplicate the step-rendering scaffolding three times. The existing RENDERERS/ WIRERS dispatch table and card()/ok()/err()/info() helpers are mode-agnostic already — extend the step functions to branch on S.mode internally, or parameterize them, rather than writing three parallel copies of renderStep2/renderStep3/etc.

2. Step 2 (Target) — per mode
2.1 Compound Part mode

User enters a word, not a bare fragment (e.g. gingerbread, not ginger) — this mirrors the existing word-first flow in Vowel Sound mode.

Run the real tryCompoundSplit (imported from src/phonics/core/syllables.mjs — do not reimplement) against the entered word, using the current compoundPartsSet.
If it already splits successfully: show the actual split and which two entries matched. Offer a "this is already correct, nothing to target" state rather than forcing a target.
If it fails: enumerate every candidate split point the real algorithm's loop bounds would consider (right half ≥ 2 chars, left half ≥ 3 chars, same bounds as the shipped tryCompoundSplit), and for each candidate pair, show whether each half is currently in compoundPartsSet. This is what makes the missing half visible — e.g. for gingerbread: ginger (not in list) / bread (in list) at the i=6 split point.
User picks a candidate half to target (e.g. ginger) → proceeds to Step 3.
2.2 Root Word mode

User enters a word suspected of mis-stripping (e.g. a word that incorrectly undoubles, or fails to undouble when it should).

Run the real tryStripSuffix (same module, same import rule) against the word using every rule in suffixStripRules and the current rootWordsSet.
Show which rule matched (if any), the resulting stem, whether undoubling fired, and — if undoubling was blocked specifically because the candidate root wasn't in rootWordsSet — surface that candidate root explicitly as the thing to target.
User confirms the candidate root word → proceeds to Step 3.

Both modes must use the real algorithm to compute candidates, not substring matching. This is not a stylistic preference — it's a direct correction of the exact bug just fixed in Vowel Sound mode's blast radius (bear/beard falsely matching ea via substring containment). Do not reintroduce that failure mode here under a different name.

3. Step 3 (Blast Radius) — per mode
3.1 Compound Part mode

For the targeted candidate (e.g. ginger), scan the full loaded word pool (fixture corpus's tokenizer, syllableSplit, and vowelTeamSounds word lists combined, deduplicated — the broadest available word set, same principle as the original blast radius casting as wide a net as the data allows) for every word where the real tryCompoundSplit algorithm's loop would actually consider ginger as a valid half (respecting the same ≥3/≥2 character bounds). For each match, show:

The word's current split result (using the real splitSyllables, unmodified).
Whether adding/removing the candidate would change that result — compute this by running splitSyllables again against a sandboxed compoundPartsSet with the candidate toggled, exactly mirroring how the existing vowel-sound blast radius pattern works.
3.2 Root Word mode

For the targeted candidate root (e.g. a stem), scan the full word pool for every word ending in any suffixStripRules suffix whose stripped-and-undoubled stem would equal the candidate, and show the same current-result / would-change comparison.

4. Patch schema — simpler than vowelTeamExceptions, by necessity

compoundParts and rootWords are flat string arrays with no per-entry sound/note structure. There is no "modify" operation — a string either is or isn't in the list.

yaml
patch:
  add:
    - ginger
  remove:
    - someOldEntry

Forbidden-key enforcement, mode-scoped: when in Compound Part mode, the patch may only target compoundParts — any patch structure resembling vowelTeamExceptions rows (objects with word/pattern/sound), or any attempt to touch rootWords or any other section, is rejected immediately, same synchronous-before-sandbox rejection timing as the existing FORBIDDEN_KEYS check. Same rule, mirrored, for Root Word mode. Reuse the existing validatePatchSchema structure/pattern rather than writing an unrelated second validator — extend it to accept a mode parameter that selects which schema applies.

Validation on apply: reuse the existing Phase 1 structural hard-fails verbatim — compoundParts entries must be ≥2 characters, rootWords entries must be ≥3 characters, hard-fail (never silently drop), exactly as checkStructure already enforces. Do not write a second length check in the Workbench — call the real validator.

5. Regression diff — new function, same shape as the existing one

runRegressionDiff is scoped to vowelTeamSounds fixtures and sound comparison. Add a sibling, runSyllableRegressionDiff(oldCompiled, newCompiled, fixturesObj), that re-runs every syllableSplit fixture through the real splitSyllables against both the old and new compiled objects and returns rows where the resulting array differs.

Reuse the nowPassing/expectedFailure logic exactly as already built, not reinvented. A syllableSplit fixture that was expectedFailure: true and now matches its documented target split must surface as "known-failure now passing," excluded from the merge-blocking unexpectedChanges set — same rule, same reasoning, as the fix already shipped for runRegressionDiff. This is directly relevant here: gingerbread and reindeer are already expectedFailure: true fixtures in the real corpus for exactly this reason, so fixing them via this extension is the first real-world case this logic will exercise outside its own test suite.

Step 7's review screen gets a second diff table (syllable-split fixtures) alongside whichever mode is active, using the same hard-gate rendering already built — no new visual language.

6. CHANGELOG format — adapted, not reinvented

No sound column exists for these entries. Adapt buildChangelogEntries (or add a sibling function) to the shape: | word | list | action | date | reason | — e.g. | ginger | compoundParts | added | 2026-10-09 | enables gingerbread compound-split |. Keep the append-only behavior, the same markdown-table-row format, and the same |-character escaping on free-text reasons already in place.

7. Build/bundle updates

src/phonics/core/syllables.mjs (for tryCompoundSplit, tryStripSuffix, splitSyllables) must be added to both app.js's real imports and build-standalone.mjs's bundled-file list, following the exact pattern already established when tokenize.mjs was added for the earlier bug fix. Confirm the rebuilt workbench-standalone.html's byte size increases (same kind of corroborating evidence used last time) and that node tools/constructs-workbench/build-standalone.mjs runs clean.

8. Acceptance criteria
Mode selector presents all three modes; Vowel Sound mode is provably byte-for-byte unchanged in behavior (existing vitest/Playwright suites for that mode pass without modification).
Compound Part mode, targeting ginger on a corpus containing gingerbread: Step 2 correctly identifies ginger as the missing half via the real algorithm (not substring matching); Step 3's blast radius includes gingerbread with its current (pre-patch) split shown.
Submitting the patch { add: [ginger] } in Compound Part mode, running the sandbox, and reaching Step 7 shows gingerbread's syllableSplit fixture transitioning from expectedFailure to nowPassing — not flagged as an unexpected regression — and the merge gate is open.
The same end-to-end flow closes the reindeer case (rein/deer, whichever is missing — confirm against the real compoundParts list which one actually is).
A patch in Compound Part mode containing a vowelTeamExceptions-shaped row, or targeting rootWords, is rejected immediately, before any sandbox computation — same timing guarantee as the existing vowel-sound forbidden-key check.
Root Word mode's candidate-detection uses the real tryStripSuffix, verified by a case parallel to the slimmer/slim fix from Phase 1 — construct a test case with a deliberately missing root and confirm Step 2 surfaces exactly that missing root.
checkStructure's existing length hard-fails (≥2 for compoundParts, ≥3 for rootWords) block a patch adding a too-short entry, surfaced through the same Step 7 validator hard-gate.
CHANGELOG entries for this mode use the adapted format and remain append-only.
Full test suite (vitest + Playwright, current baseline 771 + 85) passes with new mode-specific tests added, not replacing any existing test.
build-standalone.mjs successfully bundles the newly-required syllables.mjs; the rebuilt file's byte size is reported and shown to have increased from the pre-extension baseline.
9. Evidence standard — unchanged from every prior round

Literal code, literal test output, literal command output. A description of what a function does is not evidence that it does it. Collect into git_diff.txt as before.

10. Explicitly out of scope
Any change to blends/digraphs/trigraphs/clusters3/floss tooling.
Any change to the Vowel Sound mode's existing behavior, schema, or UI beyond what's needed to coexist with the new mode selector.
Resolving the checkExceptionTableSelfConsistency substring-weakness finding flagged during the Phase 2 bug-fix round — that remains its own separate, deliberately deferred item.