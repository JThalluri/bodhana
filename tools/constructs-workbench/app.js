/**
 * Constructs Workbench — UI layer (app.js)
 *
 * Requires serving from repo root (not bare file://) due to Chrome's cross-directory
 * ES module restriction. Use: npx serve . --no-clipboard  (then open /tools/constructs-workbench/)
 * OR launch Chrome with --allow-file-access-from-files.
 */

import { compileConstructs }         from '../../scripts/constructs-compile-core.mjs';
import { validateAll, ValidationError } from '../../scripts/constructs-validate.mjs';
import { buildExceptionMap, lookupExceptionWithTier, soundForVowelTeam }
  from '../../src/phonics/core/vowelSounds.mjs';
import {
  validatePatchSchema,
  validatePatchSchemaForList,
  applyPatchToRaw,
  applyPatchToRawList,
  analyzeCompoundWord,
  analyzeRootWord,
  computeBlastRadius,
  computeCompoundBlastRadius,
  computeRootWordBlastRadius,
  runRegressionDiff,
  runSyllableRegressionDiff,
  buildChangelogEntries,
  buildChangelogEntriesForList,
} from './workbench-core.mjs';

const jsyaml = window.jsyaml;
const hasFSA = typeof window.showOpenFilePicker === 'function';

// ── State ─────────────────────────────────────────────────────────────────────

const S = {
  step: 1,
  ioMode: hasFSA ? 'fsa' : 'upload',

  // Step 1 — loaded files
  constructsHandle: null,
  fixturesHandle:   null,
  constructsText:   null,
  fixturesText:     null,
  rawObj:           null,
  fixturesObj:      null,
  compiledObj:      null,

  // Mode selector (set in Step 1)
  mode: 'vowelSound',  // 'vowelSound' | 'compoundPart' | 'rootWord'

  // Step 2 — targeting (vowelSound mode)
  query:          '',
  detectedTeams:  [],
  targetedPattern: null,

  // Step 2 — targeting (list modes)
  listQuery:          '',
  listAnalysis:       null,
  targetedCandidate:  null,

  // Step 3 — blast radius
  blastRadius: [],

  // Step 4 — context bundle
  mergeReason:   '',
  contextBundle: '',

  // Step 5 — patch
  patchText:  '',
  patchObj:   null,
  patchError: null,

  // Step 6/7 — sandbox results
  sandboxRaw:      null,
  sandboxCompiled: null,
  validatorError:  null,
  regressionDiff:  [],
  newBlastRadius:  [],
  expectedWords:   new Set(),
  unexpectedChanges: [],

  // Step 6/7 — syllable regression diff (list modes only)
  syllableRegressionDiff:     [],
  syllableUnexpectedChanges:  [],

  // Step 8 — merge
  changelogHandle: null,
  changelogText:   null,
  mergeComplete:   false,
  mergeError:      null,
};

// ── Sidebar ───────────────────────────────────────────────────────────────────

const STEPS = [
  { num: 1, label: 'Load Files' },
  { num: 2, label: 'Target' },
  { num: 3, label: 'Blast Radius' },
  { num: 4, label: 'Export Bundle' },
  { num: 5, label: 'Paste Patch' },
  { num: 6, label: 'Run Sandbox' },
  { num: 7, label: 'Review' },
  { num: 8, label: 'Merge' },
];

const STEP_LABELS_LIST = {
  2: 'Target a Word',
};

function stepLabel(num) {
  if (S.mode !== 'vowelSound' && STEP_LABELS_LIST[num]) return STEP_LABELS_LIST[num];
  return STEPS.find(s => s.num === num)?.label ?? '';
}

function renderSidebar() {
  const el = document.getElementById('sidebar');
  el.innerHTML = `
    <div class="wb-brand">Constructs<br>Workbench</div>
    <div class="io-pill ${S.ioMode === 'fsa' ? 'fsa' : 'upload'}">
      ${S.ioMode === 'fsa' ? '⚡ File System API' : '📎 Upload / Download'}
    </div>
    ${STEPS.map(s => {
      const isDone    = s.num < S.step;
      const isActive  = s.num === S.step;
      const isBlocked = s.num === 7 && S.unexpectedChanges.length > 0;
      const cls = isBlocked ? 'blocked' : isDone ? 'done' : isActive ? 'active' : '';
      return `<button class="wb-step ${cls}" data-step="${s.num}" ${s.num > S.step && !isDone ? 'disabled' : ''}>
        <span class="step-num">${isDone ? '✓' : s.num}</span>
        <span class="step-lbl">${stepLabel(s.num)}</span>
      </button>`;
    }).join('')}
  `;
  el.querySelectorAll('.wb-step.done').forEach(btn => {
    btn.addEventListener('click', () => goTo(parseInt(btn.dataset.step)));
  });
  el.querySelectorAll('.wb-step.active').forEach(btn => {
    btn.addEventListener('click', () => {});
  });
}

// ── Main render dispatcher ────────────────────────────────────────────────────

const RENDERERS = {
  1: renderStep1, 2: renderStep2, 3: renderStep3, 4: renderStep4,
  5: renderStep5, 6: renderStep6, 7: renderStep7, 8: renderStep8,
};
const WIRERS = {
  1: wireStep1, 2: wireStep2, 3: wireStep3, 4: wireStep4,
  5: wireStep5, 6: wireStep6, 7: wireStep7, 8: wireStep8,
};

function render() {
  renderSidebar();
  const main = document.getElementById('main');
  main.innerHTML = RENDERERS[S.step]();
  WIRERS[S.step]();
}

function goTo(n) { S.step = n; render(); }
function next()  { S.step = Math.min(8, S.step + 1); render(); }

// ── Shared templates ──────────────────────────────────────────────────────────

function card(title, body) {
  return `<div class="card"><div class="card-title">${title}</div>${body}</div>`;
}

function ok(msg)   { return `<p class="msg ok">${msg}</p>`; }
function err(msg)  { return `<p class="msg err">${msg}</p>`; }
function info(msg) { return `<p class="msg info">${msg}</p>`; }

function tierBadge(tier) {
  const cls = { direct: 'tier-direct', 'suffix-stripped': 'tier-suffix', 'compound-scan': 'tier-compound', default: 'tier-default' }[tier] || '';
  return `<span class="${cls}">${tier ?? '—'}</span>`;
}

// ── Step 1: Load Files ────────────────────────────────────────────────────────

