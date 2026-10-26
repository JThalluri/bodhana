# Bodhana implementation handoff prompt

Paste the following into Codex in VS Code with the Bodhana repository open.

```text
Implement the repository plan in docs/TABLET_CONTENT_AND_PWA_IMPLEMENTATION_PLAN.md.

Read the entire plan first, inspect the current checkout and applicable AGENTS.md instructions, and reconcile the plan with the actual code. Read PORTAL_UI_ARCHITECTURE.md, PORTAL_UI_DECISION_LOG.md, docs/BODHANA_INTEGRATION_GUIDELINES.md, docs/BODHANA_PROTOTYPE_GUIDELINES.md, and CLAUDE.md. Some older guide descriptions are stale; actual code and the explicitly requested behavior govern. Preserve unrelated working-tree changes. Use a codex/ branch if creating a branch.

The intended sequence is tablet layout first, preview fitting second, independently editable module guidance third, then hosted packaging/GitHub Pages preparation and PWA installation/offline updates. Complete the authorized local implementation and verification across these phases. Use incremental reviewable checkpoints; do not stop at a proposal or after only one module. Do not introduce a framework, native wrapper, backend, broad visual redesign, or unrelated dependency upgrades.

Key requirements:
- Preserve the 1920x1080 desktop experience, existing module functions, and print/export output. Tablet navigation starts collapsed; settings become an accessible overlay; worksheet fitting follows available width and height; guide content takes remaining width. When panes cannot both be usable, switch Preview/Guide instead of squeezing them indefinitely.
- Preserve existing settings DOM and state. Integrate cleanup and reinitialization for actual module/subtype lifecycles, especially asynchronous Math categories and the Seyes/Handwriting dispatcher. Guard stale asynchronous mounts. Certificates has its own landscape scaling; Dictionary Builder is a results view, not a scaled page.
- Keep Seyes physical geometry and its dedicated print path protected. Keep all printable pages true Letter size and apply fitting only to screen presentation.
- Store module guidance in separate HTML fragments with optional scoped CSS and ordinary local image files. Add build-time image resolution/inlining: raw HTML imports alone do not process nested image paths. Content/image/CSS changes must not require editing module JS. Preserve Dictionary Builder Notes/Detail behavior and add the currently missing Phonics guide pane. Videos always open as external watch links in a new tab; no embedded players.
- Keep npm run build producing the portable dist/index.html. Add a separate configurable hosted build that supports a GitHub Pages repository subpath and includes PWA companion files. Ensure constructs generation runs for new entry points. Package fonts/icons required for the defined offline experience; online dictionary/video/platform speech dependencies must remain explicit.
- PWA registration is hosted-production-only, with stable manifest identity, standalone display, scoped caches, complete versioned precaching, and a deliberate update action that does not silently reload over unfinished work. Test multi-tab updates, failed installs, offline relaunch, and portable-file behavior.
- Add a dedicated portal Playwright configuration without disrupting Workbench tests. Verify actual production artifacts under file URLs and a non-root hosted path, not only Vite dev mode. Update the architecture, decision log, authoring/deployment documentation, and changed test commands.

Use the plan's validation matrix and run relevant existing tests. Record baseline failures separately. Test representative output before broadening checks; keep tests focused on meaningful behavior. Use screenshots and geometry checks for tablet/desktop layout and print/export validation. Be candid about physical Android/printing/PWA checks that cannot be executed in this environment; do not report them as passed.

The deployment repository owner/name has not been supplied. Implement configurable build/package tooling, a correctly located destination-workflow template, and a deployment guide without inventing a destination. Do not create repositories, publish Pages, push release artifacts externally, or use deployment credentials until I explicitly provide the destination and authorize that release. This does not block local implementation or staging artifacts. Do not add arbitrary external educational links or fabricate guide content.

Proceed autonomously on routine implementation choices. If the checkout contradicts a material plan assumption, investigate and document the adjustment while preserving the intended outcome. Ask only for missing decisions that actually prevent further work, and continue independent work where possible.

Finish with a concise implementation report: behavior delivered, significant files, tests/builds and visual checks actually run, bundle sizes, print/export results, portable/hosted artifact locations, and outstanding real-device or deployment steps. Do not claim the live deployment is complete without verifying its actual HTTPS URL.
```
