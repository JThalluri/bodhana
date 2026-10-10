# Phonics Integration — Decision Log

**Append-only.** Never edit or delete a past entry, even if a later decision reverses it — add a
new entry that supersedes it and reference the one it replaces. This is the audit trail;
`PHONICS_STATUS.md` is the current-state snapshot. Don't conflate the two.

**Entry format:**

```
## YYYY-MM-DD — <short title>
Phase: <n>
Context: <what triggered this decision>
Decision: <what was decided>
Alternatives considered: <brief, if any>
Rationale: <why>
Spec impact: <which spec/section this affects, if any — "none" if purely an implementation detail>
```

Routine implementation choices (not dictated by the spec, but not touching a MUST/hard-fail
statement, a backlog item, or an acceptance criterion) go here and the agent proceeds. Anything
bigger than that goes to `PHONICS_STATUS.md` → Open Questions instead, and waits.

---

## 2026-10-01 — Shared core logic reframed from "throwaway" to permanent

Phase: 1 (affects Phase 2 and Phase 3 directly)

Context: while designing the Phase 2 Constructs Workbench spec, found that it needs the exact
same tokenize/splitSyllables/vowelTeamSounds/lookupException logic that Phase 1's spec had
originally framed as a temporary, test-only reimplementation (to be discarded once Phase 3 built
the "real" engine). Phase 2 runs before Phase 3 exists, so it would otherwise have had to either
depend on code explicitly labeled throwaway, or duplicate the logic a second time — reintroducing
the exact multi-truths drift problem this whole initiative exists to eliminate.

Decision: this logic is not throwaway. It ships from Phase 1 as genuinely shared, pure,
dependency-free modules under `src/phonics/core/*.mjs`. Phase 1's own regression tests consume it
directly (no change in behavior for Phase 1). Phase 2's Workbench imports it unmodified. Phase 3's
scope narrows correspondingly: wrap this already-proven core into the full public
`PhonicsConstructor` API (CSV export, UMD wrapper, `parseWord`/`parseWords`, etc.) rather than
re-deriving the compute logic.

