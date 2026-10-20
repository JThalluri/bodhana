# Tablet, content and PWA implementation record

Local implementation and verification completed 2026-10-16. This is a local handoff; no external repository was created, no artifacts were pushed, no credentials were used and no Pages HTTPS deployment was verified. The destination owner/name and release authorization remain outstanding.

## Baseline and preservation

The initial tracked checkout was clean. The existing untracked TABLET_CONTENT_AND_PWA_IMPLEMENTATION_PLAN.md and TABLET_CONTENT_AND_PWA_CODEX_HANDOFF.md were preserved. No AGENTS.md instructions were found in the applicable ancestor/repository paths. The entire implementation plan, architecture, decision log, integration/prototype guidelines and CLAUDE.md were read before implementation.

Baseline npm run build passed. Baseline npm test passed 1,025 tests in 22 files when run outside the sandbox. An initial sandbox run failed at esbuild configuration loading with Access denied; this was an execution-environment failure, not a failing test assertion. The browser cache also appeared unavailable inside the sandbox; verification used installed Chrome and the available WebKit runtime outside it.

Baseline portable HTML, 1920x1080 light/dark screenshots and generated output evidence are retained under artifacts/baseline and artifacts/outputs. Deterministic baseline print comparison blocks legacy CDN requests, so it establishes page geometry/count and protected grid consistency, not exact parity with remotely supplied baseline font metrics.

## Review checkpoints and significant files

| Checkpoint | Files and delivered contract |
| --- | --- |
| Responsive shell | src/shared/modal.js, tool-shell-controller.js, src/styles/responsive.css, portal/shell.js and router.js. Original settings DOM becomes an accessible overlay with focus trapping/restoration, inert background, Escape/backdrop/close handling and shared navigation coordination. One module header is retained. |
| Real module lifecycle | Math and Writing dispatchers initialize/dispose per subtype; router and asynchronous arithmetic imports have generation guards. Dictionary Notes dialogs and manual-preview timer clean up on unmount. Settings values survive drawers and rotation. |
| Preview fitting | src/shared/preview-fit.js observes the unscaled viewport and supports Fit page/Fit width. Letter page geometry is unchanged. Certificates has one landscape stage adapter; Dictionary results have no worksheet scale. Seyes keeps its dedicated print document and copies only local Andika font-face rules through print-fonts.js. |
| Editable guidance | src/content/tool-info contains 14 stable-key HTML fragments and authoring README. tool-info.js provides table overflow and an in-app image dialog. Phonics now has a Guide pane; Dictionary Notes is extracted and live Detail/tab/flag/lookup/export behavior remains. |
| Content build | scripts/vite-tool-info-plugin.mjs uses direct parse5 validation, realpath containment, MIME signatures, data URL image inlining, content-hash encoding cache, dependency watching and image-size/deduplication reporting. Initial contract supports img[src] raster assets; srcset/SVG/remote images and unsafe/unexpected resources are rejected. A PNG/table/document fixture lives under tests/content. Production fragments currently contain no invented illustrations or external educational links. |
| Portable/hosted targets | vite.config.js and build-hosted.mjs preserve portable dist/index.html and add configurable dist-hosted. Local WOFF2 fonts/solid icons and the existing PDF/DOCX/ODT reader versions replace runtime CDNs. Existing dependency versions were compared with HEAD: none changed. New target lifecycle hooks generate constructs; unchanged construct metadata is retained to avoid spurious release versions. |
| Packaging/licensing | audit-build.mjs, package-pages.mjs and vite-licenses-plugin.mjs audit companion references, include license notices and stage an allowlisted release. The inactive template lives at deployment/pages-repository/.github/workflows/pages.yml; it is copied to the staged destination package. |
| PWA | src/pwa/register.js, sw-template.js and branded icons. Hosted production only; stable manifest identity/scope, complete versioned app precaching and scoped caches. Updates require explicit consent across controlled and uncontrolled tabs, reload at most once, and preserve old releases on failure. Missing caches are detected and an explicit online repair warns before reloading only that tab. |
| Documentation/testing | Architecture, dated decisions, CLAUDE.md and integration/prototype guides were reconciled. docs/DEPLOYMENT.md documents commands, publishing, rollback and offline boundaries. Dedicated portal Playwright config leaves Workbench configuration unchanged. |

