Dictionary Builder — TTS, Manual Word Entry, and the ea-Hiatus Fix

Target consumer: IDE build agent. What this is: a deliberate pivot from correctness-hardening (the Workbench, the regression work) to throughput — making the everyday dictionary-building workflow faster, and closing one specific content gap the Workbench surfaced along the way. Three independent changes, same session, same rigor as every prior round. Depends on: src/dictbuilder/ui.js, src/shared/phonicsWordDetail.js, src/phonics/PhonicsEngine.mjs (all as currently shipped), constructs/phonics-constructs.yaml. Spec version: 1.0.0

Part A — Text-to-speech for Word and Syllables (phoneme button dropped)
A.1 Scope decision, stated plainly

Three buttons were originally envisioned (word / syllables / phonemes). The phoneme button is dropped entirely, not shipped as experimental. Reason: TTS engines synthesize from spelling, not from phonetic transcription. Feeding an isolated grapheme like p or sh to speechSynthesis produces the letter name ("pee"), not the phoneme sound (/p/) — for a phonics tool, that's actively wrong, not a rough approximation. Word and Syllable buttons don't have this problem (syllable chunks are still spelling-like fragments a TTS engine can reasonably attempt), so they ship.

A.2 New shared utility — src/shared/speech.js

The actual Web Speech API wiring belongs here, not inlined into ui.js. Keep it genuinely reusable — Phonics Worksheets (Phase 5) may want word-audio playback later, and this should cost nothing extra to add if so.

js
// src/shared/speech.js

