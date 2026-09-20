# PhonicsConstructor.js — Build Specification

**Target consumer:** An IDE build agent (Cursor / Aider / Copilot Workspace / human dev).
**Deliverable:** A single-file, dependency-free ES5-compatible JavaScript module.
**Location in repo:** `src/phonics/PhonicsConstructor.js`
**Companion spec:** `specs/PhonicsWorksheet_Builder_Spec.md` (must be v2.1.0+)
**This document version:** `2.3.1`
**Supersedes:** `2.3.0`

### Changelog since 2.3.0

**Tokenizer**
- **New:** `ng` digraph is skipped when immediately followed by `e` — the letters belong to different syllables (`gin|ger`, `fin|ger`, `long|er`).
- **Changed:** Inner pattern loop uses explicit `continue` for clarity instead of a compound `if`.

**Syllable splitter**
- **New:** `lookupException()` performs three-tier lookup: direct → suffix-stripped → compound-part scan. Fixes `gingerbread`, `breadwinner`, `bedspread`, `steakhouse`, `overthrow`.
- **Changed:** Suffix list reordered — `es` moved to the end so `breathes` strips `s` (→ `breathe`) before `es` strips it to `breath`.

**Exception table**
- **New:** `their`, `heir`, `theirs` under `ei:'air'`.
- **New:** `breathe` family (`breathe`, `breathes`, `breathed`, `breather`, `breathing`) under `ea:'long_e'`.
- **New:** `would`, `could`, `should` under `ou:'oo_short'`.
- **New:** `friend` under `ie:'short_e'`; `says` under `ay:'short_e'`; `they`, `obey` under `ey:'long_a'`; `height`, `sleight` under `ei:'long_i'`; `either`, `neither`, `seize` under `ei:'long_e'`.
- **Expanded:** `ie = long_e` block grown from 11 to 42 entries — believe family, cookie family, common `-ie` nouns, multi-syllable `-ie`.
- **Changed:** `cookie`, `cookies`, `bookie`, `rookie`, `hoodie`, `woodie` now carry **both** `ie:'long_e'` and `oo:'oo_short'` overrides on a single line.
- **Removed:** duplicate entries for `rookie`, `hoodie` from the common-nouns block (silent overwrite hazard).

**Acceptance criteria**
- **New:** §12.7–§12.10 pin `gingerbread`, `breathe`, `cookie`, and `understand` behaviours.

---

## 1. Purpose

Convert a raw list of English words (one per line, or a `.txt` / `.csv` blob) into an array of structured phonics-metadata records, and export those records as standards-compliant CSV suitable for human inspection (Excel/Sheets) and programmatic ingestion by a worksheet builder.

The module must run in three environments without modification:

| Environment | Loading pattern | Global |
|---|---|---|
| Browser (script tag) | `<script src="PhonicsConstructor.js">` | `window.PhonicsConstructor` |
| CommonJS (Node) | `require('./PhonicsConstructor.js')` | module exports |
| ESM (bundler interop) | `import PC from './PhonicsConstructor.js'` | default export |

---

## 2. Deliverables

| Artifact | Path | Notes |
|---|---|---|
| Module source | `src/phonics/PhonicsConstructor.js` | UMD wrapper, no external deps |
| Unit tests | `tests/phonics/phonics.test.js` | Jest or Vitest, Node |
| Fixture data | `tests/phonics/fixtures/*.txt` | Raw word lists |
| README | `src/phonics/README.md` | Public API + integration notes |

---

## 3. Public API Contract

Every function below is **required**. Signatures and return shapes are frozen — do not rename, reorder args, or change return types.

```js
// Constants
PhonicsConstructor.VERSION                  // string, '2.3.1'
PhonicsConstructor.PHONICS_PATTERNS         // { [category]: string[] }
PhonicsConstructor.PATTERN_CATEGORY         // { [pattern]: category }
PhonicsConstructor.PATTERN_LEVELS           // { [pattern]: 1..8 }
PhonicsConstructor.SCOPE_LEVELS             // [{ level, name, desc }]
PhonicsConstructor.SORTED_PATTERNS          // [{ pattern, category }] longest-first
PhonicsConstructor.SOUND_LABELS             // { sound_key: '/ē/ (see)' }
PhonicsConstructor.DEFAULT_VOWEL_SOUND      // { pattern: sound_key }
PhonicsConstructor.VOWEL_TEAM_EXCEPTIONS    // { word: { pattern: sound_key } }

// Parsing
PhonicsConstructor.parseWord(rawWord, opts?) → Record|null
PhonicsConstructor.parseWords(list, opts?)   → Record[]
PhonicsConstructor.parseText(text, opts?)    → Record[]

// Analysis
PhonicsConstructor.tokenize(word, opts?)     → string[]
PhonicsConstructor.findAllPatterns(word)     → { [category]: string[] }
PhonicsConstructor.findMinimalPairs(word, pool, opts?) → Pair[]
PhonicsConstructor.countSyllables(word)      → number
PhonicsConstructor.onsetRime(word)           → { onset, rime }
PhonicsConstructor.splitSyllables(word, depth?) → string[]
PhonicsConstructor.identifyVowelNuclei(word) → Nucleus[]
PhonicsConstructor.decodabilityLevel(record) → 1..8
PhonicsConstructor.soundForVowelTeam(word, pattern) → sound_key|null
PhonicsConstructor.vowelTeamSounds(word, tokens?) → SoundHit[]
PhonicsConstructor.lookupException(word, pattern)  → sound_key|null

// CSV
PhonicsConstructor.toCSV(rows, { extended? }) → string
PhonicsConstructor.downloadCSV(csv, filename) → void  (browser only)
PhonicsConstructor.isPreParsedCSV(text)       → boolean

// Debug
PhonicsConstructor.selfTest()                 → string
```

