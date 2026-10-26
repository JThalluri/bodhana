# Bodhana tablet layout content and PWA implementation plan

Prepared 2026-10-16. Repository baseline: Vite 5, vanilla JavaScript modules, shared CSS shell, hash routing, and a single-file production build.

Implement tablet support first, then independently maintained module content, then a GitHub Pages distribution and installable PWA. Preserve the desktop workflow and downloadable HTML throughout. This plan specifies local implementation and validation; publishing to an external repository is a separate release action once its destination is supplied.

## Outcomes and boundaries

- Keep the current 1920 × 1080 desktop layout and one module header.
- Adapt to tablet browser windows using available CSS viewport dimensions, including reduced height from browser controls and the keyboard.
- Default to collapsed navigation on tablets, move settings into an overlay drawer, fit worksheet previews to their containers, and let the information pane consume remaining width.
- Use a single workspace view at narrow widths when worksheet and information cannot both remain usable.
- Store module guidance in editable HTML fragments with optional CSS and normal source image files. Bundle local images automatically. Open videos externally; do not embed video players.
- Publish build artifacts through a separate GitHub Pages repository without needing a custom domain or maintaining a server.
- Add PWA installation and deliberately managed offline caching after the browser experience works.
- Keep generators, phonics analysis, printable geometry, dictionaries, and user data behavior outside the redesign except where integration requires a narrowly scoped fix.
- Exclude native wrappers, app stores, authentication, backend storage, a CMS, and broad visual redesign.

## Repository facts and integration map

Paths below are relative to the repository root. Proposed files are identified as new; verify the latest checkout before implementation.

| Existing area | Current behavior | Integration work |
| --- | --- | --- |
| `vite.config.js` | `viteSingleFile()`, very high inline limit, `inlineDynamicImports: true`, `dist` output | Preserve portable build; add explicit hosted mode and snippet asset transform |
| `package.json` and lockfile | Vite 5, Vitest 2, Playwright; constructs generation through predev/prebuild/pretest | Retain lifecycle steps for every new build/test entry point |
| `index.html` | Navigation, portal containers, shared styles; external Google Fonts and Font Awesome | Accessible navigation controls, shared responsive styles, hosted-only manifest integration; local offline dependencies |
| `src/portal/shell.js` | Sidebar collapse above 768px; mobile drawer at or below 768px | Shared layout policy, drawer coordination, rotation handling |
| `src/portal/router.js` | Hash routes, module mount and cleanup; mount return value expected synchronously | Integrate lifecycle without assuming all subtypes are ready when route mount returns |
| `src/styles/tokens.css` | 240px sidebar, 56px rail, 300px settings, 660px preview, 0.72 preview scale | Introduce responsive dimensions and meaningful minimum pane widths |
| `src/styles/components.css` | Fixed settings/preview flex bases with `!important`; header grid reserves settings width | Shared responsive shell/header override; prevent legacy rules defeating tablet layout |
| `src/styles/layout.css` | Main area uses 100vh; global mobile rules at 768px | Dynamic viewport height with fallback; reconcile navigation breakpoint |
| `src/shared/shell-ui.js` | Tab markup and wiring shared by Dictionary Builder and settings UIs | Extend shared controls carefully; avoid changing unrelated tab instances |
| `src/math-worksheets/ui.js` | Replaces subtype DOM; arithmetic UI loaded asynchronously | Initialize and dispose shared enhancements after each actual subtype render |
| `src/worksheets/index.js` | Dispatches Seyes and Handwriting Lines, replacing tool DOM | Reinitialize enhancements per subtype and dispose before replacement |
| `src/dictbuilder/ui.js` | `NOTES_HTML`; Notes and live Detail panels; auto-select Detail on word selection | Extract Notes only; preserve live Detail, requests, selection, flagging, and speech |
| `src/phonics-worksheets/ui.js` | Shared settings/preview classes, no information pane | Add pane; do not confuse settings tabs with information tabs |
| `src/appreciation-certificates/certificates-ui.js` and CSS | Landscape preview; own ResizeObserver, stage dimensions, scale | Use a compatible adapter; avoid applying two scales |
| `src/worksheets/ui.js` and `worksheets.css` | Seyes screen zoom and protected physical grid/print window | Screen-only adaptation; retain all physical geometry and print code |
| `src/shared/print.js`, `export-pdf.js`, `worksheet-brand.js`, `src/styles/print.css` | Existing print/export engines and reset rules | Preserve output; exclude new drawers, guide controls, and overlays |
| Module CSS | Inconsistent responsive breakpoints; Money/Time hide guide below 768px | Consolidate shell behavior while preserving module-specific visuals |
| `playwright.config.js` | Test discovery limited to `tests/workbench` | Add a dedicated portal configuration without breaking Workbench tests |
| `CLAUDE.md` | Useful codebase guide with stale two-pane, route, and export descriptions | Reconcile touched documentation with current implementation |

