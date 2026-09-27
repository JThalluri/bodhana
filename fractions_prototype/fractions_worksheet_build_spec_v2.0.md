# Bodhana Fractions Module — Implementation Specification

**Version:** 2.0
**Status:** Ready for integration
**Prototype reference:** v12 + Estimation patch (v13)
**Target viewport:** 1920 × 1080 desktop
**Paper:** US Letter portrait (8.5in × 11in)

---

## 1. Overview

The Fractions module extends Bodhana's Math Worksheets with three pedagogical tiers, a curated word-problem bank, and a Games category. **Generator-only** — no student interactivity. Teachers configure, generate, print/export.

### Scope

| Category | Sub-types |
|---|---|
| Fractions | 3 tiers + Curated (see §2) |
| Games | 6 games (see §2.4) |

### Design Principles

- Teacher-first configuration
- Print-preview fidelity
- Single 1.5px lines (no double borders)
- Compact layout
- Auto-pagination for overflow
- Content separated from tool (JSON topic files)

---

## 2. Sheet Catalog

### 2.1 Tier 1 — Visual

| Sub-type | ID | Visual | Student action |
|---|---|---|---|
| Identify Fraction | `identify` | Shaded shape | Write the fraction |
| Shade the Fraction | `shade` | Fraction text + blank shape | Shade the shape |
| Compare Fractions | `compare` | Two shapes/numerals + box | Write `<`, `>`, `=` |
| Number Line (Identify) | `numberline-identify` | Number line with marker | Write the fraction |
| Number Line (Mark) | `numberline-mark` | Number line + fraction text | Draw the mark |
| Fraction of a Set | `fraction-of-set` | Grid of circles, some shaded | Write the fraction |
| Estimation / Benchmarking | `estimation` | Fraction or sum + 3 choice boxes | Tick the closest benchmark |

### 2.2 Tier 2 — Equivalence & Conversion

| Sub-type | ID | Pattern |
|---|---|---|
| Equivalent Fractions | `equivalent` | `?/2 = 4/8` |
| Simplify Fractions | `simplify` | `6/8 = [blank]` |
| Mixed → Improper | `mixed-to-improper` | `2 1/3 = ?/3` |
| Improper → Mixed | `improper-to-mixed` | `7/3 = [blank]` |
| Decimal ↔ Fraction | `decimal-fraction` | `0.75 = [blank]` or `3/4 = [blank]` |
| Percent ↔ Fraction | `percent-fraction` | `25% = [blank]` or `1/4 = [blank]` |
| Ordering | `ordering` | 4 shuffled fractions; write in order |

### 2.3 Tier 3 — Operations

| Sub-type | ID |
|---|---|
| Add / Sub / Mul / Div | `operations` |
| Missing Operand | `missing-operand` |

### 2.4 Curated Content

| Sub-type | ID |
|---|---|
| Word Problems | `word-problems` |

### 2.5 Games

| Game | ID | Grid | Purpose |
|---|---|---|---|
| Tic-Tac-Toe | `tictactoe` | 3×3 per game | Fluency + strategy |
| Bingo | `bingo` | 5×5, FREE center | Recognition speed |
| Connect 4 | `connect4` | 5×5 columns 1–5 | Strategic play |
| Fraction Snake | `snake` | Configurable R×C | Sequencing |
| Fraction War | `war` | Round list (A vs B) | Comparison |
| Fraction Match | `match` | Shuffled grid | Equivalence |

---

## 3. Settings Reference

### 3.1 Category & Sub-type

| Control | ID | Type | Values |
|---|---|---|---|
| Category | `category` | select | `fractions`, `games` |
| Sub-type | `subType` | select | §2.1–2.4 |
| Game | `gameType` | select | §2.5 |
| Topic (Word Problems) | `wpTopic` | select | populated from JSON |

### 3.2 Core Generation

| Control | ID | Type | Default |
|---|---|---|---|
| Shape Preference | `shapeType` | select | `grid` |
| Fraction Format | `fractionFormat` | select | `complex` |
| Compare Mode | `compareMode` | select | `shapes` |
| Comparison Strategy | `compareStrategy` | select | `random` |
| Ordering Direction | `orderingDirection` | select | `asc` |
| DF Mode | `dfMode` | select | `mixed` |
| PF Mode | `pfMode` | select | `mixed` |
| Missing Mode | `missingMode` | select | `random` |
| Estimation Mode | `estimationMode` | select | `single` |

### 3.3 Number Ranges

All integer inputs with auto-clamp.

