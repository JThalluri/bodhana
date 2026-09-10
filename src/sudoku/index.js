import { buildSudokuUI, unmount as uiUnmount } from './ui.js';
import './sudoku.css';

export function mount(container) {
  buildSudokuUI(container);
  return uiUnmount;
}