The desktop threshold is 1480px, adjusted from the proposed 1440px because 240 navigation + 300 settings + 660 preview + 280 minimum guide requires 1480px. Compact mode defaults to a rail and settings drawer. At 995px and below, Preview/Guide switches existing pane instances. The 1920x1080 desktop shell is preserved. Dynamic viewport heights, keyboard resize opt-in and safe-area insets are screen-only.

## Checks actually executed

- npm test: 1,039 tests passed in 23 files (baseline 1,025 plus 14 content-transform checks). This includes existing Money, Time, phonics, Dictionary and Workbench unit coverage.
- npm run build and npm run build:hosted: passed. npm run audit:build: passed. npm run package:pages: passed. git diff --check: passed.
- Chromium production portal suite: all 16 tests passed against the actual file artifact and /portal-test/ hosted artifact. A focused Dictionary rerun additionally exercises flag-note and flags JSON export.
- WebKit smoke: both portable and hosted all-route tests passed. WebKit initially exposed button focus restoration after pointer activation; the shared modal now restores the explicit trigger.
- All nine tool routes: drawer open/close/focus, Preview/Guide, no document horizontal overflow. Math: all five categories, generated Letter pages, rapid routing and subtype replacement. Writing: both subtypes. Sudoku: 1/2/4/6 tile counts. Word Puzzles: word search/criss-cross/jumble with three pages and end-of-scroll reachability. Math Games/Puzzles: dense multi-page generation. Phonics: all four activity types and settings-tab isolation. Dictionary: manual entry, enrichment, Detail/Notes, failed Wiktionary lookup, download, flags export and offline PDF/DOCX/ODT extraction.
- Screen matrix: 1920x1080, 1366x768, 1280x800, 1024x768, 800x1280, 768x1024, 1024x600 and 700x800 in both themes, with screenshots and preview-bound assertions. A separate threshold check verifies a 280px guide at 1480px. Per-route Chromium/WebKit tablet screenshots are also retained.
- PWA: initial/failed install, required-asset failure, failed network checks, second offline launch, update waiting, refusal preserving unfinished input, accepted activation across controlled/uncontrolled clients, waiting-cache survival after reload, unrelated-cache preservation, rebuilt rollback and explicit repair after cache eviction. Portable never registers a worker.
- Print/export: baseline/current captured print documents are Letter portrait 816x1056 CSS px or landscape 1056x816, screen zoom reset to 1, matching page count and no guides/drawer chrome. Seyes SVG viewBox remains 0 0 215.9 279.4. Actual PDF readback is 612x792 points portrait and 792x612 landscape. Samples: Seyes one page, arithmetic two pages, Certificates one landscape page, direct arithmetic Export two raster PDF pages. PDFs were rendered with temporary PyMuPDF and representative output PNGs were visually inspected.

The baseline Certificate output has no shared worksheet-brand watermark; its existing branding/output was preserved and this exception was recorded separately. Seyes and arithmetic retain their shared watermark. No physical printer calibration is claimed. The shared print.js/export-pdf.js and seyes-grid.js were not changed.

## Sizes and artifacts

| Artifact | Bytes | Gzip bytes |
| --- | ---: | ---: |
| Baseline portable HTML | 2,350,253 | 1,442,436 |
| Portable HTML | 5,777,150 | 2,645,536 |
| Hosted HTML | 5,780,947 | 2,646,939 |

The increase primarily packages previously external fonts/icons and document readers for offline operation. Only WOFF2/solid-icon resources actually used are bundled. Production guide image references are currently zero; image fixtures validate the bundling contract without adding fabricated guide imagery.