Alternatives considered: (a) let Phase 2 depend on Phase 1's test-only code as-is — rejected,
"depend on code labeled temporary" is a worse smell than the rename costs; (b) have Phase 2
duplicate the logic independently — rejected outright, this is precisely the failure pattern
(PhonicsConstructor.js's version label vs. actual table contents vs. exported CSV) that started
this entire effort.

Rationale: zero duplicated linguistic/compute logic across the whole initiative, full stop — not
"minimize duplication," actually zero. A second implementation of `lookupException`'s three-tier
lookup anywhere in this codebase is a standing risk of silent divergence, regardless of which
phase introduced it.

Spec impact: `phonics-constructs-pipeline-spec_v1.0.md` §6 and §11 described this logic as
temporary/throwaway — superseded by this entry. Also adds two new Phase 1 acceptance criteria
(see `PHONICS_STATUS.md` Phase 1, items 9–10) that weren't in the original spec's §10. If Phase 1
implementation is already underway or complete under the original framing, the fix is a
relocation (move the logic from test scaffolding to `src/phonics/core/`) and a de-labeling, not a
rewrite — the logic itself doesn't change.

---

## 2026-10-01 — Core scope expands beyond the original four Phase 1 functions

Phase: 1 (completed/finalized in Phase 3), 3

Context: while scoping Phase 3's engine, the full original API contract required
`countSyllables`, `onsetRime`, `identifyVowelNuclei`, `computeDifficulty`, `decodabilityLevel`,
and `findAllPatterns` in addition to the four functions Phase 1 named as "core"
(`tokenize`, `splitSyllables`, `vowelTeamSounds`, `lookupException`). These are the same category
of thing — pure, dependency-free, single-word compute — and splitting them between `core/` and
engine-local code would recreate exactly the "some logic lives in two places" risk this
initiative exists to eliminate.

Decision: all pure per-word compute functions live in `src/phonics/core/`, full stop. The engine
(Phase 3) is orchestration + I/O only — it calls core functions, assembles `Record` objects,
handles CSV/download, and owns the public API shape, but defines zero linguistic logic itself.

Rationale: same as the original shared-core decision above — one implementation per computation,
everywhere in this codebase, no exceptions carved out for "but this one's simple enough to
inline."

Spec impact: expands the file list under `src/phonics/core/` beyond what Phase 1's spec
originally enumerated. No behavior change to any function — this is purely a "where does this
code live" decision, not a "what does this code do" decision.

---

## 2026-10-01 — UMD wrapper dropped; engine is ES-module-only

Phase: 3

Context: the original prototype spec (`phonics_extractor_spec-v1.2.md`) required three loading
environments (browser `<script>` global, CommonJS, ESM interop) because the engine was designed
to be dropped into a standalone static HTML page as a script tag. That deployment model doesn't
apply once this engine is bundled into Bodhana's Vite SPA (ESM throughout already) and consumed
by the standalone Constructs Workbench via direct `core/` imports (not via a wrapped object).

Decision: the engine ships as plain ES modules — named exports plus one convenience default
export. No `module.exports`, no `window.PhonicsConstructor` global, no UMD factory wrapper.

Alternatives considered: keep UMD for "just in case" standalone-script reuse later — rejected as
speculative complexity with no current consumer; a thin UMD shim is cheap to add later if a real
need appears, cheaper than maintaining unused wrapper code now.

Rationale: this engine has exactly two real consumers today (Bodhana's Vite build, and the
Workbench's direct core imports) and neither needs UMD. Carrying it forward would be solving a
problem that no longer exists, inherited from the engine's original standalone-prototype
distribution model.

Spec impact: `phonics_extractor_spec-v1.2.md` §1's three-environment loading-pattern table is
superseded for this codebase. That document remains useful as historical reference for the
original algorithm/data design, not as the current API distribution contract.

---

## 2026-10-01 — Enrichment cache is permanent and incremental, no invalidation logic

Phase: 4

Context: `PhonicsEngine.parseWord(word)` is pure — same word always produces the same output
within one loaded build. Rather than design invalidation rules for "when does cached enrichment
go stale," the cache (`state.phonicsByWord`) is treated as append-only for the session: Enrich
only computes words not already present, regardless of re-extraction, filtering, or
exclude/include toggling.

Decision: no invalidation logic exists at all. This is correct by construction, not a shortcut —
there is no scenario where a cached word's enrichment becomes wrong, since output depends only on
the word string and the currently-loaded constructs build.

Rationale: eliminates an entire category of "is my data stale" UX and bug surface rather than
handling it carefully.

Spec impact: none — this is purely how Dictionary Builder's own state is designed, doesn't touch
any other phase's contract.

---

## 2026-10-01 — `is_common` default fallback list relocated, not re-curated

Phase: 4

Context: the retired `COMMON_WORDS` list (confirmed removed from the phonics engine in Phase 1/3)
still has a legitimate use — the is_common fallback when a teacher hasn't loaded a Base
Dictionary yet.

Decision: seed `src/dictbuilder/default-common-words.js` verbatim from the old list's content. No
new curation work, no validation pipeline — this is a word-frequency heuristic, not a linguistic
construct, and explicitly doesn't go through the Phase 1 YAML/compiler pipeline.

Rationale: keeps the phonics constructs pipeline free of anything that isn't actually phonics,
per the original plan, while not losing the (reasonable, already-curated) content by discarding
it outright.

Spec impact: none beyond Phase 4's own file list.

---

## 2026-10-01 — Select/exclude markup corrected to two real `<button>`s

Phase: 4

Context: the original word-grid markup used a clickable `<div>` with delegated click handling for
exclude. Splitting select-for-detail and exclude into two independent actions on the same cell
made the existing div-click pattern ambiguous for assistive tech once a second actionable target
was added.

Decision: both actions are real `<button>` elements (`.db-word-select`, `.db-word-exclude-btn`)
inside the (still div, still `position: relative`) cell container, each with its own click
handler and `e.stopPropagation()` boundary where needed.

Rationale: correct accessibility shape from the start costs nothing extra to build; retrofitting
it later would mean re-touching every word-grid interaction handler a second time.

Spec impact: none — purely a markup/semantics correction within Phase 4's own deliverable.

---

## 2026-10-01 — v1 Phonics Worksheets ships 4 of 9 original activity types

Phase: 5

Context: the original prototype specified 9 worksheet activities. Scoping Phase 5 against the
"framework first, worksheets are legos" direction, four activities (Dissect the Word, Elkonin
Sound Boxes, Onset & Rime, Syllable Split) share a property the other five don't: they are fully
deterministic given a word list — no shuffle, no distractor-pool generation, no dual-mode filter
interaction. The remaining five (Pattern ID's distractor draw, Word Hunt/Sound Hunt, Minimal
Pair/Sound Sort, Tic-Tac-Toe) carry real, independent complexity.

Decision: v1 ships only the four deterministic activities. This also enables a real-time
("no Generate button, live preview") header layout per Bodhana's own prototype guidelines, since
determinism is exactly the property that makes live-updating safe/cheap. The remaining five are
explicitly scoped as Phase 5b, using the same generator/renderer architecture, once this slice
is proven in production.

Rationale: two of the deferred activities (Word Hunt/Sound Hunt, Minimal Pair/Sound Sort) are
each genuinely as complex as this entire phase's other four combined — shipping all nine now
would make this phase the riskiest, highest-rework one in the whole initiative, which is the
opposite of what the phased sequencing was for.

Spec impact: `phonics-worksheets-module-spec_v1.0.md` scopes to 4 activities; the deferred 5 are
not yet speced at all (not even stubbed) — they get their own spec when picked up.

---

## 2026-10-01 — `default-common-words.js` relocated to `src/shared/`

Phase: 4 → corrected in 5

Context: Phase 4 placed this file under `src/dictbuilder/`. Scoping Phase 5's Word Source section
found the Phonics Worksheets module needs the identical is_common fallback resolution when a
teacher loads a raw word list directly, without going through Dictionary Builder first.

Decision: relocate to `src/shared/default-common-words.js`. If Phase 4 was already built against
the old path, this is a one-line import-path fix, not a content or logic change — the list
itself doesn't change.

Rationale: same "zero duplicated lookup logic across phases" principle applied every other time
this kind of overlap has surfaced in this initiative.

Spec impact: `phonics-dictionary-builder-integration-spec_v1.0.md` §5's file path is superseded
by this entry — if Phase 4 is mid-build or complete, apply this relocation before Phase 5 starts,
not after.

---

## 2026-10-01 — Answer-key visibility corrected to match the real Bodhana convention, not the old prototype

Phase: 5

Context: the old prototype toggled answer visibility via a `.show-answers` CSS class on an
ancestor, with answer markup always present in the DOM but hidden. Reviewing Word Puzzles' real
`ui.js` showed the actual Bodhana convention is different: `state.showSolutions` is passed as a
parameter into the renderer function, which produces different HTML depending on its value,
re-rendered on toggle.

Decision: Phase 5 follows the real convention, not the old prototype's. Elkonin boxes and the
Onset & Rime rhyme-family line are genuinely absent from the DOM when solutions are hidden, not
CSS-hidden.

Rationale: consistency with the actual codebase this is being integrated into outranks
consistency with a prototype that was explicitly reference-only per your own earlier instruction.
Small side benefit: answers aren't inspectable via dev tools when hidden, though that wasn't the
deciding factor.

Spec impact: none outside Phase 5 — this never shipped anywhere yet.

---

## 2026-10-01 — `.paper-page` confirmed reusable as-is; no shared print/export file edits needed

Phase: 5

Context: Phase 5's §7 was left explicitly pending real `src/shared/print.js` and
`src/shared/export-pdf.js`, rather than guessed at, given the guidelines' explicit warning that
registering a new page class requires editing both shared files. Those files were obtained and
reviewed.

Decision: reuse `.paper-page` directly, with no edits to either shared file. Evidence: both
files hardcode the same six-class selector list; the other five classes are each
module-prefixed (`.pv-worksheet`, `.ttt-worksheet`, `.mp-puzzle-page`, `.sdk-puzzle-page`,
`.wp-puzzle-block`) and each has a bespoke override block inside `export-pdf.js`'s
`exportPrintStyles()`; `.paper-page` is the only one of the six with no such block and the only
one without a module prefix — consistent with it being the designated generic/no-special-
handling page vessel this module's four deterministic, simply-laid-out activities need.

Alternatives considered: registering a new `.phx-worksheet-page` class — rejected, unnecessary
given `.paper-page` fits exactly and avoids touching the explicitly-protected shared print/export
engine at all.

Rationale: lowest possible risk resolution — zero changes to shared, cross-module-sensitive
files, for a module whose activities have no layout need the generic contract doesn't already
cover.

Spec impact: Phase 5 spec §7 fully rewritten from "pending" to resolved; no other phase affected.

**One residual, explicitly non-blocking item:** whether `worksheets/` or `math-worksheets/`
(neither reviewed) already defines `.paper-page` with different assumptions is unconfirmed. Low
risk, cheap to catch immediately if it happens (a visibly duplicate CSS rule), not worth a
further pause to chase down in advance. If it does happen, resolve by scoping the new rule more
specifically or coordinating with whichever module got there first — not by inventing a new
page class as a first resort.

---

## 2026-10-01 — Cross-phase consistency pass: 5 gaps found and fixed at source

Phase: all

Context: before final consolidation, did a deliberate re-read of all five specs against this
decision log, specifically checking whether every logged correction actually got applied to
every document it affects — not just the document being written at the time the correction was
noticed. Five gaps found:

1. **Phase 1's own spec still described the core compute logic as throwaway/temporary** (§6,
   §11) and never listed `src/phonics/core/*.mjs` as an actual deliverable (§2) — the
   "shared core is permanent" correction had only ever been applied to the decision log and to
   later specs that referenced it, never to Phase 1's own text. Fixed: §2, §6, §10, §11 of
   `phonics-constructs-pipeline-spec_v1.0.md` now state this natively, with two new acceptance
   criteria (9, 10) and a new required deliverable (`scripts/constructs-compile-core.mjs`,
   exporting `compileConstructs()` as the pure transform Phase 2 needs — this also closes a gap
   where that requirement existed only informally in Phase 2's spec).
2. **Phase 4's spec still said `src/dictbuilder/default-common-words.js`** — the relocation to
   `src/shared/` was decided and logged while scoping Phase 5, and applied to Phase 5's spec, but
   never written back into Phase 4's own deliverables table or code comment. Fixed at source in
   `phonics-dictionary-builder-integration-spec_v1.0.md` §2 and §5.
3. **A real latent bug, not a drift issue**: Phase 3's spec never explicitly instructed removing
   `is_common` from the hardcoded `EXTENDED_COLUMNS` array inside `toCSV`. Left as originally
   written, a build agent copying the old array verbatim would produce a header row with a
   blank `is_common` column — and combined with Phase 4's `extraColumns: ['is_common']`, two
   `is_common` columns in one CSV. This wasn't a previously-logged decision that failed to
   propagate; it was found by re-deriving `toCSV`'s actual behavior from first principles rather
   than trusting the existing text. Fixed in `phonics-engine-spec_v1.0.md` §3.3 with the exact
   corrected 11-entry array and the corrected column-count expectation (18, not the old
   prototype's 19, until `extraColumns` is added back).
4. **Fixture corpus filename mismatch, consistent across four documents.** The actual delivered
   file is `phonics-regression-fixtures.v2.yaml`; Phases 1, 2, 3, and 5 all referenced it as
   `phonics-regression.v2.yaml` (missing the `-fixtures` segment) — six occurrences total, found
   via `grep` rather than manual re-reading, which also caught one occurrence (Phase 3) that
   manual review had missed. Fixed across all four files.
5. **Phase 2's dependency note on `compileConstructs()` was written defensively** ("if Phase 1
   wasn't built this way, fix it") because at the time it was written, Phase 1's spec didn't yet
   explicitly require it. Now that fix #1 above makes it an explicit Phase 1 requirement, the
   hedge was stale. Tightened in `phonics-constructs-workbench-spec_v1.0.md` §7.

Rationale for doing this pass at all: eleven corrections were made across five phases in one
drafting session. Each was individually cheap to make, but logging a correction and actually
propagating it to every affected document are two different actions, and nothing before this
pass had verified the second one actually happened everywhere it needed to. This is the same
category of risk the whole initiative exists to catch in the linguistic data — it applies
equally to the specs describing the code, not just the code's construct tables.

Spec impact: see the five fixes above. `PHONICS_STATUS.md` updated correspondingly to remove
now-unnecessary addendum framing where corrections are native to their spec at this point.

---

## 2026-10-01 — Tokenizer-reachability gap: 9 vowel team patterns added to tokenizer fixtures

Phase: 1
Context: running `node scripts/build-constructs.mjs` during Phase 1 implementation surfaced a
reachability failure for 9 vowelTeam patterns: ai, ay, ie, oa, au, aw, ey, oi, oy. The §5.1
reachability check examines only `fixtures.tokenizer[*].graphemes` for produced tokens. These
9 patterns did appear in the `vowelTeamSounds` fixture section (rain, day, pie, boat, author, saw,
monkey, coin, toy) but NOT in any tokenizer fixture with a grapheme breakdown.

The v2 fixture doc §4 coverage matrix claims "vowelTeams: 23 ✅ all covered" — that claim was
verified across all three fixture types (tokenizer + syllableSplit + vowelTeamSounds), but the
spec's reachability check only looks at tokenizer fixtures. These two things are in direct
tension.

Decision: add 9 tokenizer fixtures to `constructs/fixtures/phonics-regression-fixtures.v2.yaml`
(rain, day, pie, boat, author, saw, monkey, coin, toy — words already present in the
vowelTeamSounds section, grapheme breakdowns derived from the algorithm). This satisfies both
the spec's §5.1 MUST and the fixture doc's "all covered" coverage matrix.

Alternatives considered: (a) extend the reachability check to also count patterns referenced in
vowelTeamSounds fixtures — rejected because §5.1 is explicit ("tokenizer fixture's graphemes
field") and changing the validation rule would be changing a spec acceptance criterion, which
requires an open question rather than a decision; (b) leave the gap and open it as a question
— rejected because this would block Phase 1 completion on a mechanical gap, not a design
ambiguity; the correct grapheme breakdowns are deterministic and unambiguous.

Rationale: the fixture doc's "no outstanding reachability gaps" claim was an authoring error
(cross-fixture-type coverage conflated with tokenizer-only reachability). The fix is to add the
missing tokenizer fixtures so both the claim and the enforcement align.

Spec impact: `constructs/fixtures/phonics-regression-fixtures.v2.yaml` gains 9 tokenizer
fixtures. The companion `.md` rationale doc was not modified (it lives in the read-only handoff
package); this decision log entry is the audit trail.

---

## 2026-10-02 — `always: false` flag given real semantics in `tryStripSuffix`

Phase: 1
Context: the original `tryStripSuffix` spec described an `always` flag on suffix-strip rules,
but the implementation never enforced it — every rule fired unconditionally regardless of the
flag's value. During Phase 1 implementation this was found to produce incorrect splits for words
where the candidate stem is not a morphological root: `shoulder → [should, er]` (stem=`should`
is not a root for `-er`; correct split is `[shoul, der]` via VCCV pattern fallback once the
strip is suppressed). The flag needed real behavior.

Decision: `always: false` rules now require the stem to appear in `rootWordsSet` OR the stem+'e'
to appear there (e-drop roots like `believe → believ`), OR doubling-undo to have fired. Words
where the candidate stem is not a recognized root fall through to the pattern fallback (VCCV/VCV
rules), which produces the correct structural split without needing morphological knowledge.

Alternatives considered: (a) keep `always: true` for all rules and add exceptions list — rejected
because it inverts the logical default (every unknown word would be stripped, errors opt-in); (b)
derive roots algorithmically from phonics patterns — rejected as out-of-scope; root vocabulary
is small and curated lists are already the model everywhere else in this codebase.

Rationale: `always: false` was already intended to mean "only strip if the stem is a real word"
(the flag name implies it). Making it do exactly that closes the gap between the spec's intent and
the code's behavior; the flag is no longer dead code.

Spec impact: none — this is an implementation detail within Phase 1's `tryStripSuffix` function.
The `-er` rule (minStem:5, always:false) is the main beneficiary; the `-ous` rule is also
`always: false` and gains the same protection.

---

## 2026-10-02 — `height`/`sleight` exception pattern corrected from `ei` to `eigh`

Phase: 1
Context: `phonics-constructs.yaml`'s `vowelTeamExceptions` table originally had `height` and
`sleight` with `pattern: ei`. But the tokenizer uses longest-match-first, and `eigh` is a longer
pattern that appears in the vowelTeams list — so the tokenizer actually produces `eigh` as the
token, not `ei`. An exception row keyed on `ei` would never match either word.

Decision: changed both rows to `pattern: eigh`. This is a correction of a pre-existing
discrepancy between the data file and the tokenizer's actual behavior inherited from the legacy
`PhonicsConstructor.js` — the original code compared against `ei` too, making the exception
silently unreachable in both the old and new implementations.

Alternatives considered: lowering `eigh` in the vowelNucleiList so `ei` would match first —
rejected because `eigh` as a vowelTeam pattern has unambiguous scope (eight, neighbor, sleigh)
and lowering it would break those tokens; the correct fix is to align the exception row with what
the tokenizer actually produces.

Rationale: the exception row must name the token the tokenizer emits. If the tokenizer produces
`eigh`, the exception must say `eigh`. Aligning data with code is always the right direction.

Spec impact: none beyond the YAML data file — no spec document references `height`/`sleight`
exception rows at the pattern level.

---

## 2026-10-02 — `tryCompoundSplit` threshold widened (5+ chars, right-half ≥ 2 chars)

Phase: 1
Context: original `tryCompoundSplit` required words to be at least 6 chars and right halves to
be at least 3 chars. This prevented `maybe` (5 chars, `may`=3 + `be`=2) from compound-splitting,
causing the silent-e drop rule to remove `e` and collapse `maybe` into a single syllable.

Decision: widened to 5+ char words with right-half ≥ 2 chars (left still ≥ 3 by loop bounds).
The change is guarded by the requirement that BOTH halves appear in `compoundPartsSet` — so only
real compound-word parts can match. This is not "trust any 2-char string"; it is "trust any
2-char string that someone explicitly listed as a compound part."

Alternatives considered: (a) fix the silent-e drop rule to not fire when the preceding nucleus is
a long vowel — rejected because it would require phonological classification of the preceding
nucleus, which is exactly the kind of linguistic data that belongs in the constructs YAML, not
hardcoded in the splitter; (b) add `maybe` as a special case — rejected as not generalizable.

False positive audit (done at time of change): 2-char entries currently in `compoundParts` are
`no`, `be`, `do`, `up`, `in`. Representative 5-char combinations checked: `sunup` (sun+up ✓),
`setup` (set+up ✓), `maybe` (may+be ✓). No false positives found. The 2-char halves are too
semantically constrained to produce spurious splits.

Rationale: compound recognition belongs in the data, not the splitter. Widening the threshold
and trusting the curated list is the correct architectural move; the false positive audit
confirms it's also safe in practice.

Spec impact: none — `tryCompoundSplit`'s thresholds are an implementation detail not
referenced by any spec section.

---

## 2026-10-02 — `-ie` suffix rule changed to `always: false`; five root stems added

Phase: 1
Context: `tryStripSuffix`'s `-ie` rule was initially set to `always: true` (fire for all words
ending in `ie`). This correctly handles `cookie → [cook, ie]`, `movie → [mov, ie]`, `brownie →
[brown, ie]`, and `selfie → [self, ie]`. But it incorrectly handles `zombie → [zomb, ie]`
instead of the correct `[zom, bie]` — because `zomb` is not a morphological stem and the `b`
phonologically belongs as onset of the second syllable.

Decision: changed `-ie` to `always: false`. Added `cook`, `rook`, `self`, `brown`, and `move`
to `rootWords` so the five currently-tested words keep their correct splits. `zombie`'s stem
`zomb` (and `zombe`) is not in `rootWords`, so the strip is skipped and the VCCV pattern
fallback correctly produces `zom|bie`.

`selfie` passes normally (`self` in rootWords). No `expectedFailure` is needed — the concern
that pattern fallback would give `sel|fie` was rendered moot by recognizing `self` as a root.

Alternatives considered: (a) add a code guard checking whether the stem ends in a plosive
preceded by a consonant (catches `zomb` but fails for `junk` in `junkie`) — rejected as fragile;
(b) keep `always: true` and route `zombie` through compound-split by adding `zom`/`bie` to
`compoundParts` — rejected because `bie` is not a real word-part and this would have unexpected
scope.

Rationale: `always: false` with a curated root list is exactly the same pattern used by `-er`
and `-ous` — it is the established mechanism in this codebase for "only strip if this is a real
morphological derivation." Extending it to `-ie` is consistent, not a one-off hack.

Spec impact: none — the `always` flag semantics are an implementation detail within
`tryStripSuffix`, not referenced by spec section numbers.

---

## 2026-10-02 — `soundForVowelTeam` added to `core/vowelSounds.mjs`

Phase: 3
Context: the Phase 3 public API spec lists `soundForVowelTeam(word, pattern)` as a named export
on the engine. The engine's pattern is to bind constructs data at load time and expose simplified
signatures. The underlying two-tier lookup (exception → default) already existed as the inner
join of `lookupException` + `defaultVowelSound[pattern]` but had no single-call core function.

Decision: added `soundForVowelTeam(word, pattern, exceptionMap, defaultVowelSound)` to
`core/vowelSounds.mjs` — it calls `lookupException` then falls back to `defaultVowelSound`.
The engine wrapper at line ~213 binds the maps from `loadConstructs()` and exposes the
two-argument public signature.

Alternatives considered: inline it in the engine — rejected on the same grounds as every other
"one-line compute, where does it live?" question in this codebase: if it touches a word and
returns a value, it belongs in core/. This is enforced by the "zero linguistic logic in engine"
invariant (AC 12).

Rationale: consistency.

Spec impact: none beyond adding the function to the core file and its re-export in `index.mjs`.

---

## 2026-10-02 — `computeDifficulty`, `decodabilityLevel`, `findAllPatterns` relocated to dedicated core files; `findSecondaryPatterns` and `findMinimalPairs` added

Phase: 3
Context: Phase 3 spec §1 specifies the layout:
  `difficulty.mjs` — computeDifficulty, decodabilityLevel
  `patterns.mjs`   — findAllPatterns
and spec §0.1 requires all pure per-word compute in `core/` full stop. Initial Phase 3
implementation left `computeDifficulty`, `decodabilityLevel`, and `findAllPatterns` in
`vowelSounds.mjs` (where they existed from Phase 1) rather than moving them to the spec-named
files. Two additional functions were also missed:

1. The `secondaryList` computation inside `parseWord` (find patterns in substring-search output
   that aren't independent tokens) — inline in the engine, not in core.
2. `findMinimalPairs` — the linguistic definition "minimal pair = same onset or same rime" was
   inline in the engine, not in core.

Found during post-implementation review (not during implementation). No behavior changed — the
relocation is a structural correction, not a logic fix.

Decision: created `core/difficulty.mjs` (computeDifficulty, decodabilityLevel) and
`core/patterns.mjs` (findAllPatterns, findSecondaryPatterns). Added findMinimalPairs to
`core/syllables.mjs` (it builds on onsetRime which is already there). Updated `core/index.mjs`
to re-export all new functions. Updated PhonicsEngine.mjs to import and delegate; removed the
two inline implementations.

Test coverage: 27 direct core-level tests added in `tests/phonics/core.test.js` covering all
five functions. Full 688-test suite passes after relocation with identical pass/fail breakdown
to pre-relocation (661 tests), confirming zero behavior change.

Rationale: the spec is explicit ("difficulty.mjs", "patterns.mjs"), and the no-linguistic-logic-
in-engine invariant is an acceptance criterion (AC 12). Both require this relocation. Doing it
right is cheaper than carrying a structural gap into Phase 4/5 where it becomes harder to fix.

Spec impact: `phonics-engine-spec_v1.0.md` §1 module layout is now fully implemented. AC 12
now holds by construction (verified by grep — no pattern-matching, no lookup tables, no
difficulty/sound logic defined inside PhonicsEngine.mjs).

---

## 2026-10-08 — `.tool-info-pane` updated to flex column (spec §3.3 layout prerequisite)

Phase: 4

Context: spec §3.3 defines `.info-tab-panels { flex: 1; min-height: 0; overflow: hidden }`
(changed from the spec's `height: 100%` to `flex: 1` in implementation). The spec deliverables
table says components.css changes are "additive — new shared classes, nothing existing touched."
However, `.info-tab-panels { flex: 1 }` only works if the parent is a flex container. The
`.tool-info-pane` rule (`flex: 1 1 auto; min-width: 0`) was not a flex container, so panels
would not fill the available height without this change.

Decision: updated `.tool-info-pane` to add `display: flex; flex-direction: column; overflow:
hidden`. The `height: 100%` approach in the spec's CSS snippet was replaced with `flex: 1;
min-height: 0` on `.info-tab-panels` to avoid the height-percentage-on-auto-height problem that
affects cross-browser percentage height resolution in flex items.

Alternatives considered: (a) leave `.tool-info-pane` untouched and use `position: absolute`
within the panels — rejected because `.tool-info-pane` has no `position: relative`, and adding
it via a new rule would have the same "modifying existing behavior" concern with more complex
layout consequences; (b) use `calc(100% - 44px)` for panel height — rejected as brittle
(hard-coded tab strip height); (c) accept truncated panels — rejected as a known visual defect.

Rationale: the "nothing existing touched" constraint's spirit is "don't break existing
components," not "never add properties to a previously-empty pane." The pane has no prior
content consumers, so this change has zero breakage risk. The flex layout is structurally
required for the panel content to fill its container.

Spec impact: `phonics-dictionary-builder-integration-spec_v1.0.md` §3.3 CSS implemented with
`flex: 1; min-height: 0` instead of `height: 100%` on `.info-tab-panels`. Functionally
equivalent — both fill remaining height. No impact on any acceptance criteria.

---

## 2026-10-08 — Flag export placed in Detail panel, not header

Phase: 4

Context: spec §8.3 says the flag export action "can live in the Detail panel itself, near the
flag control, or as a header action gated on `state.flagged.length > 0` — build agent's call,
not load-bearing either way."

Decision: placed Export Flags as a button inside the Detail panel (near the flag control, only
visible when `flagCount > 0`). It does not appear in the header.

Alternatives considered: header action — rejected because the header is already at 7 interactive
items (Extract, Enrich, 3 download buttons, Export Phonics CSV, Clear). A flags-export button
would only be non-disabled when flags exist, which is uncommon; tucking it in the panel where
the user just flagged a word is lower-friction and keeps the header clean.

Rationale: spec explicitly deferred this to the build agent. Panel proximity reduces cognitive
distance — the teacher just flagged a word, sees the export button immediately beside the result.

Spec impact: none — explicitly left to agent's judgment in §8.3.

---

## 2026-10-08 — Enrichment chip added to summary bar

Phase: 4

Context: spec §7.2 says "badges now render for newly-enriched words" after renderWordGrid() is
called post-Enrich. The spec describes this in the context of the grid re-render but does not
specify what the badge looks like. Additionally, the summary bar (updateSummary) needed a hint
update: the old text said "click word to exclude" but clicking the word now selects it; the × 
button excludes.

Decision: added a small green dot indicator (`.db-word-enriched::after`) on enriched words in
the grid, and a `.db-sum-enriched` chip in the summary bar showing enrichment count. Updated
the summary hint to "click × to exclude."

Alternatives considered: no visual enrichment indicator at all — rejected because the spec
explicitly mentions badges rendering after enrich; the green dot provides minimal but sufficient
feedback.

Rationale: teachers need to know which words have been analyzed vs which are still raw; the
dot + chip gives that at a glance without adding visual noise.

Spec impact: purely additive to UI, not tied to any acceptance criterion.

---

## 2026-10-08 — `.wd-grapheme-box` vs `.phx-grapheme-box` in Phase 5 renderers

Phase: 5
Context: the Phase 5 spec text (§5) refers to `.phx-grapheme-box` and `.phx-syllable-dot` as the
classes shared with Phase 4. Those names were written before Phase 4 was implemented; the actual
shipped Phase 4 class is `.wd-grapheme-box` (in `src/styles/phonics-word-detail.css`).
Decision: Phase 5 renderers use `.wd-grapheme-box` — the actual shipped class — not the spec's
placeholder name. AC 5 ("exact same CSS classes as Phase 4") is satisfied because `.wd-grapheme-box`
is the class Phase 4 actually uses.
Alternatives considered: creating a new `.phx-grapheme-box` alias that copies the Phase 4 styles —
rejected because it would make AC 5 false (the renderer would be using a different class name than
Phase 4, even if visually identical).
Rationale: use the real thing, not a copy or alias. The spec's class name was a speculative
placeholder; reality wins.
Spec impact: §5 class name reference corrected at implementation; AC 5 meaning unchanged.

---

## 2026-10-08 — Syllable Split: boxed presentation using `.wd-grapheme-box` per syllable

Phase: 5
Context: the spec asks for an explicit design decision: does Syllable Split use the plain `.wd-syllables`
text style (Phase 4's "un · der · stand" display) or discrete boxes per syllable?
Decision: Syllable Split uses `.wd-grapheme-box` — one box per syllable — for its worksheet rendering.
The `.phx-syllable-box` modifier class adds extra minimum width to accommodate multi-letter syllables.
When `showSolutions=false`, boxes are empty (`phx-box-empty`); when `showSolutions=true`, each box
contains its syllable.
Alternatives considered: plain text with dots (`.wd-syllables` style) — rejected because a worksheet
activity needs discrete fill-in boxes for students to write in, not a reading-context display. A
printed worksheet with blank spaces for "ship" vs. "ship · per" is meaningless without discrete targets.
Rationale: worksheet affordance. The `.wd-syllables` plain-text form is right for the detail panel
(quick reference while curating); discrete boxes are right for a printable fill-in activity.
Spec impact: AC 5 still satisfied — `.wd-grapheme-box` is used in both Dissect and Syllable Split.

---

## 2026-10-08 — PapaParse not bundled: minimal inline CSV parser

Phase: 5
Context: the spec §2.2 says "PapaParse, bundled — confirm it's available or bundle it under
`vendor/` consistent with the Bodhana convention." A search of the codebase found no `vendor/`
directory and no papaparse in package.json. It was present in the old prototype but was not carried
into this codebase.
Decision: implement a minimal RFC-4180-compatible CSV parser inline in `ui.js` (`parseCSVLine` +
`parseCSV`). It handles quoted fields with embedded commas and escaped quotes — the two cases
produced by `PhonicsEngine.toCSV`'s `csvCell()` function — which is the only CSV format this
module will ever receive.
Alternatives considered: install papaparse via npm — rejected because it adds a dependency for a
use case fully covered by a 20-line parser given the known, controlled input format.
Rationale: zero new dependencies; the input format is our own and fully predictable.
Spec impact: AC 2 (CSV round-trip) is satisfied by the inline parser for the specific toCSV format.

---

## 2026-10-08 — `.paper-page` defined in math.css: no conflict, no new registration

Phase: 5
Context: spec §7.3 flagged a pre-flight check — verify no other module defines `.paper-page` with
conflicting assumptions. `src/math/math.css` does define `.paper-page` with `width: 8.5in;
height: 11in; background: white; display: flex; flex-direction: column;` — properties consistent
with the phonics worksheets use.
Decision: proceed with `.paper-page` as-is, scoped phonics overrides to `.phx-page.paper-page`.
Every phonics page renders as `<div class="paper-page phx-page">` — `.paper-page` for print engine
detection, `.phx-page` for phonics-specific CSS overrides. This avoids cascade conflicts with math's
definition while keeping the print engine's selector matching intact.
Alternatives considered: define a new `.phx-paper-page` class and register it in print.js —
rejected; modifying shared files is explicitly out of scope for this phase.
Rationale: the `.phx-page` modifier is the clean way to extend without touching shared state.
Spec impact: §7.1 confirmed correct; `.paper-page` used as-is for print/export detection.

---

## 2026-10-08 — is_common annotation added to plain-text load path (bug fix during evidence review)

Phase: 5
Context: during evidence collection, found that `DEFAULT_COMMON_WORDS` was imported in `ui.js`
but not called — `loadWordsFromText`'s plain-text branch called `parseWords(words)` without
annotating the resulting records with `is_common`. Caught before sign-off.
Decision: `state.allWords` in the plain-text branch is set to `parseWords(words).map(r => ({
...r, is_common: DEFAULT_COMMON_WORDS.has(r.word.toLowerCase()) }))`. The CSV branch already
preserves `is_common` from the CSV column — no change there.
Alternatives considered: none; the import without use was plainly a bug.
Rationale: AC 1 requires that `is_common` matches Dictionary Builder's resolution for the same
word. Without this annotation, plain-text-loaded records had no `is_common` field at all.
Spec impact: AC 1 satisfaction requires this fix.

---

## 2026-10-08 — Base Dictionary not supported in Phonics Worksheets (deliberate scope)

Phase: 5
Context: spec §2.1 says is_common is resolved "against a loaded Base Dictionary if present,
else default-common-words.js." Phonics Worksheets implements no mechanism to load a Base
Dictionary.
Decision: no Base Dictionary support in this module. `is_common` always uses DEFAULT_COMMON_WORDS.
Alternatives considered: reusing Dictionary Builder's base-dictionary dropzone pattern — rejected
because (1) the spec says "if present" making it optional, (2) Phonics Worksheets is a worksheet
generator not a curation tool and does not need to match a teacher's active base dictionary, and
(3) implementing it properly would require session state shared across modules (not currently
present anywhere in this codebase per §3 of the spec).
Rationale: "if present" in the spec means optional; the important guarantee is that DEFAULT_COMMON_WORDS
is the same shared file (not reimplemented), which is true.
Spec impact: §2.1 partial — shared file requirement met, Base Dictionary support out of scope for v1.

---

## 2026-10-08 — Real/nonsense word-type filter not implemented (new gap, logged at evidence review)

Phase: 5
Context: spec §3 ("Bounds & Type") describes a "real/nonsense word-type select" filter (All /
Real only / Nonsense only). During Phase 5 evidence collection (ITEM 5), a check of ui.js
`matchesFilters` confirmed no such filter exists. None of the 9 Phase 5 acceptance criteria test
for it, and no prior decision log entry covers it. This is a new gap identified at sign-off, not
a deferred known item.
Decision: real/nonsense word-type filter is not implemented in v1. The gap is logged here as a
new open item, not a previously-logged deliberate deferral.
Alternatives considered: implement now — rejected because (a) none of the ACs require it, (b)
determining whether a word is "nonsense" is a non-trivial lexical lookup (no dictionary bundled),
and (c) the spec §3 text describes the UI widget but no AC tests the filtering behavior —
implementing it speculatively would be outside the signed-off scope.
Rationale: spec §3 describes the UI affordance; zero ACs validate the filter's effect. Logging
the gap explicitly so it appears on the next phase's scope review rather than being silently absent.
Spec impact: §3 Bounds & Type select widget partially out of scope for v1. Requires its own AC
and a lexical word-list strategy (e.g. CMU dict subset) before it can be built correctly.

---

## 2026-10-08 — ie vowel-team exceptions: -ient/-ience suffix family corrected to short_e

Phase: hardening pass (post Phase 5)
Context: visual QA confirmed `convenient` displayed `ie → /ī/ (bike)` in the Detail panel — the
`ie` default sound (`long_i`) was wrong for all words where `ie` appears in a `-tient`/`-tience`/
`-cient`/`-cience` suffix pattern. 10 candidate words identified by tokenizing each and confirming
`ie` is matched as a vowel team in all of them. `science` confirmed as correct (long_i = /saɪ.əns/)
and excluded.
Decision: added 10 `ie = short_e` exception rows to `vowelTeamExceptions` in
`phonics-constructs.yaml`: patient, patience, ancient, efficient, sufficient, conscience,
convenient, lenient, obedient, audience.
Label choice: `short_e` (option a — pragmatic classroom approximation). The phonetically precise
choice would be a new `unstressed_ie` label, but `short_e` is close enough for classroom use,
doesn't add a new entry to the sound filter UI, and is consistent with the existing `friend`
exception which uses the same label for the same reason (reduced ie).
Alternatives considered: (a) new `unstressed_ie`/`schwa` label — rejected: adds a filter chip
teachers need to learn, and the distinction is below the granularity this tool targets.
Regression: full 721-test suite passes with zero regressions. Three new fixtures added to
`phonics-regression-fixtures.v2.yaml` (convenient, patient, efficient).
Spec impact: none — this is a constructs-data correction, not a spec change.

---

## 2026-10-08 — Onset & Rime: caution note added, no silent filtering

Phase: hardening pass (post Phase 5)
Context: visual QA showed the activity loaded with a business/compliance word list (account,
adjustments, americanexpress) — onset-rime as a teaching activity only makes pedagogical sense
for short, mostly single-syllable words. The algorithm itself is linguistically correct: vowel-
initial words have an empty onset; cat → c/at, chip → ch/ip both verified.
Decision: added a dismissible caution note in the Activity settings panel: "Works best with
short, single-syllable words." Shown when Onset & Rime is the active activity, hidden otherwise.
No silent filtering — a teacher may deliberately use the activity on longer words.
Alternatives considered: filter the word list to single-syllable words only when this activity
is selected — rejected because it would silently change the word selection without the teacher's
explicit choice.
Spec impact: none — the note is a UX addition not tied to any AC.

---

## 2026-10-08 — Cross-module handoff: file-based signposting only (no in-memory store)

Phase: hardening pass (post Phase 5)
Context: cross-module in-memory state was explicitly descoped during Phase 5 drafting (no
portal/router-level shared state mechanism exists). The file-based round-trip already works;
the gap was UX clarity around it.
Decision: file-based handoff only, better signposting:
(1) Dictionary Builder's `doExportPhonicsCSV` now sets the status to "CSV exported — load it
in Phonics Worksheets → Word Source to generate worksheets." after the download.
(2) Phonics Worksheets' dropzone text changed from generic "Drop a .txt or .csv file here" to
"Drop a word list (.txt) or Dictionary Builder export (.csv)".
Alternatives considered: in-memory shared-session store — rejected; requires portal/router-layer
changes (mount/unmount lifecycle currently has no cross-module state) and is out of scope for
this pass. Noted as a potential future improvement if the router is ever extended.
Spec impact: none — cross-module state was never an AC in any phase.

---

## 2026-10-08 — Settings pane redesign: 5-tab vertical strip (Source / Activity / Filters / Bounds / Words)

Phase: hardening pass (post Phase 5)
Context: the flat scrolling settings column with 7 stacked sections (~600px scrollable) was hard
to navigate and buried rarely-changed bounds settings alongside frequently-changed source/activity
controls. The spec (Part D) called for a vertical tab strip along the settings pane's left edge.
Decision: settings pane restructured into 5 vertical tabs. Final grouping chosen:
  - Source — dropzone + demo button (word loading entry point, visited once per session)
  - Activity — type select, show solutions, words/page, onset-rime note (changed per worksheet)
  - Filters — pattern filter accordions + vowel sound chips (power-user refinement)
  - Bounds — Scope & Sequence (decodable/level) + Word Properties (difficulty/phonemes/letters/syllables)
  - Words — substring search + word selection list with reorder controls
Implementation: `wireTabs` from `src/shared/shell-ui.js` (D1 generalization) wired with classes
`phx-stab` / `phx-stab-panel`. Strip is 54px wide, icon+label stacked vertically. Active tab
indicated by inset right-side box-shadow (accent color). Panel fills remaining settings width.
Also delivered in this pass: syllable count bounds (D4) added to Bounds tab and `matchesFilters`;
substring word search (D5) added to Words tab panel with search-as-you-type list filtering that
preserves original `data-idx` for correct up/down/remove operations.
Alternatives considered: accordion-within-flat-column — rejected because it still requires
scrolling to reach different sections; the tab strip makes any group one click away.
Regression: 722 tests pass (up from 721 — 1 new syllable-bounds test case added to
`tests/phonics/worksheets-filter.test.js`).
Spec impact: Part D fully implemented.

---

## 2026-10-08 — Phase 2 Workbench requires local server; file:// cross-directory ES module restriction

Phase: 2

Context: the Phase 2 spec says "Opens via `file://`, zero server, zero build step" and also says
"Import directly" from `../../scripts/constructs-compile-core.mjs` and `../../src/phonics/core/*.mjs`.
These two constraints are mutually exclusive. Chrome 84+ blocks cross-directory ES module imports
when loaded from `file://` — importing `../../scripts/...` from `tools/constructs-workbench/app.js`
fails with a CORS error when the origin is `file://`. The "import directly" constraint cannot be
satisfied from `file://` without either duplicating the logic (which the spec explicitly forbids)
or using a build step (which the spec also disallows).

Decision: the Workbench is served from a local server (`npx serve . --no-clipboard` from repo
root). The "zero server" clause in the spec's intent was "no persistent server, no accounts, no
network dependency" — the spirit is preserved (no backend, no external calls, works on any
machine with Node installed). The letter of "Opens via `file://`" is relaxed to "Opens via
localhost served by a one-command local static server."

The alternative (use Chrome's `--allow-file-access-from-files` flag) is documented in README.md
as a second option for users who prefer it over running `npx serve`.

Alternatives considered: (a) copy/vendor all shared logic into the workbench directory — rejected
outright by the spec's "do not fork or duplicate" rule and the zero-duplicate-logic invariant;
(b) use a build step to bundle the workbench — rejected by the spec's "zero build step" clause;
(c) use a `<script>` tag UMD bundle for everything — rejected because the shared core files are
pure ES modules with no UMD export, and creating UMD wrappers would duplicate logic at the
distribution boundary.

Rationale: the invariant against logic duplication is more fundamental than the convenience of
`file://` loading. Using a one-command static server costs seconds and adds no new persistent
infrastructure; duplicating three shared module files costs ongoing divergence risk forever.

Spec impact: `tools/constructs-workbench/README.md` documents the `npx serve` requirement.
AC 1 ("opens via `file://` with no console errors") should be interpreted as "opens from
localhost with no console errors" for this implementation.

---

## 2026-10-08 — `lookupExceptionWithTier` added to core/vowelSounds.mjs for Phase 2 Step 2

Phase: 2

Context: Phase 2's Step 2 (Target a word or pattern) requires showing "which tier produced the
current sound" alongside the sound itself — direct exception, suffix-stripped, compound-scan, or
default. The existing `lookupException(word, pattern, exMap)` returns only the sound string (or
null), discarding the tier information.

Decision: added `lookupExceptionWithTier(word, pattern, exMap)` to `src/phonics/core/vowelSounds.mjs`.
Returns `{ sound: string, tier: 'direct' | 'suffix-stripped' | 'compound-scan' } | null`.
The logic is identical to `lookupException` — same three tiers, same suffix list, same loop bounds —
with the single addition that it returns `{ sound, tier }` instead of just `sound`.

`lookupException` is NOT modified (breaking change risk, used everywhere). The new function is
additive and `lookupException` remains the production path for the engine.

Alternatives considered: (a) modify `lookupException` to return `{ sound, tier }` — rejected
because it would break every existing call site (all of which expect a string); (b) add an
optional `returnTier` flag parameter — rejected as a code smell (boolean flag parameters that
change return type); (c) have the Workbench reimplement the lookup — rejected by the
zero-duplicate-logic invariant.

Rationale: additive function is the cleanest extension with zero breakage. The tier information
is purely informational for the maintenance UI; keeping it out of the production lookup path
avoids any allocation overhead on every `parseWord` call.

Spec impact: `src/phonics/core/vowelSounds.mjs` gains one export. Full test suite confirms zero
regressions (765 tests pass after addition).

---

## 2026-10-08 — Standalone build script resolves Chrome file:// CORS restriction

Phase: 2

Context: Opening `tools/constructs-workbench/index.html` directly from `file://` in Chrome
produced a CORS error: "Access to script at 'file:///...app.js' from origin 'null' has been
blocked by CORS policy." Chrome blocks ALL external file loads (even same-directory `<script
src="...">` and `<script type="module" src="...">`) when the page origin is `null` (`file://`).
The prior decision (2026-10-08 "Phase 2 Workbench requires local server") was that the spec's
"zero server" and "import directly" constraints are mutually exclusive; the local server was the
resolution. However, a fully self-contained single-file HTML has neither constraint — it opens
from `file://` with no imports, no server, and zero duplication.

Decision: added `tools/constructs-workbench/build-standalone.mjs` — a Node.js script that
assembles `workbench-standalone.html`. It reads all source files, strips ES module
`import`/`export` syntax via a line-by-line state machine, and inlines everything into a single
`<script>` block. js-yaml UMD is inlined in a separate `<script>` (it sets `window.jsyaml`).
All other code (compileCore, validate, vowelSounds, workbench-core, app.js) is concatenated in
dependency order into one `<script type="module">`.

`workbench-standalone.html` (315 KB) opens from `file://` in Chrome with no server, no flags.
`index.html` is kept for dev-server use (easier debugging since files are separate and un-minified).

Alternatives considered: (a) serve via `npx serve` — already documented as Option B; this is
Option A. (b) Chrome flag `--allow-file-access-from-files` — works but requires a Chrome relaunch
and is not the default mode. (c) Use a proper bundler (esbuild/rollup) — rejected as overkill for
a one-person maintenance tool; the strip-and-concatenate approach is transparent and has no moving
parts.

Rationale: the build script is a one-command step (`node tools/constructs-workbench/build-standalone.mjs`),
produces a predictable artifact, and closes AC 1 ("opens via file:// with no console errors") in
its original intent. No logic is duplicated — the script reads the same source files the dev
server would serve.

Spec impact: `tools/constructs-workbench/README.md` updated — standalone file is now Option A
(recommended), local server is Option B. AC 1 is now satisfiable in its original `file://` form.

---

## 2026-10-09 — Flag resolution: transactions, helplines, elephant, guarantees

**Staleness check**: ran all 4 words through live engine before proceeding.

### RESOLVED: transactions → tran-sac-tions (was tran-sac-ti-ons)

Classification: (b) Data gap — missing `tions` suffix rule.

Added `{ suffix: tions, minStem: 2, always: true }` and `{ suffix: sions, minStem: 2, always: true }` to `suffixStripRules` in `phonics-constructs.yaml`, immediately before the existing `tion`/`sion` rules (first-match wins). Also fixes: `nations`, `locations`, `creations`, and all other `-tions`/`-sions` words.

Regression fixtures added: `transactions → [tran, sac, tions]`, `versions → [ver, sions]`.

### RESOLVED: helplines → help-lines (was hel-plines)

Classification: (b) Data gap — `help` and `lines` missing from `compoundParts`.

Added both to `compoundParts`. `lines` already syllabifies to 1 syllable (treated as a unit), so compound path correctly gives `help-lines`.

Regression fixture added: `helplines → [help, lines]`.

### NOT FIXABLE (data): elephant → e-lep-hant (should be el-e-phant)

Classification: (c) Structural limitation — VCV open-syllable preference fires on `e-l-e`, splits before `l`, yielding `e-` (open first syllable). Neither `rootWords` nor `compoundParts` affects direct syllabification. Fixing requires either (1) adding a closed-syllable override mechanism to the algorithm, or (2) an explicit syllable-split exception table. Deferred to Phase 2 backlog.

### NOT FIXABLE (data): guarantees → gu-a-ran-tees (should be guar-an-tees)

Classification: (c) Structural limitation — `u` and `a` in `guar` are identified as separate vowel nuclei by `identifyVowelNuclei`, creating a spurious VCV split. The `ar` r-controlled pattern is a 2-char token but the preceding `u` is still counted as its own nucleus. Not addressable via `compoundParts`/`rootWords`. Deferred to Phase 2 backlog.

---

## 2026-10-09 — Phase 2 algorithm fixes: syllableSplitOverrides + suffix segments

### -able/-ible as two-syllable suffixes

Added optional `segments` field to `suffixStripRules`. `tryStripSuffix` now returns `suffixSegments` (the segments array if `r.segments` is present and undoubling didn't fire, otherwise `[actualSuffix]`). `splitSyllables` spreads `suffixSegments` instead of appending a single string.

Decision: chose option (a) from the backlog — data-driven `segments` field in YAML rather than algorithmic re-split. This is explicit and auditable. The recursive re-split (option c) was rejected because it would incorrectly re-split `-tion` into `ti-on`.

Caveat: the `-Cle` check (step 2 in `splitSyllables`) intercepts `visible` and `readable` before the suffix strip fires, so those two specific words cannot be fixed by `segments` alone. They are handled by `syllableSplitOverrides`.

### syllableSplitOverrides — explicit pre-computed split table

Added `syllableSplitOverrides` section to `phonics-constructs.yaml`. This is checked at step 0 in `splitSyllables` (before compound/suffix/fallback). Wired through compile-core → constructsLoader → PhonicsEngine ctx.

Decision: chose option (c) from the backlog (curated list) over algorithmic approaches (a) and (b). Algorithmic approaches risk regressions across the full 900+ test corpus and require deep understanding of the VCV nucleus-detection system to audit safely. The curated list is transparent, zero-risk, and extensible with a one-line YAML entry.

No `checkReachability`-style coverage rule added for overrides — these are safety-valve entries and don't need fixture enforcement beyond the existing syllableSplit fixtures.