function renderStep1() {
  const constructs = S.constructsText
    ? ok(`constructs loaded — ${(S.rawObj.vowelTeamExceptions||[]).length} exception rows, ${(S.rawObj.compoundParts||[]).length} compoundParts, ${(S.rawObj.rootWords||[]).length} rootWords`)
    : '';
  const fixtures = S.fixturesText
    ? ok(`fixtures loaded — ${(S.fixturesObj.vowelTeamSounds||[]).length} vowelTeamSounds, ${(S.fixturesObj.syllableSplit||[]).length} syllableSplit entries`)
    : '';
  const canProceed = S.compiledObj !== null;

  const modeSelector = canProceed ? `
    ${card('What do you want to fix?', `
      <div class="mode-selector">
        <label class="mode-opt">
          <input type="radio" name="mode" value="vowelSound" ${S.mode === 'vowelSound' ? 'checked' : ''}>
          <span><strong>Vowel Sound</strong> — fix a vowelTeamExceptions entry (existing flow)</span>
        </label>
        <label class="mode-opt">
          <input type="radio" name="mode" value="compoundPart" ${S.mode === 'compoundPart' ? 'checked' : ''}>
          <span><strong>Compound Part</strong> — add/remove an entry in compoundParts</span>
        </label>
        <label class="mode-opt">
          <input type="radio" name="mode" value="rootWord" ${S.mode === 'rootWord' ? 'checked' : ''}>
          <span><strong>Root Word</strong> — add/remove an entry in rootWords</span>
        </label>
      </div>
    `)}
  ` : '';

  return `
    <h2>Step 1 — Load Files</h2>
    ${card('phonics-constructs.yaml', `
      <p class="hint">Open the constructs YAML from <code>constructs/phonics-constructs.yaml</code></p>
      ${constructs}
      ${hasFSA
        ? `<button class="btn-primary" id="btnLoadConstructs">Open constructs YAML…</button>`
        : `<label>Upload constructs YAML: <input type="file" id="fileConstructs" accept=".yaml,.yml"></label>`
      }
    `)}
    ${card('phonics-regression-fixtures.v2.yaml', `
      <p class="hint">Open from <code>constructs/fixtures/phonics-regression-fixtures.v2.yaml</code></p>
      ${fixtures}
      ${hasFSA
        ? `<button class="btn-primary" id="btnLoadFixtures">Open fixtures YAML…</button>`
        : `<label>Upload fixtures YAML: <input type="file" id="fileFixtures" accept=".yaml,.yml"></label>`
      }
    `)}
    ${modeSelector}
    ${canProceed
      ? `<button class="btn-primary lg" id="btnStep1Next">Continue to Step 2 →</button>`
      : `<button class="btn-primary lg" disabled>Continue to Step 2 →</button>`
    }
  `;
}

function wireStep1() {
  if (hasFSA) {
    document.getElementById('btnLoadConstructs')?.addEventListener('click', loadConstructsFSA);
    document.getElementById('btnLoadFixtures')?.addEventListener('click', loadFixturesFSA);
  } else {
    document.getElementById('fileConstructs')?.addEventListener('change', e => loadFileUpload(e, 'constructs'));
    document.getElementById('fileFixtures')?.addEventListener('change', e => loadFileUpload(e, 'fixtures'));
  }
  document.querySelectorAll('input[name="mode"]').forEach(radio => {
    radio.addEventListener('change', e => { S.mode = e.target.value; });
  });
  document.getElementById('btnStep1Next')?.addEventListener('click', () => next());
}

async function loadConstructsFSA() {
  try {
    const [handle] = await window.showOpenFilePicker({
      types: [{ description: 'YAML', accept: { 'text/yaml': ['.yaml', '.yml'] } }],
    });
    S.constructsHandle = handle;
    S.constructsText = await (await handle.getFile()).text();
    S.rawObj = jsyaml.load(S.constructsText);
    S.compiledObj = compileConstructs(S.rawObj);
    render();
  } catch (e) {
    if (e.name !== 'AbortError') alert(`Error loading constructs: ${e.message}`);
  }
}

async function loadFixturesFSA() {
  try {
    const [handle] = await window.showOpenFilePicker({
      types: [{ description: 'YAML', accept: { 'text/yaml': ['.yaml', '.yml'] } }],
    });
    S.fixturesHandle = handle;
    S.fixturesText = await (await handle.getFile()).text();
    S.fixturesObj = jsyaml.load(S.fixturesText);
    render();
  } catch (e) {
    if (e.name !== 'AbortError') alert(`Error loading fixtures: ${e.message}`);
  }
}

function loadFileUpload(event, which) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    const text = e.target.result;
    try {
      if (which === 'constructs') {
        S.constructsText = text;
        S.rawObj = jsyaml.load(text);
        S.compiledObj = compileConstructs(S.rawObj);
      } else {
        S.fixturesText = text;
        S.fixturesObj = jsyaml.load(text);
      }
      render();
    } catch (err) {
      alert(`Parse error: ${err.message}`);
    }
  };
  reader.readAsText(file);
}

// ── Step 2: Target ────────────────────────────────────────────────────────────

function renderStep2() {
  if (S.mode === 'compoundPart') return renderStep2Compound();
  if (S.mode === 'rootWord')     return renderStep2RootWord();
  return renderStep2VowelSound();
}

function wireStep2() {
  if (S.mode === 'compoundPart') { wireStep2Compound(); return; }
  if (S.mode === 'rootWord')     { wireStep2RootWord(); return; }
  wireStep2VowelSound();
}

// Step 2 — Vowel Sound mode (unchanged) ────────────────────────────────────────

