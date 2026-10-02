# Phonics Engine — Build Specification (Phase 3 of 5)

**Target consumer:** IDE build agent.
**What this is:** the rebuilt, production engine — a thin orchestration layer over the pure
core compute functions (now permanent per the Phase 1 decision-log correction), consuming only
the compiled `phonics-constructs.json`. This is what Phase 4 (Dictionary Builder) and Phase 5
(Phonics Worksheets) will actually import.
**Phase scope:** the engine module only. No Bodhana UI changes.
**Spec version:** 1.0.0
**Depends on:** `src/phonics/core/*.mjs` and `src/phonics/generated/phonics-constructs.json`
from Phase 1, unmodified.

---

## 0. Two boundary decisions made while scoping this phase

### 0.1 Core scope expands — all pure per-word compute moves to `src/phonics/core/`

Phase 1 named four functions as shared core (`tokenize`, `splitSyllables`, `vowelTeamSounds`,
`lookupException`). Scoping the engine's full API surface against the original contract
(`countSyllables`, `onsetRime`, `identifyVowelNuclei`, `computeDifficulty`, `decodabilityLevel`,
`findAllPatterns`) made it clear these are exactly the same kind of thing — pure, dependency-free,
operate on a single word. Splitting "four in core, the rest duplicated or inlined in the engine"
would recreate the same multi-truths risk this initiative keeps finding and killing.

**Decision:** all of the above move to `src/phonics/core/` as part of this phase. The engine
becomes strictly orchestration + I/O + public API shape — it composes core functions into
`Record` objects, handles CSV/download, and exposes the stable contract. It defines zero
linguistic logic of its own. Logged in the decision log; this expands Phase 1's original core
file list but changes none of Phase 1's already-built behavior.

### 0.2 UMD wrapper dropped — engine is ES-module-only

The original prototype spec required three loading environments (browser `<script>` tag,
CommonJS, ESM interop) because `PhonicsConstructor.js` was designed to be dropped into a
standalone static HTML page — which is exactly what the old `phonics-worksheet.html` prototype
did. That use case no longer applies: this engine is bundled into Bodhana's Vite SPA (ESM
throughout, per every existing module in this repo) and the standalone Constructs Workbench
(Phase 2) already imports the core functions directly as ES modules, not via a wrapped global
object. Carrying UMD forward would be solving a problem that doesn't exist anymore, at a real
cost (the wrapper is extra surface with its own bugs waiting to happen).

**Decision:** the engine ships as plain ES modules — named exports plus one convenience default
export aggregating them, matching how the rest of this codebase reads (`import { mount } from
'./ui.js'` style). No `module.exports`, no `window.PhonicsConstructor` global. If a future need
for a standalone-script deployment genuinely arises, it's a thin UMD shim added later, not
something to carry speculatively now.

---

## 1. Module layout

```
src/phonics/
  core/
    tokenize.mjs            # tokenize(word, opts)
    vowelNuclei.mjs          # identifyVowelNuclei(word)
    syllables.mjs            # splitSyllables(word, depth), countSyllables(word), onsetRime(word)
    vowelSounds.mjs          # lookupException, soundForVowelTeam, vowelTeamSounds
    difficulty.mjs           # computeDifficulty, decodabilityLevel
    patterns.mjs             # findAllPatterns
    index.mjs                # re-exports everything above — the ONE import path for consumers
  constructsLoader.mjs        # loads generated JSON, validates schemaVersion, derives lookup tables
  generated/
    phonics-constructs.json   # from Phase 1, gitignored, always regenerated
  PhonicsEngine.mjs            # the public API — THIS is what Phase 4/5 import
```

Every function in `core/` takes a word (and, where relevant, data passed explicitly from
`constructsLoader`) and returns a value — **no function in `core/` reads the constructs JSON
itself.** Pattern/exception/default-sound data is always passed in as a parameter, never
imported inside a core file. This keeps core functions trivially testable and keeps
`constructsLoader` as the single point of contact with the compiled data — if the compiled JSON
shape ever changes, only `constructsLoader.mjs` and `PhonicsEngine.mjs` need to know.

---

## 2. `constructsLoader.mjs`

```js
import constructsData from './generated/phonics-constructs.json';

const EXPECTED_SCHEMA_VERSION = '1.0.0';

export function loadConstructs() {
  if (constructsData.schemaVersion !== EXPECTED_SCHEMA_VERSION) {
    throw new Error(
      `phonics-constructs.json schemaVersion mismatch: expected ${EXPECTED_SCHEMA_VERSION}, ` +
      `got ${constructsData.schemaVersion}. Re-run the Phase 1 compiler or update ` +
      `EXPECTED_SCHEMA_VERSION if this is an intentional shape change.`
    );
  }

  // Derive PATTERN_CATEGORY, PATTERN_LEVELS, SORTED_PATTERNS from patternCategories +
  // patternCategoryDefaultLevels + patternLevelOverrides — same derivation the old engine did
  // at module-load time, just sourced from compiled JSON instead of hardcoded literals.
  // Build a word-keyed lookup map from the flat vowelTeamExceptions array here, once, at load —
  // this is the ONE place that array becomes a map; core functions receive the map, never the
  // raw array, and never re-derive it.

  return {
    patternCategories: constructsData.patternCategories,
    patternCategory: /* derived */,
    patternLevels: /* derived */,
    sortedPatterns: /* derived, longest-first */,
    scopeLevels: constructsData.scopeLevels,
    soundLabels: constructsData.soundLabels,
    defaultVowelSound: constructsData.defaultVowelSound,
    vowelTeamExceptionsByWord: /* derived map: word -> { pattern: {sound, note} } */,
    compoundParts: /* Set, built from constructsData.compoundParts */,
    rootWords: /* Set, built from constructsData.rootWords */,
    suffixStripRules: constructsData.suffixStripRules,
    meta: { schemaVersion: constructsData.schemaVersion, sourceHash: constructsData.sourceHash, generatedAt: constructsData.generatedAt }
  };
}
```