/** Feature detection — call once, use to disable buttons gracefully if unsupported. */
export function isSpeechSupported() {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

/** Cancel any in-progress speech. Call before starting anything new. */
export function cancelSpeech() {
  if (isSpeechSupported()) window.speechSynthesis.cancel();
}

/** Speak a single string. Cancels any in-progress speech first. */
export function speakText(text, opts = {}) {
  if (!isSpeechSupported() || !text) return;
  cancelSpeech();
  const utter = new SpeechSynthesisUtterance(text);
  if (opts.rate) utter.rate = opts.rate;
  window.speechSynthesis.speak(utter);
}

/**
 * Speak an array of parts in sequence, with an explicit pause between each —
 * not relying on the engine's natural inter-utterance gap, since that's too
 * short to be pedagogically useful. pauseMs defaults to 400.
 *
 * @param {string[]} parts
 * @param {{ pauseMs?: number, onDone?: () => void }} [opts]
 */
export function speakSequence(parts, opts = {}) {
  if (!isSpeechSupported() || !parts?.length) return;
  cancelSpeech();
  const pauseMs = opts.pauseMs ?? 400;
  let i = 0;
  function speakNext() {
    if (i >= parts.length) { opts.onDone?.(); return; }
    const utter = new SpeechSynthesisUtterance(parts[i]);
    utter.onend = () => { i++; setTimeout(speakNext, pauseMs); };
    window.speechSynthesis.speak(utter);
  }
  speakNext();
}
A.3 UI wiring — src/dictbuilder/ui.js, additive only

Do not modify phonicsWordDetail.js for this. The two speaker buttons are static markup additions inside renderWordDetail's existing enriched-state output (word header area, and next to the syllable display) — but the actual click behavior is wired in ui.js's existing renderDetailPanel(), same pattern already used for the Flag button. If phonicsWordDetail.js does need the two <button data-action="speak-word"> / data-action="speak-syllables"> elements added to its template, that's the only change to that file, and it must not alter anything about its three existing render states — confirm with a diff showing only additive markup, no logic changes.

In ui.js:

js
import { speakText, speakSequence, isSpeechSupported, cancelSpeech } from '../shared/speech.js';

// inside renderDetailPanel(), after the existing flag-button wiring:
const speakWordBtn = panel.querySelector('[data-action="speak-word"]');
const speakSylBtn  = panel.querySelector('[data-action="speak-syllables"]');
if (!isSpeechSupported()) {
  [speakWordBtn, speakSylBtn].forEach(b => { if (b) { b.disabled = true; b.title = 'Text-to-speech not supported in this browser'; } });
} else {
  speakWordBtn?.addEventListener('click', () => speakText(word));
  speakSylBtn?.addEventListener('click', () => {
    const syllables = splitSyllablesForWord(word); // already imported in this file's scope
    speakSequence(syllables);
  });
}

Call cancelSpeech() whenever the Detail panel re-renders for a different word (e.g. at the top of selectWord()), so switching words mid-playback doesn't leave overlapping audio queued.

A.4 Acceptance criteria
Clicking the word speaker button speaks the whole word once, via the real OS voice (manual listening check — this is audio, no automated assertion can substitute for actually hearing it at least once per build).
Clicking the syllable speaker button speaks each syllable in sequence with an audible pause between each — not back-to-back with no gap.
Clicking either button while the other is mid-playback cancels the first and starts the second cleanly — no overlapping audio.
In a browser/environment without speechSynthesis support (or with it stubbed out for testing), both buttons render disabled with an explanatory tooltip, not a silent no-op.
phonicsWordDetail.js's diff (if touched at all) is markup-only — zero logic changes, zero changes to its three existing render states, verified by the Phase 4/5 regression suites passing unmodified.
No phoneme/Elkonin speaker button exists anywhere in the UI.
Part B — Manual word entry
B.1 Design, and why it needs almost nothing new

Typing a word and previewing it is functionally identical to selecting a word already in the grid — same PhonicsEngine.parseWord() call, same Detail-tab display, same caching rule. The only genuinely new things are the input itself and an "Add to Dictionary" action. This stays entirely inside Dictionary Builder's own files — no changes to phonicsWordDetail.js needed for this part, which keeps it zero-risk to the shared contract Phase 5 depends on.

B.2 New settings-pane section — "Add Words Manually"

Placed after the existing Filter section, before Sort. A single text input accepting space/comma-separated words, plus a small preview list rendered below it as the user types (debounced, same ~300ms pattern already used elsewhere in this file).

For each token in the input: clean it the same way parseWord already does internally (lowercase, strip non-letters). For each cleaned token, show one row:

State	Row content
Empty/invalid after cleaning	"xyz123" — not a valid word (no Add button)
Already in state.extracted	"cat" — already in dictionary (Add button disabled)
New	"cat" + enabled Add button

An "Add all" button is enabled whenever at least one row is addable.

B.3 Add behavior
js
function addManualWord(word) {
  if (state.extracted.includes(word)) return; // defensive, UI should already prevent this
  const record = PhonicsEngine.parseWord(word);
  if (!record) return;

  state.extracted.push(word);
  state.phonicsByWord[word] = record;      // cache immediately — already computed for preview
  state.freq[word] = state.freq[word] || 1; // manual words default to frequency 1

  updateSummary();
  renderWordGrid();
  updateActionButtons();
  selectWord(word); // reuses the existing selection flow — shows it in Detail immediately
}

Deliberately not done: manually added words do not trigger a re-run of findPossiblePlurals/applyPluralExclusions against the rest of the list. That heuristic is scoped to document-extracted words; re-running it on manual add risks silently changing exclusion state on words the teacher already curated. This is a deliberate scope boundary, not an oversight — log it as such if it comes up again later.

Existing export paths (Download, Full Merge, Append Delta, Export Phonics CSV) need no changes — they already operate generically over state.extracted/state.phonicsByWord.

B.4 Acceptance criteria
Typing a single new word and clicking Add results in it appearing in the word grid, already enriched (no separate Enrich click needed for that word), and auto-selected in the Detail tab.
Typing multiple space/comma-separated words shows one preview row per word with correct per-row state (new / already-present / invalid).
Clicking "Add" on a word already in the dictionary is impossible (button disabled) — never produces a duplicate grid entry.
Adding a manual word does not change any other word's plural-exclusion state — verified by checking state.excluded/state.pluralInfo are unchanged for pre-existing words after a manual add.
Export Phonics CSV on a dictionary containing at least one manually-added word produces a row for that word with full phonics fields populated — same contract as a document-extracted, already-enriched word.
Part C — The ea-hiatus fix
C.1 Why this isn't a "pick the closest label" fix like -ient was

bear/wear are excluded from vowel_team_sounds for free, because a longer r-controlled pattern (ear) wins the tokenizer match before ea is considered. The hiatus words below have no such competing pattern — ea is the genuinely correct tokenized match, so the exceptions-table mechanism is the only lever available, and approximating with an existing label (e.g. long_e) would just relocate today's wrong default into "official" data without fixing anything. The correct fix is a new, honestly-labeled sound key.

C.2 New soundLabels entry — pure data, zero code changes
yaml
soundLabels:
  # ...existing entries unchanged...
  hiatus: "(hiatus — two separate vowel sounds across a syllable boundary, as in re-act)"

Generic by design — reusable for any future pattern/word hitting the same situation, not scoped to ea specifically. No changes needed to lookupException, vowelTeamSounds, or any validator — every exception row still has a real sound key that resolves to a real soundLabels entry, so checkStructure's existing hard-fail rules are satisfied unchanged.

C.3 New exception rows
yaml
vowelTeamExceptions:
  # ...existing rows unchanged, append:
  - { word: caveat,      pattern: ea, sound: hiatus, note: "ca-ve-at, hiatus not a team" }
  - { word: react,       pattern: ea, sound: hiatus, note: "re-act, hiatus not a team" }
  - { word: reaction,    pattern: ea, sound: hiatus, note: "re-ac-tion, hiatus not a team" }
  - { word: reactivate,  pattern: ea, sound: hiatus, note: "re-ac-ti-vate, hiatus not a team" }
  - { word: create,      pattern: ea, sound: hiatus, note: "cre-ate, hiatus not a team" }
  - { word: creation,    pattern: ea, sound: hiatus, note: "cre-a-tion, hiatus not a team" }
  - { word: recreate,    pattern: ea, sound: hiatus, note: "re-cre-ate, hiatus not a team" }
  - { word: idea,        pattern: ea, sound: hiatus, note: "i-de-a, hiatus not a team" }
  - { word: area,        pattern: ea, sound: hiatus, note: "a-re-a, hiatus not a team" }
  - { word: theater,     pattern: ea, sound: hiatus, note: "the-a-ter, hiatus not a team" }

Starter list, deliberately bounded — same precedent as the -ient family. More can be added later via the Workbench's Vowel Sound mode now that this family exists.

C.4 Regression fixtures

Add to constructs/fixtures/phonics-regression-fixtures.v2.yaml's vowelTeamSounds section, one entry per word above:

yaml
  - { word: caveat, pattern: ea, sound: hiatus }
  # ... one per word in C.3
C.5 Required process — reuse the Workbench, don't hand-edit blind

This is exactly the scenario the Workbench's Vowel Sound mode exists for. Run the real change through it (or, at minimum, through the equivalent manual sandbox-apply + regression-diff steps) before committing:

Target pattern ea.
Confirm the blast radius doesn't contain anything from this list already carrying a conflicting direct exception.
Apply the patch, run the sandbox, confirm the regression diff shows only the ten targeted words changing, zero unexpected changes elsewhere.
Merge, confirm the changelog entries land correctly.
C.6 Backlog update

Move the "ea hiatus words misclassified as a vowel team" entry from OPEN to RESOLVED in phonics-phase2-backlog.md, with a short note on what shipped (the hiatus label, the ten-word starter list, and that more can be added the same way later).

C.7 Acceptance criteria
PhonicsEngine.parseWord('caveat').vowel_team_sounds === 'ea:hiatus'.
All ten words in C.3 resolve to ea:hiatus.
Full regression suite passes with the ten new fixtures included, zero unrelated fixtures changed (confirmed via the Workbench's own regression-diff step, per C.5, not asserted).
The Detail panel's vowel-sound display for caveat now shows the honest hiatus label text, not a claimed phoneme.
Backlog entry moved to RESOLVED with the note described in C.6.
Evidence standard — unchanged from every prior round

Literal code, literal test output, literal command output. For Part A specifically: audio can't be captured as text, so a manual listening confirmation (stated plainly as "I listened and confirmed X") is acceptable evidence for criteria 1–3 — but the disabled-state fallback (criterion 4) and the no-phoneme-button criterion (6) are both verifiable in code/DOM and must be shown as such, not just asserted.

Explicitly out of scope
Any phoneme-level audio (pre-recorded sound library or otherwise) — noted as a possible future direction in chat, not part of this spec.
Re-running plural detection on manual word add (Part B.3) — deliberate boundary, not a gap.
Any UI distinction marking manually-added words differently from extracted ones in the grid — optional nice-to-have, not required.