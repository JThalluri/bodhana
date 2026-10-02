# Phonics Worksheets Module — Build Specification (Phase 5 of 5)

**Target consumer:** IDE build agent.
**What this is:** the first worksheet-generating consumer of everything built in Phases 1–4 — the
engine, the shared info-pane tabs primitive, and the grapheme-box/syllable-dot rendering first
built for Dictionary Builder's Detail panel. This phase is deliberately a proof of the "lego
blocks" framing, not a from-scratch feature.
**Spec version:** 1.0.0
**Status:** Complete. §7 (print/export wiring) has been verified against the real
`src/shared/print.js` and `src/shared/export-pdf.js` and resolved — `.paper-page` is reused as-is,
zero shared-file edits required.
**Depends on:** `PhonicsEngine.mjs` (Phase 3), `phonicsWordDetail.js` / `phonics-word-detail.css`
and the info-pane tabs primitive (Phase 4), `default-common-words.js` (Phase 4, **relocated** —
see §0.2), existing `src/shared/{print.js,export-pdf.js,shell-ui.js}`, existing module pattern
(`src/wordpuzzle/`, `src/math-worksheets/`).

---

## 0. Two corrections made while scoping this phase

### 0.1 v1 ships 4 of the original 9 activity types

See the chat message accompanying this spec for full rationale. Short version: Dissect the Word,
Elkonin Sound Boxes, Onset & Rime, and Syllable Split are all fully deterministic (no shuffle, no
distractor pools) — the remaining five (Pattern Identification's distractor draw, Word
Hunt/Sound Hunt, Minimal Pair/Sound Sort, Tic-Tac-Toe) involve randomization or dual-mode
filtering complexity genuinely large enough to deserve their own phase. Sentence Construction
(Type 3) is trivial but adds no framework-proving value and is deferred alongside the others for
the same "prove the slice, then extend" reason.

### 0.2 `default-common-words.js` must live in `src/shared/`, not `src/dictbuilder/`

Phase 4 placed this file under `src/dictbuilder/` on the assumption it was Dictionary-Builder-
local. Scoping this phase's Word Source section (§2) found Phonics Worksheets needs the exact
same is_common fallback resolution when a teacher loads a raw word list directly (not routed
through Dictionary Builder first) — the same "don't duplicate a lookup list in two places" logic
that's governed every other phase here.

**Correction:** relocate to `src/shared/default-common-words.js`. If Phase 4 is already built
against the old path, this is a one-line import path fix in Dictionary Builder's `ui.js`, not a
content or logic change.

---

## 1. Module layout

Mirrors the existing `math-worksheets`/`wordpuzzle` pattern, with generator/renderer explicitly
separated per your own integration guidelines (the old prototype's `renderTypeN` functions mixed
data computation and HTML string assembly — this phase does not repeat that):

```
src/phonics-worksheets/
  index.js                  # mount/unmount
  ui.js                     # state, settings pane wiring, word source/selection panel
  generator.js               # PURE functions: (words, activityType, options) -> sheet data model
  renderer.js                 # (sheet data model, { showSolutions }) -> HTML string
  phonics-worksheets.css
```

No activity's generator function touches the DOM. No renderer function computes phonics data —
it only formats what the generator already produced. This split is what lets Phase 5b (the
deferred five activities) add new generator/renderer pairs without touching `ui.js`'s settings
wiring at all.

---

## 2. Word Source — two load paths, file-based only

Per the architecture already in place (each module's `mount()`/`unmount()` implies isolated,
non-persistent state — confirmed from every existing `index.js`), there is no live, in-session
handoff between Dictionary Builder and this module. The bridge is always a file, same as the rest
of this codebase's cross-module patterns:

### 2.1 Path A — raw word list (`.txt`)

Teacher loads or pastes a plain word list (or clicks "Load demo list" — seed this from a small
curated subset of `constructs/fixtures/phonics-regression-fixtures.v2.yaml`'s tokenizer words, not a new
hand-picked list; it's already validated against the engine, which is a nice free correctness
guarantee for a demo list specifically).

