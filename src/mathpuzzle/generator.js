import { shuffle } from '../shared/utils.js';

export const DIFFICULTY_SETTINGS = {
  easy:   { gridSize: 14, targetDefault: 10, blankMode: 'result'    },
  medium: { gridSize: 18, targetDefault: 18, blankMode: 'any_num'   },
  hard:   { gridSize: 22, targetDefault: 25, blankMode: 'num_or_op' },
};

export function buildEquationPool(config) {
  const equations = [];
  const seen = new Set();

  const norm = (a, b) => {
    let lo = Math.max(0, a ?? 0), hi = Math.max(0, b ?? 0);
    if (lo > hi) [lo, hi] = [hi, lo];
    return [lo, hi];
  };
  const dedup = (eq) => {
    const key = `${eq.a}${eq.op}${eq.b}`;
    if (!seen.has(key)) { seen.add(key); equations.push(eq); }
  };

  if (config.includeAdd) {
    const [aMin, aMax] = norm(config.addAmin, config.addAmax);
    const [bMin, bMax] = norm(config.addBmin, config.addBmax);
    for (let a = aMin; a <= aMax; a++)
      for (let b = bMin; b <= bMax; b++) {
        const [x, y] = a <= b ? [a, b] : [b, a];
        dedup({ op: '+', a: x, b: y, c: x + y });
      }
  }

  if (config.includeSub) {
    const [mMin, mMax] = norm(config.subMmin, config.subMmax);
    const [sMin, sMax] = norm(config.subSmin, config.subSmax);
    for (let m = mMin; m <= mMax; m++)
      for (let s = sMin; s <= sMax; s++)
        if (m >= s) dedup({ op: '−', a: m, b: s, c: m - s });
  }

  if (config.includeMul) {
    const [aMin, aMax] = norm(config.mulAmin, config.mulAmax);
    const [bMin, bMax] = norm(config.mulBmin, config.mulBmax);
    for (let a = aMin; a <= aMax; a++)
      for (let b = bMin; b <= bMax; b++) {
        const [x, y] = a <= b ? [a, b] : [b, a];
        dedup({ op: '×', a: x, b: y, c: x * y });
      }
  }

  if (config.includeDiv) {
    const [qMin, qMax] = norm(config.divQmin, config.divQmax);
    const dMin = Math.max(1, config.divDmin ?? 1);
    const dMax = Math.max(dMin, config.divDmax ?? 10);
    for (let q = qMin; q <= qMax; q++)
      for (let d = dMin; d <= dMax; d++)
        dedup({ op: '÷', a: q * d, b: d, c: q });
  }

  return equations;
}

export function generatePuzzle(config, targetCount) {
  const diff = DIFFICULTY_SETTINGS[config.difficulty] ?? DIFFICULTY_SETTINGS.medium;
  const gridSize = Math.min(26, diff.gridSize);
  const pool = shuffle(buildEquationPool(config));

  if (pool.length === 0) return null;

  const grid = Array.from({ length: gridSize }, () => new Array(gridSize).fill(null));
  const placed = [];

  const firstEq = pool[0];
  const firstCol = Math.floor((gridSize - 5) / 2);
  const firstRow = Math.floor(gridSize / 2);
  doPlace(grid, firstEq, firstRow, firstCol, 'h', 0);
  placed.push({ eq: firstEq, row: firstRow, col: firstCol, dir: 'h' });

  const target = Math.max(1, Math.min(targetCount ?? diff.targetDefault, pool.length));
  for (let i = 1; i < pool.length && placed.length < target; i++) {
    const eq = pool[i];
    const intersections = findIntersections(grid, eq, gridSize);
    let p = null;
    if (intersections.length) {
      p = intersections[Math.floor(Math.random() * intersections.length)];
    } else {
      const free = findFreePlacements(grid, eq, gridSize);
      if (free.length) p = free[Math.floor(Math.random() * free.length)];
    }
    if (p) {
      doPlace(grid, eq, p.row, p.col, p.dir, placed.length);
      placed.push({ eq, ...p });
    }
  }

  applyBlanks(grid, placed, diff);
  return cropGrid(grid, placed, gridSize);
}

function eqVals(eq) {
  return [String(eq.a), eq.op, String(eq.b), '=', String(eq.c)];
}

const CELL_TYPES = ['num', 'op', 'num', 'eq', 'num'];

function cellCoord(row, col, dir, i) {
  return dir === 'h' ? [row, col + i] : [row + i, col];
}

