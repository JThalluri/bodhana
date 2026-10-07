import { FRACTION_PRESETS, fractionShapeSVG, fractionText, makeFraction, mixedText, normalizeFractionState, randomInt, setFractionSeed } from '../math-worksheets/fractions-generator.js';

let _random = Math.random;

const OP_SYMBOLS = { add: '+', sub: '-', mul: 'x', div: '/' };

export const DEFAULT_MATH_GAMES_STATE = {
  gameCategory: 'tictactoe',
  mathDomain: 'fractions',
  questionMode: 'numerals',
  gamesPerPage: 4,
  pages: 1,
  fontSize: 'm',
  difficulty: 'easy',
  operations: { add: true, sub: true, mul: false, div: false },
  denomMode: 'unlike',
  minDigits: 2,
  maxDigits: 2,
  numOperands: 2,
  multiOperator: false,
  multiplierMinDigits: 1,
  multiplierMaxDigits: 2,
  divisorMinDigits: 1,
  divisorMaxDigits: 2,
  rangePreset: 'grade5',
  numMin: 1,
  numMax: 8,
  denMin: 2,
  denMax: 12,
  randomSeed: '',
  includeAnswers: true,
};

export function setGameSeed(seed) {
  if (!seed) {
    _random = Math.random;
    setFractionSeed('');
    return;
  }
  let s = 0;
  for (let i = 0; i < seed.length; i++) s = (Math.imul(31, s) + seed.charCodeAt(i)) | 0;
  if (s === 0) s = 1;
  _random = function () {
    s = (Math.imul(1664525, s) + 1013904223) | 0;
    return (s >>> 0) / 0x100000000;
  };
  setFractionSeed(seed);
}

function rand(min, max) {
  return Math.floor(_random() * (max - min + 1)) + min;
}

function clampInt(value, min, max, fallback) {
  const parsed = parseInt(value, 10);
  const n = Number.isFinite(parsed) ? parsed : fallback;
  return Math.min(max, Math.max(min, n));
}

export function normalizeGameState(raw = {}) {
  const state = {
    ...DEFAULT_MATH_GAMES_STATE,
    ...raw,
    operations: { ...DEFAULT_MATH_GAMES_STATE.operations, ...(raw.operations || {}) },
  };
  if (!['tictactoe', 'bingo', 'match', 'snake'].includes(state.gameCategory)) state.gameCategory = 'tictactoe';
  if (!['arithmetic', 'fractions'].includes(state.mathDomain)) state.mathDomain = 'fractions';
  if (!['numerals', 'visual', 'mixed'].includes(state.questionMode)) state.questionMode = 'numerals';
  state.gamesPerPage = [1, 2, 4, 6, 8].includes(parseInt(state.gamesPerPage, 10)) ? parseInt(state.gamesPerPage, 10) : 4;
  state.pages = clampInt(state.pages, 1, 20, 1);
  if (!['s', 'm', 'l', 'xl'].includes(state.fontSize)) state.fontSize = 'm';
  state.minDigits = clampInt(state.minDigits, 1, 6, 2);
  state.maxDigits = clampInt(state.maxDigits, state.minDigits, 6, state.minDigits);
  state.numOperands = clampInt(state.numOperands, 2, 6, 2);
  state.multiplierMinDigits = clampInt(state.multiplierMinDigits, 1, 6, 1);
  state.multiplierMaxDigits = clampInt(state.multiplierMaxDigits, state.multiplierMinDigits, 6, 2);
  state.divisorMinDigits = clampInt(state.divisorMinDigits, 1, 6, 1);
  state.divisorMaxDigits = clampInt(state.divisorMaxDigits, state.divisorMinDigits, 6, 2);
  if (!['easy', 'medium', 'hard', 'custom'].includes(state.difficulty)) state.difficulty = 'easy';
  if (!['same', 'unlike'].includes(state.denomMode)) state.denomMode = 'unlike';
  if (!FRACTION_PRESETS[state.rangePreset]) state.rangePreset = 'grade5';
  const frac = normalizeFractionState(state);
  Object.assign(state, {
    numMin: frac.numMin,
    numMax: frac.numMax,
    denMin: Math.max(2, Math.min(frac.denMin, 16)),
    denMax: Math.max(Math.max(2, Math.min(frac.denMin, 16)), Math.min(frac.denMax, 16)),
  });
  applyDifficultyPreset(state);
  return state;
}

export function applyGameRangePreset(state, presetKey) {
  const preset = FRACTION_PRESETS[presetKey];
  if (!preset || presetKey === 'custom') return normalizeGameState({ ...state, rangePreset: 'custom' });
  return normalizeGameState({ ...state, ...preset, denMax: Math.min(16, preset.denMax), rangePreset: presetKey });
}

function applyDifficultyPreset(state) {
  if (state.difficulty === 'easy') {
    state.numOperands = 2;
    state.multiOperator = false;
  } else if (state.difficulty === 'medium') {
    state.numOperands = 2;
    state.multiOperator = true;
  } else if (state.difficulty === 'hard') {
    state.numOperands = 6;
    state.multiOperator = true;
    state.multiplierMinDigits = 1;
    state.multiplierMaxDigits = Math.min(2, state.maxDigits);
    state.divisorMinDigits = 1;
    state.divisorMaxDigits = 2;
  }
}

