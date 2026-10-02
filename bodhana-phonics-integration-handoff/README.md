# Bodhana Phonics Integration — Handoff Package

This package is the complete, consistency-checked set of specs and tracking artifacts for
integrating phonics worksheet generation into Bodhana, built in five dependency-ordered phases.
Everything in here supersedes the original prototype files (`PhonicsConstructor.js`,
`phonics-worksheet.html`, the two `phonics_*_spec-v1.*.md` documents, `phonics-dictionary.csv`) —
those remain useful only as historical reference for the original algorithm design, never as the
current contract.

## Read this first, in this order

1. **This file.**
2. **`tracking/PHONICS_STATUS.md`** — current state of every phase, acceptance-criteria
   checklists mirrored verbatim from each spec. If you're resuming work, this tells you exactly
   where things stand and whether any open question is blocking you.
3. **`tracking/PHONICS_DECISION_LOG.md`** — chronological record of every design decision and
   correction made while producing these specs, including *why*. Several entries describe
   corrections that were made directly inside the phase specs themselves — the specs already
   reflect these corrections; this log is the audit trail for *why* they look the way they do,
   not a patch note you need to apply yourself.
4. **`tracking/phonics-phase2-backlog.md`** — deliberately deferred content/architecture
   questions. Nothing in here should be silently resolved by implementation work in any phase.

Then proceed phase by phase, in order. **Do not start a phase before its dependency phase is
complete and its `PHONICS_STATUS.md` checklist is fully checked.** The phases were deliberately
sequenced to minimize rework — each one proves its foundation before the next builds on it.

## Phase order and what's in each folder

| Folder | Phase | Depends on | What it produces |
|---|---|---|---|
| `00-fixtures/` | — (shared input) | nothing | The authoritative regression corpus. Every phase's tests are judged against this. |
| `01-phase1-constructs-pipeline/` | 1 | fixtures only | YAML authoring schema, compiler, 4 permanent validation rules, `src/phonics/core/*.mjs` (permanent, shared, production code — not scaffolding) |
| `02-phase2-constructs-workbench/` | 2 | Phase 1 | Standalone, offline LLM-handoff tool for safely enriching the constructs YAML |
| `03-phase3-engine/` | 3 | Phase 1 | `PhonicsEngine.mjs` — the public API Phase 4 and 5 actually import |
| `04-phase4-dictionary-builder/` | 4 | Phase 3 | Dictionary Builder's Enrich action, shared tabbed info-pane, word Detail view |
| `05-phase5-worksheets/` | 5 | Phases 3 + 4 | Phonics Worksheets module — 4 activity types, reusing Phase 4's components |

Phase 2 can be built in parallel with Phase 3/4/5 once Phase 1 is done — it has no dependency on
them. Phases 3→4→5 are strictly sequential.

## Non-negotiable ground rules across every phase

These are stated once here because they govern all five specs, not because any single phase
owns them:

- **Zero duplicated logic, anywhere, ever.** If the same computation needs to happen in two
  places, it's a shared module imported by both, never reimplemented. This rule is *why* three
  separate corrections happened during drafting (core logic, `compileConstructs()`,
  `default-common-words.js`) — each time a second consumer needed the same logic, the fix was
  relocation to a shared location, never a second implementation.
- **No `localStorage`/`sessionStorage`/`IndexedDB` anywhere.** Cross-module handoff is
  file-based only (download/load), consistent with how every existing Bodhana module already
  works.
- **Fail loud, never degrade silently.** Validation errors, schema mismatches, and malformed
  input all hard-stop with a specific, actionable error — never a partial result or a quiet
  fallback.
- **Reuse the real, already-confirmed Bodhana conventions, not inferred ones.** Every UI-facing
  spec (Phases 4 and 5) was written against the actual `components.css`, `tokens.css`,
  `shell-ui.js`, `print.js`, and `export-pdf.js` already in this repo — not guessed. Where a
  spec references a class name, token, or shared function, it's real and confirmed, not
  aspirational.

## How to use the two tracking files while building

**`PHONICS_STATUS.md`** is overwritten in place, not appended to — it always reflects current
truth. Its checklists are copied verbatim from each spec's numbered acceptance criteria
specifically so review is mechanical: check a box only when it's actually true.

**`PHONICS_DECISION_LOG.md`** is append-only — never edit or delete a past entry, even if a
later decision reverses it; add a new entry that supersedes it instead.

The rule that separates them: if implementing something requires a choice **not already
dictated by the spec**, make the choice and log it in the decision log — don't stop. If it would
require **contradicting an explicit MUST/hard-fail statement in a spec, touching an item in the
backlog file, or changing an acceptance criterion itself** — stop, add it to `PHONICS_STATUS.md`
under that phase's "Open questions," and wait. Do not decide and log afterward in that case.

## What "done" looks like

All five phases' `PHONICS_STATUS.md` checklists fully checked, zero unresolved open questions,
and the full regression corpus (`00-fixtures/phonics-regression-fixtures.v2.yaml`) passing
through the real Phase 3 public API with only the four `expectedFailure: true` fixtures reported
as known-failures — matching exactly what's tracked in the backlog file, no more, no fewer.

## `_archive/`

Contains only the superseded v1 fixture-rationalization document, kept for historical context.
**Not an input to any build phase.** The authoritative fixture corpus is in `00-fixtures/`.