### Module content keys

Use stable explicit keys, not route-derived filenames. Aliases must resolve to the same active subtype content.

| Route or dispatcher | Content key and owner |
| --- | --- |
| `/math`, `/math-worksheets`, `/fractions` | `math-tests`, `place-value`, `fractions`, `money-counting`, `time-problems` from active category; `/fractions` initially selects fractions |
| `/math-games` | `math-games`; add activity-specific keys only when content needs them |
| `/word-puzzles` | `word-puzzles`; optionally refine by puzzle type later |
| `/math-puzzles` | `math-puzzles` |
| `/sudoku` | `sudoku` |
| `/dict-builder` | `dictionary-builder` for Notes; Detail remains dynamic |
| `/worksheets` | `seyes` or `handwriting` from active type |
| `/certificates` | `certificates` |
| `/phonics-worksheets` | `phonics-worksheets` |
| `/` | Home remains a responsive card page; no tool pane required |

## Phase 0 establish the baseline

1. Read applicable `AGENTS.md` instructions, `CLAUDE.md`, `PORTAL_UI_ARCHITECTURE.md`, `PORTAL_UI_DECISION_LOG.md`, and integration/prototype guidelines. Inspect Git status and preserve unrelated changes.
2. Run existing unit tests and portable build. Record preexisting failures separately. Capture representative desktop screenshots in both themes and save generated multi-page print/export samples.
3. Inventory all current printable page selectors, page orientations, subtype renderers, cleanup behavior, external dependencies, and header actions. Verify actual code instead of relying on stale documentation. The current exporter is a custom shared implementation; do not introduce an old CDN exporter based on the guide's historical notes.
4. Add a dedicated `playwright.portal.config.js` and portal test directory when functional changes begin. Provide named scripts for portal testing and local production serving. Keep Workbench discovery and Vitest's e2e exclusions intact.
5. Record initial desktop screenshots and representative bundle size in implementation notes. Use the existing lockfile; do not upgrade Vite or unrelated dependencies as part of this work.

Acceptance: baseline behavior and existing failures are distinguishable from regressions, and the intended files and module adapters are identified.

## Phase 1 implement the responsive shell

### Layout policy

Start with the following proposed boundaries, then tune against actual module headers and minimum readable pane sizes. Widths are CSS pixels, not device hardware pixels.

| Mode | Starting rule | Navigation | Settings | Workspace |
| --- | --- | --- | --- | --- |
| Desktop | 1440px and wider | Existing expanded default; user can collapse | Inline | Current preview width plus flexible guide |
| Compact | 960px to below 1440px | 56px rail; expanded navigation overlays | Drawer | Worksheet and guide side by side when budget permits |
| Narrow | Below 960px, or insufficient pane budget | Menu button and navigation drawer | Drawer | Preview/Guide switch, one visible at a time |

Define the side-by-side budget from navigation width, minimum preview width, guide minimum near 280–320px, and padding/borders. Example: 1024 − 56 − 660 = 308px before minor adjustments. Do not preserve a simultaneous guide by shrinking worksheets indefinitely. Permit a narrower preview only with a readable zoom workflow. Retain extra guide width when navigation or preview contracts.

Viewport height also matters: short landscape windows should change preview scale, not silently change the selected module or settings. Use `100dvh` with `100vh` fallback where appropriate and keep independently scrollable panes. Test actual Chrome toolbar and Android keyboard behavior; no user-agent tablet detection or forced orientation.

