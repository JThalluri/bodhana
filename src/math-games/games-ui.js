import {
  DEFAULT_MATH_GAMES_STATE,
  applyGameRangePreset,
  cellRef,
  generateMathGames,
  normalizeGameState,
  renderGamePrompt,
} from './games-generator.js';
import { FRACTION_PRESETS, fractionShapeSVG } from '../math-worksheets/fractions-generator.js';
import { themeToggleMarkup } from '../shared/shell-ui.js';
import { printWorksheet } from '../shared/print.js';
import { exportWorksheetPdf } from '../shared/export-pdf.js';

let _gameListeners = [];

function on(el, evt, fn) {
  if (!el) return;
  el.addEventListener(evt, fn);
  _gameListeners.push({ el, evt, fn });
}

export function unmountMathGames() {
  _gameListeners.forEach(({ el, evt, fn }) => el.removeEventListener(evt, fn));
  _gameListeners = [];
}

export function buildMathGamesUI(container) {
  container.innerHTML = `
    <div class="mg-tool tool-shell">
      <div class="mg-toolbar tool-header tool-worksheet-header no-print">
        <div class="tool-header-main">
          <span class="tool-header-title">Math Games</span>
          <span class="tool-header-status tb-status status-msg info" id="mgStatus"></span>
        </div>
        <div class="tool-header-actions tool-worksheet-actions">
          <div class="tool-primary-actions">
            <button class="btn btn-primary btn-sm" id="mgGenerateBtn"><i class="fas fa-sync-alt"></i> Generate</button>
            <button class="btn btn-secondary btn-sm" id="mgPrintBtn"><i class="fas fa-print"></i> Print</button>
            <button class="btn btn-secondary btn-sm" id="mgExportBtn"><i class="fas fa-file-pdf"></i> Export</button>
            <span class="tool-action-separator" aria-hidden="true"></span>
            <button class="btn btn-ghost btn-sm" id="mgResetBtn"><i class="fas fa-undo-alt"></i> Reset</button>
          </div>
          <div class="tool-secondary-actions"><span class="tool-theme-slot">${themeToggleMarkup()}</span></div>
        </div>
      </div>
      <div class="mg-body tool-body">
        <div class="mg-settings-pane tool-settings no-print">
          <div class="mg-settings-section">
            <div class="mg-section-title">Game</div>
            <div class="mg-field"><label for="mgGame">Type</label><select class="tb-select" id="mgGame"><option value="tictactoe">Tic-Tac-Toe</option><option value="bingo">Bingo</option><option value="match">Match</option><option value="snake">Snake</option></select></div>
            <div class="mg-field" id="mgDomainRow"><label for="mgDomain">Domain</label><select class="tb-select" id="mgDomain"><option value="fractions">Fractions</option><option value="arithmetic">Arithmetic</option></select></div>
            <div class="mg-field"><label for="mgMode">Question mode</label><select class="tb-select" id="mgMode"><option value="numerals">Numerals</option><option value="visual">Visual</option><option value="mixed">Mixed</option></select></div>
          </div>
          <div class="mg-settings-section" id="mgFractionRange">
            <div class="mg-section-title">Fraction Range</div>
            <div class="mg-field"><label for="mgRangePreset">Preset</label><select class="tb-select" id="mgRangePreset">${presetOptions()}</select></div>
            <div class="mg-field"><label for="mgNumMin">Min numerator</label><input class="tb-num" type="number" id="mgNumMin" value="1"></div>
            <div class="mg-field"><label for="mgNumMax">Max numerator</label><input class="tb-num" type="number" id="mgNumMax" value="8"></div>
            <div class="mg-field"><label for="mgDenMin">Min denominator</label><input class="tb-num" type="number" id="mgDenMin" value="2"></div>
            <div class="mg-field"><label for="mgDenMax">Max denominator</label><input class="tb-num" type="number" id="mgDenMax" value="12"></div>
            <div class="mg-range-note">Game visuals are capped at denominator 16.</div>
          </div>
          <div class="mg-settings-section" id="mgOperationsRows">
            <div class="mg-section-title" id="mgOperationsTitle">Operations</div>
            <div class="mg-field"><label for="mgDifficulty">Preset</label><select class="tb-select" id="mgDifficulty"><option value="custom">Custom</option><option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option></select></div>
            <div class="mg-op-grid">
              <label class="op-chk"><input type="checkbox" id="mgAdd" checked><span class="op-sym add">+</span></label>
              <label class="op-chk"><input type="checkbox" id="mgSub" checked><span class="op-sym sub">-</span></label>
              <label class="op-chk"><input type="checkbox" id="mgMul"><span class="op-sym mul">&times;</span></label>
              <label class="op-chk"><input type="checkbox" id="mgDiv"><span class="op-sym div">&divide;</span></label>
            </div>
            <div class="mg-field"><label for="mgMinDigits">Min digits</label><input class="tb-num" type="number" id="mgMinDigits" value="2"></div>
            <div class="mg-field"><label for="mgMaxDigits">Max digits</label><input class="tb-num" type="number" id="mgMaxDigits" value="2"></div>
            <div class="mg-field"><label for="mgOperands">Operands</label><input class="tb-num" type="number" id="mgOperands" value="2"></div>
            <div class="mg-field"><label for="mgMixedOps">Mixed operators</label><input type="checkbox" id="mgMixedOps"></div>
            <div class="mg-field" id="mgDenomModeRow"><label for="mgDenomMode">Denominators</label><select class="tb-select" id="mgDenomMode"><option value="unlike">Unlike</option><option value="same">Same</option></select></div>
          </div>
          <div class="mg-settings-section">
            <div class="mg-section-title">Layout</div>
            <div class="mg-field"><label for="mgPages">Pages</label><input class="tb-num" type="number" id="mgPages" min="1" max="20" value="1"></div>
            <div class="mg-field"><label for="mgGamesPerPage">Games per page</label><select class="tb-select" id="mgGamesPerPage"><option value="1">1</option><option value="2">2</option><option value="4" selected>4</option><option value="6">6</option><option value="8">8</option></select></div>
            <div class="mg-field"><label for="mgFontSize">Font size</label><select class="tb-select" id="mgFontSize"><option value="s">S</option><option value="m" selected>M</option><option value="l">L</option><option value="xl">XL</option></select></div>
            <div class="mg-field"><label for="mgAnswers">Answer key</label><input type="checkbox" id="mgAnswers" checked></div>
          </div>
          <div class="mg-settings-section">
            <div class="mg-section-title">Reproducibility</div>
            <div class="mg-field"><label for="mgSeed">Random seed</label><input class="mg-text-input" type="text" id="mgSeed" placeholder="optional"></div>
          </div>
        </div>
        <div class="mg-preview-pane tool-preview">
          <div class="tool-preview-scroll"><div id="mgWorksheetsContainer" class="tool-pages"></div></div>
        </div>
        <div class="tool-info-pane" aria-hidden="true"></div>
      </div>
    </div>
  `;

  const c = sel => container.querySelector(sel);
  const els = {
    game: c('#mgGame'), domain: c('#mgDomain'), mode: c('#mgMode'),
    rangePreset: c('#mgRangePreset'), numMin: c('#mgNumMin'), numMax: c('#mgNumMax'), denMin: c('#mgDenMin'), denMax: c('#mgDenMax'),
    difficulty: c('#mgDifficulty'), add: c('#mgAdd'), sub: c('#mgSub'), mul: c('#mgMul'), div: c('#mgDiv'),
    minDigits: c('#mgMinDigits'), maxDigits: c('#mgMaxDigits'), operands: c('#mgOperands'), mixedOps: c('#mgMixedOps'), denomMode: c('#mgDenomMode'),
    pages: c('#mgPages'), gamesPerPage: c('#mgGamesPerPage'), fontSize: c('#mgFontSize'), answers: c('#mgAnswers'), seed: c('#mgSeed'),
    fractionRange: c('#mgFractionRange'), operationsRows: c('#mgOperationsRows'), operationsTitle: c('#mgOperationsTitle'), domainRow: c('#mgDomainRow'), denomModeRow: c('#mgDenomModeRow'),
    status: c('#mgStatus'), preview: c('#mgWorksheetsContainer'), generate: c('#mgGenerateBtn'), print: c('#mgPrintBtn'), export: c('#mgExportBtn'), reset: c('#mgResetBtn'),
  };

  function readState() {
    return normalizeGameState({
      gameCategory: els.game.value,
      mathDomain: els.domain.value,
      questionMode: els.mode.value,
      rangePreset: els.rangePreset.value,
      numMin: els.numMin.value,
      numMax: els.numMax.value,
      denMin: els.denMin.value,
      denMax: els.denMax.value,
      difficulty: els.difficulty.value,
      operations: { add: els.add.checked, sub: els.sub.checked, mul: els.mul.checked, div: els.div.checked },
      denomMode: els.denomMode.value,
      minDigits: els.minDigits.value,
      maxDigits: els.maxDigits.value,
      numOperands: els.operands.value,
      multiOperator: els.mixedOps.checked,
      pages: els.pages.value,
      gamesPerPage: els.gamesPerPage.value,
      fontSize: els.fontSize.value,
      includeAnswers: els.answers.checked,
      randomSeed: els.seed.value.trim(),
    });
  }

  function writeState(state) {
    els.game.value = state.gameCategory;
    els.domain.value = state.mathDomain;
    els.mode.value = state.questionMode;
    els.rangePreset.value = state.rangePreset;
    els.numMin.value = state.numMin;
    els.numMax.value = state.numMax;
    els.denMin.value = state.denMin;
    els.denMax.value = state.denMax;
    els.difficulty.value = state.difficulty;
    els.add.checked = state.operations.add;
    els.sub.checked = state.operations.sub;
    els.mul.checked = state.operations.mul;
    els.div.checked = state.operations.div;
    els.denomMode.value = state.denomMode;
    els.minDigits.value = state.minDigits;
    els.maxDigits.value = state.maxDigits;
    els.operands.value = state.numOperands;
    els.mixedOps.checked = state.multiOperator;
    els.pages.value = state.pages;
    els.gamesPerPage.value = state.gamesPerPage;
    els.fontSize.value = state.fontSize;
    els.answers.checked = state.includeAnswers;
    els.seed.value = state.randomSeed;
    const locked = state.rangePreset !== 'custom';
    [els.numMin, els.numMax, els.denMin, els.denMax].forEach(el => { el.readOnly = locked; });
  }

  function updateConditional() {
    const state = readState();
    if (state.gameCategory !== 'tictactoe') state.mathDomain = 'fractions';
    writeState(state);
    const fractions = state.mathDomain === 'fractions';
    const fractionNumeralTtt = state.gameCategory === 'tictactoe' && fractions && state.questionMode === 'numerals';
    const arithmeticTtt = state.gameCategory === 'tictactoe' && state.mathDomain === 'arithmetic';
    els.domainRow.classList.toggle('hidden', state.gameCategory !== 'tictactoe');
    els.fractionRange.classList.toggle('hidden', !fractions);
    els.operationsRows.classList.toggle('hidden', !(arithmeticTtt || fractionNumeralTtt));
    els.operationsTitle.textContent = arithmeticTtt ? 'Arithmetic' : 'Fraction Operations';
    [els.difficulty, els.minDigits, els.maxDigits, els.operands, els.mixedOps].forEach(el => {
      el.closest('.mg-field').classList.toggle('hidden', !arithmeticTtt);
    });
    els.denomModeRow.classList.toggle('hidden', !fractionNumeralTtt);
    els.mode.disabled = !fractions;
  }

  function renderWorksheet() {
    const result = generateMathGames(readState());
    writeState(result.state);
    updateConditional();
    els.preview.innerHTML = '';
    result.pages.forEach((pageData, index) => els.preview.appendChild(renderPage(pageData, result.state, index + 1)));
    els.status.className = 'tb-status status-msg success';
    els.status.innerHTML = `<i class="fas fa-check-circle"></i> ${result.pages.length} page${result.pages.length === 1 ? '' : 's'}`;
  }

  function reset() {
    writeState(normalizeGameState({ ...DEFAULT_MATH_GAMES_STATE }));
    updateConditional();
    renderWorksheet();
  }

  on(els.rangePreset, 'change', () => {
    writeState(applyGameRangePreset(readState(), els.rangePreset.value));
    updateConditional();
  });
  [els.numMin, els.numMax, els.denMin, els.denMax].forEach(el => on(el, 'input', () => {
    els.rangePreset.value = 'custom';
    updateConditional();
  }));
  [els.game, els.domain, els.mode, els.difficulty, els.add, els.sub, els.mul, els.div, els.denomMode, els.minDigits, els.maxDigits, els.operands, els.mixedOps, els.pages, els.gamesPerPage, els.fontSize, els.answers].forEach(el => on(el, 'change', updateConditional));
  on(els.generate, 'click', renderWorksheet);
  on(els.print, 'click', printWorksheet);
  on(els.export, 'click', () => exportWorksheetPdf({ filenameBase: `math_games_${els.game.value}` }));
  on(els.reset, 'click', reset);

  reset();
}