| Control | ID | Min | Max | Default |
|---|---|---|---|---|
| Numerator Min | `numMin` | 1 | 30 | 1 |
| Numerator Max | `numMax` | 1 | 30 | 5 |
| Denominator Min | `denMin` | 2 | 30 | 2 |
| Denominator Max | `denMax` | 2 | 30 | 8 |
| Whole Min | `wholeMin` | 1 | 9 | 1 |
| Whole Max | `wholeMax` | 1 | 9 | 3 |
| Set Size | `setSize` | 4 | 24 | 12 |
| Minimum Difference | `minDiff` | 0 | 1.0 | 0.1 |

**Visibility:**
- `wholeMin/wholeMax` → visible when `fractionFormat = complex` AND category = fractions AND sub-type ∈ {identify, shade, mixed-to-improper, improper-to-mixed, operations}
- `setSize` → visible only when sub-type = `fraction-of-set`
- `minDiff` → visible only when sub-type = `operations` AND `opSub = true`

### 3.4 Operations (Tier 3 only)

| Control | ID | Default |
|---|---|---|
| Addition | `opAdd` | ✓ |
| Subtraction | `opSub` | ✓ |
| Multiplication | `opMul` | — |
| Division | `opDiv` | — |
| Fractions per question | `numFractions` | 2 |
| Denominator Mode | `denomMode` | `unlike` |

### 3.5 Layout

| Control | ID | Default |
|---|---|---|
| Questions per paper | `qCount` | 16 (4–60) |
| Include workspace | `workspaceToggle` | ✓ |

### 3.6 Appearance

| Control | ID | Default |
|---|---|---|
| Font Face | `fontFace` | `Andika` |
| Font Size | `fontSize` | `1rem` |

### 3.7 Games

| Control | ID | Visible when |
|---|---|---|
| Question Mode | `gameQuestionMode` | ttt, bingo, c4, snake |
| Snake Dimensions | `snakeSize` | snake |
| Match Format | `matchFormat` | match |
| Round Strategy | `warStrategy` | war |
| Games per page | `gameCount` | always |

### 3.8 Answer Key

| Control | ID |
|---|---|
| Include answer key page | `includeAnswers` |

---

## 4. Data Model

### 4.1 State Shape

```js
const state = {
  category: 'fractions' | 'games',
  subType: string,       // see §2
  gameType: string,
  shapeType: 'grid' | 'bar',
  fractionFormat: 'simple' | 'complex',
  compareMode: 'shapes' | 'numerals',
  compareStrategy: 'random' | 'sameDenom' | 'sameNum',
  orderingDirection: 'asc' | 'desc',
  dfMode: 'toFraction' | 'toDecimal' | 'mixed',
  pfMode: 'toFraction' | 'toPercent' | 'mixed',
  missingMode: 'random' | 'first' | 'second' | 'result',
  estimationMode: 'single' | 'sum',
  wpTopic: string,
  numMin, numMax, denMin, denMax, wholeMin, wholeMax, minDiff, setSize: numbers,
  ops: { add, sub, mul, div: boolean },
  numFractions: 2 | 3 | 4,
  denomMode: 'same' | 'unlike',
  gameQuestionMode: 'visual' | 'numerals',
  gameCount: 1 | 2 | 4 | 6 | 8,
  snakeRows, snakeCols: integer,
  matchFormat: 'numeral' | 'shape' | 'mixed',
  warStrategy: 'random' | 'sameDenom' | 'sameNum',
  qCount: integer,
  workspace: boolean,
  fontFace: 'Andika' | 'Nunito',
  fontSize: string,
  includeAnswers: boolean
};
```

### 4.2 Fraction Object

```js
{ n: number, d: number, isMixed: boolean, whole: number }
```

### 4.3 Answer Key Entry

```js
{ label: string, answer: string }
```

### 4.4 JSON Topic File Schema

Each topic is a **standalone JSON file**. Build process inlines them into `TOPIC_FILES`.

```json
{
  "schemaVersion": "1.0",
  "topicId": "recipe-scaling",
  "title": "Recipe Scaling",
  "description": "Multiply fractions in cooking and recipe contexts",
  "board": "CBSE",
  "textbook": "NCERT",
  "grades": [6, 7],
  "curriculumRefs": [
    { "board": "CBSE", "class": 7, "chapter": "Fractions and Decimals" }
  ],
  "learningObjectives": ["...", "..."],
  "tags": ["real-world", "cooking"],
  "questions": [
    {
      "questionId": "recipe-001",
      "type": "static",
      "difficulty": "easy",
      "grades": [6],
      "operations": ["multiplication"],
      "question": "A recipe needs {frac:2/3} cup of sugar. How much for double?",
      "answer": {
        "value": "1 1/3",
        "valueType": "mixed",
        "alternatives": ["4/3"],
        "unit": "cups"
      },
      "solutionSteps": ["{frac:2/3} × 2 = {frac:4/3} = 1 {frac:1/3} cups"],
      "hint": "Multiply the numerator by 2."
    }
  ]
}
```

