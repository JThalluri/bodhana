# Bodhana – Feature Backlog

Items are ordered by priority. Update this file when work begins or finishes.

---

## Active / In Progress

### Math Games + Fractions Worksheets (implementation)
Moving Tic-Tac-Toe into `/math-games`, adding fraction Bingo/Match/Snake, and adding Fractions as a Math Worksheets family with shared Print / Export.

### Writing Worksheets — Handwriting Lines type (awaiting user testing)
New worksheet type under `/worksheets`, selected from the Type dropdown (Seyès remains the default). Code in `src/writing-worksheets/`. Five grade-tier presets (Pre-K → adult), four formats (alternating model + practice, copy-from-box, jumbled sentences, Word Practice), inline-SVG ruling, word wrapping, auto pagination up to 20 pages, seeded shuffle, shared Print / Export PDF. Pending: physical print check of Tier 4 Seyès-style 8 mm / 2 mm spacing.

---

## Completed

### Seyès Worksheet Module (v1)
First worksheet type — French ruled (grands carreaux) handwriting practice paper. Characters sit in 8mm cells on a CSS gradient grid with blank rows below for learner copying.

### Seyès Module Redesign (v2)
Replaced stacked slider layout with compact two-pane: sticky toolbar + fixed left input pane + scrollable right page preview. Geometry-based pagination (no DOM measurement). Multi-page support.

### Math Worksheets Module (v1)
Consolidated `/math-worksheets` route containing two sub-types selected via a type dropdown:
1. **Math Tests** — existing arithmetic drill generator (add/sub/mul/div), two-pane layout: sticky toolbar + left settings pane (operation ranges, options) + right scrollable paper output. Defaults: 8 papers × 51 questions (17 per column × 3 columns).
2. **Place Value** — 10 worksheet types ported from prototype (examining digit value, place value chart, expanded form, missing addend, word form, comparing, rounding, base-ten blocks, skip counting, powers of 10). Seeded LCG PRNG for reproducibility. US and Indian number locale. Defaults: 25 questions/worksheet, Andika X-Large, 2 worksheets.

Both sub-types use the same two-pane pattern (sticky toolbar + left settings + right preview) and share `@media print` CSS for clean page breaks. `/math` route preserved as alias.

### Font Revert: Andika
Reverted Seyès font from Consolas (interim choice for PDF size) back to Andika. Andika is designed for literacy learners; PDF size tradeoff accepted.

### Dictionary Builder
Upload PDF/DOCX/ODT/TXT/CSV → extract vocabulary → download filtered word list.

### Word Jumble
Added Word Jumble puzzle type to the Word Puzzles module.

---

## Backlog

### Phonics country / pronunciation selector

Requested 2026-10-20. Use American English as the current pronunciation convention. Defer a country/pronunciation dropdown that changes the phonics analysis and pronunciation guidance to the selected variety. Detailed scope and acceptance criteria: [Phonics deferred-items backlog](../bodhana-phonics-integration-handoff/tracking/phonics-phase2-backlog.md#open---country--pronunciation-selector).

### Fractions Later Work
Prototype-only fraction worksheet/game ideas deferred from v1: number-line mark, fraction of a set, estimation/benchmarking, equivalent fractions, ordering, and Connect 4. Fractions War is dropped.

### Portal-wide UX Overhaul
Standardize all modules to the two-pane print-preview layout pattern used by Worksheets and Math Worksheets:
- Single-page display (one paper at a time) with prev/next navigation
- Modules to migrate: Word Puzzles, Math Puzzle Grid, Sudoku
- Consistent toolbar structure across all tools

---

*Last updated: 2026-10-20 (phonics pronunciation selector deferred; American English retained)*

## Statement paper rollout - phase 2 (2026-10-26)

Shared registry, physical print/PDF support and all Handwriting Lines formats are implemented with Word Practice. Remaining scope: all Math Worksheets subtypes, Math Games, Math Puzzles, Sudoku tile layouts, Word Puzzles, Phonics, Certificates and dedicated Seyes. Migrate each generator/renderer to shared paper geometry and explicit smaller-page pagination; expose the shared options only after its layouts fit. Preserve existing Letter defaults and output. Certificates needs landscape Statement; Seyes must keep exact 8 mm geometry and its dedicated print path. Dictionary Builder is a results view and has no worksheet stock. Acceptance: portable/hosted offline, persistence, desktop/tablet fitting, all types/dense cases, actual print frames/PDF MediaBoxes and physical device/print review.
