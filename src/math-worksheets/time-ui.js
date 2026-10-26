import {measurePaperPages} from '../shared/paper-measurement.js';
import { paperSizeControl, applyPaperSize } from '../shared/paper-size.js';
import { TIME_TYPES, createTimeGenerator, normalizeTimeState, timeArithmeticProfile, timePool } from './time-generator.js';
import { themeToggleMarkup } from '../shared/shell-ui.js';
import { printWorksheet } from '../shared/print.js';
import { exportWorksheetPdf } from '../shared/export-pdf.js';

let listeners = [];
export function unmountTime() {
  listeners.forEach(([el, event, fn]) => el.removeEventListener(event, fn));
  listeners = [];
}

const select = (id, label, entries) => `<div class="frac-field"><label for="time${id}">${label}</label><select class="tb-select" id="time${id}">${Object.entries(entries).map(([value, text]) => `<option value="${value}">${text}</option>`).join('')}</select></div>`;
const check = (id, label) => `<div class="frac-field"><label for="time${id}">${label}</label><input type="checkbox" id="time${id}" checked></div>`;

export function buildTimeUI(container) {
  container.innerHTML = `<div class="frac-tool time-tool tool-shell">
    <div class="frac-toolbar tool-header tool-worksheet-header no-print">
      <div class="tool-header-main"><span class="tool-header-title">Time Problems</span><span id="timeStatus" class="tool-header-status tb-status status-msg info" role="status"></span></div>
      <div class="tool-header-actions tool-worksheet-actions"><div class="tool-primary-actions">
        <button class="btn btn-primary btn-sm" id="timeGenerate"><i class="fas fa-sync-alt"></i> Generate</button>
        <button class="btn btn-secondary btn-sm" id="timePrint"><i class="fas fa-print"></i> Print</button>
        <button class="btn btn-secondary btn-sm" id="timeExport"><i class="fas fa-file-pdf"></i> Export</button>
        <span class="tool-action-separator" aria-hidden="true"></span>
        <button class="btn btn-ghost btn-sm" id="timeReset"><i class="fas fa-undo-alt"></i> Reset</button>
      </div><div class="tool-secondary-actions"><span class="tool-theme-slot">${themeToggleMarkup()}</span></div></div>
    </div>
    <div class="frac-body tool-body"><div class="frac-settings-pane tool-settings no-print">${paperSizeControl('timePaperSize')}
      <div class="frac-settings-section"><div class="frac-section-title">Time Problems Type</div>
        ${select('SubType', 'Worksheet', TIME_TYPES)}
      </div>
      <div class="frac-settings-section"><div class="frac-section-title">Question Options</div>
        ${select('Grade', 'Grade level', { all: 'All grades', 1: 'Grade 1', 2: 'Grade 2' })}
        ${select('Difficulty', 'Difficulty', { all: 'Mixed', easy: 'Easy', medium: 'Medium', hard: 'Hard' })}
        <div id="timeArithmeticOptions">
          ${select('Operation', 'Operations', { mixed: 'Mixed (+ / -)', add: 'Addition', sub: 'Subtraction' })}
          <div class="frac-field" id="timeDifferenceRow"><label for="timeMinDifference">Min difference (min)</label><input class="tb-num" type="number" id="timeMinDifference" min="0" step="1" value="0"></div>
        </div>
      </div>
      <div class="frac-settings-section"><div class="frac-section-title">Layout</div>
        <div class="frac-field"><label for="timePages">Worksheets</label><input class="tb-num" type="number" id="timePages" min="1" max="20" value="1"></div>
        ${select('FontSize', 'Font size', { s: 'S', m: 'M', l: 'L', xl: 'XL' })}
        ${check('Workspace', 'Workspace')}${check('Answers', 'Answer key')}
      </div>
      <div class="frac-settings-section"><div class="frac-section-title">Reproducibility</div><div class="frac-field"><label for="timeSeed">Random seed</label><input class="frac-text-input" id="timeSeed" type="text" placeholder="optional"></div></div>
    </div><div class="frac-preview-pane tool-preview"><div class="tool-preview-scroll"><div id="timeWorksheetsContainer" class="tool-pages"></div></div></div><div class="tool-info-pane" aria-hidden="true"></div></div>
  </div>`;
  const previewHost = container.querySelector('#timeWorksheetsContainer');
  const el = id => id === 'WorksheetsContainer' ? previewHost : container.querySelector(`#time${id}`);
  const on = (id, event, fn) => {
    el(id).addEventListener(event, fn);
    listeners.push([el(id), event, fn]);
  };
  function read() {
    return normalizeTimeState({ subType: el('SubType').value, grade: el('Grade').value,
      difficulty: el('Difficulty').value, operation: el('Operation').value, minDifference: el('MinDifference').value,
      pages: el('Pages').value, fontSize: el('FontSize').value, workspace: el('Workspace').checked,
      includeAnswers: el('Answers').checked, randomSeed: el('Seed').value });
  }
  function write(state) {
    for (const [id, key] of Object.entries({ SubType: 'subType', Grade: 'grade', Difficulty: 'difficulty', Operation: 'operation', MinDifference: 'minDifference', Pages: 'pages', FontSize: 'fontSize', Seed: 'randomSeed' })) el(id).value = state[key];
    el('Workspace').checked = state.workspace;
    el('Answers').checked = state.includeAnswers;
  }
  function conditional() {
    const state = read();
    const word = state.subType === 'word-problems';
    el('ArithmeticOptions').hidden = word;
    el('DifferenceRow').hidden = word || state.operation === 'add';
    for (const option of el('Difficulty').options) option.disabled = word && !timePool({ ...state, difficulty: option.value }).length;
    if (el('Difficulty').selectedOptions[0].disabled) state.difficulty = 'all';
    write(normalizeTimeState(state));
    const { max, step } = timeArithmeticProfile(state);
    el('MinDifference').max = max - step;
    el('MinDifference').step = step;
  }
  function newPage(state, title, number, key = false) {
    const page = applyPaperSize(document.createElement('div'), container.querySelector('#timePaperSize').value);
    page.className = `frac-worksheet time-worksheet frac-font-${state.fontSize}${key ? ' time-key-page' : ''}`;
    const header = document.createElement('div');
    header.className = 'frac-ws-header';
    header.innerHTML = `<div class="frac-ws-namedate"><span class="frac-name-line">${title}</span><span class="frac-date-line">Date: ________________</span></div><div class="frac-ws-typelabel">${TIME_TYPES[state.subType]} | ${number}</div>`;
    const content = document.createElement('div');
    content.className = `frac-ws-content time-content${state.subType === 'arithmetic' ? (key ? ' time-key-grid' : ' time-two-col') : ''}`;
    page.append(header, content);
    el('WorksheetsContainer').append(page);
    return content;
  }
  const fits = (content, node) => node.getBoundingClientRect().bottom <= content.getBoundingClientRect().bottom - 4;
  function generate() {
    return container.querySelector('#timePaperSize').value === 'statement' ? measurePaperPages(el('WorksheetsContainer'),renderMeasuredPages) : renderMeasuredPages();
  }
  function renderMeasuredPages() {
    conditional();
    const generator = createTimeGenerator(read());
    const state = generator.state;
    const preview = el('WorksheetsContainer');
    preview.replaceChildren();
    preview.classList.add('frac-measuring');
    const answers = [];
    let pending;
    try {
      for (let p = 1; p <= state.pages; p++) {
        const content = newPage(state, 'Name: __________________________', p);
        for (let count = 0; count < 200; count++) {
          const item = pending || generator.next();
          const node = document.createElement('div');
          node.className = 'frac-question time-question';
          const num = document.createElement('span');
          num.className = 'frac-q-num';
          num.textContent = `${answers.length + 1})`;
          const body = document.createElement('span');
          body.className = 'frac-q-body';
          body.textContent = item.text;
          if (state.subType === 'arithmetic') {
            const blank = document.createElement('span');
            blank.className = 'time-answer-blank';
            body.append(blank);
          }
          if (state.workspace) {
            const line = document.createElement('span');
            line.className = 'frac-workspace-line';
            body.append(line);
          }
          node.append(num, body);
          content.append(node);
          if (!fits(content, node)) {
            node.remove();
            pending = item;
            break;
          }
          pending = null;
          answers.push(item);
        }
      }
      if (state.includeAnswers) {
        let content;
        answers.forEach((item, index) => {
          const node = document.createElement('div');
          node.className = 'time-key-entry';
          node.textContent = `${index + 1}) ${item.answer}${item.steps ? `  ${item.steps}` : ''}`;
          if (!content) content = newPage(state, 'Answer Key', preview.children.length + 1, true);
          content.append(node);
          if (!fits(content, node)) {
            node.remove();
            content = newPage(state, 'Answer Key (continued)', preview.children.length + 1, true);
            content.append(node);
          }
        });
      }
      el('Status').textContent = `${answers.length} questions`;
      el('Status').className = 'tool-header-status tb-status status-msg success';
    } catch (error) {
      preview.replaceChildren();
      el('Status').textContent = error.message;
      el('Status').className = 'tool-header-status tb-status status-msg error';
    } finally {
      preview.classList.remove('frac-measuring');
    }
  }
  on('PaperSize', 'change', generate);
  on('Generate', 'click', generate);
  on('Print', 'click', printWorksheet);
  on('Export', 'click', () => exportWorksheetPdf({ filenameBase: `time_${el('SubType').value}` }));
  const reset = () => { write(normalizeTimeState()); generate(); };
  on('Reset', 'click', reset);
  ['SubType', 'Grade', 'Difficulty', 'Operation', 'MinDifference', 'Pages', 'FontSize', 'Workspace', 'Answers'].forEach(id => on(id, 'change', conditional));
  reset();
}
