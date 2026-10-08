import { buildDictBuilderUI, unmount as uiUnmount } from './ui.js';
import './dictbuilder.css';
import '../styles/phonics-word-detail.css';

export function mount(container) {
  buildDictBuilderUI(container);
  return uiUnmount;
}
