import { buildDictBuilderUI, unmount as uiUnmount } from './ui.js';
import './dictbuilder.css';

export function mount(container) {
  buildDictBuilderUI(container);
  return uiUnmount;
}
