# Portal UI Decision Log

## Visual Shell

- Use one module-owned header row instead of a global topbar plus module toolbar.
- Move the brand banner into the sidebar header.
- Hide the brand banner when the sidebar is collapsed.
- Keep the theme toggle as the last action in each included module header.

## Settings Placement

- Put worksheet and puzzle type selection in the settings pane, not the header.
- Add a separator after the type selector to distinguish worksheet identity from worksheet options.

## Print and PDF

- Keep Generate as the primary action for generated worksheets.
- Rename print actions to Print PDF because the expected workflow is generate, inspect, then print or save through the browser print dialog.
- Use native browser print for print-quality output.
- Add direct Export PDF for generated non-Seyes worksheet modules using a shared hidden Letter-sized print-layout frame and high-resolution page-image PDF output.
- Prefer visual fidelity to the validated DOM print layout for this export phase. A future true-vector exporter can be revisited only after module-specific geometry is formalized.
- Add a small top-right `Bodhana` watermark to printed pages and exported PDFs.

## Module Scope

- Include Math Worksheets, Math Puzzles, Sudoku, Word Puzzles, Seyes Worksheets, and Dictionary Builder in the shared visual shell.
- Limit Dictionary Builder work to layout consistency in this phase; its functional overhaul and new features remain a separate redesign phase.
- Treat Seyes as the most sensitive module because physical paper geometry affects student handwriting practice.
- Keep Seyes on its dedicated Print PDF path for this export phase; do not add direct Export PDF until its millimeter grid can be matched exactly.

## Layout

- Use a fixed settings pane and fixed rendered-page pane.
- Add an empty right-side pane that absorbs extra width, including when the sidebar collapses.
- Normalize printable module backgrounds across light and dark modes.
- Dictionary Builder uses the same header/settings/main/right-pane structure, with its word results as the main pane instead of a rendered worksheet page.