function generateNumberByDigits(digits) {
  if (digits <= 1) return rand(1, 9);
  return rand(Math.pow(10, digits - 1), Math.pow(10, digits) - 1);
}

function randomByRange(minDigits, maxDigits) {
  return generateNumberByDigits(rand(minDigits, maxDigits));
}

function getActiveOperations(state) {
  const ops = [];
  if (state.operations.add) ops.push(OP_SYMBOLS.add);
  if (state.operations.sub) ops.push(OP_SYMBOLS.sub);
  if (state.operations.mul) ops.push(OP_SYMBOLS.mul);
  if (state.operations.div) ops.push(OP_SYMBOLS.div);
  return ops.length ? ops : [OP_SYMBOLS.add];
}

function pickDivisor(total, minDigits, maxDigits) {
  const min = Math.pow(10, minDigits - 1);
  const max = Math.pow(10, maxDigits) - 1;
  const possible = [];
  for (let d = Math.max(2, min); d <= Math.min(max, total - 1); d++) {
    if (total % d === 0) possible.push(d);
  }
  return possible.length ? possible[rand(0, possible.length - 1)] : null;
}

function generateArithmeticProblem(state, usedProblems = new Set()) {
  const activeOps = getActiveOperations(state);
  for (let attempts = 0; attempts < 200; attempts++) {
    const operands = [];
    const operators = [];
    const operandCount = state.difficulty === 'hard' ? rand(2, 6) : state.numOperands;
    const digitRange = state.difficulty === 'custom'
      ? { min: state.minDigits, max: state.maxDigits }
      : { min: rand(state.minDigits, state.maxDigits), max: rand(state.minDigits, state.maxDigits) };
    if (digitRange.min > digitRange.max) digitRange.max = digitRange.min;
    const primaryOp = activeOps[rand(0, activeOps.length - 1)];
    for (let i = 0; i < operandCount - 1; i++) {
      operators.push(state.multiOperator || state.difficulty === 'hard' ? activeOps[rand(0, activeOps.length - 1)] : primaryOp);
    }
    let total = randomByRange(digitRange.min, digitRange.max);
    operands.push(total);
    let valid = true;
    for (const op of operators) {
      let nextOperand;
      if (op === '+') {
        nextOperand = randomByRange(digitRange.min, digitRange.max);
        total += nextOperand;
      } else if (op === '-') {
        const min = Math.max(1, Math.pow(10, digitRange.min - 1));
        const max = Math.min(total - 1, Math.pow(10, digitRange.max) - 1);
        if (min > max) { valid = false; break; }
        nextOperand = rand(min, max);
        total -= nextOperand;
      } else if (op === 'x') {
        nextOperand = randomByRange(state.multiplierMinDigits, state.multiplierMaxDigits);
        total *= nextOperand;
      } else {
        nextOperand = pickDivisor(total, state.divisorMinDigits, state.divisorMaxDigits);
        if (nextOperand === null) { valid = false; break; }
        total /= nextOperand;
      }
      operands.push(nextOperand);
    }
    if (!valid) continue;
    const signature = operands.join(',') + operators.join(',');
    if (!usedProblems.has(signature)) {
      usedProblems.add(signature);
      return { kind: 'arithmetic', operands, operators, answer: total };
    }
  }
  return { kind: 'arithmetic', operands: [12, 34], operators: ['+'], answer: 46 };
}

function generateFractionCard(state, used = new Set()) {
  for (let attempts = 0; attempts < 100; attempts++) {
    const f = makeFraction({ ...state, subType: 'identify' });
    const sig = fractionText(f);
    if (used.has(sig)) continue;
    used.add(sig);
    return { kind: 'fraction', fraction: f, answer: sig };
  }
  const f = { n: randomInt(1, 5), d: randomInt(6, 12) };
  return { kind: 'fraction', fraction: f, answer: fractionText(f) };
}

export function renderGamePrompt(item, state) {
  if (item.kind === 'arithmetic') return item.operands.map((operand, idx) => ({ op: idx ? item.operators[idx - 1] : '', operand }));
  if (item.kind === 'fraction-operation') return `${item.leftText} ${item.opLabel} ${item.rightText}`;
  if (state.questionMode === 'visual') return fractionShapeSVG(item.fraction, { shapePreference: 'grid', cap: 16, preserveDenominator: true });
  if (state.questionMode === 'mixed' && _random() > 0.5) return fractionShapeSVG(item.fraction, { shapePreference: 'grid', cap: 16, preserveDenominator: true });
  return item.answer;
}

export function generateMathGames(rawState) {
  const state = normalizeGameState(rawState);
  setGameSeed(state.randomSeed);
  const used = new Set();
  const pages = [];

  for (let pageIndex = 0; pageIndex < state.pages; pageIndex++) {
    const games = [];
    for (let gameIndex = 0; gameIndex < state.gamesPerPage; gameIndex++) {
      games.push(generateGame(state, used));
    }
    pages.push({ type: 'games', games });
  }

  if (state.gameCategory === 'bingo') pages.push(generateBingoCallSheet(state, used));
  if (state.includeAnswers && state.gameCategory === 'match') pages.push(generateMatchAnswerPage(pages));

  return { state, pages };
}

