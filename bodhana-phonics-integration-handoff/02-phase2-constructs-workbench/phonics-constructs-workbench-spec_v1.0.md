# Constructs Workbench — Build Specification (Phase 2 of 5)

**Target consumer:** IDE build agent.
**What this is:** a standalone, offline HTML tool — **not part of Bodhana, never shipped to
teachers** — that sits between the repo and an LLM to make iterative enrichment of
`phonics-constructs.yaml` safe. It is your content-maintenance surface, used by one person
(you), with a copy-paste LLM handoff (no API wiring in this phase — see §9).
**Phase scope:** the Workbench application only. No Bodhana changes. No engine refactor beyond
the Phase 1 correction described above.
**Spec version:** 1.0.0
**Depends on:** Phase 1's `scripts/constructs-validate.mjs` and `src/phonics/core/*.mjs`
(imported directly, unmodified — see dependency correction above) and
`constructs/fixtures/phonics-regression-fixtures.v2.yaml`.

---

## 1. Purpose — restated precisely

An LLM asked to fix "`ea` should say `/ē/` in *speak*" can fail two ways: under-context (doesn't
know the full existing branch structure, proposes a change to the wrong place) or
over-confidence (can't tell you what else its proposed edit touches). The Workbench's entire job
is to make both failures structurally hard:

1. **Scope the context** mechanically, not by hoping the LLM asks the right questions.
2. **Compute blast radius** before and after a proposed change, deterministically — never by
   LLM judgment.
3. **Gate the merge** on an exact, reviewable diff. Nothing writes to the real YAML without you
   looking at precisely what changed and confirming it's only that.

---

## 2. Deliverables

| Artifact | Path | Notes |
|---|---|---|
| Workbench app | `tools/constructs-workbench/index.html` | Opens via `file://`, zero server, zero build step. Same ethos as the other prototype files you've already built. |
| App logic | `tools/constructs-workbench/app.js` | Vanilla JS, ES modules. |
| Bundled YAML parser | `tools/constructs-workbench/vendor/js-yaml.min.js` | Bundled locally, not CDN-loaded — same rule as PapaParse elsewhere in this codebase. |
| Shared core (imported, not copied) | `src/phonics/core/*.mjs` | **Do not fork or duplicate.** Import directly. If the Workbench needs a browser-safe wrapper around a Node-oriented export, fix the export, don't copy the logic. |
| Shared validator (imported, not copied) | `scripts/constructs-validate.mjs` | Same rule. |
| README | `tools/constructs-workbench/README.md` | The six-step workflow below, written for future-you re-reading this in six months. |

---

## 3. File I/O strategy

Two paths, feature-detected at startup:

**Primary — File System Access API** (`showOpenFilePicker`/`showSaveFilePicker`, Chrome/Edge):
read `constructs/phonics-constructs.yaml` and the fixture corpus directly from disk, and — after
explicit merge confirmation (§8) — write the updated YAML back to the same file handle. This is
the low-friction path and should be the default experience.

**Fallback — upload/download** (Firefox/Safari, or if the API is denied): load via a file input
exactly like the existing Dictionary Builder's drop zones; on merge, trigger a download of the
updated YAML with a clear filename (`phonics-constructs.updated.<timestamp>.yaml`) and an
on-screen instruction to manually replace the repo file. No worse than today's workflow, just not
as smooth.

Detect capability once at load; do not ask the user to choose — pick the best available path
silently and only surface the fallback's manual-replace instruction when that path is actually in
use.

---

## 4. The six-step workflow

### Step 1 — Load

Open `phonics-constructs.yaml` (via either I/O path) and parse with the bundled `js-yaml`. Also
load `constructs/fixtures/phonics-regression-fixtures.v2.yaml` — required for blast-radius computation,
not optional. If either fails to parse, show the raw parser error and stop; do not guess or
partially load.

### Step 2 — Target a word or pattern

A single search box. Typing a word (e.g. `speak`) or a bare pattern (e.g. `ea`) runs the loaded
core module's `vowelTeamSounds()` / `lookupException()` against it live and shows:

- The current computed sound.
- Which tier produced it (`default` / `direct exception` / `suffix-stripped` / `compound-scan`).
- If a pattern was entered rather than a word: every exception row that pattern appears in.

### Step 3 — Blast radius (mechanical, not LLM)

For the targeted pattern, scan two sources — the full fixture corpus and the full existing
`vowelTeamExceptions` table — for every word containing that pattern as a substring. For each,
run the current core lookup and render:

| word | current sound | branch |
|---|---|---|

This table is the literal answer to "what already exists and how is it branched" — computed, not
asserted by anyone, human or LLM.

### Step 4 — Export context bundle

One button assembles a single copy-pasteable block containing, scoped tightly to the targeted
pattern only:

- The `defaultVowelSound` entry for that pattern.
- Every existing `vowelTeamExceptions` row for that pattern, including `note`.
- The full blast-radius table from Step 3.
- A free-text field where you state the correction (e.g. "speak should resolve to long_e, like
  'see' — it currently doesn't because no fixture pins it, but check whether any existing
  exception row would incorrectly also match it").
- **A fixed instruction block** telling the LLM the exact legal patch format (§5) and explicitly
  stating it must not propose changes to any other section of the construct file.

"Copy to clipboard" — nothing is sent anywhere automatically (see §9).

### Step 5 — Patch input

A textarea where you paste the LLM's response. The response must conform to the patch schema in
§5. Parse and schema-validate on paste, before allowing the user to proceed — reject with a
specific error (not a generic "invalid") if the LLM's output doesn't match, since copy-paste
LLM output is exactly where format drift creeps in.

### Step 6 — Sandbox apply + full regression

Never touches the loaded file. On an in-memory clone of the parsed construct object:

1. Apply the patch.
2. Run the shared core's compile step (the pure `compileConstructs()` function — see dependency
   note in §7) to produce a sandbox compiled object.
3. Run all four Phase 1 validation rules against the sandbox object, via the imported
   `constructs-validate.mjs` — unmodified, same rules, same failure messages.
4. Re-run **every** fixture in the full regression corpus (not just the targeted pattern) against
   the sandboxed compiled object, and diff against their pre-patch results.
5. Recompute the Step 3 blast-radius table against the sandbox object, side by side with the
   original.

### Step 7 — Review (hard gate)

Render, in this order:

1. **Validator result.** Any failure → block entirely, show the exact rule and offending
   word/pattern, no way to proceed until the patch is fixed.
2. **Full regression diff.** Every fixture whose result changed, before → after. If **any**
   fixture outside the ones you expected to change shows a different result, this is a **hard
   block**, not a warning — show the full list and require the patch to be revised. This is the
   literal mechanism that prevents "some rules silently changed causing destruction."
3. **Blast-radius diff**, color-coded (unchanged / intentionally changed / unintentionally
   changed).

Only if the regression diff touches exactly the words you expected does a "Proceed to merge"
button become available. There is no override.

### Step 8 — Merge

On explicit confirmation:

1. Apply the patch to the real loaded object.
2. Append one line per changed row to `constructs/CHANGELOG.md` (not the YAML file itself):
   `word | old sound | new sound | pattern | date | reason` — reason pulled from the free-text
   field in Step 4. This changelog is **append-only** — the Workbench never edits or removes past
   entries, even if a later patch reverts something.
3. Write the updated YAML via whichever I/O path was active (§3).

Nothing in steps 1–7 ever writes to disk. Only Step 8, only on explicit click.

---

## 5. Patch schema (v1 — `vowelTeamExceptions` only)

```yaml
patch:
  add:
    - { word: speak, pattern: ea, sound: long_e, note: "explicit anchor, was previously only covered by the default" }
  modify:
    - { word: <existing word>, pattern: <existing pattern>, sound: <new sound>, note: "<reason>" }
  remove:
    - { word: <word>, pattern: <pattern> }
```

**Hard constraint: this phase's patch format may only target `vowelTeamExceptions`.** If the
pasted patch contains any key other than `add`/`modify`/`remove` under a `vowelTeamExceptions`
root, or attempts to touch `patternCategories`, `defaultVowelSound`, `compoundParts`,
`rootWords`, or `suffixStripRules`, reject the entire patch immediately with a clear error naming
the offending key. Do not partially apply.

This restriction is deliberate, not a placeholder: `vowelTeamExceptions` is the highest-churn,
highest-risk section (it's the one with the actual historical bug), and it's the one shaped as a
flat row array specifically so LLM-proposed add/modify/remove operations are unambiguous. The
other sections change rarely and carry wider blast radius per edit — they deserve a slower,
non-copy-paste-LLM path. Extending this patch format to `compoundParts`/`rootWords` later (e.g.
to fix the `gingerbread`/`slimmer`-style gaps tracked in the backlog) is a natural, small
extension of this same mechanism — same six steps, same gating — but is explicitly not built now.

---

## 6. Non-functional requirements

| Concern | Requirement |
|---|---|
| Network | Zero network calls, ever. Copy-paste is the LLM boundary by design (§9). |
| Auto-merge | Never. Step 8 requires an explicit, single-purpose click every time. |
| Changelog | Append-only. Never rewritten retroactively, even to "clean up" a reverted change. |
| Approver model | Single user, no auth, no review/approval workflow beyond the one person clicking merge — per current scope. |
| Portability | Works via plain `file://`, no dev server, matching the existing prototype conventions in this repo. |
| Validator/core reuse | Zero duplicated logic from Phase 1. Any mismatch between Workbench behavior and the real compiler/engine is a bug in this requirement, not an acceptable drift. |

---

## 7. Dependency on Phase 1's `constructs-compile-core.mjs`

Phase 1's spec (§2) requires the YAML-object-to-compiled-JSON transform to be exported as a
**pure, I/O-free function**, `compileConstructs(parsedYamlObject) -> compiledObject`, from its
own dedicated file (`scripts/constructs-compile-core.mjs`), separate from the Node CLI wrapper
that reads/writes files — specifically so this phase can import and run it standalone, in-browser,
for sandbox-apply (§6). Import it directly; do not reimplement it. If this phase is somehow
started before that Phase 1 requirement is actually in place, treat that as a Phase 1 gap to fix
there, not a reason to duplicate the transform here — the alternative reintroduces the exact
multi-truths drift this entire project exists to eliminate.

---

## 8. Acceptance criteria

1. Opening `tools/constructs-workbench/index.html` via `file://` loads successfully with no
   console errors, on a browser with File System Access API support.
2. Searching `speak` (Step 2) correctly shows it currently resolving via the `ea` default, with
   no exception row matched.
3. Targeting `ea` (Step 3) produces a blast-radius table including, at minimum, every `ea` word
   already in the regression corpus.
4. Submitting a patch that adds a duplicate `(word, pattern)` row already present in the
   construct is rejected at Step 6 with the exact validator message from Phase 1's rule 5.4 —
   proving real reuse, not a reimplementation.
5. Submitting a patch that would change the computed sound for a word **not** named in the patch
   (simulate by proposing an edit to a pattern's related branch that has a side effect) is caught
   by the Step 7 regression diff and blocks merge.
6. Submitting a patch with a key targeting `compoundParts` is rejected immediately at Step 5,
   before any sandbox computation runs.
7. A successful merge (Step 8) writes exactly one new line to `constructs/CHANGELOG.md` and
   updates only the targeted row(s) in the real YAML file — diff the file before/after to confirm
   no unrelated formatting or ordering changes occurred.
8. No network request fires at any point in the entire workflow (verify via browser devtools
   network tab during a full run-through).

---

## 9. Explicitly out of scope

- **Direct LLM API integration.** Copy-paste only, per your stated preference. The context
  bundle and patch-schema instruction block in §4/§5 are designed to make copy-paste low-friction
  enough that this isn't a real cost — if you want API wiring later, the context-bundle and
  patch-parsing logic already built here is most of what that would need anyway.
- **Multi-section patching** (`compoundParts`, `rootWords`, `suffixStripRules`, categories) —
  noted as a natural future extension in §5, not built now.
- **Multi-user review/approval.** Single approver, as agreed.
- Anything Bodhana-facing. This tool is never linked from, or shipped with, the Bodhana SPA.