function renderStep2VowelSound() {
  const defaults    = S.compiledObj?.defaultVowelSound ?? {};
  const exMap       = buildExceptionMap(S.compiledObj?.vowelTeamExceptions ?? []);
  const q           = S.query.trim().toLowerCase();
  const isPattern   = !!defaults[q];
  let resultHtml    = '';

  if (q.length > 0) {
    if (isPattern) {
      const rows = (S.compiledObj.vowelTeamExceptions || []).filter(r => r.pattern === q);
      resultHtml = `
        <div class="result-box">
          <div class="result-row"><strong>Pattern:</strong> <code>${q}</code></div>
          <div class="result-row"><strong>Default sound:</strong> <code>${defaults[q] ?? '(none)'}</code></div>
          <div class="result-row"><strong>Exception rows (${rows.length}):</strong></div>
          ${rows.length > 0
            ? `<table><thead><tr><th>word</th><th>sound</th><th>note</th></tr></thead><tbody>
               ${rows.map(r => `<tr><td>${r.word}</td><td><code>${r.sound}</code></td><td>${r.note ?? ''}</td></tr>`).join('')}
               </tbody></table>`
            : `<p class="hint">No exception rows.</p>`
          }
        </div>
        <button class="btn-primary" id="btnTarget">Target pattern "${q}" →</button>
      `;
    } else if (q.length >= 2) {
      const patternsSorted = Object.keys(defaults).sort((a, b) => b.length - a.length);
      const found = patternsSorted.filter(p => q.includes(p));
      if (found.length === 0) {
        resultHtml = `<p class="hint">No vowel team patterns detected in "${q}".</p>`;
      } else {
        const rows = found.map(p => {
          const res = lookupExceptionWithTier(q, p, exMap);
          const sound = res?.sound ?? defaults[p] ?? null;
          const tier  = res?.tier  ?? 'default';
          return { pattern: p, sound, tier };
        });
        resultHtml = `
          <div class="result-box">
            <div class="result-row"><strong>Word:</strong> <code>${q}</code></div>
            <table><thead><tr><th>pattern</th><th>current sound</th><th>tier</th></tr></thead><tbody>
              ${rows.map(r => `<tr>
                <td><code>${r.pattern}</code></td>
                <td><code>${r.sound ?? '—'}</code></td>
                <td>${tierBadge(r.tier)}</td>
              </tr>`).join('')}
            </tbody></table>
          </div>
          ${rows.map(r => `<button class="btn-primary" data-pat="${r.pattern}" id="btnTarget_${r.pattern}">
            Target pattern "${r.pattern}" for "${q}" →
          </button>`).join('')}
        `;
      }
    }
  }

  return `
    <h2>Step 2 — Target a Word or Pattern</h2>
    ${card('Search', `
      <label for="qInput">Enter a word (e.g. <code>speak</code>) or a vowel-team pattern (e.g. <code>ea</code>):</label>
      <input type="text" id="qInput" placeholder="speak  or  ea" value="${S.query}" autocomplete="off" spellcheck="false">
    `)}
    ${resultHtml ? card('Result', resultHtml) : ''}
  `;
}

function wireStep2VowelSound() {
  const inp = document.getElementById('qInput');
  let debounceTimer;
  inp?.addEventListener('input', e => {
    S.query = e.target.value;
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => render(), 500);
  });

  document.querySelectorAll('[id^="btnTarget"]').forEach(btn => {
    const pat = btn.dataset.pat || S.query.trim().toLowerCase();
    btn.addEventListener('click', () => {
      S.targetedPattern = pat;
      S.blastRadius = computeBlastRadius(pat, S.compiledObj, S.fixturesObj);
      next();
    });
  });
}

// Step 2 — Compound Part mode ──────────────────────────────────────────────────

function renderStep2Compound() {
  const q = S.listQuery.trim().toLowerCase().replace(/[^a-z]/g, '');
  let analysisHtml = '';

  if (q.length >= 4) {
    const analysis = analyzeCompoundWord(q, S.compiledObj);

    const currentSplitHtml = analysis.currentSplit && analysis.currentSplit.length
      ? `<div class="msg info" style="margin-top:8px">Current split: <strong>${analysis.currentSplit.join(' | ')}</strong>${analysis.alreadySplits ? ' (compound path)' : ' (fallback path — not via compoundParts)'}</div>`
      : '';

    if (analysis.alreadySplits) {
      analysisHtml = card('Result', `
        ${ok(`✓ "${q}" already compound-splits as [${analysis.split.join(' | ')}] — both halves are in compoundParts.`)}
        ${currentSplitHtml}
        <p class="hint">Nothing to target. If the split is wrong, check vowelTeamExceptions instead.</p>
      `);
    } else {
      const anyGenuine = (analysis.candidates || []).some(c => c.wouldChange);

      const candidateRows = (analysis.candidates || []).map(c => {
        const leftStatus  = c.leftInSet  ? '<span class="tier-direct">✓ in list</span>' : '<span class="tier-default">✗ missing</span>';
        const rightStatus = c.rightInSet ? '<span class="tier-direct">✓ in list</span>' : '<span class="tier-default">✗ missing</span>';

        let action;
        if (!c.wouldChange) {
          action = `<span class="tier-default" style="font-size:11px">no-op — adding both gives same split (${(c.newSplit || analysis.currentSplit).join('·')})</span>`;
        } else {
          const canTargetLeft  = !c.leftInSet && c.rightInSet && c.left.length >= 3;
          const canTargetRight = !c.rightInSet && c.leftInSet;
          const canTargetBoth  = !c.leftInSet && !c.rightInSet;
          action = [
            canTargetLeft  ? `<button class="btn-secondary sm" data-candidate="${c.left}"  id="btnCand_L_${c.left}">Target "${c.left}"</button>`  : '',
            canTargetRight ? `<button class="btn-secondary sm" data-candidate="${c.right}" id="btnCand_R_${c.right}">Target "${c.right}"</button>` : '',
            canTargetBoth  ? `<button class="btn-secondary sm" data-candidate="${c.left}"  id="btnCand_L_${c.left}">Target "${c.left}"</button>
                              <button class="btn-secondary sm" data-candidate="${c.right}" id="btnCand_R_${c.right}">Target "${c.right}"</button>` : '',
          ].filter(Boolean).join(' ');
        }

        return `<tr>
          <td><code>${c.left}</code></td><td>${leftStatus}</td>
          <td><code>${c.right}</code></td><td>${rightStatus}</td>
          <td>${action}</td>
        </tr>`;
      }).join('');

      const statusHtml = anyGenuine
        ? err(`"${q}" does not compound-split — candidates below would change the split.`)
        : `<div class="msg info">"${q}" does not compound-split, but the current fallback split is already correct — none of the candidates below would change the result.</div>`;

      analysisHtml = card('Result', `
        ${statusHtml}
        ${currentSplitHtml}
        <p class="hint">Candidate split points (algorithm bounds: left ≥ 3 chars, right ≥ 2 chars):</p>
        ${candidateRows.length
          ? `<table>
              <thead><tr><th>left half</th><th>in list?</th><th>right half</th><th>in list?</th><th>action</th></tr></thead>
              <tbody>${candidateRows}</tbody>
             </table>`
          : `<p class="hint">Word is too short (minimum 5 characters for compound split).</p>`
        }
      `);
    }
  }

  return `
    <h2>Step 2 — Target a Word (Compound Part)</h2>
    ${card('Enter the word to analyse', `
      <label for="listQInput">Enter a word to check for compound split (e.g. <code>gingerbread</code>):</label>
      <input type="text" id="listQInput" placeholder="gingerbread" value="${S.listQuery}" autocomplete="off" spellcheck="false">
    `)}
    ${analysisHtml}
  `;
}

