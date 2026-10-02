# Phonics Regression Fixture Corpus — v1

**Purpose:** canonical word-level test fixtures for the Phase 1 construct compiler's regression
harness. Supersedes the prototype's `DEMO_WORDS` list and the spec's §8.1–§8.4 tables, which left
several pattern categories completely untested.

**Status of each table:**
- **Tokenizer fixtures** — hand-traced against the actual `tokenize()` algorithm (greedy,
  longest-pattern-first, left-to-right). High confidence; corrections to the original prototype
  guesses are noted inline.
- **Syllable-split fixtures** — these are the *pedagogically correct target*, not a guaranteed
  current-algorithm output. Where the splitter is likely to disagree with the target, that
  disagreement is exactly what Phase 1's harness exists to surface — treat a mismatch as a bug to
  fix, not a fixture to water down.
- **Vowel-team sound fixtures** — targets based on standard English pronunciation, cross-checked
  against the existing `VOWEL_TEAM_EXCEPTIONS` table and `DEFAULT_VOWEL_SOUND` map for consistency.

---

## 0. Two findings surfaced while building this list

### 0.1 Six blend patterns may be structurally unreachable

`rd`, `rk`, `rm`, `rn`, `rl`, `rt` are declared in `PHONICS_PATTERNS.blends`, intended to catch
word-final `r + consonant` clusters (e.g. a hypothetical `bird` → `b|i|rd`). Tracing the actual
scan: whenever `r` is immediately preceded by a vowel, the 2-letter `rControlled` patterns
(`ar`,`er`,`ir`,`or`,`ur`) are checked at that vowel's position and win first, because the scan
is strictly left-to-right and longest-pattern-first *at each position* — the `r` is already
consumed as part of `ir` before the scanner ever reaches a position where `rk`/`rd`/etc. could
match standing alone. I could not construct a plausible English spelling where `r` reaches the
scanner "unpaired" from a preceding vowel. (`bird` → `b|ir|d`, not `b|i|rd`; `park` → `p|ar|k`,
not `p|a|rk`; etc.)

**Recommendation for the Phase 1 compiler:** add a reachability check — for every declared
pattern, require at least one regression fixture whose tokenized output actually contains that
exact token. This check would have caught the above immediately. I have *not* forced fixtures for
these six, since I believe they're genuinely unreachable given the current algorithm — this needs
your judgment call on whether to (a) remove them, (b) accept they're dead code, or (c) change the
scan order for final-position clusters.

### 0.2 The `ea → long_e` default case (your `speak` scenario) had zero direct coverage

The original fixture set tested `ea → short_e` (bread, ready) and `ea → long_a` (break, steak)
exceptions extensively, but never once tested the *default* long_e case your `speak` example
depends on — `easy`/`weak` were the only two, and both are borderline. I've added `speak`, `team`,
`eat`, `sea` as direct, unambiguous default-case anchors specifically so that any future exception
added near this branch has something concrete to regress against.

---

## 1. Tokenizer fixtures (`word` → `graphemes`)

### 1.1 Carried forward from existing spec (verified correct)

| word | graphemes |
|---|---|
| ship | `sh\|i\|p` |
| catch | `c\|a\|tch` |
| stretch | `str\|e\|tch` |
| shell | `sh\|e\|ll` |
| clamp | `cl\|a\|mp` |
| phone | `ph\|o\|ne` |
| sing | `s\|i\|ng` |
| singing | `s\|i\|ng\|i\|ng` |
| strong | `str\|o\|ng` |
| finger | `f\|i\|n\|g\|er` |
| gingerbread | `g\|i\|n\|g\|er\|br\|ea\|d` |
| longer | `l\|o\|n\|g\|er` |
| stronger | `str\|o\|n\|g\|er` |
| younger | `y\|ou\|n\|g\|er` |

### 1.2 New — CVC / Level-1 baseline (nothing in the old set tested plain CVC)

| word | graphemes |
|---|---|
| cat | `c\|a\|t` |
| dog | `d\|o\|g` |
| sun | `s\|u\|n` |
| hat | `h\|a\|t` |
| bed | `b\|e\|d` |
| pin | `p\|i\|n` |
| top | `t\|o\|p` |
| cup | `c\|u\|p` |

### 1.3 New — digraphs (gh, kn, wr, gn, mb, ps, qu, th, wh, ck untested)

