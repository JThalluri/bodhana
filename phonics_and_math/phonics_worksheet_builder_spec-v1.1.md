# Phonics Worksheet Builder — Build Specification

**Target consumer:** An IDE build agent (Cursor / Aider / Copilot Workspace / human dev).
**Deliverable:** A single-page interactive UI that consumes `PhonicsConstructor.js` v2.3.0+ and renders nine printable worksheet activities.
**Location in repo:** `src/phonics/PhonicsWorksheetBuilder/`
**Companion spec:** `specs/PhonicsConstructor_Module_Spec.md` (must be v2.3.0+)
**This document version:** `2.1.0`
**Supersedes:** `2.0.0`

### Changelog since 2.0.0

- **New:** Vowel-team **sound filter** axis (independent of pattern filters).
- **New:** Activity **Type 5b — Sound Hunt** (same radio, new mode toggle).
- **New:** Activity **Type 6b — Sound Sort** (same radio, new mode toggle).
- **New:** Type 6 lane dropdowns are restricted to the same pattern category.
- **Changed:** Type 5 distractor pool is now sound-aware.
- **Changed:** Type 6 lane headers use letters, not `/slashes/`.
- **Fixed:** `Show filter summary on sheet` toggle now appears for all nine activities.
- **Fixed:** `matchesActivePatterns` respects both pattern AND sound filters.

---

## 1. Purpose

Give a teacher (or curriculum designer) a print-ready worksheet generator that:

1. Accepts a raw `.txt` word list OR a pre-parsed `.csv` from `PhonicsConstructor`.
2. Lets them filter the word pool on four independent axes:
   - phonics pattern (spelling),
   - vowel-team **sound**,
   - scope-and-sequence level (decodability ceiling),
   - difficulty / phoneme / letter / real-vs-nonsense bounds.
3. Lets them manually include/exclude/reorder words before printing.
4. Renders any of nine pedagogical activities — two of which have sound-first variants — to a clean, high-contrast, print-optimised sheet.
5. Toggles answer-key visibility for every activity with a single floating control.

The builder must work **fully offline** — no network requests after initial page load.

---

## 2. Deliverables

| Artifact | Path | Notes |
|---|---|---|
| HTML shell | `index.html` | Single file, no framework |
| Stylesheet | `styles.css` | Print rules mandatory |
| App logic | `app.js` | Vanilla ES2018+ |
| Vendor | `vendor/papaparse.min.js` | Bundled, not CDN |
| Constructor | `../PhonicsConstructor.js` | v2.3.0+ from companion spec |
| E2E tests | `tests/e2e/*.spec.js` | Playwright, headless Chromium |

The build agent may split `app.js` into smaller modules **only if** the final `index.html` still loads a single bundled file and works via `file://` (no dev server required).

---

## 3. Architectural Constraints

- **No framework** (no React, Vue, Svelte, Angular, jQuery).
- **No build step required at runtime.** `index.html` must open directly in a browser.
- **No web fonts loaded from the network.** Fonts must be system stacks.
- **No `localStorage` / `sessionStorage` / `IndexedDB`.**
- **No analytics, telemetry, or network requests after page load.**
- **PapaParse** may be used for CSV import but must be bundled locally.
- Target browsers: Chrome 100+, Firefox 100+, Safari 15+, Edge 100+.

---

## 4. File Layout

```
src/phonics/PhonicsWorksheetBuilder/
├── index.html
├── styles.css
├── app.js
├── vendor/
│   └── papaparse.min.js
└── README.md
```

---

## 5. State Model

Five pieces of module-private state. All others are derived on demand.

```ts
let WORDS:       Record[]      // all loaded words
let FILTERED:    Record[]      // after filters
let wordOrder:   string[]      // display order of currently filtered set
let wordInclude: Record<string, boolean>  // manual include/exclude overrides
let showAnswers: boolean       // answer-key visibility (set via wrapper class)
```

---

## 6. Component Inventory

### 6.1 Control Panel (left sidebar, `.panel`)

