# Statement paper rollout

Implemented locally on 2026-10-26, continuing the separate phase after Word Practice. All printable worksheet families now offer US Letter and Statement. Dictionary Builder remains a results view. Letter is still the default, including when older preferences have no paper setting. No framework, dependency upgrade, backend or native wrapper was added. The rollout was subsequently published as release e0e9b7eaba6c8b9d; see the publication record below.

## Investigation and implementation

The existing shared paper registry and print/PDF adapters already understood physical stock, but most generators still assumed Letter. Merely exposing the selector would have clipped questions, charts, call sheets and grids. This implementation changes each generator's native layout and pagination; screen fitting remains independent.

| Family | Statement behavior and limits |
| --- | --- |
| Arithmetic Tests | Two columns, up to 32 questions per physical page. Continue the original test and numbering until all requested questions appear. |
| Place Value, all 11 types | Measure questions and charts at the real width/height. Fixed-width chart columns wrap their labels. Hints retain all eight puzzles across pages. Skip-counting tables fit available width. Statement keys use separate, measured pages, including when the placement preference says Bottom. Letter placement behavior remains unchanged. |
| Fractions, all subtypes | One question column; preserve workspace/visual options. Add measured answer-key pages. Worksheets counts filled question pages, as before. |
| Money and Time, both subtypes | One question column with native pagination and matching keys; retain grade, difficulty, operations and workspace controls. |
| Phonics, all four activities | Retain selected words and physical writing-box dimensions. Stack labels above boxes; wrap groups and paginate intact word rows. Words per page is a maximum. |
| Sudoku | One or two puzzles per Statement page. Four/six options are unavailable on Statement and return on Letter. Retain every generated board; a stock change during deferred generation uses the current stock/tiling. |
| Math Games, all four types | One, two or four boards per Statement page, with density-specific text, diagrams and padding and all four font levels retained. Six/eight remain Letter-only. Keep all 60 Bingo calls and paginate call/key rows. Snake directions sit above the board; real START/FINISH spans survive raster export. |
| Math Puzzle Grid | New grids at most 18 by 18; retain difficulty, equation pool and blank rules. Fit native cells. Oversized custom values must fit both given and hidden-answer cells before output is enabled. |
| Word Puzzles, all three modes | New grids at most 20 by 20. Fit letter/cell size to the actual grid; continue complete word banks and jumbles on additional pages. Keep dictionary/word selections and solutions. |
| Seyes | Change canvas bounds and text pagination only; split overlong words without dropping characters on Statement. Keep exact 8 mm major/2 mm minor geometry, existing baseline/row controls, vector grid and dedicated Print path. |
| Certificates, all six templates | Native landscape Statement (8.5 by 5.5 inches), with reflowed artwork/text. Retain the landscape fitting adapter and Print-only output. Large notes must be shortened to fit. |
| Handwriting Lines | Existing Statement support in every format remains intact, including Word Practice quarter-inch margins and exact primary ruling. |

Stock layouts keep normal worksheet content within the actual page. Certificates and Seyes retain their own physical layout contracts; Word Practice retains its independent quarter-inch defaults. A smaller Statement watermark stays within the normal quarter-inch margin; Letter branding is unchanged.

## Shared integration contract

- `src/shared/paper-size.js` supplies physical inches, CSS pixels and PDF points, a native selector and page declarations. Portrait Statement is 528 by 816 CSS pixels / 396 by 612 PDF points; landscape reverses those dimensions. Stable control IDs use existing per-tool preference storage.
- `paper-measurement.js` temporarily measures the original Math page host outside hidden previews, restoring its exact position in a finally block. Guide mode and compact settings must not affect pagination. Money/Time retain stable host references while it is moved.
- `paper-pagination.js` measures intact rows at native size even when hidden, creates continuation pages and retains every row. Word-bank continuations omit the already-printed grid. Single oversized rows remain visible for correction.
- `paper-fit-guard.js` checks Statement page boundaries and game/number cells, including hidden Math Puzzle answers. It gives an accessible explanation and disables Print/Export until content fits. It cleans up observers, animation frames and font listeners with the actual module shell.
- Shared screen fitting still reads actual page geometry. Ordinary modules use existing Print/Export; Seyes keeps its dedicated path and Certificates stays Print only. No settings forms were cloned.