### 3.1 Options object (`opts`)

```ts
{
  mergeDoubleConsonants?: boolean  // default true. 'shell' → 'sh|e|ll'
  includeSubPatterns?:    boolean  // default false. 'catch' → both 'tch' and 'ch'
}
```

---

## 4. Data Contracts

### 4.1 `Record`

```ts
{
  word:              string   // lowercase a–z only, non-empty
  graphemes:         string   // 'sh|i|p'
  phoneme_count:     number
  digraphs:          string   // comma-separated, may be ''
  trigraphs:         string
  blends:            string   // EXCEL-SAFE: quoted in CSV
  difficulty:        1 | 2 | 3

  clusters3:         string
  vowel_teams:       string
  r_controlled:      string
  floss:             string
  letter_count:      number
  syllable_count:    number
  onset:             string
  rime:              string
  level:             number   // 1..8
  is_common:         'yes' | 'no'
  secondary_patterns: string
  vowel_team_sounds: string   // 'ea:short_e' or 'oo:oo_short,ie:long_e'

  tokens:            string[] // not exported to CSV
}
```

### 4.2 `SoundHit`

```ts
{
  pattern:    string   // 'ea'
  sound:      string   // 'long_e'
  label:      string   // '/ē/ (see)'
  is_default: boolean
}
```

### 4.3 `Pair`

```ts
{ word, target_token, other_token, differs_at }
```

### 4.4 `Nucleus`

```ts
{ start, end, pattern }
```

---

## 5. Reference Data (inlined verbatim)

### 5.1 Pattern dictionary

```js
const PHONICS_PATTERNS = {
  digraphs:    ['ch','sh','th','wh','ph','ck','ng','qu','gh','kn','wr','gn','mb','ps'],
  floss:       ['ss','ff','ll','zz'],
  blends:      ['bl','cl','fl','gl','pl','sl','br','cr','dr','fr','gr','pr','tr',
                'tw','dw','sc','sk','sm','sn','sp','st','sw',
                'mp','nt','nk','nd','ft','lt','lk','ld','lp','lf','pt','ct','xt',
                'rd','rk','rm','rn','rl','rt'],
  clusters3:   ['scr','spl','spr','str','shr','thr','squ','sch'],
  trigraphs:   ['tch','dge','igh'],
  vowelTeams:  ['ai','ay','ea','ee','ie','oa','oe','ue','ui',
                'au','aw','ei','eu','ew','ey','oi','oo','ou','ow','oy',
                'eigh','ough','augh'],
  rControlled: ['ar','er','ir','or','ur'],
  rControlled3:['air','ear','eer','oor','our','are','ere','ire','ore','ure','oar']
};
```

**Category priority** (for longest-first tie-breaks at equal length):
`clusters3 > trigraphs > digraphs > vowelTeams > rControlled > blends`

### 5.2 Scope-and-sequence levels

```js
const SCOPE_LEVELS = [
  { level: 1, name: 'CVC & single letters',      desc: 'cat, dog, sun' },
  { level: 2, name: 'Digraphs & FLOSS',          desc: 'sh, ch, th, ck, ng, ss, ll' },
  { level: 3, name: 'Consonant blends',          desc: 'st, tr, bl, mp, nd' },
  { level: 4, name: 'Trigraphs & 3-clusters',    desc: 'tch, dge, igh, str, spl' },
  { level: 5, name: 'Common vowel teams',        desc: 'ai, ay, ee, ea, oa' },
  { level: 6, name: 'Advanced vowels & R-ctrl',  desc: 'oi, oy, ou, au, ar, er' },
  { level: 7, name: 'R-ctrl trigraphs',          desc: 'air, ear, ire, ore' },
  { level: 8, name: 'Advanced / multi-syllable', desc: 'ough, eigh, schwa' }
];
```

### 5.3 Pattern → level assignment

Default per category: `digraphs=2, floss=2, blends=3, clusters3=4, trigraphs=4, vowelTeams=5, rControlled=6, rControlled3=7`.

Overrides:
- `gh, kn, wr, gn, mb, ps` → level 4
- `au, aw, ei, eu, ew, ey, oi, oo, ou, ow, oy` → level 6
- `eigh, ough, augh` → level 8