| Section | Controls | Notes |
|---|---|---|
| **1 · Word Source** | file picker + `Load demo` + `Clear` + `Download CSV` + word count | |
| **2 · Scope & Sequence** | range slider (1–8) + level name + `Only show decodable words` checkbox | |
| **3 · Pattern Filters** | accordion from `PHONICS_PATTERNS` keys + `Match mode` select (`all`/`any`) + `Include sub-patterns` checkbox + **vowel-team sound filter chips** | two independent filter axes |
| **4 · Bounds & Type** | difficulty min/max, phoneme min/max, letter min/max, word-type select, max-words-per-sheet | |
| **5 · Activity** | radio group, 9 values | |
| **6 · Activity Options** | context-sensitive — shows only relevant options | |
| **7 · Word Selection** | Select-all / Deselect-all / Reset-order / Shuffle + scrollable list with checkboxes and ▲▼ reorder | |
| **8 · Print** | Copies input + `Print / Save PDF` button | |

### 6.2 Preview Pane (right, `#previewWrap`)

- Contains a floating `.sol-toggle` button fixed top-right, `.no-print`.
- Contains a sibling `#preview` div where sheets render.
- **The toggle button lives OUTSIDE `#preview`** so re-renders do not destroy it.
- Toggling adds/removes `show-answers` class on `#previewWrap`. All answer-key visibility is CSS-driven from that class.

---

## 7. Filter Pipeline

Runs on every `refresh()`. Order matters.

```js
function applyFilters() {
  const patterns  = getSelectedPatterns();   // [{cat, value}]
  const mode      = matchMode.value;         // 'all' | 'any'
  const sounds    = getSelectedSounds();     // ['long_e', 'short_e', ...]
  const dMin      = +diffMin.value,  dMax = +diffMax.value;
  const pMin      = +phonMin.value,  pMax = +phonMax.value;
  const lMin      = +letMin.value,   lMax = +letMax.value;
  const scopeMax  = +scopeSlider.value;      // 1..8
  const decodable = decodableOnly.checked;
  const wt        = wordType.value;

  FILTERED = WORDS.filter(w => {
    // --- Numeric bounds ---
    if (w.difficulty < dMin || w.difficulty > dMax) return false;
    if (w.phoneme_count < pMin || w.phoneme_count > pMax) return false;
    if (w.word.length < lMin || w.word.length > lMax) return false;

    // --- Decodability ceiling ---
    if (decodable && w.level > scopeMax) return false;

    // --- Real / nonsense ---
    if (wt === 'real' && w.is_common !== 'yes') return false;
    if (wt === 'nonsense' && w.is_common === 'yes') return false;

    // --- Vowel-team sound filter (independent axis) ---
    if (sounds.length) {
      const entries = String(w.vowel_team_sounds || '').split(',').filter(Boolean);
      const hasMatch = entries.some(e => sounds.indexOf(e.split(':')[1]) !== -1);
      if (!hasMatch) return false;
    }

    // --- Pattern filter (independent axis) ---
    if (patterns.length) {
      const toks = wordTokens(w);
      const byCat = {};
      patterns.forEach(s => (byCat[s.cat] = byCat[s.cat] || []).push(s.value));
      const results = Object.keys(byCat).map(cat =>
        byCat[cat].some(v => toks.indexOf(v) !== -1)
      );
      const patternOk = mode === 'all'
        ? results.every(Boolean)
        : results.some(Boolean);
      if (!patternOk) return false;
    }

    return true;
  });

  syncWordOrder();
  updateStats();
  populateContrastSelects();
}
```

### 7.1 `syncWordOrder()`

- Keep surviving words in their current `wordOrder` positions.
- Append newly-filtered words at the end (with `wordInclude[word] = true`).
- Drop words that no longer match.

### 7.2 The single source of truth: `matchesActiveFilters(w)`

**Rename note:** the old function name `matchesActivePatterns` is deprecated in this spec. Use `matchesActiveFilters` — it must respect BOTH pattern AND sound filters.

