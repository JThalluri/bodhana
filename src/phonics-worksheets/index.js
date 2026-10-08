import './phonics-worksheets.css';
import '../styles/phonics-word-detail.css';
import { buildPhonicsWorksheetsUI, unmountPhonicsWorksheets } from './ui.js';

export function mount(container) {
  buildPhonicsWorksheetsUI(container);
  return unmountPhonicsWorksheets;
}