On load: call `PhonicsEngine.parseWords(list)` immediately — **no separate Enrich step here**,
unlike Dictionary Builder. The reason Dictionary Builder makes Enrich an opt-in cost-gated step
is that it may be curating hundreds/thousands of words for later word-bank use; this module
works with an already-small, lesson-scoped word set where eager enrichment costs nothing and
matches the "proactive, least clicks" direction. `is_common` is resolved the same way Dictionary
Builder does — against a loaded Base Dictionary if present, else `default-common-words.js` —
using the exact same shared file, not a reimplementation.

### 2.2 Path B — pre-parsed CSV

Teacher loads a CSV produced by Dictionary Builder's `Export Phonics CSV` action (Phase 4, §7.4),
or the existing sample `phonics-dictionary.csv`. Detect via `PhonicsEngine.isPreParsedCSV(text)`,
parse directly (PapaParse, bundled — same dependency already present in the old prototype,
confirm it's available or bundle it under `vendor/` consistent with the Bodhana convention of
bundling rather than CDN-loading). No re-enrichment needed — every field, including `is_common`,
is already present as a column.

### 2.3 Fail case

If neither path recognizes the input, show a clear error — do not guess, do not silently fall
back to treating malformed CSV as a word list.

---

## 3. Filters, bounds, and word selection — reusing the old spec's design, re-verified against real engine field names

The filter pipeline design from the original worksheet-builder spec (§7, `matchesActiveFilters`)
is sound and is ported with field names double-checked against Phase 3's actual `Record` shape
(confirmed: `difficulty`, `phoneme_count`, `level`, `vowel_team_sounds`, `letter_count` all match
— only `is_common` required the Phase 4 resolution logic described in §2.1/§2.2 rather than being
a native Record field).

**Deliberately not extracted as a shared component (noted, not an oversight):** the word
selection panel here needs manual reordering (▲▼) in addition to include/exclude, which
Dictionary Builder's panel doesn't currently need for its own curation use case. Building a
generic reorderable-filterable-list component now, for a single real consumer, would be
speculative reuse — the same restraint already applied in Phase 2 (patch schema scoped to one
table, not generalized pre-emptively). If Dictionary Builder later grows a real need for
reordering, extracting a shared component at that point has two real consumers to design against
instead of one guess.

Sections, following the `tb-select`/`tb-num`/`toggle-switch` conventions confirmed from the real
`components.css`/Word Puzzles' `ui.js`:

1. **Word Source** (§2)
2. **Scope & Sequence** — decodability slider (1–8) + "Only show decodable words" toggle
3. **Pattern & Sound Filters** — pattern category accordion (from `PhonicsEngine.PHONICS_PATTERNS`)
   + vowel-sound chips (from `PhonicsEngine.SOUND_LABELS`) — two independent filter axes, exactly
   as the original spec intended
4. **Bounds & Type** — difficulty/phoneme/letter-count ranges, real/nonsense word-type select
5. **Activity** — a `tb-select` dropdown (four options for v1), matching Word Puzzles' `Type`
   selector convention exactly — **not radio buttons**, correcting the old prototype's choice
6. **Answers** — single `toggle-switch`, labeled "Show solutions" — matching the real convention
   confirmed in Word Puzzles' `ui.js` (`wpShowSolutions` → `state.showSolutions` → passed into the
   renderer), not the old prototype's CSS-visibility-toggle approach (see §5)
7. **Word Selection** — filtered list, checkboxes, ▲▼ reorder, shuffle/reset-order buttons

---

## 4. The four v1 generators (pure, data-only)

```js
// generator.js
export function generateDissect(words) {
  return { type: 'dissect', words: words.map(w => ({ word: w.word, tokens: w.tokens })) };
}

export function generateElkonin(words) {
  return { type: 'elkonin', words: words.map(w => ({
    word: w.word, tokens: w.tokens, phonemeCount: w.phoneme_count
  })) };
}

export function generateOnsetRime(words, fullPool) {
  // fullPool: the complete loaded word set, for rhyme-family lookup — NOT just the selected
  // words, matching the original spec's intent that rhyme families should be rich even on a
  // narrow worksheet
  const rimeIndex = buildRimeIndex(fullPool);
  return { type: 'onsetRime', words: words.map(w => ({
    word: w.word, onset: w.onset, rime: w.rime,
    rhymeFamily: (rimeIndex[w.rime] || []).filter(x => x !== w.word).slice(0, 6)
  })) };
}

export function generateSyllableSplit(words) {
  return { type: 'syllableSplit', words: words.map(w => ({
    word: w.word, syllables: PhonicsEngine.splitSyllables(w.word)
  })) };
}
```

