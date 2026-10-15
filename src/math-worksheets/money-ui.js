import { MONEY_TYPES, arithmeticLimit, createMoneyGenerator, moneyPool, normalizeMoneyState } from './money-generator.js';
import { themeToggleMarkup } from '../shared/shell-ui.js';
import { printWorksheet } from '../shared/print.js';
import { exportWorksheetPdf } from '../shared/export-pdf.js';

let listeners = [];
export function unmountMoney() {
  listeners.forEach(([el, event, fn]) => el.removeEventListener(event, fn));
  listeners = [];
}

const options = entries => Object.entries(entries).map(([value, label]) => `<option value="${value}">${label}</option>`).join('');
const select = (id, label, entries) => `<div class="frac-field"><label for="money${id}">${label}</label><select class="tb-select" id="money${id}">${options(entries)}</select></div>`;
const check = (id, label) => `<div class="frac-field"><label for="money${id}">${label}</label><input type="checkbox" id="money${id}" checked></div>`;

export function buildMoneyUI(container) {
  container.innerHTML = `<div class="frac-tool money-tool tool-shell">
    <div class="frac-toolbar tool-header tool-worksheet-header no-print">
      <div class="tool-header-main"><span class="tool-header-title">Money Counting</span><span id="moneyStatus" class="tool-header-status tb-status status-msg info" role="status"></span></div>
      <div class="tool-header-actions tool-worksheet-actions"><div class="tool-primary-actions">
        <button class="btn btn-primary btn-sm" id="moneyGenerate"><i class="fas fa-sync-alt"></i> Generate</button>
        <button class="btn btn-secondary btn-sm" id="moneyPrint"><i class="fas fa-print"></i> Print</button>
        <button class="btn btn-secondary btn-sm" id="moneyExport"><i class="fas fa-file-pdf"></i> Export</button>
        <span class="tool-action-separator" aria-hidden="true"></span>
        <button class="btn btn-ghost btn-sm" id="moneyReset"><i class="fas fa-undo-alt"></i> Reset</button>
      </div><div class="tool-secondary-actions"><span class="tool-theme-slot">${themeToggleMarkup()}</span></div></div>
    </div>
    <div class="frac-body tool-body"><div class="frac-settings-pane tool-settings no-print">
      <div class="frac-settings-section"><div class="frac-section-title">Money Counting Type</div>
        ${select('SubType', 'Worksheet', MONEY_TYPES)}
        ${select('Currency', 'Currency', { inr: 'Indian Rupee (INR)', usd: 'US Dollar (USD)' })}
      </div>
      <div class="frac-settings-section"><div class="frac-section-title">Question Options</div>
        ${select('Grade', 'Grade level', { all: 'All grades', 1: 'Grade 1', 2: 'Grade 2', 3: 'Grade 3', 4: 'Grade 4' })}
        ${select('Difficulty', 'Difficulty', { all: 'Mixed', easy: 'Easy', medium: 'Medium', hard: 'Hard' })}
        <div id="moneyArithmeticOptions">
          ${select('Operation', 'Operations', { mixed: 'Mixed (+ / -)', add: 'Addition', sub: 'Subtraction' })}
          <div class="frac-field" id="moneyDifferenceRow"><label for="moneyMinDifference">Minimum difference</label><input class="tb-num" type="number" id="moneyMinDifference" min="0" step="0.01" value="0"></div>
        </div>
      </div>
      <div class="frac-settings-section"><div class="frac-section-title">Layout</div>
        <div class="frac-field"><label for="moneyPages">Worksheets</label><input class="tb-num" type="number" id="moneyPages" min="1" max="20" value="1"></div>
        ${select('FontSize', 'Font size', { s: 'S', m: 'M', l: 'L', xl: 'XL' })}
        ${check('Workspace', 'Workspace')}${check('Answers', 'Answer key')}
      </div>
      <div class="frac-settings-section"><div class="frac-section-title">Reproducibility</div><div class="frac-field"><label for="moneySeed">Random seed</label><input class="frac-text-input" id="moneySeed" type="text" placeholder="optional"></div></div>
    </div><div class="frac-preview-pane tool-preview"><div class="tool-preview-scroll"><div id="moneyWorksheetsContainer" class="tool-pages"></div></div></div><div class="tool-info-pane" aria-hidden="true"></div></div>
  </div>`;
  const el = id => container.querySelector(`#money${id}`);
  const on = (id, event, fn) => {
    el(id).addEventListener(event, fn);
    listeners.push([el(id), event, fn]);
  };
  function read() {
    return normalizeMoneyState({ subType: el('SubType').value, currency: el('Currency').value,
      grade: el('Grade').value, difficulty: el('Difficulty').value, operation: el('Operation').value,
      minDifference: el('MinDifference').value, pages: el('Pages').value, fontSize: el('FontSize').value,
      workspace: el('Workspace').checked, includeAnswers: el('Answers').checked, randomSeed: el('Seed').value });
  }
  function write(state) {
    for (const [id, key] of Object.entries({ SubType: 'subType', Currency: 'currency', Grade: 'grade', Difficulty: 'difficulty', Operation: 'operation', MinDifference: 'minDifference', Pages: 'pages', FontSize: 'fontSize', Seed: 'randomSeed' })) el(id).value = state[key];
    el('Workspace').checked = state.workspace;
    el('Answers').checked = state.includeAnswers;
  }
  function conditional() {
    const state = read();
    const word = state.subType === 'word-problems';
    el('ArithmeticOptions').hidden = word;
    el('DifferenceRow').hidden = word || state.operation === 'add';
    for (const option of el('Difficulty').options) {
      option.disabled = word && !moneyPool({ ...state, difficulty: option.value }).length;
    }
    if (el('Difficulty').selectedOptions[0].disabled) state.difficulty = 'all';
    state.minDifference = normalizeMoneyState(state).minDifference;
    write(state);
    el('MinDifference').max = (arithmeticLimit(state) - 1) / 100;
  }
  function newPage(state, title, number, key = false) {
    const page = document.createElement('div');
    page.className = `frac-worksheet money-worksheet frac-font-${state.fontSize}${key ? ' money-key-page' : ''}`;
    const header = document.createElement('div');
    header.className = 'frac-ws-header';
    header.innerHTML = `<div class="frac-ws-namedate"><span class="frac-name-line">${title}</span><span class="frac-date-line">Date: ________________</span></div><div class="frac-ws-typelabel">${MONEY_TYPES[state.subType]} | ${state.currency.toUpperCase()} | ${number}</div>`;
    const content = document.createElement('div');
    content.className = `frac-ws-content money-content${state.subType === 'arithmetic' ? (key ? ' money-key-grid' : ' money-two-col') : ''}`;
    page.append(header, content);
    el('WorksheetsContainer').append(page);
    return content;
  }
  function fits(content, node) {
    return node.getBoundingClientRect().bottom <= content.getBoundingClientRect().bottom - 4;
  }
  function generate() {
    conditional();
    const generator = createMoneyGenerator(read());
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
          node.className = 'frac-question money-question';
          const num = document.createElement('span');
          num.className = 'frac-q-num';
          num.textContent = `${answers.length + 1})`;
          const body = document.createElement('span');
          body.className = 'frac-q-body';
          body.textContent = item.text;
          if (state.subType === 'arithmetic') {
            const blank = document.createElement('span');
            blank.className = 'money-answer-blank';
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
          node.className = 'money-key-entry';
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
  on('Generate', 'click', generate);
  on('Print', 'click', printWorksheet);
  on('Export', 'click', () => exportWorksheetPdf({ filenameBase: `money_${el('SubType').value}_${el('Currency').value}` }));
  const reset = () => { write(normalizeMoneyState()); generate(); };
  on('Reset', 'click', reset);
  ['SubType', 'Currency', 'Grade', 'Difficulty', 'Operation', 'MinDifference', 'Pages', 'FontSize', 'Workspace', 'Answers'].forEach(id => on(id, 'change', conditional));
  reset();
}
