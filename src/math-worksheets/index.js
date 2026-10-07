import { buildMathWorksheetsUI, unmount } from './ui.js';
import './math-worksheets.css';

export function mount(container) {
  const initialType = window.location.hash.replace(/^#/, '') === '/fractions'
    ? 'fractions-drill'
    : 'math-test';
  buildMathWorksheetsUI(container, initialType);
  return unmount;
}
