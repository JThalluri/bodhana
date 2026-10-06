// /worksheets — Writing Worksheets.
// Dispatches between two worksheet types via the "Type" select in the
// settings pane. Seyès is the default; Handwriting Lines is opt-in.

import { buildWorksheetsUI, unmount as unmountSeyes } from './ui.js';
import { buildHandwritingUI, unmountHandwriting } from '../writing-worksheets/handwriting-ui.js';
import './worksheets.css';
import '../writing-worksheets/writing-worksheets.css';

export function mount(container) {
  let current = null;
  let typeListener = null;

  function teardown() {
    if (typeListener) {
      typeListener.el.removeEventListener('change', typeListener.fn);
      typeListener = null;
    }
    if (current === 'seyes') unmountSeyes();
    if (current === 'handwriting') unmountHandwriting();
    current = null;
  }

  function switchType(type) {
    teardown();
    if (type === 'handwriting') {
      buildHandwritingUI(container, switchType);
      current = 'handwriting';
      return;
    }
    buildWorksheetsUI(container);
    current = 'seyes';
    const select = container.querySelector('#wsTypeSelect');
    if (select) {
      const fn = () => { if (select.value !== 'seyes') switchType(select.value); };
      select.addEventListener('change', fn);
      typeListener = { el: select, fn };
    }
  }

  switchType('seyes');
  return teardown;
}