Guidance fragments, architecture, decision log, integration/prototype guidance, local-data documentation and the phase-two backlog are updated. Unsupported density is explicit rather than silently shrinking an entire Letter worksheet.

## Verification

Baseline: 1,256 unit tests in 29 files passed before implementation; no baseline unit failures. Copied the pre-rollout portable build to artifacts/statement-baseline/index.html. Seeded baseline/current comparisons cover all 12 remaining families: page count, native geometry, padding, fonts, text and Seyes SVG markup match. Cropped Letter worksheet PNGs are byte-identical in all 12 cases, including after the final game correction. The harness loads Phonics words before measuring and treats harness errors as failures.

Final unit result: 1,256/1,256 passed. Final full production portal run: 77/77 passed, including all 27 new Statement checks (5.6 minutes).

The 27 added Statement production checks cover actual file URLs and hosted /gurukool/ artifacts: all place-value/fraction/money/time subtypes; wide charts and keys; all Phonics activities; retained numbered arithmetic; 24 Sudoku boards; all games/modes and S/M/L/XL fonts; puzzle grids/word-bank/jumble continuations; all certificate templates; exact Seyes geometry; hidden Guide generation; offline reload and per-family stock retention; tablet Settings access; oversized content warnings and recovery; actual print frames and downloaded PDFs. Desktop 1920x1080 and tablet 800x1024 screenshots include dark/offline states. Existing viewport, settings-access, phonics, handwriting, persistence and PWA regressions are retained.

An initial broad run passed 76/77. The existing failed-update PWA test could check a cache before installation had reached its terminal failure because registration.update() may resolve first. Its assertions were retained and the test now waits for the existing Offline update failed signal. All four focused PWA checks then passed, including initial/update failures, multi-tab approval/defer, waiting-release reload, offline relaunch, cache repair and minimized status. No service-worker runtime change was needed. This was a verification-harness finding, not a baseline product failure.

Verified all 44 generated Statement PDFs / 104 pages: portrait MediaBox [0 0 396 612], landscape certificates [0 0 612 396]. Print/export page counts match for every paired output. All 20 raster exports contain 1584 by 2448 pixel page images, and pixel checks verify their margin watermark. Actual exported JPEGs were extracted and visually inspected, including chart typography, puzzle cells, Snake layout and margin branding. Quantitative pixel checks confirmed the watermark is present in the actual grid/game JPEGs, despite an initially misleading image preview. The PDF metadata reader warned that optional canvas polyfills were unavailable; metadata parsing and direct JPEG extraction passed, and browser screenshots/JPEG inspection supplied visual verification.

Commands actually used: npm test; npm run build; npm run build:hosted (configured /gurukool/ base); npm run audit:build; npm run package:pages; npm run test:portal. Focused matrix: npm run test:portal -- statement-paper. Workbench configuration is unchanged.

Evidence in artifacts/: statement-final-unit.txt, statement-final-full-portal.txt, statement-pwa-rerun.txt, statement-letter-comparison.json, statement-bundle-sizes.json, statement-pdf-geometry.json, statement-final-audit.txt, statement-final-package.txt; statement-*-print.pdf, statement-*-export.pdf/.jpg and desktop/tablet screenshots. Earlier intermediate logs are retained separately.

## Local artifacts and remaining gates

| Artifact | Bytes | Gzip bytes |
| --- | ---: | ---: |
| dist/index.html, portable | 5,834,918 | 2,664,198 |
| dist-hosted/index.html | 5,839,358 | 2,665,795 |

Complete local Pages package: artifacts/pages-release/, release e9736e86361ad454, configured for /gurukool/. BODHANA_BASE remains configurable. The allowlisted package includes the existing destination workflow, manifest, icons, worker, metadata and licenses. No external repository push, Pages publication or live HTTPS claim is part of this rollout.

