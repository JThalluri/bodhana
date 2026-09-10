import { shuffle } from '../shared/utils.js';

export const DIFFICULTY_SETTINGS = {
  easy:   { clues: 45, label: 'Easy'   },
  medium: { clues: 34, label: 'Medium' },
  hard:   { clues: 24, label: 'Hard'   },
};

export function generatePuzzle(difficulty = 'medium') {
  const diff = DIFFICULTY_SETTINGS[difficulty] ?? DIFFICULTY_SETTINGS.medium;
  const solution = generateComplete();
  const puzzle   = removeCells(solution, diff.clues);
  return { puzzle, solution, difficulty };
}

function generateComplete() {
  const board = Array.from({ length: 9 }, () => new Array(9).fill(0));
  for (let box = 0; box < 3; box++) fillBox(board, box * 3, box * 3);
  solveBoard(board, true);
  return board;
}

function fillBox(board, sr, sc) {
  const nums = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  let k = 0;
  for (let r = 0; r < 3; r++)
    for (let c = 0; c < 3; c++)
      board[sr + r][sc + c] = nums[k++];
}

function solveBoard(board, randomize = false) {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (board[r][c] === 0) {
        const nums = randomize ? shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]) : [1, 2, 3, 4, 5, 6, 7, 8, 9];
        for (const n of nums) {
          if (isValid(board, r, c, n)) {
            board[r][c] = n;
            if (solveBoard(board, randomize)) return true;
            board[r][c] = 0;
          }
        }
        return false;
      }
    }
  }
  return true;
}

function isValid(board, row, col, num) {
  for (let c = 0; c < 9; c++) if (board[row][c] === num) return false;
  for (let r = 0; r < 9; r++) if (board[r][col] === num) return false;
  const br = Math.floor(row / 3) * 3;
  const bc = Math.floor(col / 3) * 3;
  for (let r = 0; r < 3; r++)
    for (let c = 0; c < 3; c++)
      if (board[br + r][bc + c] === num) return false;
  return true;
}

function countSolutions(board, limit = 2) {
  let count = 0;
  function solve() {
    if (count >= limit) return;
    let fr = -1, fc = -1;
    outer: for (let i = 0; i < 9; i++)
      for (let j = 0; j < 9; j++)
        if (board[i][j] === 0) { fr = i; fc = j; break outer; }
    if (fr === -1) { count++; return; }
    for (let n = 1; n <= 9; n++) {
      if (isValid(board, fr, fc, n)) {
        board[fr][fc] = n;
        solve();
        board[fr][fc] = 0;
        if (count >= limit) return;
      }
    }
  }
  solve();
  return count;
}

function removeCells(solution, clueCount) {
  const puzzle = solution.map(r => [...r]);
  const positions = shuffle(Array.from({ length: 81 }, (_, i) => [Math.floor(i / 9), i % 9]));
  let given = 81;

  for (const [r, c] of positions) {
    if (given <= clueCount) break;
    const val = puzzle[r][c];
    puzzle[r][c] = 0;
    if (countSolutions(puzzle.map(row => [...row])) === 1) {
      given--;
    } else {
      puzzle[r][c] = val;
    }
  }
  return puzzle;
}