```js
// Returns true if the word satisfies EVERY active substantive filter.
// Used by Type 5 (highlight + distractor pool) and Type 5b (Sound Hunt).
function matchesActiveFilters(w) {
  const patterns = getSelectedPatterns();
  const sounds   = getSelectedSounds();
  if (!patterns.length && !sounds.length) return false;

  if (patterns.length) {
    const toks = wordTokens(w);
    const byCat = {};
    patterns.forEach(s => (byCat[s.cat] = byCat[s.cat] || []).push(s.value));
    const results = Object.keys(byCat).map(cat =>
      byCat[cat].some(v => toks.indexOf(v) !== -1)
    );
    const patternOk = matchMode.value === 'all'
      ? results.every(Boolean)
      : results.some(Boolean);
    if (!patternOk) return false;
  }

  if (sounds.length) {
    const entries = String(w.vowel_team_sounds || '').split(',').filter(Boolean);
    const soundOk = entries.some(e => sounds.indexOf(e.split(':')[1]) !== -1);
    if (!soundOk) return false;
  }

  return true;
}
```

---

## 8. Activity Renderer Contracts

Each renderer returns an HTML string beginning with `<div class="sheet">` and ending with `</div>`. No renderer touches the DOM directly. All receive `words: Record[]` already sliced to fit.

### 8.0 Common sheet helpers

```js
sheetHeader(title, subtitle) → string
sheetFooter()                → string   // returns '' if the toggle is off
wrapSheet(innerHtml)         → string
emptyNote(message)           → string
```

`sheetHeader` renders title, optional subtitle, name/date line, and an `<hr class="sheet-rule">`.

### 8.1 Type 1 — Dissect the Word

- Split `w.graphemes` on `|` → `<span class="tok">/{token}/</span>`.
- No answers to reveal.

### 8.2 Type 2 — Pattern Identification

- Compute `correct` = tokens of length ≥ 2 appearing in the union of all `PHONICS_PATTERNS` values.
- Fall back to the longest token if none match.
- Draw 2–3 decoys from `ALL_PATTERNS` not present in the word.
- Shuffle; take 4.
- Emit `<span class="opt{correct ? ' correct' : ''}">{token}</span>` for each.
- **Always** emit the `correct` class. Visibility is gated by CSS:

```css
.opt.correct::after { display: none; }
.preview.show-answers .opt.correct::after { display: block; }
```

### 8.3 Type 3 — Sentence Construction

- 5 words max.
- Heavy bold heading + 2 blank ruled lines per word.

### 8.4 Type 4 — Elkonin Sound Boxes

- Split `w.graphemes` on `|` → `n` boxes.
- Each box: `<div class="ebox" data-tok="{token}"></div>`.
- Answer visibility:

```css
.ebox::before                        { content: attr(data-tok); visibility: hidden; }
.preview.show-answers .ebox::before  { visibility: visible; }
```

### 8.5 Type 5 — Word Hunt Matrix

**Inputs:** filtered words + `huntCells` (16/20/24) + `soundHuntMode` checkbox.

**Two modes:**

#### 8.5.1 Normal mode (`soundHuntMode` unchecked)

- **Target pool** = filtered words (shuffled).
- **Distractor pool** = `WORDS.filter(w => !matchesActiveFilters(w))`.
- **Quota:** ~60% targets, ~40% distractors. Pad from remaining targets if short. Absolute last resort: cycle targets.
- **Highlight** via `matchesActiveFilters(w)`:

```css
.preview.show-answers .hunt-cell.match { background: #ffeb99; font-weight: 800; }
```

#### 8.5.2 Sound Hunt mode (`soundHuntMode` checked)

- **Requires** at least one sound filter ticked. Otherwise render an `emptyNote` with instructions.
- **Target pool** = filtered words.
- **Distractor pool (preferred)** = words with at least one vowel team whose sound is **NOT** in the active sound set — these are the pedagogically valuable traps.
- If that pool is < 40% of the grid, top up with any word that doesn't match `matchesActiveFilters`.
- **Quota:** same ~60/40 split.
- **Cell rendering:** highlighted cells get a small spelling pill (only visible when answers are shown):