function wireStep2Compound() {
  const inp = document.getElementById('listQInput');
  let debounceTimer;
  inp?.addEventListener('input', e => {
    S.listQuery = e.target.value;
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => render(), 400);
  });

  document.querySelectorAll('[id^="btnCand_"]').forEach(btn => {
    btn.addEventListener('click', () => {
      S.targetedCandidate = btn.dataset.candidate;
      S.blastRadius = computeCompoundBlastRadius(S.targetedCandidate, S.compiledObj, S.fixturesObj);
      next();
    });
  });
}

// Step 2 — Root Word mode ──────────────────────────────────────────────────────

function renderStep2RootWord() {
  const q = S.listQuery.trim().toLowerCase().replace(/[^a-z]/g, '');
  let analysisHtml = '';

  if (q.length >= 3) {
    const { actualResult, currentSplit, blockedCandidates } = analyzeRootWord(q, S.compiledObj);

    const currentSplitHtml = currentSplit && currentSplit.length
      ? `<div class="msg info" style="margin-top:8px">Current split: <strong>${currentSplit.join(' | ')}</strong></div>`
      : '';

    const genuineBlocked = blockedCandidates.filter(bc => bc.wouldChange);
    if (actualResult && genuineBlocked.length === 0) {
      const undoubledNote = actualResult.suffix !== actualResult.suffix.slice(-actualResult.suffix.length + 1)
        ? ` (undoubled: "${actualResult.stem}${actualResult.suffix}")`
        : '';
      analysisHtml = card('Result', `
        ${ok(`✓ "${q}" strips correctly: stem = "${actualResult.stem}", suffix = "${actualResult.suffix}"${undoubledNote}`)}
        ${currentSplitHtml}
        <p class="hint">The suffix rule matched and the stem was accepted. If the split looks wrong, try a different word.</p>
      `);
    } else if (blockedCandidates.length > 0) {
      const anyGenuine = blockedCandidates.some(bc => bc.wouldChange);

      const rows = blockedCandidates.map(bc => {
        const action = bc.wouldChange
          ? `<button class="btn-secondary sm" data-candidate="${bc.candidate}" id="btnRootCand_${bc.candidate}">Target "${bc.candidate}"</button>`
          : `<span class="tier-default" style="font-size:11px">${bc.candidate} missing but fallback already gives ${currentSplit.join('·')} — no-op</span>`;
        return `<tr>
          <td><code>${bc.suffix}</code></td>
          <td><code>${bc.undoubledSuffix}</code></td>
          <td><code>${bc.candidate}</code></td>
          <td><span class="tier-default">✗ missing from rootWords</span></td>
          <td>${action}</td>
        </tr>`;
      }).join('');

      const statusHtml = anyGenuine
        ? err(`Undoubling blocked for "${q}" — the doubled-consonant root is missing from rootWords.`)
        : `<div class="msg info">"${q}" — undoubling candidate missing, but the current fallback split is already correct. Adding it would have no effect.</div>`;

      analysisHtml = card('Result', `
        ${statusHtml}
        ${currentSplitHtml}
        <table>
          <thead><tr><th>suffix</th><th>doubled suffix</th><th>candidate root</th><th>in list?</th><th>action</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      `);
    } else {
      analysisHtml = card('Result', `
        <p class="hint">No suffix rule matched "${q}", and no blocked undoubling candidates were found. Try checking whether the word uses a suffix from the suffixStripRules list.</p>
      `);
    }
  }

  return `
    <h2>Step 2 — Target a Word (Root Word)</h2>
    ${card('Enter the word to analyse', `
      <label for="listQInput">Enter a word suspected of mis-splitting (e.g. <code>slimmer</code>):</label>
      <input type="text" id="listQInput" placeholder="slimmer" value="${S.listQuery}" autocomplete="off" spellcheck="false">
    `)}
    ${analysisHtml}
  `;
}

function wireStep2RootWord() {
  const inp = document.getElementById('listQInput');
  let debounceTimer;
  inp?.addEventListener('input', e => {
    S.listQuery = e.target.value;
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => render(), 400);
  });

  document.querySelectorAll('[id^="btnRootCand_"]').forEach(btn => {
    btn.addEventListener('click', () => {
      S.targetedCandidate = btn.dataset.candidate;
      S.blastRadius = computeRootWordBlastRadius(S.targetedCandidate, S.compiledObj, S.fixturesObj);
      next();
    });
  });
}

// ── Step 3: Blast Radius ──────────────────────────────────────────────────────

function renderStep3() {
  if (S.mode !== 'vowelSound') return renderStep3List();
  return renderStep3VowelSound();
}

function wireStep3() {
  if (S.mode !== 'vowelSound') { wireStep3List(); return; }
  wireStep3VowelSound();
}

function renderStep3VowelSound() {
  const p = S.targetedPattern;
  const rows = S.blastRadius;

  return `
    <h2>Step 3 — Blast Radius for <code>${p}</code></h2>
    ${card(`${rows.length} words found`, `
      <p class="hint">Every word in the fixture corpus + exception table containing <code>${p}</code> as a substring, with its current resolved sound and lookup tier.</p>
      <table>
        <thead><tr><th>word</th><th>current sound</th><th>tier</th></tr></thead>
        <tbody>
          ${rows.map(r => `<tr>
            <td><code>${r.word}</code></td>
            <td><code>${r.sound ?? '—'}</code></td>
            <td>${tierBadge(r.tier)}</td>
          </tr>`).join('')}
        </tbody>
      </table>
    `)}
    <button class="btn-primary lg" id="btnStep3Next">Continue to Step 4 →</button>
  `;
}

function wireStep3VowelSound() {
  document.getElementById('btnStep3Next')?.addEventListener('click', () => {
    S.contextBundle = buildContextBundle();
    next();
  });
}

