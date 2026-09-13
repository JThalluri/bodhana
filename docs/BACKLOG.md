# Bodhana – Feature Backlog

Items are ordered by priority. Update this file when work begins or finishes.

---

## Active / In Progress

*(nothing currently in flight)*

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

### Portal-wide UX Overhaul
Standardize all modules to the two-pane print-preview layout pattern used by Worksheets and Math Worksheets:
- Single-page display (one paper at a time) with prev/next navigation
- Modules to migrate: Word Puzzles, Math Puzzle Grid, Sudoku
- Consistent toolbar structure across all tools

---

*Last updated: 2026-09-12 (Math Worksheets module shipped)*
