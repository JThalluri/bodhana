# Portable and hosted releases

`npm ci`, `npm test`, `npm run build` produce the portable `dist/index.html`. Copy that single file and open it with a file URL. It has no manifest or service-worker registration. Fonts, icons, guides and document readers are packaged locally.

For a hosted release in PowerShell:

```powershell
# Optional override; deployment/target.json defaults to /gurukool/
$env:BODHANA_BASE='/gurukool/'
npm run build:hosted
npm run audit:build
npm run package:pages
```

The hosted output is `dist-hosted/`; the allowlisted destination package is `artifacts/pages-release/`. The authorized destination is `git@github.com:JThalluri/gurukool.git`, configured in `deployment/target.json` with stable base `/gurukool/`. `BODHANA_BASE` remains available for other local verification targets. Root Pages can use `/`. Hash URLs need no server rewrite. Every build entry point generates constructs first. Do not use `vite build` directly for a release.

The user has authorized publishing to that destination. Authenticate GitHub with repository write, workflow and Pages permissions, copy only the staged package into that separate repository, preserve its LICENSE, review its diff, commit it there, and manually run its included workflow. Configure the destination's Pages source as GitHub Actions. The template is intentionally located at `deployment/pages-repository/.github/workflows/pages.yml`, not this source repository's active workflows. It deploys the reviewed artifact; it does not build or copy development files. GitHub's source-repository token does not grant cross-repository write access. Do not place credentials in code or artifacts.

The live URL is [https://jthalluri.github.io/gurukool/](https://jthalluri.github.io/gurukool/), verified on 2026-10-16 for release `3bdb1a6d9ffb0a49` after [workflow 38999799486](https://github.com/JThalluri/gurukool/actions/runs/38999799486) succeeded. Runtime files matched the local artifacts byte for byte. Live status minimization survived reload and offline relaunch, and keyboard activation restored the full message. Physical Android installation and printing remain unverified. Verify the actual HTTPS URL, all hash routes, icons, scope, installation and offline restart before declaring deployment complete. Public client bundles contain the code/content. Enforce HTTPS in destination Pages settings. To roll back, restore a complete previous artifact (HTML, manifest, icons, worker and metadata together), review and publish through the same workflow. Clients receive the rollback via the same deliberate update flow. Keep a copy of each complete release, its release.json and license notices.

The manifest identity, start URL and scope equal the configured directory. Display is standalone; orientation is unrestricted. Workers are registered only for hosted production builds. Precache installation is all-or-nothing and versioned by artifact content. Only required same-origin assets in this app scope are cached; user documents, generated output and dictionary API responses are excluded. Other project caches are untouched. Old caches remain while multiple windows could use them; a single client can prune this app's old versions. Storage eviction removes offline availability. On the next online visit the app checks required cached files and offers Repair offline files; repairing warns about unfinished work, reloads only the consenting tab and performs a fresh installation.

Updates wait without reloading. The Update action warns about unsaved work and asks every responsive open tab to approve, including uncontrolled tabs that run this app. A refusing, older or unresponsive tab defers the update; close it and retry after saving. Accepted activation reloads each consenting tab once. Installation is optional and offered only when supported. Offline availability starts after a successful cache cycle, never before the first visit.

Offline core: module navigation, local TXT/CSV/PDF/DOCX/ODT uploads, generation, guides/images, fonts/icons and supported Export. Wiktionary definitions and external video/site links need internet. Speech uses device voices and may require platform downloads or connectivity. Printing requires the platform print service and printer connectivity; desktop automation does not validate Android printing. CJK PDF fonts not present in the source document may need separate validation.

Verification commands:

```powershell
npm run build
npm run build:hosted
npm run audit:build
# Optional when using installed Chrome rather than a Playwright browser:
$env:PORTAL_CHROME='C:/Program Files/Google/Chrome/Application/chrome.exe'
npm run test:portal
npm test
```

Portal tests use actual file and hosted artifacts under the built release's configured base (currently `/gurukool/`), a dedicated configuration, and a local production server. The existing Workbench config remains unchanged. The server and tests read `dist-hosted/release.json`, so the production suite verifies the actual destination base. Screenshots, output PDFs and reports are local under `artifacts/`. Physical Android touch/keyboard/toolbars, downloads, print calibration and install/standalone behavior remain release gates requiring a real device.

Android Chrome is asked to resize the layout viewport with its keyboard using interactive-widget=resizes-content; safe-area insets are respected. This follows the [Chrome viewport behavior documentation](https://developer.chrome.com/blog/viewport-resize-behavior). Hardware validation is still required.

Optional WebKit route smoke: set PORTAL_BROWSER=webkit, clear PORTAL_CHROME, and run npm run test:portal -- --grep "all routes". Its report uses artifacts/webkit-report. The baseline comparison runs when artifacts/baseline/index.html is available; otherwise output checks still validate the current production artifact.

Settings and loaded files are now retained separately from the offline asset cache; see [Local device data](LOCAL_DATA.md). Normal PWA updates and offline-file repair preserve this data. The persistence update is published as release `a98cba4cb81d2f7c`. Live checks verified settings retention after reload, source-file restoration and offline extraction, plus a deliberate upgrade from the previous live release that preserved unfinished work until accepted.

The app status notice has a remembered Minimize/Offline status control. Minimizing hides explanatory text, while install/update/repair actions remain visible. Important repair/failure messages expand the notice.