### 5.4 Compound-parts dictionary

Copy verbatim (words < 2 chars discarded at load):

```
some any every no one thing body where what who how when why
sun moon star day night time week year book case mark ground
back side walk way yard work play mate room house home place
food cake bread milk meat bird fish tree leaf rain snow wind
cloud fire water earth air light dark may be can will do have
go come see know think say take get make man boy girl friend
self own ever never up down in out over under all half full
less more hand foot head arm leg eye ear hair black white blue
red green brown yellow pink purple grand mother father son
daughter chair table door window wall floor roof stairs paper
pencil pen box bag toy game ball cup pot pan bowl dish glass
spoon fork knife car bus train boat plane bike ship truck cart
class birth board fly base basket note text story news stand
set line ware wear side note pad clip pin corn pop bow cup
```

### 5.5 Root-words dictionary (for un-doubling)

Copy verbatim (words < 3 chars discarded):

```
run hop sit fit big hot get cut put let win shop drop slip trip
swim stop plan clap grab drum hug jog nod pat pet pop rub shut
skip slam snap spin spot step stir swap tap tip top wrap zip
spell tell sell smell swell fill kill will still chill drill
fast slow soft hard quick small tall short long strong weak
teach work play help look want need call talk walk read write
sing ring king thing bring spring string wing cling fling sting
swing big dig fig pig wig sum ban fan man pan tan van
```

### 5.6 Common-words set (for `is_common`)

Concatenate the string literal in §5.6.1, split on whitespace, build a `Set`.

**§5.6.1 Literal** — obtain verbatim from the reference implementation (`PhonicsConstructor.v2.3.1.js`). Do not paraphrase.

### 5.7 Vowel-team sound labels

```js
const SOUND_LABELS = {
  long_a:   '/ā/ (cake)',
  long_e:   '/ē/ (see)',
  long_i:   '/ī/ (bike)',
  long_o:   '/ō/ (boat)',
  long_u:   '/ū/ (cube)',
  short_a:  '/ă/ (cat)',
  short_e:  '/ĕ/ (bed)',
  short_i:  '/ĭ/ (bit)',
  short_o:  '/ŏ/ (dog)',
  short_u:  '/ŭ/ (cup)',
  oo_long:  '/o͞o/ (moon)',
  oo_short: '/o͝o/ (book)',
  ow:       '/ou/ (cow)',
  oi:       '/oi/ (coin)',
  aw:       '/ô/ (saw)',
  air:      '/âr/ (air)'
};
```

### 5.8 Default vowel-team sounds

```js
const DEFAULT_VOWEL_SOUND = {
  ai:'long_a', ay:'long_a',
  ea:'long_e', ee:'long_e',
  ie:'long_i', oa:'long_o', oe:'long_o',
  ue:'long_u', ui:'long_u',
  au:'aw', aw:'aw',
  ei:'long_a', eu:'long_u',
  ew:'oo_long',
  ey:'long_a',
  oi:'oi', oy:'oi',
  oo:'oo_long',
  ou:'ow', ow:'ow',
  eigh:'long_a'
};
```

### 5.9 Vowel-team pronunciation exceptions

**Copy this table verbatim.** Do not paraphrase, reorder, or split entries across multiple declarations. Every word appears exactly once.

