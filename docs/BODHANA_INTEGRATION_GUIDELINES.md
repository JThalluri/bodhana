# Bodhana Integration Guidelines

Use this guide when integrating a new worksheet type or module into Bodhana. The goal is to keep future work aligned with the shared shell, shared print/export engines, and existing module boundaries.

## Before Coding

Read these files first:

- `PORTAL_UI_ARCHITECTURE.md`
- `PORTAL_UI_DECISION_LOG.md`
- `docs/BODHANA_PROTOTYPE_GUIDELINES.md`
- The closest existing module under `src/`

Prefer extending existing shared components and module patterns over creating new shell, header, print, or export systems.

## Standard Module Structure

Generated worksheet modules should keep responsibilities separated:

- UI module: state wiring, settings pane, header actions.
- Generator module: pure worksheet data generation.
- Renderer module: printable page DOM.
- Module CSS: module-specific worksheet visuals only.
- Shared CSS/utilities: shell, controls, print/export behavior.

Do not mix print/export code into worksheet generators.

## Shared Shell Contract

Use the shared tool shell primitives from `src/styles/components.css`:

- `.tool-shell`
- `.tool-header`
- `.tool-worksheet-header`
- `.tool-header-main`
- `.tool-header-title`
- `.tool-header-status`
- `.tool-header-actions`
- `.tool-primary-actions`
- `.tool-secondary-actions`
- `.tool-action-separator`
- `.tool-body`
- `.tool-settings`
- `.tool-preview`
- `.tool-preview-scroll`
- `.tool-pages`
- `.tool-info-pane`
- `.tool-theme-slot`

The visual structure is:

```text
sidebar | one module header
        | settings pane | page preview pane | empty/right content pane
```

Do not add a second module toolbar or a duplicate top header.

## Header Actions

Worksheet action buttons belong in the header action area aligned to the preview pane. The theme toggle remains separated at the far right.

Generated worksheet layout:

```text
[Generate] [Print] [Export] | [Reset] |                         | [theme pill]
```

Real-time worksheet layout:

```text
[Print] |                         | [theme pill]
```

Dictionary Builder uses the same alignment concept, with module actions such as:

```text
[Extract] [Download] [Full Merge] [Append Delta] | [Clear] |      | [theme pill]
```

Button labels should be:

- `Print`, not `Print PDF`.
- `Export`, not `Export PDF`.
- `Reset` for worksheet reset actions.
- `Clear` for destructive clearing in non-worksheet tools such as Dictionary Builder.

Use existing button classes and icons. Do not create module-specific header button systems.

## Settings Pane

Put worksheet type/category selection in the first settings section, not in the header.

Settings sections should be compact and separated by section boundaries. Follow existing patterns for:

- `.tb-select`
- `.tb-num`
- `.btn`
- `.toggle-switch`
- Section titles and row layouts used by nearby modules.

Keep dropdowns wide enough for real labels. Avoid narrow prototype widths that truncate normal worksheet names.

## Printable Page Contract

Rendered worksheet pages must live under `.tool-pages` inside `.tool-preview-scroll`.

The shared print/export engines currently recognize these page selectors:

- `.paper-page`
- `.pv-worksheet`
- `.ttt-worksheet`
- `.mp-puzzle-page`
- `.sdk-puzzle-page`
- `.wp-puzzle-block`

If a new printable page class is required, update both:

- `src/shared/print.js`
- `src/shared/export-pdf.js`

Keep page elements as exact US Letter pages:

```css
width: 8.5in;
height: 11in;
box-sizing: border-box;
background: white;
overflow: hidden;
```

Page scaling for screen preview is handled by the shared shell. Do not use transforms or viewport-relative sizing on printable page content.

## Print Engine

For non-Seyes worksheet modules, use the shared print utility:

```js
import { printWorksheet } from '../shared/print.js';
```

Then wire the header `Print` button to `printWorksheet`.

Do not:

- Call `window.print()` directly from normal worksheet modules.
- Create a module-specific print window.
- Add module-specific `@page` rules.
- Change browser page margins from a module.
- Print the visible portal DOM directly.

The shared print engine:

