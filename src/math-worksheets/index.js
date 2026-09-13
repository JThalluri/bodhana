import { buildMathWorksheetsUI, unmount } from './ui.js';
import './math-worksheets.css';

export function mount(container) {
  buildMathWorksheetsUI(container);
  return unmount;
}