Each returns a plain data object — no markup, no knowledge of `showSolutions`. The **renderer**
decides what's visible.

---

## 5. Renderer — answer visibility is a render-time parameter, not a CSS toggle

Correcting the old prototype's approach (static answer markup in the DOM, hidden via a
`.show-answers` CSS class on an ancestor) in favor of the pattern this codebase actually uses
(confirmed in Word Puzzles: `state.showSolutions` is a boolean passed into the renderer, which
produces different HTML depending on its value, re-rendered on toggle — not a CSS reveal):

```js
// renderer.js
export function renderSheet(sheetData, { showSolutions }) {
  switch (sheetData.type) {
    case 'dissect':       return renderDissect(sheetData, showSolutions);
    case 'elkonin':       return renderElkonin(sheetData, showSolutions);
    case 'onsetRime':      return renderOnsetRime(sheetData, showSolutions);
    case 'syllableSplit':  return renderSyllableSplit(sheetData, showSolutions);
  }
}
```

**Dissect** and **Syllable Split** reuse the grapheme-box (`.phx-grapheme-box`) and syllable-dot
rendering classes directly from Phase 4's `phonics-word-detail.css` — imported once into
`phonics-worksheets.css` via the same classes, not copied or reimplemented. This is the literal
proof of the "lego blocks, reused" framing: the same visual component that shows a word's
breakdown while a teacher is curating a dictionary is the same component printed on a worksheet.

**Elkonin** boxes render empty when `showSolutions` is false, and with the token letter(s) inside
when true — generated conditionally in the renderer, not hidden via CSS on an always-present
element.

**Onset & Rime** renders the rhyme-family line only when `showSolutions` is true; otherwise the
onset/rime boxes render empty for the teacher to fill in.

Every rendered page uses whichever page class §7 settles on (`.paper-page` if generic enough, or
a newly-registered one) — **this is the one piece of this section genuinely blocked on the
files noted at the top of this document.**

---

## 6. Minimal pairs helper panel (optional, not acceptance-gated)

`PhonicsEngine.findMinimalPairs` is already exposed from Phase 3 specifically for this kind of
use. Reuse the old prototype's no-print helper-panel concept (shown below the worksheet,
`.no-print`, listing minimal pairs found within the current selection) for all four v1
activities. This is a genuine value-add with near-zero marginal cost given the engine already
does the work — but it's explicitly **not** one of this phase's acceptance criteria, since it's
additive polish, not framework-proving.

---

## 7. Print / Export wiring — resolved against real `print.js`/`export-pdf.js`

### 7.1 Reuse `.paper-page` as-is — no shared-file edits required

Both shared engines hardcode the same six-class selector list
(`.paper-page, .pv-worksheet, .ttt-worksheet, .mp-puzzle-page, .sdk-puzzle-page,
.wp-puzzle-block`). The other five are each module-prefixed and each carry a bespoke
page-type-specific override block inside `export-pdf.js`'s `exportPrintStyles()`.
**`.paper-page` is the only one of the six with no such override block** — it's the generic,
no-special-handling page vessel, and its unprefixed name (unlike the other five) confirms that's
intentional. This phase uses `.paper-page` directly. **No edits to `print.js` or `export-pdf.js`
are needed** — the original §7 concern about registering a new page class doesn't apply.

### 7.2 Required page structure

Confirmed from `components.css`'s existing rule (`.tool-pages > .paper-page { zoom:
var(--tool-page-scale) !important; }`) and both engines' `document.querySelector('.tool-pages')`
root lookup: every sheet must be a **direct child** of a `.tool-pages` container, exactly:

```html
<div class="tool-pages" id="phxPagesContainer">
  <div class="paper-page">...sheet content for word list A...</div>
  <div class="paper-page">...sheet content for word list B, if multiple sheets...</div>
