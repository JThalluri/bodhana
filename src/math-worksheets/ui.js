import { buildPlaceValueUI, unmountPlaceValue } from './pv-ui.js';

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
  }
}

async function mountSubType(type, container) {
  container.innerHTML = '';
  _currentType = type;

  if (type === 'math-test') {
    const { buildUI } = await import('../math/ui.js');
    buildUI(container);
  } else if (type === 'place-value') {
    buildPlaceValueUI(container);
  }
}

export function buildMathWorksheetsUI(container) {
  container.innerHTML = `
    <div class="mw-tool">
      <div class="mw-typebar no-print">
        <span class="mw-typebar-label">Math Worksheet Type</span>
        <select class="tb-select" id="mwTypeSelect" style="min-width:180px;">
          <option value="math-test">Math Tests (Arithmetic)</option>
          <option value="place-value">Place Value</option>
        </select>
      </div>
      <div id="mwSubContainer"></div>
    </div>
  `;

  const typeSelect  = container.querySelector('#mwTypeSelect');
  const subContainer = container.querySelector('#mwSubContainer');

  mountSubType('math-test', subContainer);

  on(typeSelect, 'change', () => {
    unmountSubType();
    mountSubType(typeSelect.value, subContainer);
  });
}