### Shared implementation

Proposed new files: `src/shared/tool-shell-controller.js`, `src/styles/responsive.css`. Names may be adjusted to match repository conventions.

- Add one owner for layout mode state, using `matchMedia` and measured workspace width where needed. CSS handles layout; JS coordinates overlay state, focus, and transitions. Keep breakpoint definitions consistent.
- Add shared Settings and Preview/Guide controls to existing module headers, preferably through reusable markup helpers. Preserve action labels and theme toggle ordering. Reflow the header grid when settings is no longer inline; avoid a blank 300px column.
- Establish an overlay policy: navigation and settings do not remain open simultaneously. Use a reliable stacking order above sticky headers and a shared close mechanism.
- Make the existing settings node the drawer content; do not clone forms or generate a second settings tree. It may remain in its original tool subtree with overlay positioning to preserve existing scoped queries and CSS. If a dialog container is introduced, verify parent-scoped event delegation before moving nodes.
- Provide an accessible name, close button, Escape/backdrop handling, focus trapping, focus restoration, and inert background while modal. Restore all attributes on close and on unmount. Keep focused controls reachable above the keyboard.
- Preserve values and worksheet output when opening/closing settings or rotating. Do not turn drawer closing into Reset, Generate, or Apply. Retain live updates in modules that already use them.
- Keep user navigation preference distinct from responsive defaults. Returning to desktop must not leave a modal backdrop, inert page, body lock, or inaccessible settings behind.
- Keep header actions reachable by touch. Prioritize core actions and allow intentional wrapping; do not introduce duplicate toolbars. Review controls for adequate touch hit areas without scaling the whole interface.

### Lifecycle integration

- Return explicit cleanup functions from shared controllers; disconnect observers and remove listeners when tool DOM is replaced.
- Initialize after each UI builder finishes inserting its actual DOM, including Math and Writing subtype switches. A router-only hook is insufficient.
- In Math, sequence asynchronous subtype mounting and discard stale completion when the user changes categories or routes rapidly. If router mounting is changed to await promises, update its contract and add route-generation guards; otherwise preserve synchronous route mount and use scoped subtype lifecycle hooks.
- On navigation/subtype replacement close overlays before removing their controls. Prevent focus restoration into detached elements. Avoid broad MutationObservers as a substitute for known mount/unmount hooks.
- Consolidate conflicting responsive shell rules, especially Dictionary Builder and Money/Time. Keep module-specific form/grid adaptations.

Acceptance: every route and subtype works in all three modes, controls and state survive rotation, overlays are operable by touch and keyboard, and no global horizontal page overflow occurs. Detailed tables may scroll locally. Desktop layout remains recognizable.

## Phase 2 implement preview fitting

Proposed new file: `src/shared/preview-fit.js`, returning an explicit dispose function and supporting per-module adapters.

1. Observe the unscaled preview viewport with ResizeObserver. Measure unscaled page geometry using intrinsic dimensions or a controlled unscaled measure; do not feed already zoomed dimensions back into the fit calculation.
2. Compute fit-page as the minimum of available width/page width and available height/page height, subtracting padding and allowing scrollbars. Clamp to a documented useful range and do not upscale by default.
3. Provide Fit page and Fit width modes using existing header space sensibly. Fit width allows vertical scrolling for reading. Preserve user's choice per mounted tool across drawer changes.
4. Apply scaling once at a preview-specific scope. The existing `--tool-page-scale`/CSS zoom path is the default for compatible worksheets. Update on initial generation, regeneration, orientation or container changes, and page orientation changes. Do not observe a scaled child in a loop.
5. Certificates retains its landscape stage mechanism through an adapter; reconcile its current automatic scale and label with shared controls. Seyes retains physical dimensions and its dedicated print path. Dictionary Builder uses responsive results layout rather than worksheet zoom.
6. Test multi-page content, scroll reachability, centering, and transitions when returning from Guide view. A hidden preview may report zero size; remeasure on activation rather than calculating an invalid scale.
7. Audit hidden print/export frames: reset screen zoom, transforms, stage sizes, and inherited custom properties as needed. Exclude overlay UI from printed/exported markup. Screen improvements must not change page count, margins, watermark, or physical Seyes geometry.