```html
<div class="hunt-cell match">eat<span class="hunt-tag">ea</span></div>
```

```css
.hunt-tag                            { display: none; /* pill styling */ }
.preview.show-answers .hunt-tag      { display: inline; }
```

- **Header:**
  - Title: `Sound Hunt`
  - Subtitle: `Find every word where a vowel team says {soundList}. The spellings will be different — listen, don't look.`
  - Where `soundList` is the active sounds joined with `or`, each formatted as `/ē/` (drop the parenthetical).

### 8.6 Type 6 — Minimal Pair Word Sort

**Inputs:** two lane selectors + `soundSortMode` checkbox.

**Two modes:**

#### 8.6.1 Normal mode (`soundSortMode` unchecked)

- Lane A and Lane B must be from the **same** `PATTERN_CATEGORY`.
- Bank words split:
  - `inA` = contains pattern A only
  - `inB` = contains pattern B only
  - `inBoth` = contains both → **excluded** with a count note
- Bank word tag = plain letters, no slashes: `ea` / `ee` (not `/ea/`).
- Lane headers = plain letters, no slashes.

#### 8.6.2 Sound Sort mode (`soundSortMode` checked)

- Lane selectors become **sound** selectors (populated from `SOUND_LABELS`).
- Both lanes may be any two sounds.
- Bank words split by **sound** membership:
  - `inA` = has vowel team with sound A
  - `inB` = has vowel team with sound B
  - `inBoth` = has both → excluded with note
- Each bank word carries **two tags**:
  - **sound-tag** (blue): the lane sound `/ē/` or `/ĕ/`
  - **spelling-tag** (yellow): the pattern(s) producing it (`ea`, `ee`, `ey`)
- Both tags are hidden until `show-answers`:

```css
.bank-tag                                       { display: none; }
.preview.show-answers .bank-tag                 { display: inline-block; }
.bank-tag.sound-tag    { background: #dbe9ff; color: #1f4c8f; }
.bank-tag.spelling-tag { background: #fff5cc; color: #4a3a00; font-family: ui-monospace; }
```

- Title: `Sound Sort`
- Subtitle: `Cut out the words at the bottom. Say each one out loud. Put it in the lane that matches the sound you hear — not the spelling.`

### 8.7 Type 7 — Tic-Tac-Toe

- Grid size selectable (3×3 = 9, 4×4 = 16).
- If `filtered.length < need`, `emptyNote` — do NOT pad.
- Cells: distinct shuffled words.
- No answers to reveal.

### 8.8 Type 8 — Onset & Rime

For each word:
1. Read `w.onset`, `w.rime` from the record.
2. Two boxes: onset (empty reveal → `(none)`) and rime.
3. Rhyme family — scan **full dictionary** `WORDS` for other words sharing the same `rime`. Cap at 6.
4. Answer visibility:

```css
.or-answer                           { visibility: hidden; }
.preview.show-answers .or-answer     { visibility: visible; }
.or-rhymes                           { visibility: hidden; }
.preview.show-answers .or-rhymes     { visibility: visible; }
```

### 8.9 Type 9 — Syllable Split

For each word:
1. `syls = PC.splitSyllables(w.word)`.
2. One `<div class="syl-box"><span class="syl-answer">{syl}</span></div>` per syllable, joined by `<div class="syl-dot">·</div>`.
3. Answer visibility:

```css
.syl-answer                          { visibility: hidden; }
.preview.show-answers .syl-answer    { visibility: visible; }
```

---

## 9. Activity Options (context-sensitive)

Show only the options that apply to the current activity.

| Activity | Options shown |
|---|---|
| 1, 2, 3, 4, 7, 8, 9 | `Show filter summary on sheet` |
| 5 | Grid cells selector + `Sound hunt` checkbox + `Show filter summary on sheet` |
| 6 | `Sort by sound` checkbox + two lane selectors + `Show filter summary on sheet` |

**Critical:** the `Show filter summary on sheet` toggle's `data-for` list must be `"1 2 3 4 5 6 7 8 9"` — every activity. If any activity is omitted, its footer becomes un-toggleable.