function renderStep3List() {
  const candidate = S.targetedCandidate;
  const listName  = S.mode === 'compoundPart' ? 'compoundParts' : 'rootWords';
  const rows = S.blastRadius;
  const changedCount = rows.filter(r => r.changes).length;

  return `
    <h2>Step 3 — Blast Radius for <code>${candidate}</code> (${listName})</h2>
    ${card(`${rows.length} word(s) in blast radius — ${changedCount} would change split`, `
      <p class="hint">Words where the real algorithm would consider <code>${candidate}</code> as a valid half/root. Current split shown alongside what it would be if <code>${candidate}</code> were added.</p>
      ${rows.length > 0
        ? `<table>
            <thead><tr><th>word</th><th>current split</th><th>split with "${candidate}" added</th><th>changes?</th></tr></thead>
            <tbody>
              ${rows.map(r => `<tr class="${r.changes ? 'diff-expected' : ''}">
                <td><code>${r.word}</code></td>
                <td>${r.currentSplit.join(' | ')}</td>
                <td>${r.newSplit.join(' | ')}</td>
                <td>${r.changes ? '<span class="tier-direct">✓ yes</span>' : '—'}</td>
              </tr>`).join('')}
            </tbody>
           </table>`
        : `<p class="hint">No words in the full fixture corpus contain "${candidate}" at a valid compound split position.</p>`
      }
    `)}
    <button class="btn-primary lg" id="btnStep3Next">Continue to Step 4 →</button>
  `;
}

function wireStep3List() {
  document.getElementById('btnStep3Next')?.addEventListener('click', () => {
    S.contextBundle = buildContextBundleList();
    next();
  });
}

// ── Step 4: Export Context Bundle ─────────────────────────────────────────────

function buildContextBundle() {
  const p        = S.targetedPattern;
  const defaults = S.compiledObj.defaultVowelSound ?? {};
  const exRows   = (S.compiledObj.vowelTeamExceptions || []).filter(r => r.pattern === p);
  const labels   = S.compiledObj.soundLabels ?? {};
  const validSounds = Object.keys(labels).join(', ');

  const exTable = exRows.length > 0
    ? exRows.map(r => `  ${r.word} | ${r.pattern} | ${r.sound}${r.note ? ` | ${r.note}` : ''}`).join('\n')
    : '  (none)';

  const blastTable = S.blastRadius
    .map(r => `  ${r.word.padEnd(20)} | ${(r.sound ?? '—').padEnd(12)} | ${r.tier}`)
    .join('\n');

  const reason = S.mergeReason.trim() || '[FILL IN: describe what you want changed and why]';

  return `=== CONSTRUCTS WORKBENCH — CONTEXT BUNDLE ===
Pattern targeted: ${p}
Default sound:    ${defaults[p] ?? '(not in defaultVowelSound)'}

--- Existing vowelTeamExceptions rows for "${p}" ---
${exTable}

--- Blast radius (words containing "${p}") ---
  word                 | current sound | tier
${blastTable}

--- Your correction request ---
${reason}

=== PATCH SCHEMA INSTRUCTION ===
Reply with ONLY a YAML block. No prose, no markdown fences, no explanation.
ONLY "add", "modify", "remove" under "patch:" are valid in Phase 1.
Do NOT touch: patternCategories, defaultVowelSound, compoundParts, rootWords, suffixStripRules.

patch:
  add:
    - { word: <word>, pattern: ${p}, sound: <sound>, note: "<reason>" }
  modify:
    - { word: <existing-word>, pattern: ${p}, sound: <new-sound>, note: "<reason>" }
  remove:
    - { word: <word>, pattern: ${p} }

Valid sound keys: ${validSounds}
`;
}

function buildContextBundleList() {
  const candidate = S.targetedCandidate;
  const listName  = S.mode === 'compoundPart' ? 'compoundParts' : 'rootWords';

  const blastTable = S.blastRadius
    .map(r => `  ${r.word.padEnd(20)} | ${r.currentSplit.join('|').padEnd(20)} | ${r.newSplit.join('|')} | ${r.changes ? 'CHANGES' : 'no change'}`)
    .join('\n') || '  (no affected words found)';

  const reason = S.mergeReason.trim() || '[FILL IN: describe why this entry should be added/removed]';

  return `=== CONSTRUCTS WORKBENCH — CONTEXT BUNDLE (${listName} mode) ===
Candidate to target: ${candidate}
List: ${listName}

--- Blast radius (words affected by adding "${candidate}") ---
  word                 | current split        | split with candidate | effect
${blastTable}

--- Your reasoning ---
${reason}

=== PATCH SCHEMA INSTRUCTION ===
Reply with ONLY a YAML block. No prose, no markdown fences, no explanation.
Only "add" and "remove" are valid ops. Items are plain strings (word entries), NOT objects.
Do NOT use word/pattern/sound rows — those are vowelTeamExceptions format, not valid here.

patch:
  add:
    - ${candidate}
  remove:
    - <entry-to-remove>
`;
}

function renderStep4() {
  return `
    <h2>Step 4 — Export Context Bundle</h2>
    ${card('Correction request (optional free-text)', `
      <label for="reasonInput">Describe what you want the LLM to fix. This gets included in the bundle and in CHANGELOG.</label>
      <textarea id="reasonInput" rows="3" placeholder="${S.mode === 'vowelSound'
        ? 'e.g. speak should resolve to long_e — it currently falls through to the ea default which is correct but has no explicit anchor'
        : 'e.g. ginger is missing from compoundParts — enables gingerbread to compound-split correctly'
      }">${S.mergeReason}</textarea>
    `)}
    ${card('Context bundle', `
      <p class="hint">Copy this entire block and paste it to the LLM.</p>
      <textarea id="bundleArea" rows="28" readonly>${escHtml(S.contextBundle)}</textarea>
      <button class="btn-secondary" id="btnCopyBundle">📋 Copy to clipboard</button>
      <span id="copiedMsg" style="display:none;color:#16a34a;font-size:12px;margin-left:8px;">Copied!</span>
    `)}
    <button class="btn-primary lg" id="btnStep4Next">Continue to Step 5 →</button>
  `;
}