```js
var VOWEL_TEAM_EXCEPTIONS = {
    /* ---- ea = /ĕ/ (short e) ---- */
    bread:{ea:'short_e'}, head:{ea:'short_e'}, dead:{ea:'short_e'},
    ready:{ea:'short_e'}, already:{ea:'short_e'}, breakfast:{ea:'short_e'},
    health:{ea:'short_e'}, wealth:{ea:'short_e'}, weather:{ea:'short_e'},
    feather:{ea:'short_e'}, leather:{ea:'short_e'}, heavy:{ea:'short_e'},
    pleasant:{ea:'short_e'}, measure:{ea:'short_e'}, treasure:{ea:'short_e'},
    sweat:{ea:'short_e'}, threat:{ea:'short_e'}, spread:{ea:'short_e'},
    instead:{ea:'short_e'}, thread:{ea:'short_e'}, breath:{ea:'short_e'},
    death:{ea:'short_e'}, deaf:{ea:'short_e'},

    /* ---- ea = /ā/ (long a) ---- */
    break:{ea:'long_a'}, great:{ea:'long_a'}, steak:{ea:'long_a'},

    /* ---- ea = /ē/ (long e) — silent-e makes the ea long ---- */
    breathe:{ea:'long_e'}, breathes:{ea:'long_e'}, breathed:{ea:'long_e'},
    breather:{ea:'long_e'}, breathing:{ea:'long_e'},

    /* ---- oo = /o͝o/ (short oo) ---- */
    book:{oo:'oo_short'}, look:{oo:'oo_short'}, took:{oo:'oo_short'},
    cook:{oo:'oo_short'}, hook:{oo:'oo_short'}, good:{oo:'oo_short'},
    hood:{oo:'oo_short'}, wood:{oo:'oo_short'}, foot:{oo:'oo_short'},
    stood:{oo:'oo_short'}, shook:{oo:'oo_short'}, brook:{oo:'oo_short'},
    wool:{oo:'oo_short'}, hoof:{oo:'oo_short'},

    /* ---- oo = /ŭ/ ---- */
    blood:{oo:'short_u'}, flood:{oo:'short_u'},

    /* ---- ow = /ō/ (long o) ---- */
    snow:{ow:'long_o'}, slow:{ow:'long_o'}, grow:{ow:'long_o'},
    show:{ow:'long_o'}, know:{ow:'long_o'}, low:{ow:'long_o'},
    row:{ow:'long_o'}, glow:{ow:'long_o'}, flow:{ow:'long_o'},
    throw:{ow:'long_o'}, window:{ow:'long_o'}, yellow:{ow:'long_o'},
    follow:{ow:'long_o'},

    /* ---- ou = /o͞o/ ---- */
    soup:{ou:'oo_long'}, group:{ou:'oo_long'}, you:{ou:'oo_long'},
    youth:{ou:'oo_long'}, route:{ou:'oo_long'}, wound:{ou:'oo_long'},

    /* ---- ou = /o͝o/ (short oo) ---- */
    would:{ou:'oo_short'}, could:{ou:'oo_short'}, should:{ou:'oo_short'},
	shoulder:{ou:'long_o'}, shoulders:{ou:'long_o'},
	soul:{ou:'long_o'}, souls:{ou:'long_o'},
	boulder:{ou:'long_o'}, boulders:{ou:'long_o'},

    /* ---- ou = /ŭ/ ---- */
    touch:{ou:'short_u'}, rough:{ou:'short_u'}, tough:{ou:'short_u'},
    enough:{ou:'short_u'}, cousin:{ou:'short_u'}, double:{ou:'short_u'},
    trouble:{ou:'short_u'}, young:{ou:'short_u'},

    /* ---- ie = /ē/ (long e) — default -ief/-ield set ---- */
    field:{ie:'long_e'}, yield:{ie:'long_e'}, shield:{ie:'long_e'},
    brief:{ie:'long_e'}, chief:{ie:'long_e'}, thief:{ie:'long_e'},
    grief:{ie:'long_e'}, relief:{ie:'long_e'}, niece:{ie:'long_e'},
    piece:{ie:'long_e'}, priest:{ie:'long_e'},

    /* ---- ie = /ē/ (long e) — believe family ---- */
    believe:{ie:'long_e'}, believes:{ie:'long_e'}, believed:{ie:'long_e'},
    believer:{ie:'long_e'}, believing:{ie:'long_e'},

    /* ---- ie = /ē/ (long e) — words with BOTH ie and oo ----
       NOTE: These carry two overrides because both vowel teams are
       present and both deviate from their pattern defaults. Every
       word appears exactly ONCE in this table. Do NOT re-add these
       keys elsewhere or the later declaration will silently overwrite
       the multi-sound entry. */
    cookie:{ie:'long_e', oo:'oo_short'},
    cookies:{ie:'long_e', oo:'oo_short'},
    bookie:{ie:'long_e', oo:'oo_short'},
    bookies:{ie:'long_e', oo:'oo_short'},
    rookie:{ie:'long_e', oo:'oo_short'},
    rookies:{ie:'long_e', oo:'oo_short'},
    hoodie:{ie:'long_e', oo:'oo_short'},
    hoodies:{ie:'long_e', oo:'oo_short'},
    woodie:{ie:'long_e', oo:'oo_short'},
    footie:{ie:'long_e', oo:'oo_short'},
    movie:{ie:'long_e'}, movies:{ie:'long_e'},
    batteries:{ie:'long_e'},

    /* ---- ie = /ē/ (long e) — common -ie nouns ----
       (rookie/hoodie families live in the block above so they can
        carry BOTH the ie and oo overrides. Do not re-add.) */
    zombie:{ie:'long_e'}, zombies:{ie:'long_e'},
    brownie:{ie:'long_e'}, brownies:{ie:'long_e'},
    selfie:{ie:'long_e'}, selfies:{ie:'long_e'},
    sweetie:{ie:'long_e'}, auntie:{ie:'long_e'},

    /* ---- ie = /ē/ (long e) — multi-syllable ---- */
    calorie:{ie:'long_e'}, calories:{ie:'long_e'},
    prairie:{ie:'long_e'}, collie:{ie:'long_e'},
    goalie:{ie:'long_e'}, genie:{ie:'long_e'},
    soldier:{ie:'long_e'}, charlie:{ie:'long_e'},

    /* ---- ie = /ĕ/ (short e) ---- */
    friend:{ie:'short_e'},

    /* ---- ey = /ē/ (long e) ---- */
    key:{ey:'long_e'}, monkey:{ey:'long_e'}, donkey:{ey:'long_e'},
    turkey:{ey:'long_e'}, alley:{ey:'long_e'}, valley:{ey:'long_e'},
    chimney:{ey:'long_e'}, honey:{ey:'long_e'}, money:{ey:'long_e'},

    /* ---- ey = /ā/ (long a) ---- */
    they:{ey:'long_a'}, obey:{ey:'long_a'},

    /* ---- ay = /ĕ/ (short e) ---- */
    says:{ay:'short_e'},

    /* ---- ei = /ē/ (long e) ---- */
    receive:{ei:'long_e'}, deceive:{ei:'long_e'}, ceiling:{ei:'long_e'},
    protein:{ei:'long_e'}, either:{ei:'long_e'}, neither:{ei:'long_e'},
    seize:{ei:'long_e'},

    /* ---- ei = /ī/ (long i) ---- */
    height:{ei:'long_i'}, sleight:{ei:'long_i'},

    /* ---- ei = /âr/ (air) ---- */
    their:{ei:'air'}, heir:{ei:'air'}, theirs:{ei:'air'}
  };
```

