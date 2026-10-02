# Phonics Constructs — Authoring Guide

This directory contains the single source of truth for all phonics pattern data
used by Bodhana's phonics engine.

## Files

| File | Purpose |
|---|---|
| `phonics-constructs.yaml` | Hand/LLM-editable authoring file |
| `fixtures/phonics-regression-fixtures.v2.yaml` | Regression corpus — do not hand-edit without also updating the companion `.md` |

The compiler (`scripts/build-constructs.mjs`) reads the YAML, validates it, and
writes `src/phonics/generated/phonics-constructs.json` (gitignored — always
freshly generated).

## Running the compiler

```
node scripts/build-constructs.mjs
```

Or via npm (also runs automatically before dev/build/test):

```
npm run build:constructs
```

## Adding a new exception row

The most common edit is adding a word whose vowel team makes an unexpected sound.

**Example:** adding `"swear"` (the `ea` in `swear` says `/âr/`, which is the
`rControlled3:ear` pattern's job and not actually a vowel-team exception — this
is a contrived example to show the format):

```yaml
vowelTeamExceptions:
  # ... existing rows ...
  - { word: swear, pattern: ea, sound: short_e }  # ← new row
```

### Rules for exception rows

1. **`word`** — lowercase, no spaces or punctuation.
2. **`pattern`** — must be one of the vowel teams listed in
   `patternCategories.vowelTeams`. The compiler hard-fails if it isn't.
3. **`sound`** — must be a key in `soundLabels`. The compiler hard-fails if it
   isn't. The available sound keys are:
   `long_a, long_e, long_i, long_o, long_u, short_a, short_e, short_i,
   short_o, short_u, oo_long, oo_short, ow, oi, aw, air`.
4. **`note`** — optional free-text. Include when the reason the exception exists
   is non-obvious. Notes compile through into the JSON for tooling to show.
5. **No duplicate (word, pattern) pairs.** Two rows for the same word are
   allowed — and normal for dual-override words like `cookie` (both `ie:long_e`
   and `oo:oo_short`). But two rows with the same word *and* the same pattern
   would be a contradiction — the compiler treats this as a hard failure.
6. **The word must contain the pattern.** The compiler checks this as a typo
   guard. `{ word: height, pattern: igh, sound: long_i }` passes because
   `height` contains `igh`. `{ word: height, pattern: ea, sound: ... }` would
   fail because `height` doesn't contain `ea`.

### After editing

Re-run `node scripts/build-constructs.mjs`. All four validation rules run
automatically. Then run `npm test` to confirm the regression corpus still passes.

## Exception table structure — why it's a flat array

The original `PhonicsConstructor.js` keyed exceptions by word
(`{ bread: {ea:'short_e'}, cookie: {ie:'long_e', oo:'oo_short'}, ... }`).
This caused a silent-overwrite bug: if a word appeared twice in a large file,
or needed two different pattern overrides, the second entry wiped out the first.

This YAML uses a **flat array of rows** instead. Multiple rows for the same word
are explicit and visible. The *only* thing that's forbidden is two rows sharing
both the same `word` and the same `pattern` — that's a real contradiction.

## Adding a new compound part

Compound parts are words that commonly form one half of a compound word
(`something`, `breadwinner`, `steakhouse`). Add to the `compoundParts` list:

```yaml
compoundParts:
  - ...existing entries...
  - ginger   # now "gingerbread" can compound-split as gin·ger·bread
```

Minimum length is 2 characters; the compiler hard-fails on shorter entries.

## Adding a new root word

Root words are used by the suffix-strip un-doubling logic (`running→run`,
`bigger→big`, `slimmer→slim`). If you find a word that should split via
un-doubling but doesn't, check whether its root is in `rootWords`:

```yaml
rootWords:
  - ...existing entries...
  - slim   # enables slimmer → slim·mer
```

Minimum length is 3 characters; the compiler hard-fails on shorter entries.

## Validation rules (permanent, build-blocking)

The compiler enforces four rules on every build:

1. **Reachability** — every pattern in `patternCategories` must appear as a
   token in at least one tokenizer fixture.
2. **No cross-category collisions** — no pattern string may appear in more than
   one category.
3. **Branch coverage** — every suffix-strip rule and every lookup exception tier
   (direct/suffix-stripped/compound-scan) must be exercised by ≥1 fixture.
4. **Exception-table self-verification** — every row's word must contain its
   pattern, every sound must exist in `soundLabels`, every pattern must be a
   vowel team, and no (word, pattern) pair appears twice.
