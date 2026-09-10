import { buildWordPuzzleUI, unmount } from './ui.js';
import './wordpuzzle.css';

export function mount(container) {
  buildWordPuzzleUI(container);
  return unmount;
}