**Maintenance rule:** the build agent MUST run the duplicate check (§8.7) before merging any table change. A duplicate key silently overwrites its predecessor and can strip overrides from words that need them (the `rookie`/`hoodie` bug).

---

## 6. Algorithm Specifications

### 6.1 `clean(word)`

Coerce to string (`null`/`undefined` → `''`), lowercase, strip non-`a–z`.

### 6.2 `tokenize(word, opts)`

**Complete implementation — includes the `ng`-before-`e` guard:**

```js
function tokenize(word, opts) {
  opts = opts || {};
  var mergeDoubles = opts.mergeDoubleConsonants !== false;
  var w = clean(word), tokens = [], i = 0;
  while (i < w.length) {
    var matched = null;
    for (var k = 0; k < SORTED_PATTERNS.length; k++) {
      var p = SORTED_PATTERNS[k].pattern;
      if (p.length > w.length - i) continue;
      if (w.substr(i, p.length) !== p) continue;

      // 'ng' is only a digraph at the end of a syllable. When it's
      // immediately followed by 'e', the n and g belong to different
      // syllables (gin-ger, fin-ger, long-er, strong-er). Skip the
      // match so the fall-through splits them into n + g.
      if (p === 'ng' && i + 2 < w.length && w.charAt(i + 2) === 'e') continue;

      matched = p;
      break;
    }
    if (matched) { tokens.push(matched); i += matched.length; continue; }
    if (mergeDoubles && i + 1 < w.length &&
        w.charAt(i) === w.charAt(i + 1) && CONSONANT.test(w.charAt(i))) {
      tokens.push(w.charAt(i) + w.charAt(i + 1)); i += 2; continue;
    }
    tokens.push(w.charAt(i)); i += 1;
  }
  return tokens;
}
```

**Invariant:** `tokens.join('') === clean(word)`.

**Why the `ng` guard:** the only consonant digraph in English whose letters can straddle a syllable boundary. `ck`, `ch`, `sh`, `th`, `wh`, `ph`, `qu` all make their sound regardless of what follows.

### 6.3 `findAllPatterns(word)`

Iterate `SORTED_PATTERNS`; on substring hit, append to `result[category]` (deduped within category).

### 6.4 `computeDifficulty(buckets, tokens)`

1. `clusters3.length` → **3**.
2. `trigraphs.length` → **2**.
3. Last token in `{mp,nt,nk,nd,ft,lt,lk,ld,lp,lf,pt,ct,xt,rd,rk,rm,rn,rl,rt}` → **2**.
4. Any of `vowelTeams`, `rControlled`, `rControlled3` non-empty → **2**.
5. Otherwise **1**.

### 6.5 `decodabilityLevel(record)`

`max(PATTERN_LEVELS[t] for t in record.tokens)` — default 1.

### 6.6 `countSyllables(word)`

1. Empty → 0; `length <= 3` → 1.
2. Drop trailing `e` unless preceded by `l` (for `-Cle`).
3. Count non-vowel → vowel transitions across `a e i o u`. Minimum 1.

### 6.7 `onsetRime(word)`

Scan from 0 to first `a e i o u`. `y` is not treated as a vowel here.

### 6.8 `splitSyllables(word, depth = 0)`

1. **Guard.** `depth > 4` → `[word]`.
2. **Compound split.** `tryCompoundSplit(word)`. If found, recurse each half and concat.
3. **`-Cle` strip.** If `length > 4`, ends `le`, letter at `-3` is a consonant other than `l` → extract `cleSuffix = slice(-3)`, shrink.
4. **Suffix strip.** `tryStripSuffix(w)`. If `{stem, suffix}` AND `stem.length >= 2`:
   - `result = splitSyllables(stem, depth+1).concat([suffix])`.
   - Append `cleSuffix` if set. Return.
