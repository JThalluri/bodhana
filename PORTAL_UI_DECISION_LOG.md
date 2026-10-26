# Portal UI Decision Log

## Visual Shell

- Use one module-owned header row instead of a global topbar plus module toolbar.
- Move the brand banner into the sidebar header.
- Hide the brand banner when the sidebar is collapsed.
- Keep the theme toggle as the last action in each included module header.

## Settings Placement

- Put worksheet and puzzle type selection in the settings pane, not the header.
- Add a separator after the type selector to distinguish worksheet identity from worksheet options.

## Historical print action labels (superseded below)

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

## Historical layout (superseded below)

- Use a fixed settings pane and fixed rendered-page pane.
- Add an empty right-side pane that absorbs extra width, including when the sidebar collapses.
- Normalize printable module backgrounds across light and dark modes.
- Dictionary Builder uses the same header/settings/main/right-pane structure, with its word results as the main pane instead of a rendered worksheet page.


## 2026-10-16: Tablet shell, editable guidance and distribution targets

Supersedes the historical fixed-pane/empty-right-pane decision. Desktop settings/preview widths remain; compact mode uses original settings DOM in an accessible overlay and gives remaining width to guidance. Below the measured minimum pane budget, switch Preview/Guide. Use CSS viewport sizes and dynamic height, with no device detection or orientation lock. Preserve one header and existing action labels.

Use explicit per-mount/subtype cleanup and generation guards rather than a global DOM mutation observer for lifecycle. Fit the preview viewport in width and height; retain separate Certificate stage and Dictionary results adapters. Physical Letter dimensions and Seyes print geometry are unchanged.

Guidance is independently editable HTML plus optional scoped CSS and local raster images. Build-time parser validation/inlining solves nested raw-HTML image references. Initially reject srcset/SVG/remote images and inline style rather than silently shipping unresolved resources. Preserve Dictionary Notes/Detail and add the missing Phonics guide. Videos remain external watch links.

Preserve the portable single file and add a separately configured hosted artifact. Locally package fonts/icons and the already-used document parser versions for offline fidelity. License notices accompany both targets. App identity equals the stable hosting directory. Precache required files completely before activation, scope cache cleanup to this app, and offer a deliberate update requiring consent across tabs. Offline does not include Wiktionary, external videos/sites or guarantees about device speech and print services.

Prepare a destination-repository workflow template and allowlisted package only. Owner/name and release authorization remain external inputs; no repository creation, push or Pages deployment is implied. Physical Android/printing/install checks require a real device.

The desktop threshold is tuned to 1480px: 240px navigation + 300px settings + 660px preview + 280px minimum guide. The proposed 1440px boundary left only 240px for guidance; smaller windows use compact settings/navigation instead. This is a measured budget adjustment, with the 1920px layout preserved.

Current header action labels are Print and Export. The earlier Print PDF/Export PDF label decision is superseded; the shared native print and hidden-frame direct export contracts remain.

## 2026-10-16 — Retain settings and loaded dictionaries on the device

User validation confirmed PWA installation, navigation, PDF export, page/Seyes rendering and print working during continued testing. Committed the reviewed tablet/content/PWA implementation as 680518e before starting persistence.

Persist small settings in namespaced localStorage and larger tool workspaces/files in IndexedDB. Keep the namespace stable across releases and separate it from service-worker caches. Use explicit state adapters for dictionaries and Handwriting presets; retain existing Clear/base-removal behavior. Shared settings restoration follows actual Math/Writing subtype lifecycles. Fail visibly and continue working when storage is unavailable; do not overwrite a previous complete workspace after a failed save. Clear saved data is deliberate, scoped, and prevents older open tabs from writing back cleared records. Ordinary simultaneous edits use the last completed save, without cross-tab state merging. Retention is local to the browser/profile/origin, and separate copies remain necessary. Details: docs/LOCAL_DATA.md.

## 2026-10-19 — Keep shared storage notices outside tabbed settings rows

A report of inaccessible installed-app Writing settings was reproduced in the desktop hosted artifact: Handwriting and Phonics tab panels had zero width. Their settings panes were horizontal flex rows; appending the shared device-storage notice made it another column and consumed the form's space. This was a shared layout fault, not a storage-permission requirement.

Group the original tab strip and panel nodes into a dedicated flex row, with the shared close control and storage notice above/below it in a vertical pane. Keep the tab strip, active panel and bounded footer independently scrollable at short heights. Preserve existing control nodes, state and subtype cleanup. Regression checks must verify readable, focusable fields inside pane bounds across desktop and compact widths, not just the existence of the Settings dialog. Check every route and all Math/Writing subtypes against actual production file/hosted artifacts.

## 2026-10-19 - Version derived phonics analysis independently of local content

Use engine version plus compiled constructs hash to invalidate derived Dictionary Builder/TXT phonics records after pronunciation corrections. Preserve files, user metadata and original flag evidence. Imported CSV and legacy unknown-origin Phonics analyses retain their existing pass-through behavior; an explicit Source > Refresh analysis action opts into current rules without resetting selection/order. The nine-flag review and dialect choices are documented in docs/PHONICS_NINE_FLAG_REVIEW.md and the phonics decision log.

## 2026-10-26: Word Practice and shared Statement stock

Implement Word Practice as a format in the Handwriting Lines family, retaining the existing shell, dictionary picker, fonts, ruling, margins, workspace and shared print/export. The prototype is a visual/feature reference only; its duplicate per-cell full-width lines and CDN export code are not imported. Emit ruling once per row and paginate deterministic word/ruling blocks. Full-page blank ruling retains the entered words. Primary and single ruling are supported; the unrelated Seyes-style option is unavailable in this format.

Physical paper stock is a shared registry and printable-node contract, not a Word Practice flag. Statement is 5.5 x 8.5 inches / 396 x 612 PDF points. Keep Letter defaults and existing desktop geometry. All Handwriting Lines formats adopt paper-aware pagination now. Broader worksheet adoption is an explicit second phase: reflow and validate each generator; do not shrink existing Letter worksheets. Dedicated Seyes geometry and Certificate landscape require separate output checks. See docs/WORD_PRACTICE.md for the phase boundary and validation.

Actual exported-page inspection exposed a pre-existing font fallback in SVG raster export: computed font-family names did not carry bundled fonts into the separate SVG image context. Shared export now embeds only the matching local @font-face rules in each serialized page. Print geometry, PDF image encoding and offline independence are retained; no remote font fetch or new dependency was introduced.