| word | graphemes | note |
|---|---|---|
| math | `m\|a\|th` | plain `th` |
| whale | `wh\|a\|l\|e` | plain `wh` |
| duck | `d\|u\|ck` | plain `ck` |
| queen | `qu\|ee\|n` | plain `qu` |
| ghost | `gh\|o\|st` | `gh` |
| knee | `kn\|ee` | `kn` |
| wrist | `wr\|i\|st` | `wr` |
| gnome | `gn\|o\|m\|e` | `gn` — **corrected**: original guess `gn\|o\|me` is wrong; `me` is not a pattern, so it tokenizes as 4 separate phonemes |
| comb | `c\|o\|mb` | `mb` |
| lamb | `l\|a\|mb` | `mb` |
| psalm | `ps\|a\|l\|m` | `ps` — flagged: obscure word for age 7+; swap for a classroom-friendlier word if one exists that still isolates `ps`, otherwise keep for structural coverage only |

### 1.4 New — floss (only `ll` was tested)

| word | graphemes |
|---|---|
| buzz | `b\|u\|zz` |
| cliff | `cl\|i\|ff` |
| grass | `gr\|a\|ss` |

### 1.5 New — clusters3 (only `str` was tested; `spl,spr,shr,thr,squ,sch` untested)

| word | graphemes |
|---|---|
| splash | `spl\|a\|sh` |
| sprint | `spr\|i\|nt` |
| shrimp | `shr\|i\|mp` |
| three | `thr\|ee` |
| squid | `squ\|i\|d` |
| school | `sch\|oo\|l` |

### 1.6 New — blends not previously exercised

| word | graphemes | blend tested |
|---|---|---|
| flag | `fl\|a\|g` | fl |
| glow | `gl\|ow` | gl |
| plan | `pl\|a\|n` | pl |
| sled | `sl\|e\|d` | sl |
| bring | `br\|i\|ng` | br |
| crab | `cr\|a\|b` | cr |
| drum | `dr\|u\|m` | dr |
| print | `pr\|i\|nt` | pr |
| trap | `tr\|a\|p` | tr |
| twin | `tw\|i\|n` | tw |
| dwarf | `dw\|ar\|f` | dw |
| scan | `sc\|a\|n` | sc |
| skip | `sk\|i\|p` | sk |
| smell | `sm\|e\|ll` | sm |
| snap | `sn\|a\|p` | sn |
| spin | `sp\|i\|n` | sp |
| swim | `sw\|i\|m` | sw |
| pink | `p\|i\|nk` | nk |
| sand | `s\|a\|nd` | nd |
| soft | `s\|o\|ft` | ft |
| belt | `b\|e\|lt` | lt |
| milk | `m\|i\|lk` | lk |
| gold | `g\|o\|ld` | ld |
| help | `h\|e\|lp` | lp |
| self | `s\|e\|lf` | lf |
| kept | `k\|e\|pt` | pt |
| act | `a\|ct` | ct |
| next | `n\|e\|xt` | xt |
| yard | `y\|a\|rd`* | rd — **see §0.1, likely unreachable; included only if you decide to fix scan order** |

\* `yard`: traced as `y` (consonant, single) → `a` (single, since no 2-char pattern matches at
that position) → then `rd` *should* match per declared pattern, but needs re-verification once
§0.1 is resolved either way. Do not treat this row as confirmed until that decision is made.

### 1.7 New — rControlled (ar, er, ir, or, ur — none were tested)

| word | graphemes |
|---|---|
| car | `c\|ar` |
| her | `h\|er` |
| bird | `b\|ir\|d` |
| for | `f\|or` |
| fur | `f\|ur` |

### 1.8 New — rControlled3 (zero coverage previously — air/ear/eer/oor/our/are/ere/ire/ore/ure/oar)

| word | graphemes |
|---|---|
| chair | `ch\|air` |
| bear | `b\|ear` |
| deer | `d\|eer` |
| door | `d\|oor` |
| sour | `s\|our` |
| care | `c\|are` |
| here | `h\|ere` |
| fire | `f\|ire` |
| more | `m\|ore` |
| pure | `p\|ure` |
| roar | `r\|oar` |

### 1.9 New — vowel teams not previously exercised (ue, ui, eu, ew, augh, ough, eigh, oe)

| word | graphemes |
|---|---|
| blue | `bl\|ue` |
| fruit | `fr\|ui\|t` |
| feud | `f\|eu\|d` *(rare word — included only for structural completeness)* |
| chew | `ch\|ew` |
| caught | `c\|augh\|t` |
| though | `th\|ough` |
| eight | `eigh\|t` |
| toe | `t\|oe` |
| vein | `v\|ei\|n` |

---

## 2. Syllable-split fixtures (`word` → target split)

### 2.1 Carried forward from existing spec (unchanged)

something · amazing · cooked · maybe · doors · running · spelling · teacher · over · never ·
water · bigger · table · rabbit · wanted · jumped · father · sister · summer · winter · flower ·
understand — all as originally specified.