5. **Pattern fallback.**
   - `nuclei = identifyVowelNuclei(w)`.
   - `<= 1` → return `cleSuffix ? [w, cleSuffix] : [w]`.
   - For each consecutive pair `(cur, nxt)`, `between = slice(cur.end, nxt.start)`:
     - `len === 0` → split at `cur.end`.
     - `len === 1` → split at `cur.end`, unless prefix has no vowel → `cur.end + 1`.
     - `len === 2`:
       - `between ∈ {th, sh, ch, wh}` → split at `cur.end` (**fa|ther**).
       - Else → split at `cur.end + 1` (**rab|bit, sis|ter, win|ter, sum|mer**).
     - `len >= 3`:
       - `PATTERN_CATEGORY[between.slice(-2)]` ∈ `{blends, digraphs, clusters3}` → split at `nxt.start - 2`, else `nxt.start - 1`.
   - Dedupe boundaries, slice, append `cleSuffix`.

### 6.9 `tryCompoundSplit(word)`

- `length < 6` → `null`.
- For `i` from `length - 3` down to `3`: if `COMPOUND_PARTS[left] && COMPOUND_PARTS[right]` → return `[left, right]`.
- `null` otherwise.

**Rationale:** longest left-half first, min 3 chars per half. Prevents `nothing` → `no|thing`, allows `something` → `some|thing`.

### 6.10 `tryStripSuffix(word)`

Ordered rules. First match wins.

| suffix | minStem | undouble | notes |
|---|---|---|---|
| `tion` | 3 | — | always |
| `sion` | 3 | — | always |
| `ment` | 3 | — | always |
| `ness` | 3 | — | always |
| `less` | 3 | — | always |
| `able` | 3 | — | always |
| `ible` | 3 | — | always |
| `ous`  | 3 | — | always |
| `ful`  | 3 | — | always |
| `ing`  | 3 | yes | |
| `ly`   | 3 | — | |
| `est`  | 4 | yes | |
| `er`   | **5** | yes | high minStem prevents `father` → `fa|ther` |
| `ed`   | 2 | — | only if stem ends in `t` or `d` |

For each rule:
1. Skip if `word.length < suffix.length + minStem`.
2. Skip if word doesn't end with `suffix`.
3. `stem = word.slice(0, -suffix.length)`.
4. For `ed`: if last char of `stem` ∉ `{t, d}` → **continue** (not return).
5. If `stem` has no vowel → continue.
6. If `undouble` and last two chars of `stem` are identical consonants not in `{l, s, f}`:
   - `candidate = stem.slice(0, -1)`.
   - If `ROOT_WORDS[candidate]` → `stem = candidate`, `suffix = lastChar + suffix`.
7. Return `{ stem, suffix }`.

### 6.11 `lookupException(word, pattern)`

**Three-tier lookup. This is the fix that makes `gingerbread`, `breadwinner`, `bedspread`, `steakhouse`, `overthrow`, `breathes` all classify correctly.**

```js
function lookupException(word, pattern) {
  // 1. Direct match.
  var m = VOWEL_TEAM_EXCEPTIONS[word];
  if (m && m[pattern]) return m[pattern];

  // 2. Suffix-stripped match. NOTE: 'es' is LAST, so 'breathes'
  //    strips 's' → 'breathe' before 'es' would strip it to 'breath'.
  var suffixes = ['ing', 'est', 'ed', 'er', 'ly', 's', 'd', 'es'];
  for (var i = 0; i < suffixes.length; i++) {
    var s = suffixes[i];
    if (word.length > s.length + 2 && word.slice(-s.length) === s) {
      var stem = word.slice(0, -s.length);
      var m2 = VOWEL_TEAM_EXCEPTIONS[stem];
      if (m2 && m2[pattern]) return m2[pattern];
    }
  }

  // 3. Compound-part scan: split at every point where BOTH halves
  //    are at least 3 chars. If either half is in the table, adopt
  //    its sound. Handles gingerbread → bread, bedspread → spread,
  //    steakhouse → steak, overthrow → throw.
  //    The ≥3 constraint on each side prevents 'breathe' from matching
  //    prefix 'breath' (which would be wrong — breathe says long_e).
  for (var j = 3; j <= word.length - 3; j++) {
    var prefix = word.slice(0, j);
    var m3 = VOWEL_TEAM_EXCEPTIONS[prefix];
    if (m3 && m3[pattern]) return m3[pattern];

    var suffix = word.slice(j);
    var m4 = VOWEL_TEAM_EXCEPTIONS[suffix];
    if (m4 && m4[pattern]) return m4[pattern];
  }

  return null;
}
```

**Order matters.** Each tier is strictly more expensive than the last. Direct lookup wins; suffix stripping is tried next; the compound scan is O(n) and only runs if the first two fail.

**The `≥ 3 chars each side` constraint is essential.** Without it, `breathe` would match on the prefix `breath` (which is in the table as `ea:short_e`) and get the wrong sound.

### 6.12 `soundForVowelTeam(word, pattern)`

```js
function soundForVowelTeam(word, pattern) {
  var ex = lookupException(word, pattern);
  if (ex) return ex;
  return DEFAULT_VOWEL_SOUND[pattern] || null;
}
```

