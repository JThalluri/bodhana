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
