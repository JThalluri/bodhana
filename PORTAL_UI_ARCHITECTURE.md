# Portal UI Architecture

## Tool Shell

Included tool modules should follow this screen structure:

```text
sidebar | module header
        | settings pane | main work/preview pane | editable guide pane
```

The module header is the only visible header row. It contains the module title/status on the left, actions on the right, and the theme toggle as the final item.

## Shared Layout Primitives

Use shared classes for the common layout:

- `.tool-shell`
- `.tool-header`
- `.tool-header-main`
- `.tool-header-title`
- `.tool-header-status`
- `.tool-header-actions`
- `.tool-body`
- `.tool-settings`
- `.tool-preview`
- `.tool-preview-scroll`
- `.tool-pages`
- `.tool-info-pane`
- `.tool-theme-slot`

Module-specific classes may remain for controls and worksheet rendering, but module containers should adopt these primitives so preview size, spacing, and sidebar collapse behavior stay consistent.

Dictionary Builder uses the same shell primitives, but its main pane contains extracted word results rather than Letter-sized worksheet pages. Its data extraction, filtering, deduping, and download behavior are outside the layout contract and should remain unchanged until the separate Dictionary Builder feature redesign.

## Page Preview Contract

- Printable pages remain actual Letter-sized DOM nodes for print.
- Screen preview scaling must not alter print geometry.
- Print media rules reset preview scaling and hide portal chrome.
- At 1920x1080, the middle pane should show one full page without relying on the right pane width.

## Seyes Contract

Seyes uses deterministic millimeter geometry. Its pagination, grid SVG, text placement, and print-window CSS are treated as protected architecture. Visual shell changes may move controls and resize the screen preview, but they must not change printed geometry.

## PDF Direction

Native `Print` is the quality baseline. Direct `Export` for generated non-Seyes worksheets uses a shared hidden print-layout frame, renders each Letter-sized page at high resolution, and embeds those page images into a PDF. This avoids screen-preview zoom drift while matching the validated print geometry.

The exporter must not rasterize the visible preview pane directly. It should render from the same print-layout contract used by `Print`: Letter page, zero browser page margin, module print overrides, all rendered pages included, and portal chrome excluded.

Seyes remains outside direct Export PDF for now. Its trusted output path is still the dedicated print window because its 8mm grid and text placement require physical validation.

Printed and exported worksheet pages include a small top-right `Bodhana` watermark implemented as real page markup rather than a pseudo-element, so the same mark survives print windows and PDF serialization.


## Responsive screen shell (2026-10-16)

Desktop at 1480px and wider retains inline settings, the existing 660px preview column, a flexible guide and one header. Below 1480px navigation defaults to a rail and Settings opens the original form as a modal overlay. Navigation and settings share one overlay owner, focus trapping/restoration, Escape/backdrop handling and restored inert state. No cloned form trees are created. The desktop navigation preference is independent of responsive defaults. At 995px and below the 56 + 660 + 280px pane budget cannot hold both panes; Preview/Guide switches the existing pane instances. A 44px menu rail remains available below 769px, including on tool routes whose topbar is hidden. Viewport height uses dvh with vh fallback.

src/shared/tool-shell-controller.js owns per-tool controls and disposal. Ordinary synchronous routes integrate at router mount; Math and Writing integrate after each actual subtype render. Both router imports and asynchronous arithmetic mounts have generation guards. Subtype replacement closes overlays and removes observers/listeners before replacing DOM.

src/shared/preview-fit.js observes the unscaled viewport, uses page offset geometry and applies one screen scale. Fit page considers width and height; Fit width permits vertical scrolling. The minimum scale is 20%, maximum 100%. Hidden previews remeasure when activated. Certificates uses the landscape stage adapter with its old automatic scale observer removed. Dictionary results never use worksheet scaling. Seyes physical geometry and its dedicated print document remain protected; its font dependency is now bundled rather than fetched from Google.

## Guidance and assets