### 6.13 `vowelTeamSounds(word, tokens?)`

Iterate `tokens || tokenize(word)`. For each token present in `DEFAULT_VOWEL_SOUND`:
- `sound = soundForVowelTeam(word, token)`.
- Push `{ pattern, sound, label: SOUND_LABELS[sound], is_default: sound === DEFAULT_VOWEL_SOUND[token] }`.

### 6.14 `parseWord(rawWord, opts)`

1. `word = clean(rawWord)`; empty → `null`.
2. `tokens = tokenize(word, opts)`.
3. Populate pattern buckets (dedupe by `cat:pattern`).
4. If `opts.includeSubPatterns`, merge `findAllPatterns(word)`.
5. `difficulty = computeDifficulty(buckets, tokens)`.
6. `or = onsetRime(word)`.
7. `allPats` = union of buckets (deduped).
8. `vts = vowelTeamSounds(word, tokens)`, joined as `pattern:sound` comma-separated.
9. Construct `Record`. `vowel_team_sounds = vts`.
10. `record.level = decodabilityLevel(record)`.
11. Return.

### 6.15 `parseWords(list, opts)`

- Non-array → split on `/[\r\n]+/`.
- Dedupe by cleaned `word`, preserve insertion order.

### 6.16 `parseText(text, opts)`

Split on `/[\r\n,;|\t]+/`, trim, keep `/[a-zA-Z]/`, delegate to `parseWords`.

### 6.17 `findMinimalPairs(word, pool, opts)`

Same as v2.3.0.

### 6.18 `toCSV(rows, { extended })`

- Base: `word, graphemes, phoneme_count, digraphs, trigraphs, blends, difficulty`
- Extended adds: `clusters3, vowel_teams, r_controlled, floss, letter_count, syllable_count, onset, rime, level, is_common, secondary_patterns, vowel_team_sounds`
- Header always emitted.
- Every field passes through `csvCell` (RFC 4180 quoting on `,`, `"`, `\r`, `\n`).
- Line separator: `\r\n`.

### 6.19 `isPreParsedCSV(text)`

First non-empty line matches `/^\s*word\s*,\s*graphemes/i`.

---

## 7. Reference Implementation Notes

The reference file (`PhonicsConstructor.v2.3.1.js`) is **canonical**. Treat it as authoritative for:

- Exact whitespace and ordering of the UMD wrapper.
- Set membership of `COMMON_WORDS`, `COMPOUND_PARTS`, `ROOT_WORDS`.
- The literal `FINAL_BLENDS` set in `computeDifficulty`.
- The literal `rules[]` array in `tryStripSuffix`.
- The complete `VOWEL_TEAM_EXCEPTIONS` table.

Any deviation requires a code comment + a new test.

---

## 8. Test Suite

Fixtures in `tests/phonics/fixtures/`.

### 8.1 Tokenizer

| Input | `graphemes` |
|---|---|
| `ship` | `sh|i|p` |
| `catch` | `c|a|tch` |
| `stretch` | `str|e|tch` |
| `shell` | `sh|e|ll` |
| `clamp` | `cl|a|mp` |
| `phone` | `ph|o|ne` |
| `sing` | `s|i|ng` |
| `singing` | `s|i|ng|i|ng` |
| `strong` | `str|o|ng` |
| `finger` | `f|i|n|g|er` |
| `gingerbread` | `g|i|n|g|er|br|ea|d` |
| `longer` | `l|o|n|g|er` |
| `stronger` | `str|o|n|g|er` |
| `younger` | `y|ou|n|g|er` |

### 8.2 CSV safety

`clamp` row MUST quote blends: `clamp,cl|a|mp,3,,,"cl,mp",1` — verify 7 columns.

### 8.3 Syllable splitter — canonical cases

| Word | Expected |
|---|---|
| `something` | `some · thing` |
| `amazing`   | `a · maz · ing` |
| `cooked`    | `cooked` |
| `maybe`     | `may · be` |
| `doors`     | `doors` |
| `running`   | `run · ning` |
| `spelling`  | `spell · ing` |
| `teacher`   | `teach · er` |
| `over`      | `o · ver` |
| `never`     | `ne · ver` |
| `water`     | `wa · ter` |
| `bigger`    | `big · ger` |
| `table`     | `ta · ble` |
| `rabbit`    | `rab · bit` |
| `wanted`    | `want · ed` |
| `jumped`    | `jumped` |
| `father`    | `fa · ther` |
| `sister`    | `sis · ter` |
| `summer`    | `sum · mer` |
| `winter`    | `win · ter` |
| `flower`    | `flow · er` |
| `understand`| `un · der · stand` |

### 8.4 Vowel-team sound resolution

