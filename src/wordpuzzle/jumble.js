import { shuffle } from '../shared/utils.js';

export function generateJumble(dict, opts) {
  const { wordsPerPuzzle = 10, minWordLength = 4, maxWordLength = 10 } = opts;

  const pool = dict.filter(w => w.length >= minWordLength && w.length <= maxWordLength);
  const finalPool = pool.length > 0 ? pool : dict;
  const chosen = shuffle([...finalPool]).slice(0, Math.min(wordsPerPuzzle, finalPool.length));

  const words = chosen.map(word => ({
    original: word,
    jumbled: jumbleWord(word),
  }));

  return { words, mode: 'jumble' };
}

function jumbleWord(word) {
  const arr = word.split('');
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  const result = arr.join('');
  return result === word && word.length > 1 ? jumbleWord(word) : result;
}