- Copies rendered pages from `.tool-pages`.
- Prints in a hidden iframe.
- Uses `@page { size: Letter; margin: 0; }`.
- Forces each page to `8.5in x 11in`.
- Adds the shared `Bodhana` watermark.
- Excludes portal chrome.

## Export Engine

For supported generated non-Seyes worksheets, use the shared exporter:

```js
import { exportWorksheetPdf } from '../shared/export-pdf.js';
```

Wire the header `Export` button to:

```js
exportWorksheetPdf({ filenameBase: 'worksheet_type_name' });
```

Use a lowercase, underscore-friendly filename base. The shared exporter appends a timestamp.

Do not implement raster screenshot export from the visible preview pane. The shared exporter renders from the same hidden Letter-sized print-layout contract used by print.

## Branding

Printed and exported pages must include the shared `Bodhana` watermark.

Normal worksheet modules should rely on:

- `src/shared/print.js`
- `src/shared/export-pdf.js`
- `src/shared/worksheet-brand.js`

Do not duplicate watermark markup or styles in individual modules unless working on a protected special path such as Seyes.

## Seyes Exception

Seyes/French ruled writing worksheets are protected. Do not fold Seyes into the normal print/export path unless physical output is revalidated.

Preserve:

- 8 mm grid geometry.
- Line positions.
- Font size calibration.
- Baseline offset.
- Left and top margins.
- Blank row behavior.
- Dedicated print guidance.

Seyes may share the shell and header layout, but print geometry changes require separate manual validation.

## CSS Rules

Use shared tokens from `src/styles/tokens.css`:

- `--tool-settings-width`
- `--tool-preview-width`
- `--tool-page-scale`
- `--print-page-width`
- `--print-page-height`
- `--print-margin-x`
- `--print-margin-y`
- `--print-content-width`
- `--print-content-height`

Keep module CSS scoped to the module's worksheet and settings details. If a change applies to all modules, put it in shared CSS instead of copying it across modules.

Avoid:

- New global `.tool-*` overrides inside module CSS.
- Module-specific print CSS for ordinary worksheets.
- `!important` except when matching an existing shared print override pattern.
- Hidden overflow that clips printable content unexpectedly.
- Body-level margins, transforms, or zoom hacks for printable pages.

## Data And Rendering

Keep generated data independent from DOM rendering.

Recommended flow:

```text
read UI state -> generate worksheet data -> render pages -> print/export from rendered pages
```

Pagination must be explicit. If a setting can make content dense, validate that it either fits the page or paginates intentionally.

## Validation Checklist

Run after each integration phase:

- `npm run build`
- Open the affected route at 1920 x 1080.
- Confirm only one module header row is visible.
- Confirm action buttons align with the preview pane.
- Confirm theme toggle is the final far-right header item.
- Confirm settings pane and preview pane stay fixed when the sidebar collapses.
- Confirm one full page is visible in the middle pane.
- Confirm `Print` preview shows US Letter pages with no right-edge truncation.
- Confirm `Export` output visually matches the rendered worksheet and print geometry.
- Confirm the `Bodhana` watermark appears top-right on every printed/exported page.
- Test light and dark mode.

For Math Worksheets, test every worksheet type touched by the change, not only the newly added type.

For Sudoku, test all supported tile counts.

For Word Puzzles, test word search and criss-cross, including dense grids.

For Seyes, run separate physical-geometry validation.

## Documentation And Decisions

Update `PORTAL_UI_DECISION_LOG.md` when changing shared layout, print, export, or module scope decisions.

Update `PORTAL_UI_ARCHITECTURE.md` when changing shared contracts or file responsibilities.

Keep worksheet-specific specs near the prototype/spec source, but make sure integration notes include any deviations from Bodhana defaults.

## Integration Anti-Patterns

Avoid these:

- Duplicating `printWorksheet` or `exportWorksheetPdf` logic inside a module.
- Adding a new topbar or second header row.
- Moving worksheet type selection back into the header.
- Using screenshots as a substitute for the shared export contract.
- Adding per-module `@page` CSS for normal worksheets.
- Changing shared page geometry to fix a single worksheet without checking other modules.
- Allowing prototypes to introduce one-off palettes, oversized controls, or custom layout systems.