**Marker syntax:**
- `{frac:n/d}` — proper or improper fraction
- `{frac:w n/d}` — mixed number

Renderer converts markers to styled HTML at render time.

**Build integration:**
```
topics/
  recipe-scaling.json
  measurement-length.json
  money.json
  time.json
  ...
  manifest.json    # { "topics": ["recipe-scaling", "money", ...] }
```

Build script inlines:
```js
const TOPIC_FILES = [
  require('./topics/recipe-scaling.json'),
  require('./topics/measurement-length.json'),
  // ...
];
```

---

## 5. Generation Algorithms

### 5.1 Range Sanitization

Runs on every Generate.

```
numMin ← clamp(int(input), 1, 30)
numMax ← clamp(int(input), numMin, 30)
denMin ← clamp(int(input), 2, 30)
denMax ← clamp(int(input), denMin, 30)
wholeMin ← clamp(int(input), 1, 9)
wholeMax ← clamp(int(input), wholeMin, 9)
setSize ← clamp(int(input), 4, 24)
minDiff ← clamp(float(input), 0, 1)
if denMin <= numMin: denMin ← numMin + 1
if denMax < denMin: denMax ← denMin
Write all values back to inputs.
```

### 5.2 Fraction Generator

```
function makeFraction():
  d ← randomInt(denMin, denMax)
  maxN ← min(numMax, d - 1)
  minN ← min(numMin, maxN)
  n ← randomInt(minN, maxN)
  if fractionFormat = 'complex' and random() > 0.6:
    isMixed ← true; whole ← randomInt(wholeMin, wholeMax)
  return { n, d, isMixed, whole }
```

### 5.3 Operations Validator

```
function validateOps(operands, opSigns):
  vals ← operands.map(toImproper)
  acc ← vals[0]
  for each opSign:
    acc ← applyOp(acc, next, op)
    if acc.n < 0: return false
  final ← acc.n / acc.d
  if final < 0: return false
  if hasSub and final < minDiff: return false
  return true
```

**Generation loop:** up to 40 retries. Fallback removes subtraction entirely.

### 5.4 Estimation

**Single mode:** pick a fraction, compute distance to {0, 0.5, 1}, return closest.

**Sum mode:** generate pairs of fractions with sum ∈ [0.6, 3.4]. Reject if not clearly closer to one of {1, 2, 3} by margin ≥ 0.25.

### 5.5 Mixed Numbers

Converted to improper internally, rendered via `.mixed-num` wrapper. Whole number and fraction share parent font-size.

---

## 6. Rendering Rules

### 6.1 Page Geometry

```css
@page { size: Letter; margin: 0; }
.worksheet-page {
  width: 8.5in; height: 11in; padding: 0.4in;
  background: white; color: black; overflow: hidden;
}
```

### 6.2 Fraction Text

```html
<span class="mixed-num">
  <span class="whole">2</span>
  <span class="fraction-text">
    <span class="numerator">1</span>
    <span class="denominator">3</span>
  </span>
</span>
```

Whole number and fraction share parent font-size.

### 6.3 Shapes — Crisp Single Lines

Container provides top + left border. Each cell provides right + bottom.

```css
.fraction-shape { border-top: 1.5px solid #000; border-left: 1.5px solid #000; }
.shape-cell { border-right: 1.5px solid #000; border-bottom: 1.5px solid #000; }
.shape-cell.shaded { background: #B0B0B0; }
.shape-cell.empty { border-right: none; border-bottom: none; }
```

### 6.4 Blank Spaces

Plain blank (`min-width: 20px`), not bordered boxes. For underlines, `.workspace-inline` with `border-bottom`.

### 6.5 Question Number

Inline: `<span class="q-num">3)</span>`. Format `3)` — not `3.` — prevents decimal confusion.

### 6.6 Estimation Choices

Three checkboxes inline with the prompt. `.est-box` = 14×14px bordered square.

### 6.7 Game Tiling

| Games/page | Grid |
|---|---|
| 1 | 1×1 |
| 2 | 1 col × 2 rows |
| 4 | 2×2 |
| 6 | 2 cols × 3 rows |
| 8 | 2 cols × 4 rows |

`.game-grid-area` uses `container-type: size`. `.game-grid` uses `aspect-ratio: 1; width: min(100cqw, 100cqh)`.

Per-tile scaling: font-size 1rem → 0.6rem, shape 44px → 18px.

### 6.8 Instruction Rail (Games)

Vertical rotated text on left edge. Saves vertical space.

### 6.9 Snake Pattern

Row 0 left→right, row 1 right→left, alternating. First cell START highlight, last cell FINISH highlight.

