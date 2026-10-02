# Dictionary Builder Phonics Integration — Build Specification (Phase 4 of 5)

**Target consumer:** IDE build agent.
**What this is:** the framework-proving phase — Dictionary Builder becomes the first (and
reference) consumer of the Phase 3 engine, and the `tool-info-pane` gets its first real content
as a shared, reusable tabbed component. Phase 5 (Phonics Worksheets) reuses everything built
here; nothing here is Dictionary-Builder-private by design.
**Spec version:** 1.0.0
**Depends on:** Phase 3's `PhonicsEngine.mjs` (unmodified import), existing
`src/dictbuilder/{ui.js,extractor.js,dictbuilder.css}`, existing
`src/styles/{components.css,tokens.css}`, existing `src/shared/shell-ui.js`.

---

## 1. Scope boundary — restated per your clarification

The 4th pane (`tool-info-pane`) is not split or resized. It is already the one flexible-width
pane in the shell (confirmed from `components.css`: `.tool-info-pane { flex: 1 1 auto; min-width:
0; }`, with no width override anywhere — unlike `.tool-settings`/`.tool-preview`, which are
hard-pinned via `!important` width rules in both the shared CSS and `dictbuilder.css`). It
already grows when the sidebar collapses, by construction. This phase gives it its first real
content, structured as tabs, exactly as you described — no new pane, no layout restructuring.

---

## 2. Deliverables

| Artifact | Path | Change type |
|---|---|---|
| Info-pane tabs primitive (CSS) | `src/styles/components.css` | **Additive** — new shared classes, nothing existing touched |
| Info-pane tabs helper (JS) | `src/shared/shell-ui.js` | **Additive** — one new exported function alongside `themeToggleMarkup` |
| Word detail renderer | `src/shared/phonicsWordDetail.js` | **New file.** Pure render function — takes a word + its enrichment Record (or null) → markup string. Zero Dictionary-Builder-specific code inside it. |
| Word detail styles | `src/styles/phonics-word-detail.css` | **New file**, added to the global stylesheet import list |
| Default common-words fallback | `src/shared/default-common-words.js` | **New file** — see §5. Lives under `src/shared/`, not `src/dictbuilder/`, because Phase 5's Phonics Worksheets module needs the identical fallback when a teacher loads a word list directly, without routing through Dictionary Builder first. |
| Dictionary Builder UI changes | `src/dictbuilder/ui.js` | Modified — see §4, §6, §7 |
| Dictionary Builder styles | `src/dictbuilder/dictbuilder.css` | Modified — additive classes only, see §6 |

---

## 3. Shared Info-Pane Tabs primitive

### 3.1 Why this is shared, not Dictionary-Builder-scoped

`tool-info-pane` is a shared shell primitive per your own integration guidelines — Dictionary
Builder is simply its first content consumer. Phase 5's Phonics Worksheets will want the exact
same Detail view when a teacher is picking words for a worksheet. Building the tab mechanism
generically now, in shared files, means Phase 5 gets it for free — building it
Dictionary-Builder-local and promoting it later is exactly the rework this whole initiative's
phased sequencing exists to avoid.

### 3.2 Markup (produced by the new `shell-ui.js` helper)

```js
// src/shared/shell-ui.js — new export, alongside the existing themeToggleMarkup
export function infoPaneTabsMarkup(tabs) {
  // tabs: [{ id, label, icon? }] — icon is an optional FontAwesome class suffix, e.g. 'fa-sticky-note'
  return `
    <div class="info-tabs" role="tablist">
      ${tabs.map((t, i) => `
        <button class="info-tab${i === 0 ? ' active' : ''}" role="tab"
                aria-selected="${i === 0}" data-tab="${t.id}">
          ${t.icon ? `<i class="fas ${t.icon}"></i>` : ''} ${t.label}
        </button>
      `).join('')}
    </div>
    <div class="info-tab-panels">
      ${tabs.map((t, i) => `
        <div class="info-tab-panel${i === 0 ? ' active' : ''}" role="tabpanel" data-panel="${t.id}"></div>
      `).join('')}
    </div>
  `;
}

// Wires click handling + the "switch to this tab programmatically" API any module needs
// (Dictionary Builder's auto-switch-on-select behavior, per your UX call, uses this).
export function wireInfoPaneTabs(container) {
  const tabs = container.querySelectorAll('.info-tab');
  const panels = container.querySelectorAll('.info-tab-panel');
  function activate(tabId) {
    tabs.forEach(t => {
      const on = t.dataset.tab === tabId;
      t.classList.toggle('active', on);
      t.setAttribute('aria-selected', String(on));
    });
    panels.forEach(p => p.classList.toggle('active', p.dataset.panel === tabId));
  }
  tabs.forEach(t => t.addEventListener('click', () => activate(t.dataset.tab)));
  return { activate }; // caller keeps this to auto-switch tabs programmatically
}
```