function wireStep4() {
  document.getElementById('reasonInput')?.addEventListener('input', e => {
    S.mergeReason = e.target.value;
    S.contextBundle = S.mode === 'vowelSound' ? buildContextBundle() : buildContextBundleList();
    const ta = document.getElementById('bundleArea');
    if (ta) ta.value = S.contextBundle;
  });

  document.getElementById('btnCopyBundle')?.addEventListener('click', () => {
    navigator.clipboard.writeText(S.contextBundle).then(() => {
      const msg = document.getElementById('copiedMsg');
      if (msg) { msg.style.display = 'inline'; setTimeout(() => msg.style.display = 'none', 1500); }
    }).catch(() => {});
  });

  document.getElementById('btnStep4Next')?.addEventListener('click', () => next());
}

// ── Step 5: Paste Patch ───────────────────────────────────────────────────────

function renderStep5() {
  let statusHtml = '';
  if (S.patchText.trim()) {
    if (S.patchError) {
      statusHtml = err(`Validation error: ${escHtml(S.patchError)}`);
    } else if (S.patchObj) {
      statusHtml = ok(`Schema valid — ${descPatch(S.patchObj)}`);
    }
  }

  const canProceed = S.patchObj !== null && !S.patchError;
  const placeholder = S.mode === 'vowelSound'
    ? 'patch:\n  add:\n    - { word: speak, pattern: ea, sound: long_e, note: &quot;anchor&quot; }'
    : 'patch:\n  add:\n    - ginger';

  return `
    <h2>Step 5 — Paste Patch</h2>
    ${card('Paste the LLM\'s YAML response', `
      <p class="hint">Paste the entire YAML block. The schema is validated live before you can proceed.</p>
      <textarea id="patchInput" rows="14" placeholder="${placeholder}" spellcheck="false">${escHtml(S.patchText)}</textarea>
      ${statusHtml}
    `)}
    <button class="btn-primary lg" id="btnRunSandbox" ${canProceed ? '' : 'disabled'}>Run Sandbox →</button>
  `;
}

function wireStep5() {
  document.getElementById('patchInput')?.addEventListener('input', e => {
    S.patchText  = e.target.value;
    S.patchObj   = null;
    S.patchError = null;
    const text = S.patchText.trim();
    if (text) {
      try {
        const parsed = jsyaml.load(text);
        S.patchObj = S.mode === 'vowelSound'
          ? validatePatchSchema(parsed)
          : validatePatchSchemaForList(parsed, S.mode);
      } catch (ex) {
        S.patchError = ex.message;
      }
    }
    const existing = document.querySelector('.msg');
    const newStatus = S.patchError
      ? `<p class="msg err">Validation error: ${escHtml(S.patchError)}</p>`
      : S.patchObj
        ? `<p class="msg ok">Schema valid — ${descPatch(S.patchObj)}</p>`
        : '';
    if (existing) existing.outerHTML = newStatus || '';
    else if (newStatus) {
      const ta = document.getElementById('patchInput');
      if (ta) ta.insertAdjacentHTML('afterend', newStatus);
    }
    const btn = document.getElementById('btnRunSandbox');
    if (btn) btn.disabled = !(S.patchObj !== null && !S.patchError);
  });

  document.getElementById('btnRunSandbox')?.addEventListener('click', runSandbox);
}

function descPatch(p) {
  if (S.mode !== 'vowelSound') {
    return [
      p.add    ? `${p.add.length} add`    : '',
      p.remove ? `${p.remove.length} remove` : '',
    ].filter(Boolean).join(', ') || 'empty patch';
  }
  return [
    p.add    ? `${p.add.length} add`    : '',
    p.modify ? `${p.modify.length} modify` : '',
    p.remove ? `${p.remove.length} remove` : '',
  ].filter(Boolean).join(', ') || 'empty patch';
}

// ── Step 6: Run Sandbox ───────────────────────────────────────────────────────

function renderStep6() {
  const fixtureCount = S.mode === 'vowelSound'
    ? `${(S.fixturesObj?.vowelTeamSounds||[]).length} vowelTeamSounds fixtures`
    : `${(S.fixturesObj?.syllableSplit||[]).length} syllableSplit fixtures`;
  return `
    <h2>Step 6 — Sandbox</h2>
    ${card('Running…', `<p class="hint">Applying patch, compiling, and running all ${fixtureCount}…</p>`)}
  `;
}

function wireStep6() {}

function runSandbox() {
  S.step = 6;
  render();

  try {
    if (S.mode === 'vowelSound') {
      S.sandboxRaw      = applyPatchToRaw(S.rawObj, S.patchObj);
    } else {
      S.sandboxRaw      = applyPatchToRawList(S.rawObj, S.patchObj, S.mode);
    }
    S.sandboxCompiled = compileConstructs(S.sandboxRaw);

    S.validatorError = null;
    try {
      validateAll(S.sandboxCompiled, S.fixturesObj);
    } catch (e) {
      S.validatorError = e;
    }

    if (S.mode === 'vowelSound') {
      S.regressionDiff  = runRegressionDiff(S.compiledObj, S.sandboxCompiled, S.fixturesObj);
      S.newBlastRadius  = computeBlastRadius(S.targetedPattern, S.sandboxCompiled, S.fixturesObj);

      S.expectedWords   = new Set([
        ...(S.patchObj.add    || []).map(r => r.word),
        ...(S.patchObj.modify || []).map(r => r.word),
        ...(S.patchObj.remove || []).map(r => r.word),
      ]);
      S.unexpectedChanges = S.regressionDiff.filter(d => !S.expectedWords.has(d.word) && !d.nowPassing);
    } else {
      S.syllableRegressionDiff    = runSyllableRegressionDiff(S.compiledObj, S.sandboxCompiled, S.fixturesObj);
      S.syllableUnexpectedChanges = S.syllableRegressionDiff.filter(d => !d.nowPassing);
      S.unexpectedChanges         = S.syllableUnexpectedChanges;

      const blastFn = S.mode === 'compoundPart' ? computeCompoundBlastRadius : computeRootWordBlastRadius;
      S.newBlastRadius = blastFn(S.targetedCandidate, S.sandboxCompiled, S.fixturesObj);
    }

    goTo(7);
  } catch (e) {
    S.validatorError = e;
    goTo(7);
  }
}

// ── Step 7: Review ────────────────────────────────────────────────────────────

