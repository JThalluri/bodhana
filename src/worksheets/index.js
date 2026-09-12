import { buildWorksheetsUI, unmount } from './ui.js';
import './worksheets.css';

export function mount(container) {
  buildWorksheetsUI(container);
  return unmount;
}
