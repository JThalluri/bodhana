import { readSelection, writePreference } from '../shared/device-storage.js';
import { initToolShell } from '../shared/tool-shell-controller.js';
import { buildPlaceValueUI, unmountPlaceValue } from './pv-ui.js';
import { buildFractionsUI, unmountFractions } from './fractions-ui.js';
import { buildMoneyUI, unmountMoney } from './money-ui.js';
import { buildTimeUI, unmountTime } from './time-ui.js';

let _listeners = [];
let generation = 0;
let disposeShell;
let _currentType = null;

function on(el, evt, fn) {
  el.addEventListener(evt, fn);
  _listeners.push({ el, evt, fn });
}

export function unmount() {
  generation++;
  _listeners.forEach(({ el, evt, fn }) => el.removeEventListener(evt, fn));
  _listeners = [];
  unmountSubType();
  _currentType = null;
}

function unmountSubType() {
  _listeners.forEach(({el,evt,fn})=>el.removeEventListener(evt,fn));
  _listeners=[];
  disposeShell?.(); disposeShell = null;
  if (_currentType === 'math-test') {
    // math/ui.js has no unmount; clearing innerHTML is sufficient
  } else if (_currentType === 'place-value') {
    unmountPlaceValue();
  } else if (_currentType === 'fractions-drill') {
    unmountFractions();
  } else if (_currentType === 'money-counting') {
    unmountMoney();
  } else if (_currentType === 'time-problems') {
    unmountTime();
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
          <option value="fractions-drill"${currentType === 'fractions-drill' ? ' selected' : ''}>Fractions</option>
          <option value="money-counting"${currentType === 'money-counting' ? ' selected' : ''}>Money Counting</option>
          <option value="time-problems"${currentType === 'time-problems' ? ' selected' : ''}>Time Problems</option>
        </select>
      </div>
    </div>
  `;
}

function injectWorksheetTypeSelector(container, currentType, onChange) {
  const pane = container.querySelector('.math-settings-pane, .pv-settings-pane, .frac-settings-pane');
  if (!pane) return;
  pane.insertAdjacentHTML('afterbegin', worksheetTypeSelectorMarkup(currentType));
  const select = pane.querySelector('#mwTypeSelect');
  on(select, 'change', () => { writePreference('selection:math',select.value); onChange(select.value); });
}

async function mountSubType(type, container, ticket) {
  container.innerHTML = '';
  _currentType = type;

  if (type === 'math-test') {
    const { buildUI } = await import('../math/ui.js');
    if (ticket !== generation || !container.isConnected) return false;
    buildUI(container);
  } else if (type === 'place-value') {
    buildPlaceValueUI(container);
  } else if (type === 'fractions-drill') {
    buildFractionsUI(container);
  } else if (type === 'money-counting') {
    buildMoneyUI(container);
  } else if (type === 'time-problems') {
    buildTimeUI(container);
  }
}

export function buildMathWorksheetsUI(container, initialType = 'math-test') {
  container.innerHTML = `
    <div class="mw-tool">
      <div id="mwSubContainer"></div>
    </div>
  `;

  const subContainer = container.querySelector('#mwSubContainer');

  const switchType = async (nextType) => {
    unmountSubType();
    const ticket = ++generation;
    await mountSubType(nextType, subContainer, ticket);
    if (ticket !== generation || !subContainer.isConnected) return;
    injectWorksheetTypeSelector(subContainer, nextType, switchType);
    const keys = { 'math-test':'math-tests', 'place-value':'place-value', 'fractions-drill':'fractions', 'money-counting':'money-counting', 'time-problems':'time-problems' };
    disposeShell = initToolShell(subContainer, keys[nextType]);
  };

  switchType(window.location.hash === '#/fractions' ? 'fractions-drill' : readSelection('math',['math-test','place-value','fractions-drill','money-counting','time-problems'],initialType));
}