Acceptance: full-page fitting works at short landscape heights; fit-width permits readable inspection; all pages remain reachable; no double scaling, observer loops, or print geometry changes occur.

## Phase 3 add independently maintained module content

### Source structure and rendering

Proposed structure:

```text
src/content/tool-info/
  README.md
  place-value/
    content.html
    styles.css          # optional
    images/
      number-chart.webp
  dictionary-builder/
    content.html
  ...one directory per content key...
src/shared/tool-info.js
src/styles/tool-info.css
scripts/vite-tool-info-plugin.mjs
tests/content/
```

- Discover `*/content.html` with literal Vite glob patterns and eager string imports, through the custom transform described below. Discover optional CSS with a literal eager import glob. Directory name is the stable content key; no hand-maintained import list for existing modules.
- A shared `renderToolInfo(target, key)` inserts a trusted fragment into a wrapper with `.tool-info-content` and `data-tool-info="<key>"`. The API returns cleanup if it attaches behavior. Modules supply their key once; routine HTML/CSS/image edits require no JS edits.
- Render into the existing information pane, remove `aria-hidden="true"`, and provide a labelled region and one vertical scrolling surface. Add the missing pane to Phonics Worksheets.
- For Dictionary Builder, move `NOTES_HTML` to the fragment and inject into Notes only. Keep tabs, `selectWord()` activation of Detail, and dynamic word rendering intact. Restrict wrapper queries to the intended pane to avoid matching settings tabs.
- Preview/Guide switching reuses the same pane instance. Do not duplicate IDs, lose Notes/Detail selection, or reset current guide scroll on a layout change. In narrow mode, define word selection to reveal Guide and activate Detail so the existing interaction remains visible.
- Initial content should describe existing UI behavior accurately: brief purpose, main workflow, settings guidance, and relevant tips. Migrate Dictionary Builder notes and remove stale internal phase terminology where it does not help users. Do not invent educational claims, attribution, external videos, or illustrations. Include a local test image/table fixture to validate support even if production content has none yet.
- Missing registered content keys should fail validation/build. Development may show a concise diagnostic; do not silently show another module's guidance.

### Content and CSS contract

- Accept HTML fragments with headings, paragraphs, lists, semantic tables, figures, images, normal links, and native details/summary disclosures. No full document/head/body wrappers or per-fragment scripts.
- Use shared typography, theme tokens, readable line height, and responsive spacing. Module CSS must be scoped under its `data-tool-info` key; importing a stylesheet does not isolate its selectors automatically.
- Add `container-type: inline-size` to the guide wrapper and use container queries when content layout depends on pane width. Avoid fixed-width content and viewport-based assumptions in snippets.
- Tables need captions/header cells as appropriate and an overflow wrapper; long URLs must wrap. Detailed images need an accessible shared enlarge viewer or in-app image view that works with data URLs. Do not rely on opening a data URL in a new browser tab.
- Video references are ordinary HTTPS watch links with `target="_blank"` and `rel="noopener noreferrer"`. Use a clear label indicating an external video. No iframes or video provider scripts. Other external links receive the same new-tab attributes through shared normalization or authoring validation.
- Keep snippets as repository-authored trusted content, and validate a narrow contract: reject script, inline event handlers, iframe, javascript URLs, unexpected resource links, and unsafe SVG content. This validator is not a general sanitizer for future uploaded HTML; user-authored uploads would require a separate security design.

### Local image bundling

Raw HTML imports do not process nested image URLs. Add a small Vite plugin using an HTML parser to transform fragment markup into an exported HTML string with resolved assets. Use a declared direct parser dependency rather than relying on a transitive package. Do not parse HTML or `srcset` with broad regular expressions.

