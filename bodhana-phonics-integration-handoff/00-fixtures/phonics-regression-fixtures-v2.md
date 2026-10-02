# Phonics Regression Fixture Corpus — v2

**Supersedes v1 entirely.** v1 was a single hand-trace pass and, per its own findings log, missed
things (see §0 below — two gaps were in v1's own coverage claims, not just the original
prototype). v2 applies four mechanical passes rather than one-off inspection. See the companion
`phonics-phase2-backlog.md` for items found but deliberately deferred.

The original prototype's `DEMO_WORDS` and the old spec's §8 tables are not authoritative inputs
here — only the actual algorithm and this corpus are.

---

## 0. Summary of what changed since v1

| # | Finding | Resolution |
|---|---|---|
| 1 | `rd,rk,rm,rn,rl,rt` blends structurally unreachable | **Removed from `PHONICS_PATTERNS.blends`.** Replaced with 13 `rControlled`/`rControlled3` fixtures (§1.6 below), using common classroom words. |
| 2 | Pattern tie-break priority: spec doc says one order, code does another | **New permanent compiler rule**: no pattern string may be declared in more than one category. Makes the ordering question moot rather than reconciling two conflicting orders. |
| 3 | v1 claimed `scr` and `igh` were covered; they weren't | Added `scrap` (scr), `night` (igh). |
| 4 | `dge` trigraph had zero coverage in v1 or the original spec | Added `fudge → f\|u\|dge`. |
| 5 | Only ~35 of ~140 `VOWEL_TEAM_EXCEPTIONS` rows had any fixture | **New permanent compiler rule**: auto-generate a self-verifying assertion for every row directly from the table (word/pattern/sound already stated there — zero authoring cost, also catches typos where a row claims a pattern the word doesn't contain). A representative sample is still hand-listed below for human readability (§3.6). |
| 6 | `slimmer` split incorrectly (`slimm·er` not `slim·mer`) — `ROOT_WORDS` missing `slim` | Patched: `slim` added to `ROOT_WORDS`. General question of whether undoubling should depend on a finite list at all → **deferred, tracked in backlog.** |
| 7 | `-able`/`-ible` suffix rules undercount true syllables by one | **Open, tracked in backlog.** Target fixtures below are set to the linguistically correct answer; splitter is expected to currently fail them. |

---

## 1. Tokenizer fixtures (`word` → `graphemes`)

### 1.1 Carried forward, verified correct (unchanged from v1/original spec)

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

### 1.2 CVC / Level-1 baseline

cat → `c\|a\|t` · dog → `d\|o\|g` · sun → `s\|u\|n` · hat → `h\|a\|t` · bed → `b\|e\|d` ·
pin → `p\|i\|n` · top → `t\|o\|p` · cup → `c\|u\|p`

### 1.3 Digraphs

| word | graphemes |
|---|---|
| math | `m\|a\|th` |
| whale | `wh\|a\|l\|e` |
| duck | `d\|u\|ck` |
| queen | `qu\|ee\|n` |
| ghost | `gh\|o\|st` |
| knee | `kn\|ee` |
| wrist | `wr\|i\|st` |
| gnome | `gn\|o\|m\|e` |
| comb | `c\|o\|mb` |
| lamb | `l\|a\|mb` |
| psalm | `ps\|a\|l\|m` *(structural coverage only — flagged as classroom-appropriateness call in v1, carried forward unresolved; swap if you have a better word)* |

### 1.4 Floss

buzz → `b\|u\|zz` · cliff → `cl\|i\|ff` · grass → `gr\|a\|ss`

### 1.5 Clusters3 and trigraphs (closes the v1 gaps — item 3, 4 above)

| word | graphemes | closes |
|---|---|---|
| splash | `spl\|a\|sh` | spl |
| sprint | `spr\|i\|nt` | spr |
| shrimp | `shr\|i\|mp` | shr |
| three | `thr\|ee` | thr |
| squid | `squ\|i\|d` | squ |
| school | `sch\|oo\|l` | sch |
| scrap | `scr\|a\|p` | **scr — v1 claimed covered, wasn't** |
| night | `n\|igh\|t` | **igh — v1 claimed covered, wasn't** |
| fudge | `f\|u\|dge` | **dge — never covered anywhere before v2** |

### 1.6 rControlled / rControlled3 — now includes your 13 common words (item 1 above)

| word | graphemes | category |
|---|---|---|
| car | `c\|ar` | rControlled |
| her | `h\|er` | rControlled |
| bird | `b\|ir\|d` | rControlled |
| for | `f\|or` | rControlled |
| fur | `f\|ur` | rControlled |
| stark | `st\|ar\|k` | rControlled |
| pork | `p\|or\|k` | rControlled |
| storm | `st\|or\|m` | rControlled |
| arm | `ar\|m` | rControlled |
| barn | `b\|ar\|n` | rControlled |
| corn | `c\|or\|n` | rControlled |
| girl | `g\|ir\|l` | rControlled |
| swirl | `sw\|ir\|l` | rControlled |
| art | `ar\|t` | rControlled |
| card | `c\|ar\|d` | rControlled |
| short | `sh\|or\|t` | rControlled |
| chair | `ch\|air` | rControlled3 |
| bear | `b\|ear` | rControlled3 |
| beard | `b\|ear\|d` | rControlled3 |
| deer | `d\|eer` | rControlled3 |
| door | `d\|oor` | rControlled3 |
| sour | `s\|our` | rControlled3 |
| care | `c\|are` | rControlled3 |
| here | `h\|ere` | rControlled3 |
| fire | `f\|ire` | rControlled3 |
| more | `m\|ore` | rControlled3 |
| pure | `p\|ure` | rControlled3 |
| roar | `r\|oar` | rControlled3 |

### 1.7 Vowel teams not previously exercised

blue → `bl\|ue` · fruit → `fr\|ui\|t` · feud → `f\|eu\|d` *(rare, structural only)* ·
chew → `ch\|ew` · caught → `c\|augh\|t` · though → `th\|ough` · eight → `eigh\|t` ·
toe → `t\|oe` · vein → `v\|ei\|n`

### 1.8 Blends (full remaining set — now 23 of 23, since the unreachable 6 were removed)

| word | graphemes | blend |
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

---

## 2. Syllable-split fixtures

### 2.1 Carried forward unchanged

something · amazing · cooked · maybe · doors · running · spelling · teacher · over · never ·
water · bigger · table · rabbit · wanted · jumped · father · sister · summer · winter · flower ·
understand

### 2.2 Single-syllable sanity checks

cat · dog · sun · hat · bed · pin · top · cup · math · whale · duck · queen · ghost · knee ·
wrist · gnome · comb · lamb · buzz · cliff · grass · splash · sprint · shrimp · three · squid ·
school · scrap · night · fudge · chair · bear · beard · deer · door · sour · care · here · fire ·
more · pure · roar · car · her · bird · for · fur · stark · pork · storm · arm · barn · corn ·
girl · swirl · art · card · short · blue · fruit · chew · caught · though · eight · toe · vein ·
touch · speak · team · eat · sea · saw · day · rain · boat · coin · toy

### 2.3 Multi-syllable — compound-scan and suffix-strip paths

| word | target split | path |
|---|---|---|
| gingerbread | gin·ger·bread | compound-scan — flagged, `ginger` not in `COMPOUND_PARTS` yet |
| breadwinner | bread·win·ner | compound-scan |
| bedspread | bed·spread | compound-scan |
| steakhouse | steak·house | compound-scan |
| overthrow | o·ver·throw | compound-scan |
| believer | be·liev·er | suffix-strip |
| cookie | cook·ie | dual vowel-team override |
| rookie | rook·ie | dual vowel-team override |
| movie | mov·ie | pattern fallback |
| friendly | friend·ly | suffix-strip (-ly) |
| friends | friends | suffix-strip (plural, no added syllable) |
| several | sev·er·al | pattern fallback |
| monkey | mon·key | pattern fallback |
| turkey | tur·key | pattern fallback |
| shoulder | shoul·der | pattern fallback — **see §2.4 boundary note** |
| trouble | trou·ble | `-Cle` strip |
| author | au·thor | pattern fallback |
| reindeer | rein·deer | compound-scan candidate — flagged, neither half in `COMPOUND_PARTS` yet |
| **slimmer** | **slim·mer** | suffix-strip, -er undouble — **requires the `ROOT_WORDS` patch (item 6)** |

### 2.4 Suffix-rule coverage — one fixture per `tryStripSuffix` rule (Pass 3)

| rule | word | target | undouble tested? |
|---|---|---|---|
| -tion | nation | na·tion | — |
| -sion | vision | vi·sion | — |
| -ment | payment | pay·ment | — |
| -ness | kindness | kind·ness | — |
| -less | careless | care·less | — |
| -able | readable | **read·a·ble** | — *(target set to linguistically correct 3 syllables — see item 7; splitter is expected to currently fail this)* |
| -ible | visible | **vis·i·ble** | — *(same caveat as -able)* |
| -ous | famous | fa·mous | — |
| -ful | careful | care·ful | — |
| -ing | running | run·ning | yes (existing) |
| -ly | friendly | friend·ly | — |
| -est | biggest | big·gest | yes (new) |
| -er | teacher / bigger / **slimmer** | teach·er / big·ger / **slim·mer** | no / yes / **yes — exposes item 6** |
| -ed | wanted / jumped | want·ed / jumped | — (edOnly branch, not undouble) |

---

## 3. Vowel-team sound resolution fixtures

### 3.1 Carried forward unchanged

easy · breakfast · ready · weak · bread · break · steak · snow · cow · book · moon · shield · pie ·
believe · cookie · breathe · breathes · breadwinner · bedspread · steakhouse · overthrow ·
gingerbread · would · friend · says · they · height · their

### 3.2 Closes the default-case gap (your original `speak` scenario)

| word | pattern | sound | branch |
|---|---|---|---|
| **speak** | ea | long_e | **default** |
| team | ea | long_e | default |
| eat | ea | long_e | default |
| sea | ea | long_e | default |

### 3.3 Suffix-stripped path for the `friend` family

friend (ie, short_e, direct) · friends (ie, short_e, suffix-stripped)

### 3.4 One default-case fixture per remaining vowel team

| word | pattern | sound |
|---|---|---|
| rain | ai | long_a |
| day | ay | long_a |
| three | ee | long_e |
| boat | oa | long_o |
| toe | oe | long_o |
| blue | ue | long_u |
| fruit | ui | long_u |
| saw | aw | aw |
| author | au | aw |
| vein | ei | long_a *(first-ever test of the `ei` default, not just its exceptions)* |
| feud | eu | long_u *(rare, structural only)* |
| chew | ew | oo_long |
| monkey | ey | long_e |
| coin | oi | oi |
| toy | oy | oi |
| caught | augh | aw |
| though | ough | long_o |
| eight | eigh | long_a |

### 3.5 `ou`-family boundary (would/could/should vs. shoulder/soul vs. touch/young)

touch (ou, short_u) · young (ou, short_u) · would (ou, oo_short) ·
shoulder (ou, long_o) — **flagged**: must not inherit `oo_short` via suffix-stripping from "should."

### 3.6 Representative sample of previously-uncovered exception rows (Pass 5)

Full coverage of all ~140 rows is auto-generated by the compiler directly from the table (see
item 5). This sample exists only for human spot-checking, not as the full test set:

dead (ea,short_e) · health (ea,short_e) · feather (ea,short_e) · heavy (ea,short_e) ·
measure (ea,short_e) · thread (ea,short_e) · field (ie,long_e) · brief (ie,long_e) ·
niece (ie,long_e) · alley (ey,long_e) · honey (ey,long_e) · hood (oo,oo_short) ·
wool (oo,oo_short) · window (ow,long_o) · yellow (ow,long_o) · route (ou,oo_long) ·
wound (ou,oo_long)

---

## 4. Pattern coverage matrix

| Category | Patterns | Status |
|---|---|---|
| digraphs | 14 | ✅ all covered |
| floss | 4 | ✅ all covered |
| blends | 23 *(reduced from 29 — 6 removed as unreachable)* | ✅ all covered |
| clusters3 | 8 | ✅ all covered (scr closed in v2) |
| trigraphs | 3 | ✅ all covered (dge closed in v2) |
| vowelTeams | 23 | ✅ all covered |
| rControlled | 5 | ✅ all covered, reinforced with common words |
| rControlled3 | 11 | ✅ all covered, reinforced with common words |

No outstanding reachability gaps. No outstanding "claimed covered but wasn't" gaps — this matrix
was itself re-verified against the actual fixtures listed above, not just asserted.

---

## 5. Flagged / high-risk fixtures — check these before any nearby construct edit

1. **`says`** — depends on direct-lookup running before suffix-stripping's `s`-rule.
2. **`speak`/`team`/`eat`/`sea`** — `ea:long_e` default anchors; check against any new `ea` exception.
3. **`shoulder`/`soul`/`boulder`** vs **`would`/`could`/`should`** — one `ou` family, opposite sounds.
4. **`cookie`/`rookie`/`hoodie`** — only words with two simultaneous overrides on one entry.
5. **`finger`/`longer`/`stronger`/`younger`** — the hand-coded `ng`-before-`e` tokenizer guard.
6. **`gingerbread`/`breadwinner`/`bedspread`/`steakhouse`/`overthrow`** — compound-scan fallback tier.
7. **`slimmer`** (new) — pins the `ROOT_WORDS` dependency; see backlog item 6. Any future
   `ROOT_WORDS` edit should re-run this fixture.
8. **`readable`/`visible`** (new) — currently *expected to fail* pending backlog item 7's resolution.
   Don't "fix" these by lowering the target to match current output — fix the splitter, or
   explicitly accept the simplification and document it, but don't let the target quietly erode.

---

## 6. Permanent compiler validation rules (for the Phase 1 build spec)

These four replace one-off manual audits going forward:

1. **Reachability** — every declared pattern must be produced by ≥1 fixture as an actual token.
2. **No cross-category pattern collisions** — no pattern string may be declared in more than one
   category, full stop. (Replaces reconciling the two conflicting priority-order definitions.)
3. **Suffix/exception branch coverage** — every `tryStripSuffix` rule and every `lookupException`
   tier (direct / suffix-stripped / compound-scan) must be exercised by ≥1 fixture.
4. **Exception-table self-verification** — every `VOWEL_TEAM_EXCEPTIONS` row is auto-asserted
   against its own stated output at build time, including a substring check that the word
   actually contains the claimed pattern (typo guard).

## 7. Deliberately out of scope here

Full `ROOT_WORDS`/`COMPOUND_PARTS` dictionary audit (only incidentally exercised above) — reasonable
Phase 1/2 follow-up given `gingerbread`/`reindeer` both expose gaps there. `is_common` is out of
scope entirely per the agreed plan (moved to Base Dictionary).