- Portable artifact: dist/index.html (copy this single file).
- Hosted artifact: dist-hosted/.
- Destination package: artifacts/pages-release/, including its destination-only .github/workflows/pages.yml, README and licenses.
- Current release: 2a5c95b72fe719ba; configured local-test base: /portal-test/.
- Reports: artifacts/portal-report/index.html and artifacts/webkit-report/index.html.
- Screenshots: artifacts/layout-*.png and artifacts/{chromium,webkit}-{portable,hosted}-*-1024.png.
- Print/export samples and geometry/PDF inspection JSON: artifacts/outputs/.
- Exact bundle metrics: artifacts/build-metrics.json.

## Outstanding external/device gates

Physical Android Chrome touch, virtual keyboard/browser toolbar behavior, downloads, print services, actual Seyes 8mm calibration, optional installation and standalone launch still need hardware validation. Desktop emulation and localhost workers do not establish those results. Native print dialog/printer output was not automated.

Supply destination owner/name, publishing permissions/mechanism and release authorization before publication. Rebuild with the exact stable BODHANA_BASE, review the staged package, then publish through the supplied destination workflow and verify its actual HTTPS URL. No live deployment is complete.

Offline excludes Wiktionary definitions and external sites/videos. Speech depends on device voices and platform connectivity. Cache/user-agent storage eviction can remove offline files; the app reports this and provides explicit online repair. User uploads, generated documents and third-party API responses are not precached.


## Authorized destination release — 2026-10-16

This follow-up supersedes the earlier destination/deployment gate above. The user supplied and authorized git@github.com:JThalluri/gurukool.git. deployment/target.json now sets JThalluri/gurukool and /gurukool/; BODHANA_BASE remains configurable. The production server, Playwright configuration and PWA fixtures read the built release base instead of hardcoding /portal-test/.

- Published release: fac9aa2e7dccf650. Destination commit: ff6deb6c3075f460260db9755c56c9881f7376fd. Existing destination LICENSE preserved.
- Workflow succeeded: https://github.com/JThalluri/gurukool/actions/runs/38984153489. Pages already used workflow deployment and enforced HTTPS.
- Verified live URL: https://jthalluri.github.io/gurukool/. All seven runtime/metadata files returned HTTP 200 and matched dist-hosted byte for byte. All nine routes loaded. The worker script and cache were scoped to /gurukool/. Offline navigation/relaunch passed for Writing, Certificates, Phonics and Dictionary Builder in desktop Chromium.
- Re-ran 1,039 tests across 23 files, 16 Chromium production tests (portable file URL and hosted /gurukool/), and two WebKit route smoke tests: all passed. One initial Math last-page check scrolled before animation-frame fitting changed scrollHeight; the test now retries the scroll/assertion until fitting commits. No application change was needed for this race.
- Production screenshot/geometry matrix and Letter print/export checks ran again. Reviewed live screenshots at 1024x768 and 1920x1080. Screenshot files: artifacts/live-gurukool-{tablet,desktop}.png. Evidence: artifacts/live-deployment-verification.json and artifacts/build-metrics.json.
- Portable HTML: 5,777,150 bytes (gzip 2,645,536). Hosted HTML: 5,780,935 bytes (gzip 2,646,940). Hosted runtime package: 5,937,607 bytes including HTML, icons, manifest, worker and release metadata.
- HTTPS Git push failed with HTTP 403/reset despite confirmed write access and repo/workflow scopes. Published the exact reviewed files through GitHub's authenticated Git Data API, retaining the existing parent tree and LICENSE, then manually dispatched the included workflow. No credentials are stored in release artifacts. The temporary request body was removed.
- Live verification initially encountered the local Node certificate-store mismatch; enabling NODE_USE_SYSTEM_CA=1 used the Windows trusted CA store and passed without disabling TLS verification.

Physical Android installation/standalone behavior, touch/keyboard/toolbars, downloads, print services and actual Seyes calibration still require hardware validation. Desktop tests do not establish these results. Dictionary lookup, external videos/sites and platform speech dependencies remain explicit.

## User validation — 2026-10-16