1. Resolve local image paths relative to the fragment file. Use realpath containment checks against the allowed content asset tree; diagnose missing files, traversal, unsupported types, and invalid MIME types with source paths.
2. Preserve normal source files. Convert raster assets to correctly typed data URLs in generated output; supported self-contained SVG may use encoded data URLs after validation. No manually checked-in base64 copies.
3. Support `img[src]`, `img[srcset]`, and `picture > source[srcset]` with a proper candidate parser, or clearly reject unsupported attributes until implemented. A usable initial release must handle ordinary `img[src]` at minimum; document the exact supported contract in README.
4. Process companion CSS asset `url()` references through Vite's normal CSS pipeline. Do not allow unprocessed URLs in inline style/style blocks; prefer companion CSS and reject those fragment constructs initially.
5. Register snippet/image dependencies with Vite's watcher. Content edits and image replacement must update the development preview, with a full reload acceptable initially. No production runtime fetches for local snippet assets.
6. Prefer local images for offline reliability. Distinguish external anchor links from external image resources; reject remote image sources in the initial offline content contract instead of silently downloading them.
7. Require meaningful alt text or explicit decorative alt, preserve width/height/aspect ratio, and apply responsive sizing. Resize/compress raster sources appropriately. Base64 adds about one third to binary size; loading="lazy" does not shrink the bundle.
8. Add asset-size reporting, deduplication metrics, and a total build-size comparison. Cache transform work by real path/content hash. If repeated assets materially inflate HTML strings, use a generated shared asset registry and resolve image references during pane render; this still needs no module JS edits. Avoid an elaborate registry before measuring duplication.

Acceptance: edit a fragment, CSS file, or image without module JS changes; dev preview updates; portable output works after copying only `index.html`; generated output has no unresolved local snippet resources; tables, links, images, Guide, and Dictionary Detail work in both themes and all layouts.

## Phase 4 prepare hosted and portable distributions

Keep one application source and two explicit build targets. Hosted output may retain the bundled application HTML, with PWA companion files added later; code splitting is not required for this project.

| Target | Proposed command | Output | Contract |
| --- | --- | --- | --- |
| Portable | Existing `npm run build` | `dist/index.html` | Copy one file; works through file URLs; no manifest or service-worker dependency |
| Hosted | New `npm run build:hosted` | `dist-hosted/` | GitHub Pages path configurable; bundled app plus required companion assets |

- Add an explicit distribution flag to Vite configuration. Default remains portable. Each target must build constructs first; npm's existing `prebuild` does not automatically cover `build:hosted`.
- For project Pages, configure base from the actual destination repository name, e.g. `/bodhana-portal/`. Keep sample names as configuration examples, not invented deployment destinations. Portable uses relative paths where any references remain.
- Add a build audit for unresolved filesystem/root-relative asset paths and external runtime resources. Existing hash links should remain `#/...`, not server routes.
- Vendor required fonts and Font Awesome assets with licenses through reproducible local dependencies or checked-in permitted assets. Inventory actual families/weights/icon usage first. Preserve fonts used by printed worksheets; fonts are part of print fidelity. Update print windows/frames to load from bundled/local resources correctly.
- Treat Wiktionary lookup, external videos/websites, and device-provided speech voices as online/platform-dependent features. Show a useful unavailable state; do not claim they are included in offline guarantees. Do not cache user uploads, generated documents, or third-party API responses by default.
- Add build scripts to `.gitignore` for new generated outputs and portal reports. Do not place generated outputs under protected source directories.

Acceptance: both outputs pass route, content, print/export smoke tests; portable remains one usable HTML file; hosted loads correctly under an arbitrary test subpath, not only `/`; offline dependency inventory is explicit.

## Phase 5 prepare GitHub Pages delivery

Use a separate deployment repository as requested. Its contents are only the hosted release artifact and deployment configuration, plus a brief release README/license information. Keep source history and tests in the working repository.

1. Add `scripts/package-pages.mjs` or equivalent to stage the hosted artifact, build/version metadata, licenses, and `.nojekyll` when branch publishing needs it. Never copy the source tree, local settings, credentials, user dictionaries, or generated worksheets.
2. Document a manual release first: build locally or in source CI, inspect artifact, copy into the supplied deployment repository, review diff, then publish. Keep deploying Pages through a branch or Actions as a documented choice; use one mechanism consistently.
3. Prepare the deployment repository workflow template under a clearly named example path in this source repo. Avoid activating a workflow here that deploys the source repository's Pages site by mistake.
4. Configure Pages on the destination repository and enforce HTTPS. Document its exact base path once supplied. Hash routing should allow refresh/bookmarks of every module without a custom 404 rewrite.
5. Cross-repository publishing, if automated later, needs explicitly scoped credentials; the source repository's GITHUB_TOKEN is not automatically authorized to push another repository. Prefer an approved narrowly scoped deployment credential and never embed it in shipped assets.
6. Include rollback instructions using a prior complete release artifact. Review public visibility; bundled client code and content are public even when source development is elsewhere.

