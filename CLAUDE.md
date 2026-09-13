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
`src/portal/router.js` — hash-based (`#/route`). Dynamic imports (lazy-loaded, split into chunks by Vite):
```js
const routes = {
  '/':             () => import('./home.js'),
  '/math':         () => import('../math-worksheets/index.js'),  // redirects to math-worksheets
  '/math-worksheets': () => import('../math-worksheets/index.js'),
  '/word-puzzles': () => import('../wordpuzzle/index.js'),
  '/math-puzzles': () => import('../mathpuzzle/index.js'),
  '/sudoku':       () => import('../sudoku/index.js'),
  '/dict-builder': () => import('../dictbuilder/index.js'),
  '/worksheets':   () => import('../worksheets/index.js'),
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

## Two-Pane Layout Pattern
**All tool modules use this.** Sticky toolbar (actions right-aligned via `.tb-actions { margin-left:auto }`) + full-height split body. Settings live in the left pane; the right pane renders white printable pages.
```css
.tool { display:flex; flex-direction:column; height:100%; min-height:0 }
.toolbar { position:sticky; top:0; flex-shrink:0; background:var(--bg-surface); border-bottom:1px solid var(--border) }
.body { display:flex; flex:1; overflow:hidden; min-height:0 }
.left-pane { width:280-300px; flex-shrink:0; overflow-y:auto; border-right:1px solid var(--border) }
.right-pane { flex:1; overflow-y:auto; overflow-x:auto; background:var(--bg-body) }
```

## Home Page
- `src/portal/home.js` — tool card HTML (`.tool-card` links)
- `src/portal/home.css` — grid layout + icon color classes (`.math-icon`, `.worksheets-icon`, etc.)
- Adding a new tool: add a `.tool-card` in home.js + an icon color class in home.css

## Current Module List
| Route | Module | Directory |
|---|---|---|
| `/` | Home | `src/portal/home.js` |
| `/math-worksheets` | Math Worksheets | `src/math-worksheets/` |
| `/word-puzzles` | Word Puzzles | `src/wordpuzzle/` |
| `/math-puzzles` | Math Puzzle Grid | `src/mathpuzzle/` |
| `/sudoku` | Sudoku | `src/sudoku/` |
| `/dict-builder` | Dictionary Builder | `src/dictbuilder/` |
| `/worksheets` | Seyès Worksheets | `src/worksheets/` |

## Known Constraints
- **vite-plugin-singlefile**: all imports inlined → watch bundle size. Google Fonts loaded via CDN link tag (not inlined).
- **Andika font**: loaded globally via the Google Fonts link in `index.html`, so every module can offer it (Seyès worksheets, Place Value, Word Puzzles, Sudoku). Adds ~400KB to PDF when printing — accepted tradeoff for handwriting-practice quality.
- **html2pdf.js**: loaded from CDN dynamically on demand for Place Value worksheet PDF export.
- **No backend**: all logic runs client-side. No persistence beyond `localStorage`.
- **Minimum width**: 1024px (desktop/tablet teacher tool).

## See Also
- `docs/BACKLOG.md` — prioritized feature queue
- `docs/DECISIONS.md` — architecture decision log