### 2.2 New — single-syllable sanity checks (every word added in §1.3–§1.9 above)

All of the following are single syllable and should return as one unit — these matter because
they exercise the "1 vowel nucleus → no split" path for every new pattern type, which the old
fixture set under-tested relative to its multi-syllable cases:

cat · dog · sun · hat · bed · pin · top · cup · math · whale · duck · queen · ghost · knee ·
wrist · gnome · comb · lamb · buzz · cliff · grass · splash · sprint · shrimp · three · squid ·
school · chair · bear · deer · door · sour · care · here · fire · more · pure · roar · blue ·
fruit · chew · caught · though · eight · toe · vein · touch · speak · team · eat · sea · saw ·
day · rain · boat · coin · toy

### 2.3 New — multi-syllable targets (compound-scan and suffix-strip paths)

| word | target split | path exercised |
|---|---|---|
| gingerbread | gin·ger·bread | compound-scan (flagged — see note below) |
| breadwinner | bread·win·ner | compound-scan |
| bedspread | bed·spread | compound-scan |
| steakhouse | steak·house | compound-scan |
| overthrow | o·ver·throw | compound-scan |
| believer | be·liev·er | suffix-strip |
| cookie | cook·ie | dual vowel-team override |
| rookie | rook·ie | dual vowel-team override |
| movie | mov·ie | pattern fallback |
| friendly | friend·ly | suffix-strip |
| friends | friends | suffix-strip (plural, no added syllable) |
| several | sev·er·al | pattern fallback |
| monkey | mon·key | pattern fallback |
| turkey | tur·key | pattern fallback |
| shoulder | shoul·der | pattern fallback |
| trouble | trou·ble | `-Cle` strip |
| author | au·thor | pattern fallback |
| reindeer | rein·deer | compound-scan candidate — flagged, see note |

**Note on `gingerbread`:** §8.1 of the original spec only pins the *phoneme* breakdown
(`g|i|n|g|er|br|ea|d`), not the syllable split. `ginger` is not currently in `COMPOUND_PARTS`
(only `bread` is), so compound-split may not fire the way the target above assumes. This is
exactly the kind of case Phase 1's harness should catch and either fix (add `ginger` to compound
parts) or document as a known limitation — don't let it pass silently either way.

**Note on `reindeer`:** included as a candidate compound (`rein` + `deer`) but neither half is
currently in `COMPOUND_PARTS`. Flagging rather than asserting a target — verify once the compound
list is finalized.

---

## 3. Vowel-team sound resolution fixtures (`word` → `pattern:sound`)

### 3.1 Carried forward from existing spec (unchanged)

easy · breakfast · ready · weak · bread · break · steak · snow · cow · book · moon · shield · pie ·
believe · cookie · breathe · breathes · breadwinner · bedspread · steakhouse · overthrow ·
gingerbread · would · friend · says · they · height · their — all as originally specified.

### 3.2 New — closes the default-case gap (this is your `speak` scenario, directly)

| word | pattern | sound | branch |
|---|---|---|---|
| **speak** | ea | long_e | **default** — the exact case you raised |
| team | ea | long_e | default |
| eat | ea | long_e | default |
| sea | ea | long_e | default |

