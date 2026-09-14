# Bodhana – Architecture Decision Log

Non-obvious decisions, with context so they can be revisited intelligently.

---

## Seyès Worksheets: Grid drawn as SVG vector (not CSS gradients)

**Decision:** Render the Seyès rules as one `<line>` per rule via `seyesGridSVG()` in `src/worksheets/seyes-grid.js`, shared by the screen preview and the print window.

**Rejected:** Three `repeating-linear-gradient` layers. They looked correct but intermittently dropped a minor rule — reported as a missing 2nd minor line in the 3rd block, 1st in the 6th, 2nd in the 19th. The browser rasterises a gradient into one tile and repeats the bitmap; because the rules fall on fractional device pixels (2mm = 7.559px, 8mm = 30.236px at 96dpi) the per-tile rounding error accumulates until a rule collides with its neighbour's pixel row and vanishes.

**Also rejected:** baking all four rules into a single 8mm tile, and giving each minor rule its own 8mm-period layer. Both reduced the frequency but neither eliminated it — any repeated tile at a fractional period accumulates the same error.

**Benefit:** Printing now emits true vector at the printer's native resolution instead of an upscaled bitmap tile.

**How to apply:** Do not reintroduce tiled gradients for the grid. If the geometry changes, change the constants in `seyes-grid.js` — both renderers consume it.

---

## Place Value Worksheets: Measurement-based pagination

**Decision:** Build pages by appending question nodes into a fixed 11in page and measuring `scrollHeight` vs `clientHeight` of the flexible `.pv-ws-content` area, starting a new page when the next item would overflow (`flowIntoPages` in `pv-ui.js`).

**Rejected:** A fixed questions-per-page count. Item height varies enormously by worksheet type — a one-line rounding prompt vs. a multi-row place value chart — so any single number either overflows the tall types (charts were being split through the middle of their boxes) or wastes most of the page on short ones.

**Details:**
- Pages are measured with the preview `zoom: 0.75` temporarily removed (`.pv-measuring`), because text does not scale perfectly linearly under `zoom`; a page that just fits at 0.75 could overflow on paper.
- A 4px safety margin absorbs remaining screen/print rounding differences.
- Overflow flows onto "continued" pages rather than being clipped, so the requested question count is always fully delivered.
- An item taller than a whole page is kept rather than skipped, otherwise the packing loop could not advance.

---

## Seyès Worksheets: Font — Andika (not Consolas)

**Decision:** Use `"Andika", "Comic Sans MS", "Chalkboard SE", sans-serif` for Seyès text.

**Rejected:** Consolas (monospace). Consolas was used briefly because its fixed glyph width fits the 8mm cell perfectly and keeps PDF size small (~50KB). However, Andika is specifically designed for emerging readers and handwriting practice — a primary goal of Seyès worksheets.

**Tradeoff:** Andika is loaded via Google Fonts CDN. Chrome/Edge embed the font when printing to PDF, adding ~400KB to the file. Accepted by product owner.

**How to apply:** Always use the Andika stack for the Seyès text area (`src/worksheets/worksheets.css`) and in the print window HTML (`buildPrintHTML` in `src/worksheets/ui.js`).

---

## Seyès Worksheets: Geometry-based pagination (not DOM measurement)

**Decision:** Calculate `linesPerPage` and `availUnits` from pure mm math, not by measuring DOM elements.

**Why:** Seyès dimensions are fully deterministic — every cell is 8mm, paper is 8.5×11in, margins are exact multiples of 8mm. DOM measurement would add async complexity and risk rounding errors.

**How to apply:** All pagination logic lives in `paginateText()` in `src/worksheets/ui.js`. If grid dimensions change, update the constants `PAGE_W_MM`, `PAGE_H_MM`, `CELL_MM`, `RIGHT_PAD_MM`.

---

## Seyès Worksheets: Print via new window (not @media print)

**Decision:** "Print / Save PDF" opens a new `window.open` tab with standalone HTML, rather than using `@media print` inline.

**Why:** The portal chrome (sidebar, topbar) creates noise in `@media print`. A new window gives a clean page with only the paper content. CSS variables are baked in at print time so calibration is preserved exactly.

**How to apply:** `buildPrintHTML()` in `src/worksheets/ui.js` generates the standalone HTML. If you need to change what appears in print, change this function (not the CSS media query).

---

## Math Worksheets: New module (not rename /math)

**Decision:** Create a new `/math-worksheets` module rather than renaming or modifying the existing `/math` module in place.

**Why:** The `/math` route may be bookmarked by users. The new module consolidates Math Tests + Place Value under one roof. `/math` route is kept pointing to the same module so existing links continue to work.

**How to apply:** Both `/math` and `/math-worksheets` routes load `src/math-worksheets/index.js`. The sidebar and home page link to `/math-worksheets` as the canonical URL.

---

## Math Tests CSS: import in ui.js (not only index.js)

**Decision:** `src/math/ui.js` imports `./math.css` directly, even though `src/math/index.js` also imports it.

**Why:** When `math-worksheets/ui.js` does `await import('../math/ui.js')` to dynamically load the sub-type, Vite only executes `ui.js` — it never runs `index.js`. If the CSS import lives only in `index.js`, the two-pane flex layout and all print rules (`@media print`, `page-break-after`) are absent. The practical result was questions rendering as unstyled flowing text with no page breaks.

**How to apply:** Any module whose `ui.js` is dynamically imported from another module must include its own CSS import. Do not rely on `index.js` being the entry point.

---

## Math Worksheets: Place Value worksheet type label in margin (not header)

**Decision:** The worksheet type name is rendered as a small (`8px`, uppercase, `color:#bbb`) label at the far right of the header row, not as a large centered title.

**Why:** A full-width title wastes vertical space. Teachers know which worksheet they printed; the label is a discreet reference for filing, not primary content.

**How to apply:** `.pv-ws-typelabel` in `math-worksheets.css`. Keep it `font-size:8px` and `color:#bbb` — it should recede visually.

---

## Build: vite-plugin-singlefile

**Decision:** Use vite-plugin-singlefile to produce a single self-contained `dist/index.html`.

**Why:** Teachers need to share or use the tool without a server. A single HTML file can be emailed, saved to a USB drive, or hosted on a simple static server with no build pipeline on the receiving end.

**Tradeoff:** All JS/CSS is inlined (base64 for binary assets). Bundle size matters — avoid bundling large libraries directly. Use CDN `<script>` / dynamic script injection for heavy one-off dependencies (html2pdf.js).

---

*Last updated: 2026-09-12 (Math Worksheets CSS isolation, PV type label)*