| Word | `vowel_team_sounds` |
|---|---|
| `easy` | `ea:long_e` |
| `breakfast` | `ea:short_e` |
| `ready` | `ea:short_e` |
| `weak` | `ea:long_e` |
| `bread` | `ea:short_e` |
| `break` | `ea:long_a` |
| `steak` | `ea:long_a` |
| `snow` | `ow:long_o` |
| `cow` | `ow:ow` |
| `book` | `oo:oo_short` |
| `moon` | `oo:oo_long` |
| `shield` | `ie:long_e` |
| `pie` | `ie:long_i` |
| `believe` | `ie:long_e` |
| `cookie` | `oo:oo_short,ie:long_e` |
| `breathe` | `ea:long_e` |
| `breathes` | `ea:long_e` |
| `breadwinner` | `ea:short_e` |
| `bedspread` | `ea:short_e` |
| `steakhouse` | `ea:long_a,ou:ow` |
| `overthrow` | `ow:long_o` |
| `gingerbread` | `ea:short_e` |
| `would` | `ou:oo_short` |
| `friend` | `ie:short_e` |
| `says` | `ay:short_e` |
| `they` | `ey:long_a` |
| `height` | `ei:long_i` |
| `their` | `ei:air` |

A failure on any row blocks merge.

### 8.5 Regression guard

Fixture `tests/phonics/fixtures/regression.txt` (200+ words). For each word assert:

- `tokenize(word).join('') === clean(word)`
- `splitSyllables(word).join('') === clean(word)`
- `splitSyllables(word).length === countSyllables(word)` (±1 tolerance)

### 8.6 Round-trip

Parse → `toCSV({extended:true})` → PapaParse → every field preserved byte-for-byte.

### 8.7 Duplicate-key guard

**New in v2.3.1.** The test suite MUST scan `PhonicsConstructor.js` for duplicate keys inside the `VOWEL_TEAM_EXCEPTIONS` object literal and fail if any exist.

Reference implementation:

```js
// Pseudocode — adapt to your test framework
const source = fs.readFileSync('src/phonics/PhonicsConstructor.js', 'utf8');
const tableBlock = source.match(/VOWEL_TEAM_EXCEPTIONS\s*=\s*\{([\s\S]*?)\n\s*\};/)[1];
const keys = [...tableBlock.matchAll(/^\s*([a-z]+)\s*:/gm)].map(m => m[1]);
const dupes = keys.filter((k, i) => keys.indexOf(k) !== i);
expect([...new Set(dupes)]).toEqual([]);
```

Rationale: a duplicate key silently overwrites its predecessor. The `rookie`/`hoodie` bug in v2.3.0 lost the `oo:'oo_short'` override because of an identical hazard — the entry lived in two blocks and the later single-sound declaration won.

---

## 9. Non-Functional Requirements

| Concern | Requirement |
|---|---|
| Size | Minified + gzipped ≤ 12 KB |
| Startup | `parseWords(10000)` ≤ 250 ms on a 2019 laptop |
| Memory | No input-size-dependent caches |
| ES target | ES5 syntax only |
| Strict mode | Yes, top of factory body |
| Side effects on load | Only lookup table construction |
| Console output | None except `selfTest()` |

---

## 10. Integration Points

Downstream `PhonicsWorksheet_Builder` (v2.1.0+) consumes `Record[]` and never touches internals. Allowed coupling:

- `PC.parseWords`, `PC.parseText`
- `PC.toCSV`, `PC.downloadCSV`, `PC.isPreParsedCSV`
- `PC.PHONICS_PATTERNS`, `PC.PATTERN_CATEGORY`, `PC.SCOPE_LEVELS`, `PC.SOUND_LABELS`
- `PC.splitSyllables`, `PC.findMinimalPairs`

The builder **must** reject any constructor older than v2.3.0 at boot, because the sound filter and Sound Hunt/Sort activities depend on `vowel_team_sounds` being present.

---

## 11. Out of Scope

- Foreign-language phonics
- Dictionary-based syllabification (heuristics are intentional)
- Morphology beyond suffix-stripping and compound-splitting
- Audio / TTS
- Persistence

---

## 12. Acceptance Criteria

1. `npm test tests/phonics/` green with §8 suite.
2. `PhonicsConstructor.VERSION === '2.3.1'`.
3. `<script>` tag exposes `window.PhonicsConstructor`.
4. `selfTest()` prints 8 records and returns CSV with 19 columns (extended).
5. Gzipped size ≤ 12 KB.
6. No ESLint errors under `eslint:recommended` + ES5 parser options.
7. `tokenize('gingerbread').join('|') === 'g|i|n|g|er|br|ea|d'`.
8. `splitSyllables('understand').join('·') === 'un·der·stand'`.
9. `parseWord('breathe').vowel_team_sounds === 'ea:long_e'` AND `parseWord('breathes').vowel_team_sounds === 'ea:long_e'`.
10. `parseWord('cookie').vowel_team_sounds === 'oo:oo_short,ie:long_e'` AND `parseWord('rookie').vowel_team_sounds === 'oo:oo_short,ie:long_e'`.
11. `parseWord('gingerbread').vowel_team_sounds === 'ea:short_e'`.
12. §8.7 duplicate-key check passes.