Acceptance: the staged artifact is reviewable locally; once the destination is provided and publication authorized, its HTTPS URL loads all routes and assets, and a rollback can restore a complete release. Local implementation need not wait for a repository name.

## Phase 6 add PWA installation and offline updates

Proposed new source files: `src/pwa/register.js`, manifest/icon sources, a service-worker source/template, and a hosted build step generating the worker and precache list. Emit worker as a real same-origin JavaScript file; do not inline it or register from a data/blob URL. Do not use runtime registration on the portable file build or ordinary dev server.

### Installation and application identity

- Emit a manifest with stable id, name/short_name, start_url, scope, theme/background colors, `display: standalone`, and appropriate 192px/512px icons including a suitable maskable variant. All URLs must honor the configured deployment subpath.
- Use existing Bodhana branding or approved assets to prepare icons. Retain ordinary browser access; installation is optional. Standalone mode hides browser chrome, not necessarily Android system bars.
- Keep orientation unrestricted and respect safe-area insets. Any install affordance must be conditional on browser support and not nag users who decline or already installed.
- Keep manifest identity and hosting path stable across releases. A future domain/repository move is an app identity and storage migration decision.

### Offline and update policy

1. Generate a build identifier from relevant content or release metadata and a complete precache list, including bundled app, icons, and locally packaged dependencies. Cache only same-origin application assets inside this deployment scope.
2. On install, populate a new versioned cache completely; a failed required asset must prevent activation of a partial release. Preserve the active release until the new one is ready.
3. Use a documented app-shell cache strategy and background worker update checks. Exclude `sw.js` itself from application precaching. Ignore unsupported methods and leave unrelated origins/network-only features alone.
4. Scope worker registration to the repository directory. Prefix cache names with application and deployment scope; GitHub project sites for an owner share an origin. Cleanup must remove only this app's obsolete caches and never clear unrelated caches/storage.
5. Do not automatically call skipWaiting and reload over an unfinished worksheet. When an update waits, offer a quiet user-triggered Update action and explain that current unsaved work may reset. Ensure existing uncontrolled tabs are included in the update decision; test multi-tab behavior.
6. On accepted activation, reload at most once after controllerchange. Defer deleting old assets if old clients could still require them, or define an activation protocol that transitions all controlled clients safely.
7. Handle first installation, first controlled reload, second offline launch, failed network update, cache population failure, browser storage eviction, and rollback to a rebuilt release. Offline is available after a successful cache/install cycle, not before the first visit.
8. Online-only actions remain clearly identifiable. Offline core includes module navigation, local uploads, generation, guide content/images, local fonts/icons, and supported export. Physical printing still depends on Android print services/printer connectivity and requires device validation.

Acceptance: Android Chrome can install and launch without browser chrome; after successful first load/cache, a network-disabled launch supports the defined core; updates do not silently destroy work; unrelated project caches remain untouched; portable HTML never tries to register a worker.

## Validation and release gates

### Automated checks

- Existing Vitest suite and constructs build remain green relative to baseline.
- Add focused content-transform tests for relative resolution, missing files, containment, MIME handling, image variants, unsupported markup, and identical portable/hosted fragment content.
- Portal browser tests verify drawer open/close/focus behavior, state preservation, guide switching, subtype replacement, rapid navigation, resize cleanup, no body overflow, and preview bounds.
- Build tests open the actual portable artifact with file URLs and the hosted artifact beneath a non-root path. Dev-server-only success is insufficient.
- PWA tests use a production build served over localhost or HTTPS with service workers enabled: offline second launch, update waiting, accepted activation, failed update, scoped caches, and multiple clients.
- Test meaningful behavior, not just source-code strings. Avoid brittle assertions on exact pixel values where a bounding constraint expresses the requirement better.

