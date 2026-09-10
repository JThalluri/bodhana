import { buildMathPuzzleUI, unmount as uiUnmount } from './ui.js';
import './mathpuzzle.css';

export function mount(container) {
  buildMathPuzzleUI(container);
  return uiUnmount;
}