function renderPage(pageData, state, pageNumber) {
  const page = document.createElement('div');
  page.className = `mg-worksheet mg-games-${state.gamesPerPage} mg-font-${state.fontSize}`;
  if (pageData.type === 'bingo-call') {
    page.classList.add('mg-call-page');
    page.innerHTML = pageHeader('Bingo Call Sheet', pageNumber) + renderBingoCalls(pageData.calls);
    return page;
  }
  if (pageData.type === 'match-answers') {
    page.classList.add('mg-answer-page');
    page.innerHTML = pageHeader('Match Answer Key', pageNumber) + renderMatchAnswers(pageData.mappings);
    return page;
  }
  page.classList.toggle('mg-snake-page', state.gameCategory === 'snake');
  page.innerHTML = pageHeader(gameTitle(state), pageNumber)
    + (state.gameCategory === 'snake' ? '<div class="mg-snake-instructions">Follow the path from START to FINISH. Move left to right, then right to left on the next row.</div>' : '')
    + '<div class="mg-games-layout"></div>';
  const layout = page.querySelector('.mg-games-layout');
  pageData.games.forEach(game => layout.appendChild(renderGame(game, state)));
  return page;
}

function pageHeader(title, pageNumber) {
  return `<div class="mg-ws-header"><div class="mg-ws-namedate"><span>Name: ____________________________________</span><span>Date: ________________</span></div><div class="mg-ws-typelabel">${title} | Page ${pageNumber}</div></div>`;
}