### 3.3 Styles — new classes added to `components.css`

Append near the existing `.tool-info-pane` rule, using only tokens already defined in
`tokens.css` (no new colors/spacing introduced):

```css
.info-tabs {
  display: flex;
  gap: 2px;
  padding: var(--space-3) var(--space-4) 0;
  border-bottom: 1px solid var(--border);
}

.info-tab {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-2) var(--space-3);
  font-size: var(--text-sm);
  font-weight: 600;
  font-family: var(--font-ui);
  color: var(--text-muted);
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  transition: color var(--transition), border-color var(--transition);
}

.info-tab:hover { color: var(--text-primary); }

.info-tab.active {
  color: var(--accent);
  border-bottom-color: var(--accent);
}

.info-tab-panels { height: 100%; min-height: 0; overflow: hidden; }

.info-tab-panel {
  display: none;
  height: 100%;
  overflow-y: auto;
  padding: var(--space-4);
  box-sizing: border-box;
}

.info-tab-panel.active { display: block; }
```

### 3.4 Usage — `tool-info-pane` no longer stays empty

Every module using `.tool-info-pane aria-hidden="true"` as an empty placeholder (currently
Dictionary Builder and Word Puzzles, confirmed in both `ui.js` files) must drop `aria-hidden`
once real content is present — leaving it on a pane with interactive tabs is an accessibility
regression, not a neutral leftover. **This phase only changes Dictionary Builder's markup.**
Word Puzzles' empty pane is untouched and keeps `aria-hidden="true"` until/unless a future phase
gives it content too.

---

## 4. Dictionary Builder — auto-switch-on-select behavior

Per your UX direction (least clicks, least scrolling, proactive detail): selecting a word
auto-switches the info-pane to the Detail tab. Using the helper from §3.2:

```js
let infoPaneTabs; // assigned once, at mount, via wireInfoPaneTabs(...)

function selectWord(word) {
  state.selectedWord = word;
  renderWordGrid();       // re-render to apply the .selected highlight (see §6.2)
  renderDetailPanel();    // populate the Detail tab's content
  infoPaneTabs.activate('detail'); // auto-switch — no second click required
}
```

If the teacher manually clicks back to the Notes tab, respect that until they select a
*different* word — re-selecting the same word (e.g. re-clicking it) does not force-switch tabs
again mid-read. Track this with a simple `state.lastAutoSwitchedWord` guard, or just re-run
`activate('detail')` unconditionally on every new selection — re-activating the tab the user is
already on is a no-op, so the simpler unconditional version is fine and is what's specified here.

---

## 5. `is_common` — moved here per the agreed plan, not left dangling

`default-common-words.js` is a flat ~400-word list — **seed it verbatim from the old
`PhonicsConstructor.js`'s retired `COMMON_WORDS` list** (content relocation, zero new curation
work; it was already reasonably curated, it just no longer belongs inside the phonics engine).

```js
// src/shared/default-common-words.js
export const DEFAULT_COMMON_WORDS = new Set([ /* ...same ~400 words, verbatim... */ ]);
```

Resolution order, computed per word at enrichment time (§7), never cached independently of the
enrichment map:

```js
function isCommon(word) {
  if (state.baseWordsList.length) return state.baseWordsSet.has(word); // existing hasBaseWord() logic
  return DEFAULT_COMMON_WORDS.has(word);
}
```

This list has nothing to do with the phonics constructs pipeline — no YAML, no compiler, no
validation rules apply to it. It's a Dictionary-Builder-local curation heuristic, full stop.

---

## 6. Select vs. exclude — interaction split and markup correction

### 6.1 Current behavior (to be replaced)

Today, the entire `.db-word-item` div's click toggles exclude, via event delegation on
`#dbWordGrid`. This phase splits that into two distinct, independently clickable controls.

### 6.2 New markup

```html
<div class="db-word-item db-word-new" data-word="duck">
  <button class="db-word-select" data-word="duck">
    duck<sup class="db-freq">3</sup>
  </button>
  <button class="db-word-exclude-btn" data-word="duck" title="Exclude from export" aria-label="Exclude duck">
    <i class="fas fa-times"></i>
  </button>
</div>
```

Two real `<button>` elements, not a clickable `<div>` with a nested interactive child — this is a
correction over the original markup's accessibility shape (a `<div onclick>` with a button
nested inside it is ambiguous for screen readers/keyboard nav), and costs nothing extra to build
correctly from the start.

`.db-word-item` already has `position: relative` set in the existing `dictbuilder.css` — this
phase relies on that existing rule rather than adding a new one; the exclude button is positioned
absolute within it:

```css
.db-word-exclude-btn {
  position: absolute;
  top: 1px;
  right: 1px;
  width: 16px;
  height: 16px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 9px;
  border-radius: var(--radius-full);
  background: transparent;
  color: var(--text-muted);
  border: none;
  cursor: pointer;
  transition: background var(--transition), color var(--transition);
}
.db-word-exclude-btn:hover { background: var(--danger); color: #fff; }

.db-word-select {
  width: 100%;
  text-align: center;
  background: none;
  border: none;
  font: inherit;
  color: inherit;
  cursor: pointer;
  padding: 0;
}

.db-word-item.selected {
  outline: 2px solid var(--accent);
  outline-offset: -1px;
  background: color-mix(in srgb, var(--accent) 10%, var(--bg-surface));
}
```

`.selected` follows the exact same `color-mix(in srgb, <color> <pct>%, var(--bg-surface))`
pattern already used for `.db-word-plural` — no new visual language introduced, just reusing the
established convention with the accent color.

### 6.3 Event wiring

Replace the single delegated click handler with two, both delegated on `#dbWordGrid` (same
survives-re-render approach already in use):

```js
grid.addEventListener('click', e => {
  const excludeBtn = e.target.closest('.db-word-exclude-btn');
  if (excludeBtn) {
    toggleExclude(excludeBtn.dataset.word); // existing exclude logic, unchanged
    return;
  }
  const selectBtn = e.target.closest('.db-word-select');
  if (selectBtn) selectWord(selectBtn.dataset.word);
});
```

---

## 7. Enrichment — `state` additions and the Enrich action

### 7.1 State additions

```js
state.phonicsByWord = Object.create(null); // word -> Record from PhonicsEngine (no is_common)
state.flagged = [];                         // [{ word, record, note, flaggedAt }]
state.selectedWord = null;
```

### 7.2 Why enrichment is incremental and cached, not re-run from scratch

`PhonicsEngine.parseWord(word)` is a pure function of the word string alone — its output never
changes for a given word within one loaded build. This means `state.phonicsByWord` can be a
permanent, append-only cache for the session: Enrich only computes words **not already in the
map**, regardless of re-extraction, filter changes, or exclude/include toggling. This sidesteps
an entire category of "is my enrichment stale" UX problem by construction — there is no
invalidation logic to get wrong, because there is no invalidation needed.

```js
function runEnrich() {
  const toEnrich = state.extracted.filter(w => !(w in state.phonicsByWord));
  if (!toEnrich.length) { setStatus('info', 'Already enriched.'); return; }
  const records = PhonicsEngine.parseWords(toEnrich);
  records.forEach(r => { state.phonicsByWord[r.word] = r; });
  updateSummary();   // reflects new enrichment coverage
  renderWordGrid();  // badges now render for newly-enriched words
  if (state.selectedWord) renderDetailPanel(); // refresh if the open word just got enriched
}
```

### 7.3 Header button — placement

Insert `Enrich` immediately after `Extract` in the primary actions group. A second new button,
`Export Phonics CSV`, is added after the existing `Download`/`Full Merge`/`Append Delta` group —
**disabled until `Object.keys(state.phonicsByWord).length > 0`.**

```
[Extract] [Enrich] | [Download] [Full Merge] [Append Delta] [Export Phonics CSV] | [Clear] |  theme
```

**Flagging this as a judgment call, not a settled decision:** this is now six buttons plus
Clear in the header action row. It should fit comfortably at the 1920×1080 target (the existing
five-button row already has room to spare in your screenshot), but this is worth a visual check
once built rather than a silent commit — logged as an open question in `PHONICS_STATUS.md` for a
quick look during your review pass, not a blocker.

### 7.4 `Export Phonics CSV` behavior

```js
function doExportPhonicsCSV() {
  const rows = activeExtracted().map(word => ({
    ...(state.phonicsByWord[word] || { word }), // falls back gracefully if a word wasn't enriched
    is_common: isCommon(word) ? 'yes' : 'no',
  }));
  const csv = PhonicsEngine.toCSV(rows, { extended: true, extraColumns: ['is_common'] });
  // download exactly like the existing downloadTxt() pattern, .csv extension, timestamped filename
}
```

Existing `Download`/`Full Merge`/`Append Delta` buttons are **completely unchanged** — they
remain plain word-list exports for the existing puzzle-generation workflows. Nothing about
today's shipped behavior is touched by this phase.

---

## 8. Word Detail panel — `phonicsWordDetail.js`

### 8.1 Three states, all handled explicitly (none left blank)

1. **No word selected** — render the existing `.empty-state` pattern already defined in
   `components.css` (reuse, don't reinvent): icon + "Click a word to see its phonics detail."
2. **Word selected, not yet enriched** — show what's genuinely available (the word itself,
   letter count, frequency if known) plus an explicit nudge: "Run Enrich to see pattern
   breakdown, syllables, and sounds for this word." Never show blank fields pretending data
   exists.
