import { buildPlaceValueUI, unmountPlaceValue } from './pv-ui.js';
import { buildTicTacToeUI, unmountTicTacToe } from './tictactoe-ui.js';

let _listeners = [];
let _currentType = null;

function on(el, evt, fn) {
  el.addEventListener(evt, fn);
  _listeners.push({ el, evt, fn });
}

export function unmount() {
  _listeners.forEach(({ el, evt, fn }) => el.removeEventListener(evt, fn));
  _listeners = [];
  unmountSubType();
  _currentType = null;
}

function unmountSubType() {
  if (_currentType === 'math-test') {
    // math/ui.js has no unmount; clearing innerHTML is sufficient
  } else if (_currentType === 'place-value') {
    unmountPlaceValue();
  } else if (_currentType === 'tic-tac-toe') {
    unmountTicTacToe();
  }
}

function worksheetTypeSelectorMarkup(currentType) {
  return `
    <div class="mw-settings-section tool-type-section">
      <div class="mw-section-title">Math Worksheet</div>
      <div class="mw-field">
        <label for="mwTypeSelect">Category</label>
        <select class="tb-select" id="mwTypeSelect">
          <option value="math-test"${currentType === 'math-test' ? ' selected' : ''}>Math Tests (Arithmetic)</option>
          <option value="place-value"${currentType === 'place-value' ? ' selected' : ''}>Place Value</option>
          <option value="tic-tac-toe"${currentType === 'tic-tac-toe' ? ' selected' : ''}>Math Tic-Tac-Toe</option>
        </select>
      </div>
    </div>
  `;
}

function injectWorksheetTypeSelector(container, currentType, onChange) {
  const pane = container.querySelector('.math-settings-pane, .pv-settings-pane, .ttt-settings-pane');
  if (!pane) return;
  pane.insertAdjacentHTML('afterbegin', worksheetTypeSelectorMarkup(currentType));
  const select = pane.querySelector('#mwTypeSelect');
  on(select, 'change', () => onChange(select.value));
}

async function mountSubType(type, container) {
  container.innerHTML = '';
  _currentType = type;

  if (type === 'math-test') {
    const { buildUI } = await import('../math/ui.js');
    buildUI(container);
  } else if (type === 'place-value') {
    buildPlaceValueUI(container);
  } else if (type === 'tic-tac-toe') {
    buildTicTacToeUI(container);
  }
}

export function buildMathWorksheetsUI(container) {
  container.innerHTML = `
    <div class="mw-tool">
      <div id="mwSubContainer"></div>
    </div>
  `;

  const subContainer = container.querySelector('#mwSubContainer');

  const switchType = async (nextType) => {
    unmountSubType();
    await mountSubType(nextType, subContainer);
    injectWorksheetTypeSelector(subContainer, nextType, switchType);
  };

  switchType('math-test');
}
