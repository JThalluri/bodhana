# Bodhana – Codebase Guide

## What is Bodhana?
Educational tools portal for teachers. Runs entirely in the browser — no server, no accounts. Distributed as a single self-contained HTML file (`dist/index.html`).

## Build & Dev
```
npm run dev      # Vite dev server (localhost:5173)
npm run build    # Produces dist/index.html (single-file, all assets inlined)
```
Uses **vite-plugin-singlefile** — everything (CSS, JS, fonts referenced via import) is base64-inlined into `dist/index.html`. Keep asset sizes in mind.

## Architecture

### Module pattern
Every tool is a **module** under `src/<name>/`. The minimal interface:
```js
// src/<name>/index.js
export function mount(container) {
  // render into container
  return unmount;   // optional cleanup fn
}
```
Router calls `mount(content)` on navigation and stores the returned `unmount`. On next navigation it calls `unmount()` before mounting the new module.

### Router
`src/portal/router.js` — hash-based (`#/route`). Dynamic imports (lazy-loaded in development; inlined into the single production bundle):
```js
const routes = {
  '/':             () => import('./home.js'),
  '/math':         () => import('../math-worksheets/index.js'),  // redirects to math-worksheets
  '/math-worksheets': () => import('../math-worksheets/index.js'),
  '/fractions':    () => import('../math-worksheets/index.js'),  // preselects Fractions
  '/math-games':   () => import('../math-games/index.js'),
  '/word-puzzles': () => import('../wordpuzzle/index.js'),
  '/math-puzzles': () => import('../mathpuzzle/index.js'),
  '/sudoku':       () => import('../sudoku/index.js'),
  '/dict-builder': () => import('../dictbuilder/index.js'),
  '/worksheets':   () => import('../worksheets/index.js'),
  '/certificates': () => import('../appreciation-certificates/index.js'),
  '/phonics-worksheets': () => import('../phonics-worksheets/index.js'),
};
```

### Sidebar nav
`index.html` `<nav>` — each `<a>` has `href="#/route"` and `data-route="/route"`. Router adds `.active` class by matching `data-route` to current hash.

## Design System

### Tokens (`src/styles/tokens.css`)
| Token | Purpose |
|---|---|
| `--bg-body` | Page background |
| `--bg-surface` | Cards, panels, toolbars |
| `--bg-input` | Input fields |
| `--border` | Dividers, input borders |
| `--border-focus` | Focused input outline |
| `--text-primary/secondary/muted` | Text hierarchy |
| `--accent` | Primary action color (burnt orange light, orange dark) |
| `--danger` | Error / warning |
| `--success` | Success state |
| `--sidebar-*` | Sidebar colors (dark even in light mode) |
| `--shadow-sm/md/lg` | Box shadows |
| `--space-1` … `--space-12` | 4px–48px spacing scale |
| `--radius-sm/md/lg/xl/full` | Border radius |
| `--font-ui` | Nunito (body text) |
| `--font-print` | Comic Sans MS stack (printed worksheets) |
| `--text-xs` … `--text-3xl` | Font size scale |

### Component classes (`src/styles/components.css`)
Shared across all modules — no need to re-define in module CSS:
- `.btn`, `.btn-primary`, `.btn-secondary`, `.btn-ghost`, `.btn-sm`
- `.tb-num` — compact number input for toolbars
- `.tb-select` — compact select for toolbars
- `.tb-vdiv` — vertical divider between toolbar groups
- `.tb-count-lbl` — label + input pair in toolbar
- `.tb-actions` — right-side action group (use `margin-left:auto` to push right)
- `.status-msg`, `.status-msg.success/.error/.info`
- `.empty-state` — centered icon + message placeholder

## Tool shell and guidance

Tools use one module header, settings, preview/results and guidance. Desktop at 1480px+ retains existing pane widths. Compact layouts use a navigation rail and Settings overlay over the original form DOM; below 996px Preview/Guide switches the existing panes. initToolShell owns controls, fitting and cleanup. Math and Writing dispatchers initialize after actual subtype rendering and dispose before replacement; stale asynchronous imports are guarded. Read PORTAL_UI_ARCHITECTURE.md before changing lifecycle or geometry.

Guidance lives in src/content/tool-info/<key>/content.html with optional scoped CSS and normal local images. The parse5 Vite transform validates/inlines raster assets. Dictionary Notes is separate from live Detail. Phonics has its own Guide. Videos are external watch links, never embeds.

## Home Page
- `src/portal/home.js` — tool card HTML (`.tool-card` links)
- `src/portal/home.css` — grid layout + icon color classes (`.math-icon`, `.worksheets-icon`, etc.)
- Adding a new tool: add a `.tool-card` in home.js + an icon color class in home.css

## Current Module List
| Route | Module | Directory |
|---|---|---|
| `/` | Home | `src/portal/home.js` |
| `/math-worksheets` | Math Worksheets | `src/math-worksheets/` |
| `/fractions` | Math Worksheets (Fractions selected) | `src/math-worksheets/` |
| `/math-games` | Math Games | `src/math-games/` |
| `/word-puzzles` | Word Puzzles | `src/wordpuzzle/` |
| `/math-puzzles` | Math Puzzle Grid | `src/mathpuzzle/` |
| `/sudoku` | Sudoku | `src/sudoku/` |
| `/dict-builder` | Dictionary Builder | `src/dictbuilder/` |
| `/certificates` | Certificates | src/appreciation-certificates/ |
| `/phonics-worksheets` | Phonics Worksheets | src/phonics-worksheets/ |
| `/worksheets` | Writing Worksheets (type switcher: Seyès default, Handwriting Lines) | `src/worksheets/` (Seyès + dispatcher), `src/writing-worksheets/` (Handwriting Lines) |

## Distribution and constraints

- npm run build produces the portable single dist/index.html, usable with file URLs and no worker registration.
- npm run build:hosted generates constructs and dist-hosted with configurable BODHANA_BASE, scoped manifest/worker/icons and versioned complete precaching. See docs/DEPLOYMENT.md.
- Fonts, solid icons and existing PDF/DOCX/ODT readers are local bundled resources; licenses accompany both outputs. Monitor bundle size.
- The custom shared Export engine uses a hidden Letter frame and raster PDF pages; no CDN html2pdf implementation is used. Seyes keeps its dedicated Print path; Certificates is landscape Print only.
- No backend. Wiktionary and external links need internet. Speech and physical printing depend on platform services. Offline availability requires a successful initial install/cache cycle.
- Updates wait for a deliberate action and consent across tabs; no silent reload over unfinished work.
- npm run test:portal uses a separate production-artifact Playwright config. Existing Workbench tests remain independently configured. Real Android checks are pending until executed on hardware.

## See Also
- `docs/BACKLOG.md` — prioritized feature queue
- `docs/DECISIONS.md` — architecture decision log

Device persistence: read docs/LOCAL_DATA.md before changing settings/file lifecycles. Small preferences use scoped localStorage; dictionary workspaces/files use IndexedDB. Do not store loaded files in service-worker caches. Preserve clear/removal semantics and flush adapters before resetting state.