These four exist specifically so that if someone later adds, say, `steam → ea:short_e` as a
mistaken exception, the harness immediately shows `team`/`eat`/`sea` would be unaffected (correct,
they're separate words) but also forces a reviewer to look at this table and confirm the new
exception doesn't accidentally collide with the default branch's own test cases.

### 3.3 New — suffix-stripped path coverage for the `friend` family

| word | pattern | sound | branch |
|---|---|---|---|
| friend | ie | short_e | direct |
| friends | ie | short_e | suffix-stripped (`s`) |

The original set only tested `friend` itself — the suffix-stripped path for this exception was
unverified.

### 3.4 New — one default-case fixture per remaining under-tested vowel team

| word | pattern | sound | branch |
|---|---|---|---|
| rain | ai | long_a | default |
| day | ay | long_a | default |
| three | ee | long_e | default |
| boat | oa | long_o | default |
| toe | oe | long_o | default |
| blue | ue | long_u | default |
| fruit | ui | long_u | default |
| saw | aw | aw | default |
| author | au | aw | default |
| vein | ei | long_a | default — **first-ever test of the `ei` default**; previously only exceptions (long_e/long_i/air) were tested, never the plain default case |
| feud | eu | long_u | default *(rare word, structural completeness only)* |
| chew | ew | oo_long | default |
| monkey | ey | long_e | default |
| coin | oi | oi | default |
| toy | oy | oi | default |
| caught | augh | aw | default |
| though | ough | long_o | default |
| eight | eigh | long_a | default |

### 3.5 New — ou-family boundary (would/should vs. shoulder/soul vs. touch/young)

| word | pattern | sound | note |
|---|---|---|---|
| touch | ou | short_u | direct — already in table |
| young | ou | short_u | direct — already in table |
| would | ou | oo_short | direct — already in table |
| shoulder | ou | long_o | direct — **flagged as rule-interaction-heavy**: `shoulder` must NOT inherit `oo_short` via suffix-stripping from `should`. This boundary is exactly where a careless edit near "would/could/should" could silently break "shoulder/soul/boulder" — treat any future `ou` exception edit as requiring this row to be re-checked. |

---

## 4. Pattern coverage matrix (summary)

Every pattern across all seven categories now has at least one tokenizer fixture that produces it
as an exact token, **except** the six flagged in §0.1 (`rd,rk,rm,rn,rl,rt`), which are pending
your decision on whether they're fixable or dead.

| Category | Patterns | Status |
|---|---|---|
| digraphs | ch,sh,th,wh,ph,ck,ng,qu,gh,kn,wr,gn,mb,ps | ✅ all covered |
| floss | ss,ff,ll,zz | ✅ all covered |
| blends | 23 of 29 | ⚠️ 6 flagged unreachable (§0.1) |
| clusters3 | scr,spl,spr,str,shr,thr,squ,sch | ✅ all covered |
| trigraphs | tch,dge,igh | ✅ all covered (tch/igh from existing set; `dge` — see note below) |
| vowelTeams | all 23 | ✅ all covered, including previously-untested ue/ui/eu/ew/augh/ough |
| rControlled | ar,er,ir,or,ur | ✅ all covered (new) |
| rControlled3 | all 11 | ✅ all covered (new — previously zero) |

**One more gap found while compiling this matrix:** `dge` (trigraph) has no dedicated fixture in
either the old or new set — `catch`/`stretch` test `tch`, but nothing tests `dge` (e.g. `bridge`,
`fudge`). Recommend adding: `fudge` → `f|u|dge`.

---

## 5. Flagged / high-risk fixtures — read before editing nearby constructs

These are the specific words I'd pin as "check this fixture first" whenever an LLM-assisted
enrichment touches a nearby rule, because each sits at a branch boundary where a well-intentioned
fix elsewhere has a plausible path to silently breaking it:

1. **`says`** — depends on direct-lookup running *before* the suffix-stripper's `s`-stripping
   rule. If lookup order ever changes, this regresses to `ay:long_a` (wrong).
2. **`speak` / `team` / `eat` / `sea`** — the default `ea:long_e` anchors. Any new `ea` exception
   should be checked against these four before merging (see §3.2).
3. **`shoulder` / `soul` / `boulder`** vs. **`would` / `could` / `should`** — same vowel team,
   opposite sounds, one character family (`ou`) apart (see §3.5).
4. **`cookie` / `rookie` / `hoodie`** family — the only words carrying *two* simultaneous
   overrides (`ie` and `oo`) on one entry. This is the exact shape of bug the original v2.3.0 →
   v2.3.1 changelog had to fix once already (duplicate-key silent overwrite).
5. **`finger` / `longer` / `stronger` / `younger`** — the `ng`-before-`e` tokenizer guard. Any
   future digraph rule change should re-run this family specifically, since it's the one place
   the tokenizer has a hand-coded lookahead exception rather than a table-driven rule.
6. **`gingerbread` / `breadwinner` / `bedspread` / `steakhouse` / `overthrow`** — the compound-scan
   fallback tier (tier 3 of `lookupException`). These are the most expensive/fragile lookup path
   and the least likely to get manually re-checked after an unrelated edit.

---

## 6. What's deliberately out of scope for this fixture set

- No attempt to exhaustively test every suffix-strip rule in `tryStripSuffix` — that table (14
  rules) deserves its own dedicated fixture pass once Phase 1 is running, separate from this
  vowel/pattern-focused corpus.
- No attempt to re-verify `COMMON_WORDS`/`is_common` — per the agreed plan, that field moves to
  Base Dictionary and drops out of the phonics construct entirely.
- `ROOT_WORDS` and `COMPOUND_PARTS` membership itself is not re-audited here, only exercised
  incidentally through the syllable-split fixtures above. A dedicated audit of those two
  dictionaries (currently ~60 and ~130 words respectively) is a reasonable Phase 1 or Phase 2
  follow-up, since under-population there is exactly what makes `gingerbread`/`reindeer`-style
  compounds fail silently.