function isValidPlacement(grid, eq, startRow, startCol, dir, gs) {
  const vals = eqVals(eq);
  for (let i = 0; i < 5; i++) {
    const [r, c] = cellCoord(startRow, startCol, dir, i);
    if (r < 0 || r >= gs || c < 0 || c >= gs) return false;
    const cell = grid[r][c];
    if (cell !== null && cell.value !== vals[i]) return false;

    // Perpendicular isolation: if this cell is empty (not an intersection),
    // its perpendicular neighbours must also be empty. This prevents cells
    // from different equations sitting adjacent in the same row/column,
    // which creates false equation readings (e.g. "13 = 8").
    if (cell === null) {
      if (dir === 'h') {
        if (r > 0    && grid[r - 1][c] !== null) return false;
        if (r < gs-1 && grid[r + 1][c] !== null) return false;
      } else {
        if (c > 0    && grid[r][c - 1] !== null) return false;
        if (c < gs-1 && grid[r][c + 1] !== null) return false;
      }
    }
  }
  const [bR, bC] = dir === 'h' ? [startRow, startCol - 1] : [startRow - 1, startCol];
  const [aR, aC] = dir === 'h' ? [startRow, startCol + 5] : [startRow + 5, startCol];
  if (bR >= 0 && bC >= 0 && bR < gs && bC < gs && grid[bR][bC] !== null) return false;
  if (aR >= 0 && aC >= 0 && aR < gs && aC < gs && grid[aR][aC] !== null) return false;
  return true;
}

function findIntersections(grid, eq, gs) {
  const vals = eqVals(eq);
  const result = [];
  for (let i = 0; i < 5; i++) {
    const v = vals[i];
    for (let r = 0; r < gs; r++) {
      for (let c = 0; c < gs; c++) {
        if (grid[r][c]?.value !== v) continue;
        if (isValidPlacement(grid, eq, r, c - i, 'h', gs)) result.push({ row: r, col: c - i, dir: 'h' });
        if (isValidPlacement(grid, eq, r - i, c, 'v', gs)) result.push({ row: r - i, col: c, dir: 'v' });
      }
    }
  }
  return result;
}

function findFreePlacements(grid, eq, gs) {
  const result = [];
  for (let r = 0; r < gs; r++)
    for (let c = 0; c < gs; c++) {
      if (isValidPlacement(grid, eq, r, c, 'h', gs)) result.push({ row: r, col: c, dir: 'h' });
      if (isValidPlacement(grid, eq, r, c, 'v', gs)) result.push({ row: r, col: c, dir: 'v' });
    }
  return result;
}

function doPlace(grid, eq, startRow, startCol, dir, eqId) {
  const vals = eqVals(eq);
  for (let i = 0; i < 5; i++) {
    const [r, c] = cellCoord(startRow, startCol, dir, i);
    if (grid[r][c] === null) {
      grid[r][c] = { value: vals[i], type: CELL_TYPES[i], eqIds: new Set([eqId]) };
    } else {
      grid[r][c].eqIds.add(eqId);
    }
  }
}

function applyBlanks(grid, placed, diff) {
  for (const { eq, row, col, dir } of placed) {
    const freeNumPos = [0, 2, 4].filter(i => {
      const [r, c] = cellCoord(row, col, dir, i);
      return grid[r]?.[c]?.eqIds.size === 1;
    });

    const [opR, opC] = cellCoord(row, col, dir, 1);
    const opIsFree = grid[opR]?.[opC]?.eqIds.size === 1;

    if (diff.blankMode === 'num_or_op' && opIsFree && isOperatorUnambiguous(eq)) {
      if (freeNumPos.length === 0 || Math.random() < 0.5) {
        grid[opR][opC].blank = true;
        continue;
      }
    }

    if (freeNumPos.length === 0) continue;

    let targetPos;
    if (diff.blankMode === 'result') {
      targetPos = freeNumPos.includes(4) ? 4 : freeNumPos[Math.floor(Math.random() * freeNumPos.length)];
    } else {
      targetPos = shuffle([...freeNumPos])[0];
    }
    const [r, c] = cellCoord(row, col, dir, targetPos);
    grid[r][c].blank = true;
  }
}

function isOperatorUnambiguous(eq) {
  const { a, b, c } = eq;
  let count = 0;
  if (a + b === c) count++;
  if (a - b === c) count++;
  if (a * b === c) count++;
  if (b !== 0 && Number.isInteger(a / b) && a / b === c) count++;
  return count === 1;
}

function cropGrid(grid, placed, gridSize) {
  let minR = gridSize, maxR = -1, minC = gridSize, maxC = -1;
  for (let r = 0; r < gridSize; r++)
    for (let c = 0; c < gridSize; c++)
      if (grid[r][c] !== null) {
        if (r < minR) minR = r;
        if (r > maxR) maxR = r;
        if (c < minC) minC = c;
        if (c > maxC) maxC = c;
      }

  if (maxR < 0) return null;

  const contentRows = maxR - minR + 1;
  const contentCols = maxC - minC + 1;

  // Pad to a square so the grid always has equal rows and columns
  const size = Math.max(contentRows, contentCols);
  const padTop  = Math.floor((size - contentRows) / 2);
  const padLeft = Math.floor((size - contentCols) / 2);

  const result = Array.from({ length: size }, (_, r) =>
    Array.from({ length: size }, (_, c) => {
      const srcR = r - padTop;
      const srcC = c - padLeft;
      if (srcR < 0 || srcR >= contentRows || srcC < 0 || srcC >= contentCols) return null;
      return grid[minR + srcR][minC + srcC];
    })
  );
  return { grid: result, rows: size, cols: size, equationCount: placed.length };
}
