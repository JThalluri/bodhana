import { buildMathGamesUI, unmountMathGames } from './games-ui.js';
import './math-games.css';

export function mount(container) {
  buildMathGamesUI(container);
  return unmountMathGames;
}