Physical Android installed-mode use, real Statement stock/printer calibration (including Seyes measurements), printer-dialog size/orientation and manual classroom review remain device gates. Desktop browser automation and browser-generated PDFs do not pass those gates. Online dictionary/pronunciation/video references and platform speech retain their existing dependency boundaries. The supplied prototype and unrelated handoff/plan files remain untouched.

Implementation checkpoints on codex/tablet-pwa-persistence: 59dc2f5 (shared stock, Math/Phonics), 6230e7d (remaining families), 2bc99dd (final Snake visual/export correction). Verification and documentation are a separate review checkpoint.

## Follow-up: compact Math Games (2026-10-26)

The initial one-board restriction was a conservative UI limit, not a generator/pagination constraint. Following visual review, Statement now offers one, two or four boards for every game. Two stack vertically; four use a two-by-two grid. Density-specific fonts, fraction diagram sizes and cell padding retain all questions and writing space without changing physical page dimensions or quarter-inch margins. Existing saved one/two/four choices remain valid; Letter six/eight changes to four when selecting Statement. Letter six/eight options return on Letter. Large custom arithmetic and XL combinations can still require fewer boards; the existing fit guard explains this and blocks clipped output. The displayed page count now includes continued call/key pages.

Verification for this follow-up: npm test passed 1,256/1,256; npm run test:portal passed 79/79 against the portable file and production /gurukool/ hosted path. The new compact matrix covers two/four boards, all four games, all three question modes and S/M/L/XL (96 combinations per artifact), exact board/cell counts, eight-board two-sheet output, complete 60-call Bingo sheets, all 64 Match pair mappings, offline reload, saved density/stock, tablet preview and overflow/recovery. Twenty baseline/current Letter page screenshots (four games at all five densities) were pixel-identical. Desktop/native-page and tablet screenshots were inspected. No baseline product failure was found. An initial focused run exposed an older font test implicitly switching from one to four boards: its oversized three-digit XL arithmetic correctly triggered the guard. The historical test now explicitly selects its original one-board layout; compact overflow behavior has separate coverage.

Inspected 22 compact-game PDFs / 58 pages, including an additional two-board fraction-equation print and downloaded export: every page is 396 by 612 points and paired print/export page counts match. All 11 raster exports contain 1584 by 2448 page images. Browser PDF.js rendering of hosted exported first/last pages and direct image inspection cover boards, equations, arithmetic, Snake START/FINISH and continued calls/keys. Quantitative pixel inspection confirms Snake grid lines in the actual exported image; apparent missing lines in a resized image preview were a viewing artifact. Node PDF.js warned about absent optional canvas polyfills; browser rendering supplied visual QA without adding dependencies. Physical Android use and Statement printer calibration remain pending.

Both production builds, distribution audit and local Pages packaging passed. Local release c26f3dc080e02101 is staged in artifacts/pages-release/; this follow-up is not published. Portable HTML: 5,836,469 bytes (2,664,469 gzip); hosted: 5,840,909 bytes (2,666,055 gzip). Evidence: artifacts/game-density-{unit,focused,full-portal,hosted-build,audit,package}.txt; game-density-letter-comparison.json; game-density-matrix.json; game-density-pdf-geometry.json; game-density-bundle-sizes.json; *compact* screenshots and print/export PDFs. Earlier focused findings remain separate from the final passing suite.

## Publication record (2026-10-26)

The complete rollout and compact Math Games follow-up are live at https://jthalluri.github.io/gurukool/ as release e0e9b7eaba6c8b9d. Source merged main 52c25fb and hosting artifact 34044b0 remain in separate repositories. The single Pages workflow 40418132785 succeeded. The final merged/cleaned checkout passed all 1,256 unit and 79 production portal tests. Actual HTTPS asset equality, nine routes, native two/four-game layouts, live writing/game PDF output, offline relaunch and a consented upgrade from the previous live release passed. See DEPLOYMENT.md for detailed evidence and remaining physical-device checks. Earlier local-only release entries above are historical checkpoints.