### 6.10 Watermark

Top-right corner, `BODHANA`, Nunito 700, 0.65rem, `#ccc`.

---

## 7. Auto-Pagination

### 7.1 Per-Page Limits

```js
const QUESTIONS_PER_PAGE = {
  'identify': 16,
  'shade': 12,
  'compare': 12,
  'numberline-identify': 12,
  'numberline-mark': 10,
  'fraction-of-set': 10,
  'estimation': 14,
  'equivalent': 16,
  'simplify': 20,
  'mixed-to-improper': 20,
  'improper-to-mixed': 20,
  'decimal-fraction': 20,
  'percent-fraction': 20,
  'ordering': 12,
  'operations': 14,
  'missing-operand': 14,
  'word-problems': 10
};
```

### 7.2 Page Splitting

If `qCount > perPage`, split into `ceil(qCount / perPage)` pages. Each page gets full header, watermark, and (when multi-page) "Page N of M" label top-left.

### 7.3 Answer Key

Renders as separate `.worksheet-page` after worksheet pages. Print CSS applies `page-break-after: always`.

---

## 8. Answer Key Rules

### 8.1 Standard

4-column grid, Nunito font:

```
1)  3/4          5)  2/3         9)  5/8         13)  1 2/5
```

### 8.2 Bingo Call Sheet

3 columns × 20 rows. Each entry: index, fraction text, small shape (24px).

### 8.3 War

Per-game breakdown with round results and final score.

### 8.4 Match

Per-game pairs list with cell references.

### 8.5 Word Problems

Answer + unit + solution steps in brackets.

---

## 9. Print & Export

### 9.1 Print Path

Native browser print. US Letter. Zoom 100%. Background graphics ON.

### 9.2 Export Path

Bodhana's shared PDF utility consumes the same print CSS.

### 9.3 Print CSS

```css
@media print {
  @page { size: Letter; margin: 0; }
  .sidebar, .settings-pane, .module-header { display: none !important; }
  .pages-container { display: block; gap: 0; }
  .worksheet-page {
    box-shadow: none; margin: 0; padding: 0.4in;
    width: 8.5in; height: 11in;
    page-break-after: always;
  }
  .worksheet-page:last-child { page-break-after: auto; }
}
```

---

## 10. Edge Cases

| Case | Behavior |
|---|---|
| `numMax < numMin` | Snap to numMin |
| `denMin ≤ numMin` | Force denMin = numMin + 1 |
| Subtraction goes negative | Retry up to 40×, then fall back to subtraction-free |
| `minDiff` NaN / negative | Clamp to 0 |
| `minDiff` > 1 | Clamp to 1.0 |
| Bingo pool exhausted | Uses denominators up to 12 regardless of user ranges |
| Empty WP topic | Show "No questions in this topic" |
| qCount overflow | Auto-paginate |
| Games category | `shapeType` forced to `'grid'`, shape dropdown hidden |

---

## 11. Integration Checklist

- [ ] CSS uses Bodhana design tokens
- [ ] Fonts: Andika + Nunito loaded
- [ ] Page geometry matches Bodhana US Letter convention
- [ ] Header actions follow `[Generate] [Print] [Export] | [Reset] | [theme]`
- [ ] Watermark reserved
- [ ] Settings pane ordered: Type → Core → Layout → Appearance → Answers → Reproducibility
- [ ] Random seed wired (currently Math.random)
- [ ] Answer key pagination matches convention
- [ ] Print CSS verified against shared utility
- [ ] Export hooks into shared PDF engine
- [ ] Settings persist (localStorage or backend)
- [ ] Input/select components match Bodhana's
- [ ] Topic JSON files inline correctly at build time
- [ ] Build script reads `topics/manifest.json`

---

## 12. Known Gaps

| Feature | Status |
|---|---|
| Random seed | Not wired; Math.random used directly |
| Multi-point number line | Only single-marker variants |
| Mixed number in Match | Complex mode doesn't add mixed pairs |
| Bingo call mode preference | Currently shows both text and shape |
| Connect 4 gravity | Layout hint only, not enforced |
| War round count override | Fixed by tiling |
| Operations visual operand | Not implemented |

---

## 13. Glossary

| Term | Meaning |
|---|---|
| Tier 1/2/3 | Visual / Equivalence / Operations |
| Mixed number | `2 1/3` |
| Improper | Numerator ≥ denominator |
| Tiling | Multiple game instances per page |
| Container query | CSS `container-type: size` |
| Snake pattern | S-shaped cell ordering |
| Call sheet | Bingo answer key formatted for reading aloud |
| Topic pack | Standalone JSON file with one theme |
| Marker | `{frac:n/d}` inline fraction notation |

---

**End of specification — v2.0.**
