You are implementing a five-phase integration of phonics worksheet generation into Bodhana, an
existing Vite-based SPA for teacher worksheet tools. All design work is already done — your job
is implementation against a complete, internally-consistency-checked set of specs, not design.

## Before you write any code

Read, in this exact order:

1. `README.md` in this package — explains the whole structure and the non-negotiable ground
   rules that apply across all five phases.
2. `tracking/PHONICS_STATUS.md` — current state. If any phase shows progress already, this is
   where you resume from, not from scratch.
3. `tracking/PHONICS_DECISION_LOG.md` — full chronological record of design decisions and
   corrections. Several entries describe corrections that are **already baked into the phase
   specs themselves** — you don't need to re-apply anything described here; it's the "why,"
   not a patch note.
4. `tracking/phonics-phase2-backlog.md` — deliberately deferred items. Do not resolve any of
   these as a side effect of your implementation work, even if you notice a clean fix while
   you're in the area.

Then read `00-fixtures/phonics-regression-fixtures-v2.md` for rationale and load
`00-fixtures/phonics-regression-fixtures.v2.yaml` as the actual, authoritative test input —
every phase's tests are judged against this file, not against anything you derive yourself.

## Build order — strict, do not reorder

1. `01-phase1-constructs-pipeline/` — build and fully pass its acceptance criteria before
   touching anything else.
2. `03-phase3-engine/` — depends only on Phase 1.
3. `04-phase4-dictionary-builder/` — depends on Phase 3.
4. `05-phase5-worksheets/` — depends on Phases 3 and 4.
5. `02-phase2-constructs-workbench/` — depends only on Phase 1; build it any time after Phase 1
   is done, including in parallel with 3/4/5 if that suits your workflow.

Do not start a phase before its dependency phase's `PHONICS_STATUS.md` checklist is fully
checked. Each phase was deliberately scoped to prove its own foundation before the next phase
builds on it — starting early recreates exactly the rework this sequencing exists to avoid.

## The one rule that governs everything else

**Zero duplicated logic, anywhere, in this codebase, ever.** If you find yourself about to write
a second implementation of something that already exists — a lookup table, a tokenizer, a CSV
column list, a validation rule — stop. The correct move is almost always to import the existing
one from wherever it already lives, even if that means a small refactor of where it's exported
from. This single rule is why three separate things got relocated during spec drafting (shared
core logic, the pure `compileConstructs()` function, `default-common-words.js`) — each time a
second consumer needed the same logic, the fix was always relocation, never a second copy.

## How to use the two tracking files as you work

**Update `PHONICS_STATUS.md` in place** as you complete each acceptance criterion — check the
box only when it's genuinely true, not "mostly done." Each phase's checklist is copied verbatim
from that phase's spec, so there's no interpretation required on your end or mine when reviewing.

**Append to `PHONICS_DECISION_LOG.md`** for any implementation choice the spec doesn't already
dictate — file organization within what's specified, variable naming, that kind of thing. Use
the entry format already established at the top of that file. Never edit or delete a past entry.

**Stop and add an open question to `PHONICS_STATUS.md` instead of deciding** — do not decide
and log afterward — whenever you hit any of these three situations:

- Implementing a criterion would require contradicting an explicit MUST/hard-fail statement
  anywhere in a spec.
- It would touch something listed in `phonics-phase2-backlog.md`.
- It would require changing an acceptance criterion itself, not just satisfying it.

This mirrors the same "no silent destructive changes" principle that governs the linguistic
constructs data in Phase 1 — it applies to the engineering process too, not just the phonics
tables.

## Specific things to get right that are easy to get subtly wrong

- **Phase 1's core compute logic (`tokenize`, `splitSyllables`, `vowelTeamSounds`, etc.) is
  permanent, production code from the moment you write it** — not test scaffolding, not
  something Phase 3 "really" implements later. Phase 3 only wraps it.
- **Phase 3's `toCSV` extended-column list must have `is_common` removed** from the hardcoded
  array (see Phase 3 spec §3.3 for the exact corrected array) — copying the old array verbatim
  produces a subtly broken CSV once Phase 4's `extraColumns` is added on top. This is spelled out
  explicitly in the Phase 3 spec precisely because it's easy to miss.
- **`default-common-words.js` lives in `src/shared/`**, not `src/dictbuilder/` — both Phase 4
  and Phase 5 need it.
- **The vowel-team exceptions table is a flat array of `{word, pattern, sound, note}` rows, not
  an object keyed by word.** This is a deliberate structural fix for a real historical bug
  (silent overwrite when a word needed two overrides) — do not "simplify" it back to a
  word-keyed object for convenience.
- **No `localStorage`/`sessionStorage`/`IndexedDB` anywhere, including in the Phase 2 Workbench.**
  Cross-module and cross-session state is file-based (download/load) or, for the Workbench
  specifically, the File System Access API with a download/upload fallback — never browser
  storage.
- **Phase 5 reuses `.paper-page` as the print/export page class, with zero edits to
  `src/shared/print.js` or `src/shared/export-pdf.js`.** If you find yourself wanting to add a
  new page class or edit either shared file, stop — re-read Phase 5 spec §7 first, since this
  was specifically verified against the real files to avoid exactly that.
- **Dictionary Builder's existing `Download`/`Full Merge`/`Append Delta` behavior must remain
  byte-for-byte unchanged.** Phase 4 only adds alongside this, never modifies it — there's an
  explicit acceptance criterion checking this with a regression comparison.

## When you're done with all five phases

`tracking/PHONICS_STATUS.md` should show every checklist fully checked across all five phases,
zero unresolved open questions, and the full regression corpus passing through the real Phase 3
public API — with only the four fixtures marked `expectedFailure: true` in
`00-fixtures/phonics-regression-fixtures.v2.yaml` reported as known-failures, matching what's
already tracked in the backlog file. Nothing more, nothing fewer, should be failing.

If at any point a spec and the real current state of the Bodhana codebase disagree — for
example, if `src/styles/components.css` has changed since these specs were written — stop and
flag it as an open question rather than guessing which one is right.