**Fail loud, exactly once, at the top.** If `loadConstructs()` throws, nothing downstream should
attempt to catch and degrade — this mirrors the Phase 1 compiler's own "never ship partial
output" rule, now enforced on the consumer side too.

---

## 3. Public API — `PhonicsEngine.mjs`

Signatures are frozen relative to the original prototype contract **except** the two changes
noted explicitly below. Do not rename, reorder arguments, or change return shapes beyond what's
stated here — Phase 4 and Phase 5 are written against this exact contract.

```js
// Constants (derived at module load via constructsLoader, exposed read-only)
ENGINE_VERSION                 // string, '3.0.0' — see §3.1 on what this version number means
PHONICS_PATTERNS               // { [category]: string[] }
PATTERN_CATEGORY               // { [pattern]: category }
PATTERN_LEVELS                 // { [pattern]: 1..8 }
SCOPE_LEVELS                   // [{ level, name, desc }]
SORTED_PATTERNS                // [{ pattern, category }] longest-first
SOUND_LABELS                   // { sound_key: '/ē/ (see)' }
DEFAULT_VOWEL_SOUND            // { pattern: sound_key }

// Parsing
parseWord(rawWord, opts?)      → Record|null
parseWords(list, opts?)        → Record[]
parseText(text, opts?)         → Record[]

// Analysis (thin pass-throughs to core/ — see §1)
tokenize(word, opts?)          → string[]
findAllPatterns(word)          → { [category]: string[] }
findMinimalPairs(word, pool, opts?) → Pair[]
countSyllables(word)           → number
onsetRime(word)                → { onset, rime }
splitSyllables(word, depth?)   → string[]
identifyVowelNuclei(word)      → Nucleus[]
decodabilityLevel(record)      → 1..8
soundForVowelTeam(word, pattern) → sound_key|null
vowelTeamSounds(word, tokens?) → SoundHit[]
lookupException(word, pattern) → sound_key|null

// CSV
toCSV(rows, { extended?, extraColumns? }) → string
downloadCSV(csv, filename)     → void  (browser only)
isPreParsedCSV(text)           → boolean

// Debug
selfTest()                     → string
```

### 3.1 `ENGINE_VERSION`

A plain string marking this engine generation (`'3.0.0'`, reflecting that this is the third major
rewrite in this module's history — `2.x` was the pre-refactor prototype line). This is **not**
the same thing as the constructs' `schemaVersion`, and the two should never be conflated — the
engine can get a patch release with zero constructs changes, and the constructs can get dozens of
enrichment edits with zero engine code changes. `selfTest()` should report both numbers plus the
constructs' `sourceHash`/`generatedAt` so a bug report always carries enough to know exactly which
code and which data produced it.

### 3.2 Record shape — `is_common` is gone, intentionally

```ts
{
  word:               string
  graphemes:          string
  phoneme_count:      number
  digraphs:           string
  trigraphs:          string
  blends:             string
  difficulty:         1 | 2 | 3
  clusters3:          string
  vowel_teams:        string
  r_controlled:       string
  floss:              string
  letter_count:       number
  syllable_count:     number
  onset:              string
  rime:               string
  level:              number
  secondary_patterns: string
  vowel_team_sounds:  string   // 'ea:short_e' or 'oo:oo_short,ie:long_e' — order follows token order in the word, not table declaration order (see §4 acceptance test 5)
  tokens:             string[] // not exported to CSV, same as before
}
```

**`is_common` is removed from this Record entirely** — it was never a phonics construct, it was
always a word-frequency/curation concern, and it now belongs to Dictionary Builder (Phase 4),
computed against the teacher's actual Base Dictionary rather than a hardcoded ~400-word list
baked into the engine. Any code checking `record.is_common` will get `undefined`, not `false` —
this is a deliberate breaking change from the original prototype's Record contract, not an
oversight. Phase 4's spec will define exactly how `is_common` gets layered back on as a
decoration step outside this engine.

### 3.3 `toCSV` — `EXTENDED_COLUMNS` must drop `is_common`, and `extraColumns` is new

**This is a required code change, not just a consequence of §3.2 — state it explicitly so it
isn't missed.** The original `EXTENDED_COLUMNS` array included `is_common` as its 9th entry:

```js
// OLD — do not carry this forward as-is
var EXTENDED_COLUMNS = ['clusters3','vowel_teams','r_controlled','floss','letter_count',
                        'syllable_count','onset','rime','level','is_common',
                        'secondary_patterns','vowel_team_sounds'];
```

If this array is copied forward unchanged, `toCSV` would emit an `is_common` header column with
every row blank (since no Record has that key) — satisfying neither acceptance criterion 8
cleanly nor, worse, criterion 9: combined with Phase 4's `extraColumns: ['is_common']` (§7.4 of
the Dictionary Builder spec), the output would contain **two** `is_common` columns, one blank
and one populated. The corrected array, 11 entries, `is_common` removed:

```js
var EXTENDED_COLUMNS = ['clusters3','vowel_teams','r_controlled','floss','letter_count',
                        'syllable_count','onset','rime','level',
                        'secondary_patterns','vowel_team_sounds'];
```

`BASE_COLUMNS` (7 entries) is unchanged. Base + extended is now **18** columns, not the original
spec's 19 — if `selfTest()`'s behavior is being verified against the old prototype spec's
acceptance criterion ("CSV with 19 columns"), that figure is stale; 18 is correct here, and 19
again only once `extraColumns: ['is_common']` is explicitly passed.

```js
toCSV(rows, { extended: true, extraColumns: ['is_common'] })
```

`extraColumns` is a list of additional field names assumed present on each row object; they're
appended after the standard extended columns, in the order given, with the same `csvCell`
quoting applied. This exists specifically so Dictionary Builder (Phase 4) can export a richer
CSV (engine fields + `is_common` + whatever else it layers on) **without the engine needing any
knowledge of what Dictionary Builder adds.** The engine stays a pure phonics layer; callers
extend the export surface without forking it.

---

## 4. Acceptance criteria

1. `ENGINE_VERSION === '3.0.0'`.
2. `tokenize('gingerbread').join('|') === 'g|i|n|g|er|br|ea|d'`.
3. `splitSyllables('understand').join('·') === 'un·der·stand'`.
4. `parseWord('breathe').vowel_team_sounds === 'ea:long_e'` and same for `breathes`.
5. `parseWord('cookie').vowel_team_sounds === 'oo:oo_short,ie:long_e'` — **note the order**: `oo`
   before `ie`, because `vowelTeamSounds` iterates tokens in word order (`c|oo|k|ie`), not
   construct-table declaration order. `rookie` must match the same order for the same reason.
6. `parseWord('gingerbread').vowel_team_sounds === 'ea:short_e'`.
7. `parseWord('ship')` returns an object with **no `is_common` key at all** (`'is_common' in
   record === false`, not merely `record.is_common === undefined` from a key that exists with an
   undefined value — verify with `Object.keys`, not just property access).
8. `toCSV(rows, { extended: true })` (no `extraColumns`) produces a header row with **no
   `is_common` column** — confirms the breaking change from §3.2 is real, not just documented.
9. `toCSV(rows, { extended: true, extraColumns: ['is_common'] })` on rows that each carry an
   `is_common` field produces a header row ending in `...,secondary_patterns,vowel_team_sounds,is_common`.
10. Loading a deliberately-corrupted `phonics-constructs.json` with a wrong `schemaVersion`
    throws synchronously on `loadConstructs()`, with a message naming both the expected and
    actual version — never degrades silently.
11. The full regression corpus (`constructs/fixtures/phonics-regression-fixtures.v2.yaml`), excluding
    `expectedFailure: true` entries, passes when run through the **public API**
    (`PhonicsEngine.parseWord`/`tokenize`/`splitSyllables`/`vowelTeamSounds`) — this is in
    addition to, not a replacement for, Phase 1's core-level tests. The point of re-running it
    here is to catch any regression introduced by the orchestration layer itself, since the
    underlying core logic is unchanged.
12. Zero linguistic logic is defined inside `PhonicsEngine.mjs` itself — every computation is a
    call into `core/`. (Verify by code review / grep: no pattern-matching, no suffix-stripping
    logic, no sound-lookup logic should appear outside `core/`.)
13. No `module.exports`, no `window.PhonicsConstructor` global, no UMD wrapper anywhere in the
    new engine files.

---

## 5. Non-functional requirements

| Concern | Requirement |
|---|---|
| Module format | ES modules only, per §0.2 |
| Size | Minified + gzipped ≤ 12 KB, same ceiling as the original spec |
| Startup | `parseWords(10000)` ≤ 250 ms on a 2019 laptop (unchanged target) |
| Fail-fast | Any `schemaVersion` mismatch throws at load, synchronously, before any parsing function can be called |
| No duplicated logic | §0.1 — enforced by acceptance criterion 12 |

---

## 6. Explicitly out of scope

- `is_common` computation or Base Dictionary integration — Phase 4.
- Any Bodhana UI — Phases 4 and 5.
- Any change to `src/phonics/core/*.mjs` function behavior — this phase only *relocates and
  completes* the core file set (§0.1); it does not change what any function computes. If a core
  function needs a behavior change, that's a Phase 1/backlog matter, not this phase's.