function generateGame(state, used) {
  if (state.gameCategory === 'bingo') return { category: 'bingo', cells: bingoCells(state, used) };
  if (state.gameCategory === 'match') return matchGame(state, used);
  if (state.gameCategory === 'snake') return { category: 'snake', cells: snakeCells(state, used) };
  return {
    category: 'tictactoe',
    cells: Array.from({ length: 9 }, () => {
      if (state.mathDomain === 'arithmetic') return generateArithmeticProblem(state, used);
      if (state.questionMode === 'numerals') return generateFractionOperationProblem(state, used);
      return generateFractionCard(state, used);
    }),
  };
}

function bingoCells(state, used) {
  return Array.from({ length: 25 }, (_, idx) => idx === 12 ? { free: true } : generateFractionCard(state, used));
}

function snakeCells(state, used) {
  return Array.from({ length: 36 }, () => generateFractionCard(state, used));
}

function matchGame(state, used) {
  const pairs = Array.from({ length: 8 }, () => generateFractionCard(state, used));
  const entries = [];
  pairs.forEach((item, index) => {
    entries.push({ ...item, pairId: index, display: 'fraction' });
    entries.push({ ...item, pairId: index, display: 'shape' });
  });
  shuffle(entries);
  return { category: 'match', cells: entries, pairs };
}

function shuffle(items) {
  for (let i = items.length - 1; i > 0; i--) {
    const j = rand(0, i);
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

function generateBingoCallSheet(state) {
  const used = new Set();
  const calls = Array.from({ length: 60 }, () => generateFractionCard(state, used));
  return { type: 'bingo-call', calls };
}

function generateMatchAnswerPage(pages) {
  const mappings = [];
  pages.forEach((page, pageIndex) => {
    page.games?.forEach((game, gameIndex) => {
      if (game.category !== 'match') return;
      const byPair = new Map();
      game.cells.forEach((cell, idx) => {
        const ref = cellRef(idx, 4);
        const entry = byPair.get(cell.pairId) || [];
        entry.push(ref);
        byPair.set(cell.pairId, entry);
      });
      for (const [pairId, refs] of byPair.entries()) {
        const pair = game.pairs[pairId];
        mappings.push({ page: pageIndex + 1, game: gameIndex + 1, refs, answer: pair?.answer || '' });
      }
    });
  });
  return { type: 'match-answers', mappings };
}

function generateFractionOperationProblem(state, used = new Set()) {
  const activeOps = Object.entries(state.operations).filter(([, on]) => on).map(([op]) => op);
  const ops = activeOps.length ? activeOps : ['add'];
  const op = ops[rand(0, ops.length - 1)];
  for (let attempts = 0; attempts < 80; attempts++) {
    const a = makeFraction({ ...state, subType: 'operations' });
    const b = state.denomMode === 'same'
      ? makeFraction({ ...state, subType: 'operations', denMin: a.d, denMax: a.d })
      : makeFraction({ ...state, subType: 'operations' });
    const answer = applyFractionOp(a, b, op);
    if (!answer || answer.n < 0 || answer.d <= 0) continue;
    const signature = `${fractionText(a)}${op}${fractionText(b)}`;
    if (used.has(signature)) continue;
    used.add(signature);
    return {
      kind: 'fraction-operation',
      leftText: fractionText(a),
      rightText: fractionText(b),
      op,
      opLabel: OP_SYMBOLS[op],
      answer: mixedText(answer),
    };
  }
  const a = makeFraction({ ...state, subType: 'operations' });
  const b = makeFraction({ ...state, subType: 'operations' });
  return {
    kind: 'fraction-operation',
    leftText: fractionText(a),
    rightText: fractionText(b),
    op: 'add',
    opLabel: OP_SYMBOLS.add,
    answer: mixedText(applyFractionOp(a, b, 'add')),
  };
}

function applyFractionOp(a, b, op) {
  if (op === 'add') return reduceFraction({ n: a.n * b.d + b.n * a.d, d: a.d * b.d });
  if (op === 'sub') return reduceFraction({ n: a.n * b.d - b.n * a.d, d: a.d * b.d });
  if (op === 'mul') return reduceFraction({ n: a.n * b.n, d: a.d * b.d });
  if (op === 'div' && b.n !== 0) return reduceFraction({ n: a.n * b.d, d: a.d * b.n });
  return null;
}

function reduceFraction(frac) {
  let x = Math.abs(frac.n);
  let y = Math.abs(frac.d);
  while (y) [x, y] = [y, x % y];
  const div = x || 1;
  return { n: frac.n / div, d: Math.abs(frac.d / div) };
}

export function cellRef(index, cols) {
  const row = Math.floor(index / cols);
  const col = index % cols;
  return `${String.fromCharCode(65 + row)}${col + 1}`;
}