function gameTitle(state) {
  const names = { tictactoe: 'Tic-Tac-Toe', bingo: 'Bingo', match: 'Match', snake: 'Snake' };
  return `${state.mathDomain === 'arithmetic' ? 'Arithmetic' : 'Fractions'} ${names[state.gameCategory]}`;
}

function renderGame(game, state) {
  const node = document.createElement('div');
  node.className = `mg-game mg-${game.category}`;
  if (game.category === 'bingo') node.innerHTML = game.cells.map(cell => `<div class="mg-cell"${cell.free ? '' : ` data-answer="${cell.answer}"`}>${cell.free ? 'FREE<br>SPACE' : renderFractionCell(cell, state)}</div>`).join('');
  if (game.category === 'match') node.innerHTML = game.cells.map((cell, idx) => `<div class="mg-cell" data-answer="${cell.answer}" data-pair-id="${cell.pairId}"><span class="mg-cell-ref">${cellRef(idx, 4)}</span>${cell.display === 'shape' ? fractionShapeSVG(cell.fraction, { shapePreference: 'grid', cap: 16, preserveDenominator: true }) : cell.answer}</div>`).join('');
  if (game.category === 'snake') node.innerHTML = game.cells.map((cell, idx) => `<div class="mg-cell ${idx === 0 ? 'snake-start' : ''} ${idx === game.cells.length - 1 ? 'snake-finish' : ''}" data-answer="${cell.answer}">${renderFractionCell(cell, state)}</div>`).join('');
  if (game.category === 'tictactoe') node.innerHTML = game.cells.map(cell => `<div class="mg-cell"${cell.answer ? ` data-answer="${cell.answer}"` : ''}>${cell.kind === 'arithmetic' ? renderArithmeticCell(cell) : renderFractionCell(cell, state)}</div>`).join('');
  return node;
}

