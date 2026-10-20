# Review of nine flagged phonics words

Reviewed 2026-10-19 against the actual engine and the user's nine-entry investigation export. Eight flags identify problems; `appear` is already correct. Notes in the export are evidence to investigate, rather than expected answers to apply blindly.

| Word | Previous result | Reviewed result | Classification/action |
|---|---|---|---|
| recreation | ea:long_e; 3 syllables | ea:hiatus; rec-re-a-tion (4) | Data gap: explicit vowel exception and existing syllable-split override mechanism. |
| somewhere | false ew:oo_long | some + where; no ew sound | Structural: respect existing curated compound boundaries in tokenization and pattern buckets. The reported long-o was not reproduced. |
| beautiful | ea:long_e; 4 syllables | eau:long_u; beau-ti-ful (3) | Structural/data: add the missing eau spelling; explicit beauty-family /yoo/ exceptions. |
| buried | ie:long_i | ie:long_e | Data: unstressed final /i/, not the long-i in died. |
| appear | a + pp + ear; 2 syllables | unchanged | Not a bug: the word has no ia. The r-controlled ear token correctly takes priority over ea. |
| enough | ough:long_o | ough:short_u | Data: the previous ou exception was unreachable because ough wins. Correct the active pattern. |
| laughed | augh:aw | augh:short_a (US) | Data: laugh-family exception, inherited by laughed. UK broad-A differs. |
| thought | ough:long_o | ough:aw | Data: THOUGHT/saw family, distinct from though. |
| worried | ie:long_i | ie:long_e | Data: unstressed final /i/, as in worry. |

## Evidence and dialect

