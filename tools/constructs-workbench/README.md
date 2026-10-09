# Constructs Workbench

Standalone offline tool for safe, iterative enrichment of `phonics-constructs.yaml`.
Not part of Bodhana. Never shipped to teachers. Used by one person (you).

---

## How to open

**Option A — Standalone file (recommended):** open `workbench-standalone.html` directly from
`file://`. Works in Chrome with no server, no flags. All JS is inlined.

```
# From repo root — build once, then open the output file directly in Chrome:
node tools/constructs-workbench/build-standalone.mjs
# Output: tools/constructs-workbench/workbench-standalone.html
```

Rebuild whenever you edit any of these source files:
- `tools/constructs-workbench/app.js`
- `tools/constructs-workbench/workbench-core.mjs`
- `tools/constructs-workbench/vendor/js-yaml.min.js`
- `scripts/constructs-compile-core.mjs`
- `scripts/constructs-validate.mjs`
- `src/phonics/core/vowelSounds.mjs`
- `src/phonics/core/tokenize.mjs`

The build script (`build-standalone.mjs`) reads all six files, strips ES module
`import`/`export` syntax, and concatenates everything into a single self-contained HTML file.
`workbench-standalone.html` is a build artifact — do not edit it directly.

**Option B — Dev server:** serves `index.html` with separate script files (easier to debug).

```
# From repo root:
npx serve . --no-clipboard
# Then open: http://localhost:3000/tools/constructs-workbench/
```

---

## The eight-step workflow

### Step 1 — Load

Open two files:
1. `constructs/phonics-constructs.yaml` — the constructs source
2. `constructs/fixtures/phonics-regression-fixtures.v2.yaml` — the regression corpus

Both are required. If either fails to parse, the error is shown and you cannot proceed.

**I/O path**: Chrome/Edge uses the File System Access API (file handles persist for the session,
enabling direct write-back on merge). Firefox/Safari falls back to upload/download.

### Step 2 — Target a word or pattern

Type a word (e.g. `speak`) or a vowel-team pattern (e.g. `ea`):

- **Word mode**: shows all vowel-team patterns detected in the word, their current resolved
  sound, and which lookup tier produced it (direct / suffix-stripped / compound-scan / default).
  Click "Target pattern X" to lock in a pattern and proceed.
- **Pattern mode**: shows the pattern's default sound and every existing exception row.
  Click "Target pattern X" to lock in and proceed.

### Step 3 — Blast radius (mechanical)

A table of every word containing the targeted pattern as a substring, drawn from both the
fixture corpus and the exception table. For each word: current sound and lookup tier.

This is the literal answer to "what already exists and how is it branched" — computed, not
asserted by anyone. Read it before writing a correction request.

### Step 4 — Export context bundle

Enter your correction request in plain text, then copy the assembled bundle to the clipboard.
The bundle contains:

- Pattern default sound
- All existing exception rows for the pattern
- The full blast-radius table
- Your correction request
- A fixed instruction block telling the LLM the exact legal patch format (vowelTeamExceptions
  only — add / modify / remove)

Paste the bundle into your LLM of choice. Nothing is sent automatically.

### Step 5 — Paste patch

Paste the LLM's YAML response. Schema is validated live:

- Only `add`, `modify`, `remove` are allowed keys.
- Keys targeting `patternCategories`, `defaultVowelSound`, `compoundParts`, `rootWords`, or
  `suffixStripRules` are **rejected immediately** before any computation.
- Each item must have `word` and `pattern`; `add`/`modify` items also need `sound`.

A red error message with a specific violation description appears on any schema problem.
Click "Run Sandbox" only when you see the green "Schema valid" status.

### Step 6 — Sandbox (automatic)

Runs immediately after you click "Run Sandbox". On an in-memory clone of the loaded constructs:

1. Applies the patch
2. Compiles via `compileConstructs()` (the real Phase 1 function — no reimplementation)
3. Runs all 5 Phase 1 validation rules via `validateAll()`
4. Re-runs every vowelTeamSounds fixture and diffs against pre-patch results
5. Recomputes the blast-radius table

Proceeds to Step 7 automatically.

### Step 7 — Review (hard gate)

Three sections:

1. **Validator result** — any failure blocks merge entirely. Shows the exact rule and all
   violating words/patterns.
2. **Regression diff** — every fixture whose resolved sound changed, flagged as expected
   (word named in the patch) or unexpected (not named). Any unexpected change is a hard block.
   There is no override.
3. **Blast-radius diff** — side-by-side before/after, colour-coded: unchanged / intentionally
   changed / unintentionally changed.

"Proceed to Merge" only appears if the validator passed AND the regression diff has zero
unexpected changes.

### Step 8 — Merge

Shows what will be written. On confirmation:

1. Applies the patch to the real in-memory constructs object and serializes it as YAML.
2. Writes the updated YAML:
   - FSA path: writes back through the original file handle (overwrites in place).
   - Upload path: downloads `phonics-constructs.updated.<timestamp>.yaml` — copy it over
     `constructs/phonics-constructs.yaml` manually.
3. Appends CHANGELOG entries to `constructs/CHANGELOG.md`:
   - FSA path: optionally load `CHANGELOG.md` first via "Load CHANGELOG" button; the workbench
     appends the new lines and writes the file back.
   - Upload/no-handle path: downloads `changelog-append.<timestamp>.txt` — append the contents
     to `constructs/CHANGELOG.md` manually.

Nothing writes to disk before this step. Nothing in steps 1–7 modifies any file.

---

## Files

| File | Purpose |
|------|---------|
| `index.html` | Standalone shell — styles + loads vendor + mounts app.js |
| `app.js` | UI layer — 8-step state machine, DOM rendering, FSA I/O |
| `workbench-core.mjs` | Pure logic — validatePatchSchema, applyPatchToRaw, computeBlastRadius, runRegressionDiff, buildChangelogEntries |
| `vendor/js-yaml.min.js` | Bundled YAML parser (UMD build of js-yaml, sets window.jsyaml) |

Shared logic is imported directly — never forked:
- `../../scripts/constructs-compile-core.mjs` — `compileConstructs()`
- `../../scripts/constructs-validate.mjs` — `validateAll()`, `ValidationError`
- `../../src/phonics/core/vowelSounds.mjs` — `buildExceptionMap`, `lookupExceptionWithTier`, `soundForVowelTeam`

---

## Automated tests

```
npx vitest run tests/workbench/
```

Covers:
- AC 3: `computeBlastRadius('ea', ...)` includes all fixture corpus ea-words (with correct tiers)
- AC 4: duplicate `(word, pattern)` row caught by Phase 1 `checkExceptionTableSelfConsistency`
- AC 5: modifying `bread:ea` causes `breadwinner` to change via compound-scan (surfaces as unexpected diff)
- AC 6: 30 schema-validation cases (all forbidden keys, all malformed item shapes)

---

## Manual verification required (ACs not covered by automated tests)

| AC | What to check | How |
|----|---------------|-----|
| AC 1 | `workbench-standalone.html` opens with zero console errors | Open directly from `file://` in Chrome; check DevTools console |
| AC 2 | Searching `speak` shows it resolving via `ea` default (tier = default) | Step 2 |
| AC 7 | Successful merge writes exactly one new line to CHANGELOG.md and updates only the targeted rows in the YAML | Run a real merge on a known row; `git diff` before/after |
| AC 8 | Zero network requests during entire workflow | Browser DevTools → Network tab → verify empty during full run-through |

Note on AC 7 formatting: `jsyaml.dump()` reformats the YAML (removes comments, normalises spacing).
The structural content is preserved; the `git diff` will show formatting changes throughout the file,
which is expected and acceptable. Verify that only the targeted `vowelTeamExceptions` rows changed value.