3. **Word selected and enriched** — full detail render, per §8.2.

### 8.2 Enriched detail layout

In this order, so the teacher gets a visual preview of what a Phase 5 worksheet activity will
show for this exact word — not just a flat metadata dump:

1. **Word header** with syllable-dot rendering (`PhonicsEngine.splitSyllables(word).join(' · ')`).
2. **Grapheme boxes** — one box per token from `record.graphemes.split('|')`, visually similar to
   the "Dissect the Word" activity style from the old prototype (bordered box, monospace, per
   token) — this is the first direct visual echo of a future worksheet activity, reused, not
   reinvented, in Phase 5.
3. **Pattern badges grouped by category** — reuse the exact badge markup/classes already defined
   in `dictbuilder.css` (`.badge`, category color variants) rather than inventing new ones.
4. **Vowel-team sound breakdown** — for each entry in `record.vowel_team_sounds`, show pattern →
   `SOUND_LABELS[sound]` (e.g. `ea → /ē/ (see)`).
5. **Compact stats row** — difficulty, decodability level, syllable count, letter count,
   phoneme count, is_common (yes/no) — single-line, low visual weight, scannable.
6. **Flag-for-review control** — a small text input + "Flag" button. On submit, pushes
   `{ word, record, note, flaggedAt: Date.now() }` onto `state.flagged` and shows a brief
   confirmation. This is the gap-finding mechanism from your original plan — it does not call
   any Workbench or constructs code; it only collects.

### 8.3 Flag export

A small, separate export action (can live in the Detail panel itself, near the flag control, or
as a header action gated on `state.flagged.length > 0` — build agent's call, not load-bearing
either way) that downloads `state.flagged` as JSON:

```json
[
  { "word": "speak", "note": "sounds like /ē/ but no fixture pins this", "record": { "...": "..." }, "flaggedAt": "2026-10-01T12:00:00.000Z" }
]
```

This file is exactly the kind of input the Phase 2 Constructs Workbench's Step 4 context-bundle
step consumes — the loop from "teacher notices something's off while curating" to "you fix it in
the Workbench" closes through this JSON file, copy-pasted in, not through any live integration.

---

## 9. Notes tab — default content (v1)

Short, static module-level guidance — not a placeholder, not empty:

- What **Extract** does.
- What **Enrich** does and why it's a separate step (cost/opt-in, not automatic).
- How to read the word grid badges.
- How flagging works and what happens to a flagged word.

Content is static text for v1 — no authoring UI, no per-teacher customization. This tab existing
with real, if brief, content is what keeps the tabbed pane from reading as half-finished.

---

## 10. Acceptance criteria

1. `.tool-info-pane` in Dictionary Builder renders two tabs (Notes, Detail), Notes active by
   default, with no `aria-hidden` attribute remaining.
2. Clicking a word's text switches the info-pane to the Detail tab automatically, with no second
   click required.
3. Clicking a word's corner `×` excludes it **without** switching tabs or changing the current
   selection.
4. Selecting a word, excluding it, then re-selecting it (still possible — exclude doesn't remove
   it from the grid) shows the same enrichment data with no recomputation (verify via a call-count
   check on `PhonicsEngine.parseWord` — should not increase on reselect).
5. Detail panel shows the correct one of the three states from §8.1 in every case, with no state
   producing a blank or misleading panel.
6. `Export Phonics CSV` is disabled at load and becomes enabled only after at least one
   successful Enrich call; the exported CSV has no `is_common` column gap and matches the engine's
   documented `extraColumns` behavior from Phase 3 acceptance criterion 9.
7. Existing `Download`/`Full Merge`/`Append Delta` behavior is byte-for-byte unchanged from
   before this phase (regression-check against current output for a fixed sample word list).
8. Re-extracting a word list that overlaps with previously-enriched words does not re-call
   `PhonicsEngine.parseWord` for the overlapping words (cache hit verified).
9. Flagging a word and exporting produces valid JSON matching the shape in §8.3, loadable without
   error.
10. `infoPaneTabsMarkup`/`wireInfoPaneTabs` in `shell-ui.js` have zero Dictionary-Builder-specific
    code inside them — verified by the fact that Phase 5 can import and use them with a
    completely different tab set and panel content with no modification.

---

## 11. Explicitly out of scope

- Phonics Worksheets module itself — Phase 5.
- Any live integration with the Constructs Workbench — the flag-export JSON is the only bridge,
  and it's a file, not a connection.
- Multi-teacher / saved-state persistence of flags or enrichment across sessions — everything in
  `state` here is in-memory only, cleared on reload, consistent with the no-`localStorage` rule
  already governing this whole codebase.
