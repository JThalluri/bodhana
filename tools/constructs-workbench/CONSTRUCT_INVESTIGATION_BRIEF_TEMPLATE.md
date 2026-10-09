Construct Investigation Brief

Use this when something looks wrong in tokenization, syllable splitting, or vowel-sound resolution and you're not yet sure whether it's a real bug, a data gap, or a misunderstanding of correct behavior. Fill in Sections 1 and 4 only — the rest is instruction for whoever (human or build agent) picks this up. This is deliberately NOT a full context dump: the agent has the whole repo. Point at what's suspicious; let it read the rest itself.

## 0. If this brief originated from a Dictionary Builder flag — check staleness first

A flag's embedded record is a snapshot from the moment it was flagged, not a live value. Before
doing anything else: recompute the word fresh via `PhonicsEngine.parseWord(word)`. If the
current output already matches the "expected behavior" stated in §1, this flag is already
resolved — log it as such in `PHONICS_DECISION_LOG.md` and stop. Do not proceed to §2 assuming
the embedded record is still accurate.

1. Symptom
Word(s) involved:
Where noticed: (Workbench Step 2 / Dictionary Builder Detail panel / manual testing / other)
Expected behavior:
Actual/current behavior:
2. Required first step — classify before proposing anything

Trace the real algorithm by hand, or via a one-off script that imports the actual functions from src/phonics/core/*.mjs — never reimplement them for this check — against the word(s) above. Do this before assuming it's a bug. State explicitly which of the three it is:

(a) Not a bug. The algorithm traces correctly; the expectation in §1 was wrong. Explain why, with the trace, and stop there. (This is what happened with the "exchange" tokenizer/syllable trace — both the ng-before-e guard and the VCCCV digraph-split rule were already correct; the reported symptom didn't match what the code actually does.)
(b) A data gap. Fixable via vowelTeamExceptions / compoundParts / rootWords. Use the existing Workbench (Vowel Sound / Compound Part / Root Word mode) for this — do not hand-edit phonics-constructs.yaml directly, even for a single row.
(c) A genuine algorithm/structural bug. Requires a code change to src/phonics/core/*.mjs, scripts/constructs-validate.mjs, or scripts/constructs-compile-core.mjs. Only continue to §3 if this is actually the case.
3. If (c) — structural fix requirements, no exceptions
Full hand-trace of before/after behavior for the triggering word(s), shown explicitly.
Full regression suite run, literal pass/fail output pasted — zero unrelated fixtures may change as a side effect.
Logged in PHONICS_DECISION_LOG.md with the trace evidence itself, not just the conclusion.
Explicit human sign-off required before merging. There is no auto-merge path for this category of change — unlike the flat-list patches the Workbench already handles safely, a structural change affects every word in the dictionary simultaneously, and gets the same manual scrutiny every prior structural change in this project has received.
4. Suspected area (a guess, not an instruction — verify independently)
5. Where the rest of the context already lives (reference, don't re-paste)
Compiled constructs: constructs/phonics-constructs.yaml
Regression fixtures: constructs/fixtures/phonics-regression-fixtures.v2.yaml
Core algorithm: src/phonics/core/*.mjs
Validator: scripts/constructs-validate.mjs
Compiler: scripts/constructs-compile-core.mjs
Deferred/known issues: phonics-phase2-backlog.md
History of prior decisions: PHONICS_DECISION_LOG.md