function renderFractionCell(cell, state) {
  if (cell.kind === 'fraction-operation') return `<div class="mg-fraction-operation"><div>${renderGamePrompt(cell, state)}</div><div class="mg-answer-line"></div></div>`;
  return renderGamePrompt(cell, state);
}

function renderArithmeticCell(problem) {
  const rows = problem.operands.map((operand, idx) => `<div class="mg-problem-row"><span>${idx ? problem.operators[idx - 1] : ''}</span><span>${operand}</span></div>`).join('');
  return `<div class="mg-arithmetic-problem" data-operands="${problem.operands.length}">${rows}<div class="mg-answer-line"></div></div>`;
}

function renderBingoCalls(calls) {
  return `<div class="mg-call-grid">${calls.map((call, idx) => `<div class="mg-call-row" data-answer="${call.answer}"><span>${idx + 1}</span><strong>${call.answer}</strong>${fractionShapeSVG(call.fraction, { shapePreference: 'grid', cap: 16, preserveDenominator: true })}</div>`).join('')}</div>`;
}

function renderMatchAnswers(mappings) {
  return `<div class="mg-answer-list">${mappings.map(item => `<div>Page ${item.page}, Game ${item.game}: ${item.answer} ${item.refs.join(' <-> ')}</div>`).join('')}</div>`;
}

function presetOptions() {
  return Object.entries(FRACTION_PRESETS).map(([value, preset]) => `<option value="${value}"${value === 'grade5' ? ' selected' : ''}>${preset.label}</option>`).join('');
}