function renderStep7() {
  const isClean = !S.validatorError && S.unexpectedChanges.length === 0;

  // Validator block
  const validatorBlock = S.validatorError
    ? `<div class="hard-gate">
        <div class="hard-gate-title">⛔ Validator failed — merge blocked</div>
        <p><strong>Rule:</strong> ${S.validatorError.rule ?? 'apply-error'}</p>
        <ul>${(S.validatorError.violations || [S.validatorError.message]).map(v => `<li>${escHtml(v)}</li>`).join('')}</ul>
      </div>`
    : ok('✓ Validator passed — all 5 Phase 1 rules OK');

  // Regression diff block (vowelSound) / Syllable diff block (list modes)
  let diffBlock;
  if (S.mode === 'vowelSound') {
    diffBlock = renderVowelSoundDiffBlock();
  } else {
    diffBlock = renderSyllableDiffBlock();
  }

  // Blast radius diff
  const brDiffHtml = renderBlastRadiusDiff();

  return `
    <h2>Step 7 — Review</h2>
    ${card('1. Validator', validatorBlock)}
    ${card('2. Regression Diff', diffBlock)}
    ${card('3. Blast-Radius Diff', brDiffHtml)}
    ${isClean
      ? `<button class="btn-primary lg" id="btnStep7Next">Proceed to Merge →</button>`
      : `<p class="msg err">Merge is blocked. Fix the patch (Step 5) and re-run.</p>
         <button class="btn-secondary" id="btnBackToPatch">← Back to Step 5</button>`
    }
  `;
}

