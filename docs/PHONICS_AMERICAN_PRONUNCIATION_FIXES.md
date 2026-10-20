# American pronunciation corrections: enough and glacier

Implemented 2026-10-20. American English remains the current convention; the future country/pronunciation selector stays on the backlog.

| Word | Corrected breakdown | Sounds and output |
|---|---|---|
| enough | e / n / ou / gh | US /əˈnʌf/, uh-NUF; gh supplies /f/. Four sound boxes, two syllables. |
| glacier | g / l / a / ci / er | Common US /ˈɡleɪʃɚ/, GLAY-sher; a is /eɪ/, ci is /ʃ/, er is /ɚ/. Five sound boxes, two syllables. |
| glaciers | g / l / a / ci / er / s | Same pronunciation plus final /z/. Six sound boxes, two syllables. |

Sources: Cambridge [enough](https://dictionary.cambridge.org/pronunciation/english/enough) and [glacier](https://dictionary.cambridge.org/pronunciation/english/glacier). Glacier also has accepted variants; this implementation deliberately selects GLAY-sher for the current American convention. It does not apply the British hiatus analysis.

## Implementation

Optional `wordPronunciations` entries in `constructs/phonics-constructs.yaml` carry locale, whole-word IPA, respelling, level, source and an ordered spelling-to-phoneme breakdown. Each segment represents one phoneme, including a diphthong or r-colored vowel as one unit. Entries apply only to the exact word; there is no suffix or compound inheritance. These three entries replace the generic tokenizer for those words. Other words retain the existing spelling-based heuristic and its limitations; this is not a complete phonemic dictionary.

The shared compiler, loader and validator support the optional section without changing the schema version or requiring it in older artifacts. Validation checks unique words, supported locale, text safety, known vowel sound keys, level/source, nonempty sound units and exact concatenation to the spelling. An ordinary vowel exception cannot conflict with the reviewed vowel correspondence. `enough` now has a reachable ou:short_u exception and no dead ough exception; this change was applied using the existing Workbench programmatic patch/validation pipeline. The patch is recorded at `constructs/patches/2026-10-20-enough.yaml`.

Dictionary Builder Detail shows the full American pronunciation and all correspondences, including gh → /f/. It no longer presents an incomplete ough → cup label for enough or an ie → bike label for glacier. Reviewed vowel-team buckets exclude those misleading overlapping matches. Sound filtering keeps enough in short-u and glacier/glaciers in long-a. The historical `vowel_team_sounds` field supports the reviewed single-vowel correspondence a:long_a; it does not label a as an ordinary vowel team.

Dissection, Elkonin boxes, counts, print and PDF export consume the same sound-unit tokens. Extended CSV includes pronunciation_locale, pronunciation_ipa, pronunciation_respelling and JSON-encoded pronunciation_segments, preserving the data through actual Dictionary Builder export and Phonics import. Base CSV columns remain unchanged. Workbench word mode shows the complete entry and directs structural edits through the compiler; blast radius and regression checks use the same pronunciation-aware core.

Engine version 3.2.0 plus constructs hash refreshes old engine-derived caches while keeping user metadata and historical flags. Imported/unknown-origin CSV records remain unchanged until Source > Refresh analysis; the original CSV file is never rewritten. No country selector, dependency upgrade, print-geometry change or general ie/ough rule was introduced.

## Verification

Baseline: 1,169 unit tests passed before edits. The real-engine before/after audit covers 385 words from the fixture/exception corpus and selected neighbors; only enough, glacier and glaciers change linguistic analysis. All records gain optional pronunciation fields, empty for unreviewed words. The existing analyses of glacial/glaciation/glaciologist, rough/tough, though/dough, thought/caught, died and other controls remain unchanged.

Focused production checks use actual portable file URLs and the hosted /gurukool/ artifact. They exercise full Detail, downloaded CSV round trips, long-a/long-i/ough filtering, reload, stale Dictionary analysis with retained historical flag data, explicit legacy-CSV refresh, sound/syllable boxes, Letter print frames and an actual PDF download. The longer Detail exposed a real status-overlay overlap. A measured status-height CSS variable now reserves scroll clearance in Dictionary Detail. The migration check clicks Flag with the full status notice, then exports flags with it minimized. This is a narrow screen-only accessibility correction; print geometry is unchanged. Physical Android, speech-provider pronunciation and printer calibration remain device checks.

Evidence is local under `artifacts/glacier-enough-*`, plus `artifacts/*american*` screenshots, CSVs and output PDFs. Final run counts, bundle sizes and deployment verification are recorded below after completion.


Final local results: 1,211 unit tests in 26 files, 103 standalone Workbench Playwright checks, and 41 full production portal checks passed. The served Workbench also bundled successfully with esbuild. Inspected tablet/desktop Detail and worksheet screenshots, print output, and the actual PDF export page image. Letter geometry remains 816x1056 CSS pixels / 612x792 PDF points. Existing broader output checks, including Seyes geometry and certificate landscape, passed.

Portable artifact: dist/index.html (5,796,403 bytes; approximately 2.652 MB gzip). Hosted artifact: dist-hosted/index.html (5,800,845 bytes; approximately 2.654 MB gzip). Complete hosted package: artifacts/pages-release/, base /gurukool/, release f21f4269af7e3b18. No physical Android, printer or speech-provider check is reported as passed.


Live verification: [Gurukool](https://jthalluri.github.io/gurukool/) serves release f21f4269af7e3b18 after [Pages workflow 39442303922](https://github.com/JThalluri/gurukool/actions/runs/39442303922) succeeded. Destination commit: 24ed1bc295a2a5b39c6396b5fa8c691ef1567f7f. All seven runtime/metadata assets matched the tested hosted bytes over normal browser HTTPS. All nine routes and four offline routes passed. The actual old-to-new PWA upgrade waited for consent, corrected enough/glacier/glaciers with tried/though controls, preserved the source file/selection/original flag, then passed offline worksheet reload and retained-file re-extraction. Local live evidence: artifacts/live-american-phonics-reviewed-artifacts.json and artifacts/live-american-phonics-upgrade.json.

## Unified sound guides and optional online pronunciation (2026-10-20)

Every enriched word now uses the same American sound-guide layout in Dictionary Builder Detail. A small, shared rule interpreter reads the existing spelling groups and vowel classifications; it does not add a pronunciation dictionary or generate a guessed whole-word transcription. Supplied complete pronunciation metadata keeps its existing full breakdown. Rules cover ordinary consonants, blends and selected closed-CVC vowel contexts. Ambiguous groups, unresolved single vowels and composite ough/augh spellings are explicitly marked **Needs review**, with no guessed sound shown for that part. A blend can display several sounds in one spelling group. Detail and count filters say **Groups**, retaining the historical phoneme_count field and all existing values/IDs for CSV and persistence compatibility.

Rules and display interpretation live in `src/phonics/core/soundGuide.mjs`; the shared Detail renderer and Phonics word-selection review badges use the same helper. This is presentation guidance over existing records, not a new tokenizer or a claim that every English pronunciation is resolved. No new word overrides, data schema, analysis-revision change, large lexicon or dependency was needed. Imported analyses stay as supplied; the helper never rewrites them. Existing dissection/Elkonin grouping, print/export and saved work remain unchanged. Whole-word IPA is shown only when the record supplies a complete pronunciation; rule-based partial guides never concatenate guesses into IPA.

The **Explore pronunciation (online)** link opens a Cambridge pronunciation page in a new tab, with noopener/noreferrer and an instruction to choose US audio. It is an ordinary link, not an API, embed, automatic fetch, cache dependency or account integration. Cambridge offers public word pronunciation pages with sound-by-sound guidance and US/UK audio; word coverage and service availability are external. No pronunciation content is downloaded into the app. Internet is needed only after choosing the external reference. Dictionary Lookup remains separate and unchanged. Portable file URLs and hosted/offline installs keep all local behavior when the link is unused or the network is unavailable.

The source was checked against Cambridge's [cat pronunciation page](https://dictionary.cambridge.org/us/pronunciation/english/cat) and [pronunciation index](https://dictionary.cambridge.org/pronunciation/). Automated navigation tests intercept the external destination to verify safe new-tab behavior without depending on the publisher's service. Direct automated retrieval can be blocked by Cambridge; the tests do not claim that live audio playback was verified.

Final unified-guide verification: 1,242 unit tests across 27 files and all 43 production portal checks passed. Checks cover actual portable file URLs, hosted /gurukool/ artifacts, offline guides and worksheet generation, no eager external request, and safe new-tab navigation. Inspected the tablet Detail screenshot including unresolved teacher groups and the compact online link. The broader suite retained Letter print/PDF, Seyes geometry, settings access and consented multi-tab update coverage. No physical Android, printer or external audio playback was tested.

Portable dist/index.html: 5,801,471 bytes (2,654,428 gzip). Hosted dist-hosted/index.html: 5,805,913 bytes (2,656,918 gzip). Hosted package artifacts/pages-release/, release ecb52fd83a153055. A separate normal Chrome HTTPS check returned HTTP 200 for the public Cambridge cat pronunciation page and confirmed sound-by-sound content; audio playback and coverage for every word remain external.


Unified offline sound guidance and the optional Cambridge pronunciation link are live in release `ecb52fd83a153055` (destination commit `3f5cdca48c1e70c48e7b23764af3b4bb888b2270`, source implementation `6c80e00`). All seven runtime/metadata files matched the tested hosted artifacts over normal browser HTTPS; all nine routes and four offline routes passed. An already-open previous release waited for update consent, then showed the uniform guide while preserving enriched records, original flags, selection and loaded source file exactly. Offline relaunch and retained-file re-extraction passed. Evidence: `artifacts/live-unified-guide-reviewed-artifacts.json` and `artifacts/live-unified-guide-upgrade.json`. Local production checks passed 43/43 and unit tests 1,242/1,242. External audio playback, physical Android and printer calibration remain unverified.