src/content/tool-info/<stable-key>/content.html is trusted repository guidance. Optional scoped styles.css is eagerly discovered. src/shared/tool-info.js renders the fragment, wraps tables and provides a native dialog image viewer. Dictionary Notes uses this loader while Detail stays dynamic. Selecting a word reveals Guide on narrow layouts. Phonics now has a guide region separate from settings tabs.

scripts/vite-tool-info-plugin.mjs validates registered keys and markup with parse5, resolves real contained raster paths, checks MIME signatures, inlines images, watches dependencies and reports image sizes/deduplication. Initial support is ordinary img[src]; srcset, SVG, remote images and inline styles are rejected. External links open HTTPS pages in new tabs; videos are watch links only. See src/content/tool-info/README.md for the authoring contract.

## Distributions and offline boundary

npm run build still emits portable dist/index.html. npm run build:hosted emits dist-hosted with configurable BODHANA_BASE, a stable scoped manifest, icons, release metadata and a real service-worker file. Both entry points generate constructs first. All fonts/icons actually used and the existing PDF/DOCX/ODT readers are bundled locally, with license notices. Hosted registration is production-only; portable and Vite dev never register. Every app-shell asset is precached in a complete versioned scope cache. Updates wait for a deliberate action and consent from all responsive tabs; no automatic reload over unfinished work. Old caches are retained while multiple clients can use them. Wiktionary, external sites/videos and device speech remain online/platform dependent.

A dedicated playwright.portal.config.js exercises file URLs and a non-root production server; Workbench discovery is unchanged. Deployment packaging is allowlisted and the workflow template lives under deployment/pages-repository/.github/workflows, outside active source workflows. No destination or publication is assumed. See docs/DEPLOYMENT.md.

## Local user data (2026-10-16)

Settings and tool workspaces persist in browser storage independently of the PWA asset cache. Shared device-storage.js namespaces localStorage preferences and an IndexedDB workspaces store by stable application base (portable: file pathname), with versioned records and atomic writes. settings-persistence.js restores standard controls via existing handlers after each actual tool/subtype mount. Math/Writing dispatchers restore their own selection; asynchronous mounts and file readers remain guarded. Dictionary Builder, Word Puzzles, Phonics and Handwriting provide explicit workspace snapshots. Handwriting restores its state directly to preserve preset customisations. Files use structured-cloned binary ArrayBuffers, not synchronous base64 strings. Scoped Clear saved data invalidates older-tab writes and preserves offline asset caches. See docs/LOCAL_DATA.md for retention, failure and concurrent-tab semantics.

Tabbed settings panes retain their original tab-strip/panel DOM inside a shared tool-settings-tabs row. Shared close controls and the device-storage notice are vertical siblings outside that row. Never append a shared footer as another horizontal column beside the tab panels: it can reduce the form to zero width. The row and tab strip scroll within bounded heights; compact settings overlays keep this layout.

Phonics derived workspace records use `ANALYSIS_REVISION` (engine version + constructs hash). Dictionary Builder refreshes older engine-derived records during restore; captured flags remain historical. Phonics retains CSV/legacy analyses until an explicit Refresh analysis action, and refreshes known TXT-derived records on revision changes. `src/phonics/analysis-cache.mjs` replaces derived fields while preserving user metadata. See docs/PHONICS_NINE_FLAG_REVIEW.md and docs/LOCAL_DATA.md.

Reviewed American pronunciation entries are optional compiled constructs data. The shared tokenizer and sound resolver apply exact-word sound units before the generic spelling heuristic; curated entries suppress overlapping vowel-team bucket matches. Dictionary Detail renders full correspondence data, while the same records drive sound filters and worksheet boxes. Extended CSV carries string/JSON pronunciation metadata, retaining the base-column contract. Compiler validation and Workbench reachability/regression paths share these entries. See docs/PHONICS_AMERICAN_PRONUNCIATION_FIXES.md and tools/constructs-workbench/README.md for the authoring contract.