### Viewport and browser matrix

Use representative CSS viewport sizes: 1920 × 1080 desktop; 1366 × 768 small desktop; 1280 × 800 and 1024 × 768 landscape; 800 × 1280 and 768 × 1024 portrait; 1024 × 600 reduced-height viewport; and a narrow split-screen window near 700px wide. Cover both themes. Confirm thresholds with measured layout rather than assuming each physical tablet reports these sizes.

Run Chromium automation plus a WebKit smoke test if available, but treat real Android Chrome as required for touch, keyboard, browser toolbar, download, print, install, and standalone validation. Desktop emulation does not establish Android printing/PWA behavior. Record unavailable device checks as pending rather than passed.

### Module coverage

- Math: all five categories, including category changes while settings is open.
- Writing: Seyes and Handwriting Lines, including type changes and physical Seyes geometry checks.
- Word Puzzles: all current types and dense/multi-page output.
- Sudoku: every supported tile count.
- Math Games and Math Puzzles: representative dense and multi-page worksheets.
- Dictionary Builder: upload/manual entry, extraction/enrichment, Notes, word-selected Detail, flags, dictionary lookup failure, export, and touch selection.
- Phonics Worksheets: all current activity types, long word lists, settings tabs, and guide isolation.
- Certificates: landscape fitting, long text, and print.
- Home and navigation: cards, active route, theme toggle, direct hash URLs.

### Print and export gate

Compare representative baseline and changed output for Letter size/orientation, page count, margins, font metrics, watermark, all pages included, and absence of guides/overlay chrome. Include light/dark screen modes because print should remain stable. Keep Seyes dedicated printing untouched unless a separately justified fix is physically validated. Do not add unrelated export capabilities to modules.

## Suggested implementation checkpoints

Each checkpoint should be reviewable and leave the repository usable. These are dependency boundaries, not instructions to stop after every commit.

1. Baseline evidence and portal test harness.
2. Responsive shell and drawer integration across modules.
3. Preview fit adapters and print regression checks.
4. Module content loader, image transform, content migration, and authoring README.
5. Portable/hosted build modes, local runtime assets, and subpath checks.
6. Pages packaging, destination workflow template, and release instructions.
7. Manifest, service worker, install/update UI, and offline tests.
8. Real-device validation, documentation reconciliation, and release artifact review.

Update `PORTAL_UI_ARCHITECTURE.md`, `PORTAL_UI_DECISION_LOG.md`, integration/prototype guidelines, and relevant `CLAUDE.md` sections when their contracts change. Preserve historical decisions with a dated superseding entry rather than leaving contradictory current instructions. Add a content authoring guide, deployment guide, and test commands with explicit offline/online feature boundaries.

## Completion and handoff requirements

The implementation report must state changed behavior, affected files, checks actually run, desktop/tablet screenshots or equivalent evidence, bundle-size comparison, print/export results, outstanding device checks, and any deployment configuration still needed. Supply the portable HTML and staged hosted artifact paths. Do not label Pages or PWA deployment complete until verified on the actual HTTPS destination.

External inputs needed only for release: deployment repository owner/name, publishing mechanism and permissions, and access to a physical Android tablet. Use configurable local placeholders until the destination exists. Initial implementation must not publish, create external repositories, or send messages merely because this plan describes those later steps.

## Technical references

- [Vite glob and raw imports](https://vite.dev/guide/features.html#glob-import) and [asset handling](https://vite.dev/guide/assets.html). Verify APIs against installed Vite 5; do not copy newer-only options blindly.
- [Vite GitHub Pages deployment and base paths](https://vite.dev/guide/static-deploy.html#github-pages).
- [GitHub Pages hosting](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages) and [HTTPS](https://docs.github.com/en/pages/getting-started-with-github-pages/securing-your-github-pages-site-with-https).
- [PWA installation requirements](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable), [service-worker lifecycle](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers), and [standalone display](https://developer.chrome.com/docs/capabilities/display-override).
- [ResizeObserver](https://developer.mozilla.org/en-US/docs/Web/API/ResizeObserver) and [modal dialog interaction](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/).
