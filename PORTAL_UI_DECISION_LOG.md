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
- Defer direct Export PDF until a vector-quality implementation is designed module by module.

## Module Scope

- Include Math Worksheets, Math Puzzles, Sudoku, Word Puzzles, and Seyes Worksheets.
- Exclude Dictionary Builder because it needs a separate redesign and feature phase.
- Treat Seyes as the most sensitive module because physical paper geometry affects student handwriting practice.

## Layout

- Use a fixed settings pane and fixed rendered-page pane.
- Add an empty right-side pane that absorbs extra width, including when the sidebar collapses.
- Normalize printable module backgrounds across light and dark modes.