The old `Include answer key` checkbox has been removed; the floating `👁 Show answers` control replaces it.

---

## 10. Event Wiring

Every control calls `refresh()` on change. The scope slider additionally calls `updateScopeLabel()` then `refresh()` on `input`.

The floating toggle handler:

```js
solToggle.addEventListener('click', function () {
  previewWrap.classList.toggle('show-answers');
  const on = previewWrap.classList.contains('show-answers');
  this.classList.toggle('on', on);
  this.textContent = on ? '🙈 Hide answers' : '👁 Show answers';
});
```

**Critical:** the toggle button lives OUTSIDE `#preview` (as a sibling inside `#previewWrap`) so re-renders do not destroy it.

### 10.1 Re-population on filter change

`refresh()` runs the full pipeline:

1. `applyFilters()` — updates `FILTERED`, `wordOrder`.
2. `updateStats()`.
3. `populateContrastSelects()` — rebuilds lane dropdowns respecting the current `soundSortMode` and `soundHuntMode`.
4. `render()` — renders the current activity.

---

## 11. Print Pipeline

```css
@page { margin: 0.4in; }
@media print {
  html, body { height: auto; background: #fff; }
  .app { display: block; height: auto; overflow: visible; }
  .panel, .no-print, .pairs-box, .sol-toggle { display: none !important; }
  .preview { padding: 0; overflow: visible; display: block; }
  .sheet { width: auto; min-height: 0; box-shadow: none; border-radius: 0;
           padding: 0; page-break-after: always; }
  .sheet:last-child { page-break-after: auto; }
  .dissect-row, .ident-row, .elkonin-item, .ttt-grid, .lane { break-inside: avoid; }
  * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
}
```

The `show-answers` class on `#previewWrap` survives into print media, so the toggle state is preserved automatically. The floating button is hidden by `.no-print` so it never prints.

The **copies input** duplicates the entire sheet HTML N times — each `<div class="sheet">` becomes a separate page.

---

## 12. Bootstrap Sequence

1. Verify `window.PhonicsConstructor` exists and `VERSION >= '2.3.0'`. If not, render a blocking error into `#preview`.
2. `updateScopeLabel()`.
3. `buildPatternFilters()` — accordion from `PC.PHONICS_PATTERNS`.
4. `buildSoundFilters()` — chips from `PC.SOUND_LABELS`.
5. `loadWords(DEMO_WORDS)`.
6. Wire all event listeners.
7. Do NOT auto-print, auto-focus, or auto-select anything.

---

## 13. Portal Integration (Bodhana)

Three integration modes supported without code change.

### 13.1 Standalone

Open `index.html` directly via `file://`.

### 13.2 Iframe embed

```html
<iframe src="/modules/phonics-worksheet-builder/index.html"
        style="width:100%;height:900px;border:0"
        title="Phonics Worksheet Builder"></iframe>
```

### 13.3 Post-message handoff

```js
// In the builder:
window.addEventListener('message', function (e) {
  if (!e.data || e.data.type !== 'phonics:loadWords') return;
  if (!Array.isArray(e.data.words)) return;
  loadWords(e.data.words);
});
```

```js
// From the portal:
iframe.contentWindow.postMessage(
  { type: 'phonics:loadWords', words: ['ship','chop','catch'] },
  '*'
);
```

### 13.4 Route integration

Static bundle at `/modules/phonics-worksheet-builder/`. No SSR, cookies, or auth required.

---

## 14. Non-Functional Requirements

| Concern | Requirement |
|---|---|
| Bundle size (min+gz) | ≤ 90 KB including PapaParse |
| Time to interactive | ≤ 500 ms on a 2019 laptop with the demo list loaded |
| Print fidelity | Chrome, Firefox, Safari produce identical page breaks |
| Accessibility | All controls have labels; toggle has `aria-pressed`; contrast ≥ 4.5:1 for body text |
| Offline | Zero network requests after initial load |
| XSS safety | All user words rendered through `esc()` before innerHTML insertion |
| i18n | No hardcoded user-facing strings outside a `MESSAGES` object |