Pronunciation references: Cambridge [recreation](https://dictionary.cambridge.org/pronunciation/english/recreation), [somewhere](https://dictionary.cambridge.org/pronunciation/english/somewhere), [beautiful](https://dictionary.cambridge.org/pronunciation/english/beautiful), [bury/buried](https://dictionary.cambridge.org/us/dictionary/english/buried), [appear](https://dictionary.cambridge.org/us/pronunciation/english/appear), [enough](https://dictionary.cambridge.org/dictionary/english/enough), [laugh](https://dictionary.cambridge.org/us/pronunciation/english/laugh), [thought](https://dictionary.cambridge.org/pronunciation/english/thought), [worried](https://dictionary.cambridge.org/us/pronunciation/english/worried). Neighbor checks include [beautify](https://dictionary.cambridge.org/pronunciation/english/beautify), [beautified](https://dictionary.cambridge.org/dictionary/english/beautified), and [beauteous](https://dictionary.cambridge.org/dictionary/english/beauteous).

Use the existing US-oriented sound inventory. `long_e` also represents final unstressed /i/; it does not assert stress or length. `aw` denotes the saw/THOUGHT family, including speakers with the cot/caught merger. `laugh` uses US short-a; UK /broad A/ has no separate key in the current inventory. These are teaching sound families, not an IPA transcription or a new dialect selector.

## Implementation and safeguards

- One shared compound-parts helper uses the existing curated splitter. It changes no compound vocabulary or splitting heuristics. This prevents false ew in somewhere/homework/somewhat and false ll across help|lines. Secondary substring patterns remain available within each part, preserving the established pattern-bucket contract.
- Add eau at level 8 with long-o default (beau, bureau, plateau, tableau); beauty-family exceptions supply long-u. Prevent ure from consuming the e of eau in bureau, in both tokenizer and vowel-nucleus detection. Pure/cure remain unchanged.
- Correct enough/rough/tough to active ough exceptions; remove their dead ou entries. A direct thorough guard prevents the existing permissive compound-exception scan from inheriting rough's sound. Though/dough/although remain long-o.
- Keep died/tied/cried/fried/tried and beautified/beautifies long-i; buried/worried/buries/worries/beauties use final /i/. Keep caught/taught/slaughter in the aw family, separate from laugh/laughed/laughter.
- Exception changes were applied with the existing Workbench programmatic schema validation, merge, compiler/validator and regression-diff gates. `constructs/patches/2026-10-19-nine-flags.yaml` records the supported exception patch. The eau vocabulary extension and recreation syllable override are explicit structural data changes outside the Workbench's three patch modes, compiled and validated separately. Source serialization was checked for exact structural equality to the Workbench result; comments were preserved.
- Workbench word-mode and blast-radius checks use the same compound-aware tokenizer as production, suppressing shadowed ea/au/ou and cross-boundary ew. Rebuilt the portable standalone Workbench, including the new shared helper. Normalizing source line endings before bundling also fixes its Windows CRLF replacement anchors.
- Engine version 3.1.0 plus the compiled source hash identifies derived analyses. Dictionary Builder recomputes old cached analysis on restore, preserving loaded files, curation, common-word choices and original flag records. Historical flags stay as originally captured; they are not rewritten to look correct.
- Phonics TXT analyses refresh on a later engine/data revision. Imported CSV analyses remain authoritative. Legacy saved lists lack origin metadata and are conservatively retained. Source > Refresh analysis explicitly opts those lists into current rules and preserves selection, order and common-word metadata. Export a fresh Dictionary Builder CSV if an updated analysis file is needed outside this browser.

## Verification

Baseline: 1,044 tests passed before edits; no baseline functional failures. The sandbox initially blocked esbuild's ancestor-directory access; rerunning the same command with authorized access resolved that environment failure.

A 506-word before/after audit covers existing fixtures, exceptions, supplied samples and related controls. Thirty-three records changed, all explained by the reviewed families or curated-boundary correction; the remaining 473 are unchanged. Added targeted controls cover additional beauty inflections and dialect-sensitive neighbors. Original sound fixtures had no unexpected changes in the Workbench sandbox. Detailed local evidence is in `artifacts/phonics-review-baseline.json`, `nine-flags-blast-radius.json`, and `nine-flags-workbench-review.json`.

Commands: `npm test`; `node tools/constructs-workbench/build-standalone.mjs`; `npx playwright test`; `npm run build`; `npm run build:hosted`; `npm run audit:build`; `npm run package:pages`; `npm run test:portal`. The portal configuration remains separate from Workbench. Production checks use both `file:` and `/gurukool/` artifacts, including actual CSV/PDF downloads, saved-data revisions, sound filters, worksheet tokens, screenshots and Letter geometry. Final run counts/results are recorded below after verification.

The existing engine still uses spelling-token counts as a phoneme-count approximation. This review does not make that model a complete pronunciation dictionary, fix every syllable/morphology edge case, or change physical print geometry. Physical Android, printer output and speech-provider pronunciation require real-device checks.

Final local verification: `npm test` passed 1,169 tests in 25 files; standalone Workbench passed 101 Playwright checks, including six new reachable-token checks; full portal production suite passed 36 checks. A separate esbuild bundle verified the served Workbench module imports. Inspected tablet (1024x768), desktop (1920x1080), Dictionary Detail and print screenshots. The new test downloaded CSV under both URL types, preserved imported CSV until explicit refresh, upgraded a stale Dictionary cache while retaining flags, verified sound filtering and saved a real PDF export with a 612x792-point MediaBox. Existing broader output checks passed, including Seyes and certificate geometry and multi-page export.

Portable HTML: 5,792,997 bytes at `dist/index.html`. Hosted HTML: 5,797,281 bytes at `dist-hosted/index.html` (release `1f3ea4cec37c24ca`, `/gurukool/`). Portable/hosted gzip sizes are approximately 2.65 MB. Complete hosted package: `artifacts/pages-release/`. These generated build artifacts are local staging outputs, separate from the source commit. No physical Android or printer result is claimed.


Live verification: published source commit 0fd5b32 as release 1f3ea4cec37c24ca to [Gurukool](https://jthalluri.github.io/gurukool/), destination commit 54fbfdc02a0a917c219f446933b8e2c7d6782bdf, after [Pages workflow 39366506291](https://github.com/JThalluri/gurukool/actions/runs/39366506291) succeeded. All seven runtime/metadata files matched the local hosted bytes. All nine hash routes and four offline routes passed. The actual old-to-new live PWA upgrade waited for consent, corrected all nine cached analyses, preserved the source file/selected word/original flag, then reloaded the corrected worksheet and re-extracted the retained source offline. Live evidence: artifacts/live-phonics-reviewed-artifacts.json and artifacts/live-phonics-upgrade-review.json.

Inspected the actual exported PDF's embedded page image as well as the print DOM screenshot: eau remains one box, text is legible, and output geometry remains Letter. The first live asset check hit this machine's Node request-client issuer-chain limitation; the replacement check used Chrome's normal trusted HTTPS connection and compared all asset bytes without disabling TLS verification.

Update 2026-10-20: the initial enough correction above fixed only the vowel family. It is superseded by the complete American e/n/ou/gh breakdown, including gh /f/, in [the enough/glacier follow-up](PHONICS_AMERICAN_PRONUNCIATION_FIXES.md). Historical verification records above describe the 2026-10-19 release.