The user reports PWA installation, navigation, PDF export, Pages rendering, Seyes rendering and printing working during continued testing. This is user-reported device validation; automated evidence and remaining calibration/hardware limits above remain distinct.

## Device persistence checkpoint — 2026-10-16

After committing the verified tablet/content/PWA work as 680518e, implemented local persistence for all module settings, fitting choices, Math/Writing subtype selection and the four dictionary-loading flows. Dictionary Builder retains source bytes, base words, extraction, exclusions, phonics records and flags; Word Puzzles retains its list/selection/output; Phonics retains parsed records, filters and word order; Handwriting retains state, dictionary and seed without replaying presets. Full retention and failure behavior is documented in docs/LOCAL_DATA.md.

Settings use namespaced versioned localStorage. Larger workspaces use IndexedDB. Source File bytes are prepared once as binary ArrayBuffers, with metadata used to reconstruct Files on restore. WebKit rejected IndexedDB Blob/File preparation in this environment; binary buffers resolved that compatibility failure. Clearing is deliberate and scoped, invalidates older-tab writes, and preserves PWA asset caches. Atomic failed saves leave the previous complete record intact. Late reads and mounts cannot overwrite re-entered modules.

Verification actually run:

- npm test: 1,044 tests, 24 files passed (including five storage preference/binary-byte cases).
- npm run test:portal: 26 Chromium production tests passed, including ten new persistence scenarios plus existing layout/geometry, Letter/Seyes/landscape print and PDF export, file readers and PWA update/offline checks.
- WebKit: all ten persistence scenarios and two route smoke tests passed. The Dictionary Builder case verifies reload/re-extraction online in WebKit. Its attempted offline page reload returned “WebKit encountered an internal error” here; it is not reported as a passed WebKit offline check. Chromium covers offline relaunch/extraction.
- Closed and relaunched an actual Chromium browser process with the same test profile, launched offline, restored a source File and re-extracted three words. Evidence: artifacts/persistence-restart-verification.json; screenshot artifacts/persistence-after-browser-restart.png.
- Reviewed the added Settings storage controls in artifacts/local-data-settings.png and the existing screenshot/geometry matrix. Print/export checks remain green.
- Both production builds, npm run audit:build and npm run package:pages passed. Final guide wording was rebuilt and checked by the 12 WebKit persistence/route tests and the browser restart check.
- Final portable HTML: 5,787,548 bytes; gzip 2,649,309. Hosted HTML: 5,791,298 bytes; gzip 2,650,255. Local staged release a98cba4cb81d2f7c at /gurukool/. Exact metrics: artifacts/build-metrics.json.

Artifacts: dist/index.html, dist-hosted/, artifacts/pages-release/. This persistence update is local and staged, not published; the previously verified live release remains fac9aa2e7dccf650. No source changes have been pushed. The pre-existing untracked plan and handoff documents remain untouched. Device validation of persistence through Android PWA restarts/updates and storage eviction remains outstanding; the user's earlier installation/render/print success is recorded separately above.

## Persistence publication — 2026-10-16 (America/Phoenix)

The user explicitly authorized publication. Published source checkpoint 7479e9a's staged release a98cba4cb81d2f7c to JThalluri/gurukool, destination commit 2faf2a4d55fc352fa155a0912d4c216125ed9dd2. Only index.html, release.json and sw.js changed; the existing LICENSE, workflow, icons and other repository files were retained. Authenticated Git Data API publication preserved the prior commit as parent and used a non-forced ref update. Pages workflow 38999121150 succeeded: https://github.com/JThalluri/gurukool/actions/runs/38999121150.

Verified the actual live HTTPS URL https://jthalluri.github.io/gurukool/. All seven runtime/metadata files returned 200 and matched the tested local artifact bytes. All nine routes loaded; four representative modules relaunched offline. The worker registration and versioned cache were scoped to /gurukool/. Evidence: artifacts/live-persistence-artifacts.json.