</div>
```

### 7.3 `.paper-page` CSS — new rule, using only existing tokens

```css
/* phonics-worksheets.css */
.paper-page {
  width: 8.5in;
  height: 11in;
  box-sizing: border-box;
  background: white;
  color: #0f172a;
  padding: var(--print-margin-y) var(--print-margin-x);
  box-shadow: var(--shadow-md);
  overflow: hidden;
  flex-shrink: 0;
}
```

The screen-preview zoom scaling (`--tool-page-scale`, currently `0.72`) is already applied
automatically by the existing shared rule — this phase does not add its own zoom handling.

**Pre-flight check for whoever implements this (cheap, not a blocker):** confirm no other module
(most likely `worksheets/` or `math-worksheets/`, neither reviewed during this spec's drafting)
already defines `.paper-page` with different assumptions, since it's an unprefixed, presumably
shared class name. If a conflict exists, it will surface immediately as a visibly duplicate/
conflicting rule when this CSS is added — a cheap, early catch, not a silent risk.

### 7.4 Wiring

```js
import { printWorksheet } from '../shared/print.js';
import { exportWorksheetPdf } from '../shared/export-pdf.js';

document.getElementById('phxBtnPrint')?.addEventListener('click', () => printWorksheet());
document.getElementById('phxBtnExport')?.addEventListener('click', () =>
  exportWorksheetPdf({ filenameBase: `phonics_${currentActivityType()}` })
);
```

No module-specific `window.print()`, no module-specific `@page` CSS, no forked watermark logic —
`addBrandWatermarks` already handles any page matching the shared selector list, including
`.paper-page`, automatically.

Header layout is the **real-time** pattern per §0.1's determinism argument — no `Generate`
button: `[Print] [Export] | | theme pill`.

### 7.5 One inherited characteristic worth knowing, not fixing

`export-pdf.js` rasterizes each page (SVG → canvas → JPEG) and assembles a minimal hand-rolled
PDF from images, rather than producing vector text. Exported PDF text will not be selectable or
searchable. This is a property of the shared export engine itself, applies identically to every
other module using it today, and is explicitly out of scope to change here — noted so it isn't
mistaken for a Phase 5 defect later.

---

## 8. Acceptance criteria

1. Loading a raw `.txt` word list enriches immediately (no Enrich button exists in this module)
   and resolves `is_common` using the same shared `default-common-words.js` / Base Dictionary
   logic as Dictionary Builder — verified by loading the same word both places and confirming
   identical `is_common` output.
2. Loading a pre-parsed CSV (including one actually exported from Dictionary Builder's `Export
   Phonics CSV`) round-trips with zero data loss or recomputation.
3. Switching the `Activity` dropdown among all four types re-renders the preview live, with no
   `Generate` button anywhere in the UI.
4. Toggling `Show solutions` re-renders the sheet with answer content present/absent — verified
   by inspecting the actual rendered HTML (not just a CSS class), confirming answers are genuinely
   absent from the DOM when solutions are hidden, not merely visually hidden.
5. The `Dissect the Word` and `Syllable Split` renderers use the exact same CSS classes
   (`.phx-grapheme-box` and the syllable-dot classes) as Phase 4's Detail panel — verified by
   diffing class names used, not just visual similarity.
6. `Onset & Rime`'s rhyme-family lookup uses the full loaded word pool, not just the currently
   selected/filtered words — verified with a case where a rhyme exists outside the current filter.
7. Filter pipeline correctly combines pattern and sound filters as independent axes (both must
   match when both are active) — ported test case from the original spec's test plan.
8. Zero generator function contains any HTML string construction; zero renderer function
   computes any phonics data — verified by code review.
9. `Print`/`Export` call the shared `printWorksheet`/`exportWorksheetPdf` functions exclusively —
   no direct `window.print()`, no module-local `@page` CSS.

---

## 9. Explicitly out of scope (Phase 5b candidates, not built now)

- Pattern Identification (Type 2), Sentence Construction (Type 3), Word Hunt/Sound Hunt (Type
  5/5b), Minimal Pair/Sound Sort (Type 6/6b), Tic-Tac-Toe (Type 7) — all deferred per §0.1.
- A shared, generic reorderable word-selection component — deferred per §3 until a second real
  consumer exists.
- Any in-session (non-file-based) handoff between Dictionary Builder and this module — would
  require portal/router-level state sharing not currently present anywhere in this codebase.