---

## 15. Test Plan (Playwright)

| Test | Steps | Assertions |
|---|---|---|
| Load + demo | Open, click `Load demo list` | Word count line shows correct total |
| Load .txt | Upload `fixtures/words.txt` | Same |
| Load .csv | Upload `fixtures/parsed.csv` | No re-parse (spy on `parseWords`) |
| Filter by pattern | Tick `sh` | Only words with `sh` token remain |
| Filter by sound | Tick `ea` pattern + `/ē/` sound | Only `/ē/` `ea` words remain |
| Reorder | ▲ on row 3 | Word moves to position 2 |
| Deselect | Uncheck a word | Sheet shrinks by one |
| Toggle answers (T2) | Select T2, click toggle | `.opt.correct::after` computed `display: block` |
| Toggle answers (T4) | Select T4, toggle | `.ebox::before` `visibility: visible` |
| Toggle answers (T5) | Select T5 with `sh` ticked, toggle | Some cells highlighted, some not |
| Toggle answers (T5b) | Enable Sound Hunt with `/ē/`, toggle | `ea`/`ee` pills visible on targets |
| Toggle answers (T6) | Lanes A=`ea`, B=`ee`, toggle | Bank tags visible |
| Toggle answers (T6b) | Enable Sound Sort, A=`/ē/`, B=`/ĕ/`, toggle | Dual tags visible |
| Toggle answers (T8) | Select T8, toggle | `.or-answer`, `.or-rhymes` visible |
| Toggle answers (T9) | Select T9, toggle | `.syl-answer` visible |
| Footer toggle | Every activity | `Show filter summary` checkbox appears |
| Sound Sort empty | Enable Sound Sort, set both lanes to sounds with no data | `emptyNote` rendered |
| Sound Hunt no filter | Enable Sound Hunt, no sound filter ticked | `emptyNote` with instructions |
| Print layout | `emulateMedia({ media: 'print' })` | `.panel` computed `display: none` |
| Copies | Set copies=3 | Three `.sheet` elements |
| Post-message | `postMessage({type:'phonics:loadWords', words:[...]})` | Word list updates |

---

## 16. Out of Scope

- User accounts, saved worksheets, server-side rendering
- Multilingual UI
- Audio, TTS, speech recognition
- Animation polish
- Mobile-specific layouts (tablet portrait is the smallest target)

---

## 17. Acceptance Criteria

The build agent's work is **done** when:

1. Opening `index.html` via `file://` shows the demo list rendered in Type 1 form.
2. Every activity radio re-renders the sheet without errors.
3. Every sidebar control re-renders without errors.
4. The `👁 Show answers` toggle affects every answer-bearing activity and prints in the same state.
5. Sound filter and pattern filter operate as independent axes.
6. Sound Hunt produces a mixed grid with sound-based distractors.
7. Sound Sort splits `ea` words across `/ē/` and `/ĕ/` lanes with both tags visible.
8. Ctrl+P in Chrome produces a clean print preview with no sidebar and no page-break artifacts.
9. Loading 1000+ words completes without visible jank > 100 ms.
10. `postMessage` handoff loads words without a file picker.
11. All Playwright tests in §15 pass in Chromium.
12. Zero console errors or warnings in any tested flow.

---

## 18. Companion Module Dependency

This spec requires **PhonicsConstructor.js v2.3.0** or later. Specifically the builder depends on:

- `PC.parseWords`, `PC.parseText`, `PC.toCSV`, `PC.downloadCSV`, `PC.isPreParsedCSV`
- `PC.PHONICS_PATTERNS`, `PC.PATTERN_CATEGORY`, `PC.SCOPE_LEVELS`, `PC.SOUND_LABELS`
- `PC.splitSyllables`, `PC.findMinimalPairs`

The builder must **fail loudly at boot** if `PC.VERSION` is older than `2.3.0` — do not silently degrade, because the sound filter and Sound Hunt/Sort modes depend on record fields (`vowel_team_sounds`) that older versions do not emit.