An app tab opened on the previous live release retained unfinished worksheet text when the new worker arrived and when the update was declined. Explicit acceptance activated the new release. In the published app, worksheet text survived reload; a loaded source file survived offline relaunch and successfully re-extracted three words. Evidence: artifacts/live-persistence-behavior.json and artifacts/live-persistence-offline.png. These are desktop Chromium checks; Android persistence and OS storage eviction still require real-device validation.

This publication supersedes the preceding local-only release status. Source repository changes have not been pushed; the destination repository contains the reviewed runtime release.

## Minimize offline status notice — 2026-10-16

Added an accessible Minimize control to the hosted PWA status notice. The compact Offline status control restores the explanation; its choice is retained in the existing scoped device preferences across reloads. Install, update and repair buttons remain visible when minimized. Repair/failure/deferred-update explanations expand the message without changing the saved normal-display preference. Portable builds still do not create a PWA status panel.

Verified both builds, artifact audit and Pages packaging. Five production Chromium tests passed: portable/no-registration versus hosted offline relaunch, failed install/update and multi-tab consent, waiting-cache survival, eviction/repair, and the new minimized/expanded/reload/action-visibility scenario. Reviewed screenshots artifacts/pwa-status-minimized.png and artifacts/pwa-status-expanded.png. The existing failed-install fixture had a race that could pass its absence check before registration began; it now waits for actual failure in both fixture tabs before permitting a successful install. No worker/update policy changed.

Staged release: 3bdb1a6d9ffb0a49. Source changes: src/pwa/register.js, src/styles/responsive.css and focused PWA tests; retention/deployment documentation updated.

Status-notice fix published on 2026-10-16 (America/Phoenix): source commit 659b2a9, destination commit f6cf265b3c37dff6e059a781a16772c0073a685e, release 3bdb1a6d9ffb0a49. Pages workflow succeeded: https://github.com/JThalluri/gurukool/actions/runs/38999799486. Verified https://jthalluri.github.io/gurukool/: all seven runtime/metadata files matched local bytes, minimized state survived reload and offline relaunch, and keyboard activation restored the explanation. Evidence: artifacts/live-status-verification.json and artifacts/live-status-minimized.png. Only index.html, release.json and sw.js changed in the destination. Existing files and LICENSE were preserved.

## Settings access correction — 2026-10-19

Reproduced the reported Writing settings failure on the live release and local hosted production artifact at 1920x1080. The persisted Writing subtype was Handwriting: its tab panels measured 0px wide, as did Phonics. Appending the shared persistence notice to each horizontal settings row consumed the form's width. Seyes uses a vertical settings pane and did not have this zero-width fault.

The shared shell now groups original tab-strip/panel nodes into tool-settings-tabs and puts the shared close control and storage footer outside that row. Screen CSS retains readable content, independently scrollable tabs/panels and a bounded footer. The original form DOM and state remain intact; teardown unwraps the group. Print geometry and output paths are unchanged.

Verification: both production builds, audit and Pages package passed; 30 Chromium portal production tests passed, including persistence, actual Letter/landscape/Seyes print and PDF export, PWA updates/offline and the new settings coverage. Three settings-access tests also passed in WebKit. Actual field width, focus and pane bounds were checked in Handwriting and Phonics at 1920x1080, 1480x900, 1366x768, 1280x800, 1024x600 and 800x1280 for hosted and portable artifacts. Other modules and all Math categories were checked at desktop and short tablet sizes. Tests wait for the actual requested route/subtype guide before checking controls. Reviewed before/after screenshots under artifacts/settings-before-*.png and artifacts/{hosted,portable}-{handwriting,phonics}-settings-*.png.

The same failure is reproducible outside installed mode; browser tests above validate the shared production layout. Physical Android installed-mode validation is not reported as passed. A pre-publication live browser session has retained the old zero-width failure and saved Handwriting content to verify upgrading preserves state and restores settings access.

Staged release 0eabbf22e0222a6e, /gurukool/. Portable HTML: 5,788,650 bytes (gzip 2,649,545); hosted HTML: 5,792,934 bytes (gzip 2,651,001). Existing untracked plan/handoff documents are preserved.