function renderVowelSoundDiffBlock() {
  if (S.regressionDiff.length === 0) {
    return ok('✓ Regression diff — no fixtures changed');
  }
  const nowPassingDiffs = S.regressionDiff.filter(d => d.nowPassing);
  const regularDiffs    = S.regressionDiff.filter(d => !d.nowPassing);
  const rows = S.regressionDiff.map(d => {
    const isExpected  = S.expectedWords.has(d.word);
    const rowClass    = d.nowPassing ? 'now-passing' : isExpected ? '' : 'unexpected';
    const statusLabel = d.nowPassing
      ? '✓ known-failure now passing'
      : isExpected ? '✓ expected' : '⚠ unexpected';
    return `<tr class="${rowClass}">
      <td><code>${d.word}</code></td>
      <td><code>${d.pattern}</code></td>
      <td class="diff-old">${d.oldSound}</td>
      <td class="diff-new">${d.newSound}</td>
      <td>${statusLabel}</td>
    </tr>`;
  }).join('');
  return `
    ${nowPassingDiffs.length > 0
      ? `<div class="msg ok">✓ ${nowPassingDiffs.length} known-failure(s) now passing — check whether the backlog item can be closed</div>`
      : ''
    }
    ${S.unexpectedChanges.length > 0
      ? `<div class="hard-gate">
          <div class="hard-gate-title">⛔ ${S.unexpectedChanges.length} unexpected regression change(s) — merge blocked</div>
          <p>Revise the patch so only the intended words change.</p>
         </div>`
      : ok(`✓ Regression diff — all ${regularDiffs.length} change(s) are in the patch`)
    }
    <table>
      <thead><tr><th>word</th><th>pattern</th><th>old sound</th><th>new sound</th><th>status</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function renderSyllableDiffBlock() {
  if (S.syllableRegressionDiff.length === 0) {
    return ok('✓ Syllable regression diff — no syllableSplit fixtures changed');
  }
  const nowPassingDiffs = S.syllableRegressionDiff.filter(d => d.nowPassing);
  const rows = S.syllableRegressionDiff.map(d => {
    const rowClass    = d.nowPassing ? 'now-passing' : 'unexpected';
    const statusLabel = d.nowPassing ? '✓ known-failure now passing' : '⚠ unexpected';
    return `<tr class="${rowClass}">
      <td><code>${d.word}</code></td>
      <td>${(d.target || []).join(' | ')}</td>
      <td class="diff-old">${d.oldSplit.join(' | ')}</td>
      <td class="diff-new">${d.newSplit.join(' | ')}</td>
      <td>${statusLabel}</td>
    </tr>`;
  }).join('');
  return `
    ${nowPassingDiffs.length > 0
      ? `<div class="msg ok">✓ ${nowPassingDiffs.length} known-failure(s) now passing — check whether the backlog item can be closed</div>`
      : ''
    }
    ${S.syllableUnexpectedChanges.length > 0
      ? `<div class="hard-gate">
          <div class="hard-gate-title">⛔ ${S.syllableUnexpectedChanges.length} unexpected syllable regression change(s) — merge blocked</div>
          <p>Revise the patch so no currently-passing fixtures regress.</p>
         </div>`
      : ok(`✓ Syllable regression diff — ${nowPassingDiffs.length > 0 ? `${nowPassingDiffs.length} known-failure(s) now passing, ` : ''}no unexpected changes`)
    }
    <table>
      <thead><tr><th>word</th><th>target split</th><th>old split</th><th>new split</th><th>status</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function renderBlastRadiusDiff() {
  if (S.mode === 'vowelSound') {
    const brOld = new Map(S.blastRadius.map(r => [r.word, r.sound]));
    const brNew = new Map(S.newBlastRadius.map(r => [r.word, r.sound]));
    const allBrWords = new Set([...brOld.keys(), ...brNew.keys()]);
    const brRows = [...allBrWords].sort().map(w => {
      const oSound = brOld.get(w) ?? '—';
      const nSound = brNew.get(w) ?? '—';
      const changed = oSound !== nSound;
      const isExpected = S.expectedWords.has(w);
      const rowClass = !changed ? '' : isExpected ? 'diff-expected' : 'unexpected';
      return `<tr class="${rowClass}">
        <td><code>${w}</code></td>
        <td class="${changed && !isExpected ? 'diff-old' : ''}">${oSound}</td>
        <td class="${changed ? 'diff-new' : ''}">${nSound}</td>
        <td>${changed ? (isExpected ? '✓ intended' : '⚠ unintended') : '—'}</td>
      </tr>`;
    }).join('');
    return `
      <table>
        <thead><tr><th>word</th><th>old sound</th><th>new sound</th><th>change?</th></tr></thead>
        <tbody>${brRows}</tbody>
      </table>
    `;
  } else {
    // List mode blast radius diff: compare currentSplit vs newSplit from the new blast radius
    const brOldMap = new Map(S.blastRadius.map(r => [r.word, r.currentSplit]));
    const brNewMap = new Map(S.newBlastRadius.map(r => [r.word, r.newSplit]));
    const allWords = new Set([...brOldMap.keys(), ...brNewMap.keys()]);
    const brRows = [...allWords].sort().map(w => {
      const oldSplit = brOldMap.get(w) || [];
      const newSplit = brNewMap.get(w) || [];
      const changed  = JSON.stringify(oldSplit) !== JSON.stringify(newSplit);
      const rowClass = changed ? 'diff-expected' : '';
      return `<tr class="${rowClass}">
        <td><code>${w}</code></td>
        <td>${oldSplit.join(' | ')}</td>
        <td class="${changed ? 'diff-new' : ''}">${newSplit.join(' | ')}</td>
        <td>${changed ? '✓ changed' : '—'}</td>
      </tr>`;
    }).join('');
    return `
      <table>
        <thead><tr><th>word</th><th>old split</th><th>new split</th><th>change?</th></tr></thead>
        <tbody>${brRows}</tbody>
      </table>
    `;
  }
}

function wireStep7() {
  document.getElementById('btnStep7Next')?.addEventListener('click', () => next());
  document.getElementById('btnBackToPatch')?.addEventListener('click', () => goTo(5));
}

// ── Step 8: Merge ─────────────────────────────────────────────────────────────

function renderStep8() {
  if (S.mergeComplete) {
    return `
      <h2>Step 8 — Merge</h2>
      ${ok('✓ Merge complete!')}
      ${S.mergeError ? err(escHtml(S.mergeError)) : ''}
      <button class="btn-secondary" id="btnNewSession">Start new session</button>
    `;
  }

  const date = new Date().toISOString().slice(0, 10);
  const changelogLines = S.mode === 'vowelSound'
    ? buildChangelogEntries(S.patchObj, S.compiledObj, S.mergeReason, date)
    : buildChangelogEntriesForList(S.patchObj, S.mode, S.mergeReason, date);

  let summary;
  if (S.mode === 'vowelSound') {
    summary = [
      S.patchObj.add    ? `${S.patchObj.add.length} row(s) added`    : '',
      S.patchObj.modify ? `${S.patchObj.modify.length} row(s) modified` : '',
      S.patchObj.remove ? `${S.patchObj.remove.length} row(s) removed` : '',
    ].filter(Boolean).join(', ');
  } else {
    const listName = S.mode === 'compoundPart' ? 'compoundParts' : 'rootWords';
    summary = [
      S.patchObj.add    ? `${S.patchObj.add.length} entr${S.patchObj.add.length === 1 ? 'y' : 'ies'} added to ${listName}`    : '',
      S.patchObj.remove ? `${S.patchObj.remove.length} entr${S.patchObj.remove.length === 1 ? 'y' : 'ies'} removed from ${listName}` : '',
    ].filter(Boolean).join(', ');
  }

  const changelogHtml = changelogLines.map(l => `<code>${escHtml(l)}</code>`).join('<br>');

  return `
    <h2>Step 8 — Merge</h2>
    ${card('What will be written', `
      <p><strong>Changes:</strong> ${summary}</p>
      <p><strong>CHANGELOG entries to append:</strong></p>
      <div class="code-block">${changelogHtml}</div>
      ${hasFSA
        ? `<p class="hint">FSA path: constructs YAML will be overwritten via the loaded file handle. CHANGELOG requires a separate load (or copy manually).</p>
           <button class="btn-secondary sm" id="btnLoadChangelog">${S.changelogHandle ? '✓ CHANGELOG loaded' : 'Load CHANGELOG.md for auto-append (optional)'}</button>`
        : `<p class="hint">Upload path: updated YAML will be downloaded. Copy the CHANGELOG entries above to <code>constructs/CHANGELOG.md</code> manually.</p>`
      }
    `)}
    ${info('This action writes to disk. Confirm only when the regression review above is satisfactory.')}
    <button class="btn-danger lg" id="btnConfirmMerge">Confirm Merge</button>
  `;
}

function wireStep8() {
  document.getElementById('btnLoadChangelog')?.addEventListener('click', loadChangelogFSA);
  document.getElementById('btnConfirmMerge')?.addEventListener('click', performMerge);
  document.getElementById('btnNewSession')?.addEventListener('click', () => location.reload());
}

async function loadChangelogFSA() {
  try {
    const [handle] = await window.showOpenFilePicker({
      types: [{ description: 'Markdown', accept: { 'text/markdown': ['.md'] } }],
    });
    S.changelogHandle = handle;
    S.changelogText   = await (await handle.getFile()).text();
    render();
  } catch (e) {
    if (e.name !== 'AbortError') alert(`Error loading CHANGELOG: ${e.message}`);
  }
}

async function performMerge() {
  S.mergeError = null;
  try {
    const date = new Date().toISOString().slice(0, 10);

    // 1. Apply patch to real rawObj and serialize
    const mergedRaw = S.mode === 'vowelSound'
      ? applyPatchToRaw(S.rawObj, S.patchObj)
      : applyPatchToRawList(S.rawObj, S.patchObj, S.mode);
    const updatedYaml = jsyaml.dump(mergedRaw, { lineWidth: 120, noRefs: true, sortKeys: false });

    // 2. Write constructs YAML
    if (hasFSA && S.constructsHandle) {
      const writable = await S.constructsHandle.createWritable();
      await writable.write(updatedYaml);
      await writable.close();
    } else {
      downloadText(updatedYaml, `phonics-constructs.updated.${Date.now()}.yaml`);
    }

    // 3. Append CHANGELOG entries
    const lines = S.mode === 'vowelSound'
      ? buildChangelogEntries(S.patchObj, S.compiledObj, S.mergeReason, date)
      : buildChangelogEntriesForList(S.patchObj, S.mode, S.mergeReason, date);
    const appendText = lines.join('\n') + '\n';

    if (hasFSA && S.changelogHandle) {
      const existingText = S.changelogText ?? '';
      const writable     = await S.changelogHandle.createWritable();
      await writable.write(existingText.trimEnd() + '\n' + appendText);
      await writable.close();
    } else {
      downloadText(appendText, `changelog-append.${Date.now()}.txt`);
    }

    // 4. Update in-memory state
    S.rawObj      = mergedRaw;
    S.compiledObj = compileConstructs(mergedRaw);
    S.constructsText = updatedYaml;

    S.mergeComplete = true;
    render();
  } catch (e) {
    S.mergeError = e.message;
    S.mergeComplete = true;
    render();
  }
}

function downloadText(text, filename) {
  const a = document.createElement('a');
  a.href  = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

// ── Utilities ─────────────────────────────────────────────────────────────────

function escHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Init ──────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => render());
