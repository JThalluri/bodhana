let _random = Math.random;

const OP_SYMBOLS = {
  add: '+',
  sub: '-',
  mul: '\u00d7',
  div: '\u00f7',
};

export const DEFAULT_TTT_STATE = {
  difficulty: 'easy',
  operations: {
    add: true,
    sub: true,
    mul: false,
    div: false,
  },
  minDigits: 2,
  maxDigits: 2,
  numOperands: 2,
  multiOperator: false,
  multiplierMinDigits: 1,
  multiplierMaxDigits: 2,
  divisorMinDigits: 1,
  divisorMaxDigits: 2,
  pages: 1,
  gamesPerPage: 1,
  randomSeed: '',
};

export function setTicTacToeSeed(seed) {
  if (!seed) {
    _random = Math.random;
    return;
  }

  let s = 0;
  for (let i = 0; i < seed.length; i++) {
    s = (Math.imul(31, s) + seed.charCodeAt(i)) | 0;
  }
  if (s === 0) s = 1;

  _random = function () {
    s = (Math.imul(1664525, s) + 1013904223) | 0;
    return (s >>> 0) / 0x100000000;
  };
}

function randomInt(min, max) {
  return Math.floor(_random() * (max - min + 1)) + min;
}

function clampInt(value, min, max, fallback) {
  const parsed = parseInt(value, 10);
  const n = Number.isFinite(parsed) ? parsed : fallback;
  return Math.min(max, Math.max(min, n));
}

export function normalizeTicTacToeState(raw = {}) {
  const state = {
    ...DEFAULT_TTT_STATE,
    ...raw,
    operations: {
      ...DEFAULT_TTT_STATE.operations,
      ...(raw.operations || {}),
    },
  };

  state.minDigits = clampInt(state.minDigits, 1, 6, DEFAULT_TTT_STATE.minDigits);
  state.maxDigits = clampInt(state.maxDigits, 1, 6, DEFAULT_TTT_STATE.maxDigits);
  if (state.minDigits > state.maxDigits) state.maxDigits = state.minDigits;

  state.numOperands = clampInt(state.numOperands, 2, 6, DEFAULT_TTT_STATE.numOperands);
  state.multiplierMinDigits = clampInt(state.multiplierMinDigits, 1, 6, DEFAULT_TTT_STATE.multiplierMinDigits);
  state.multiplierMaxDigits = clampInt(state.multiplierMaxDigits, 1, 6, DEFAULT_TTT_STATE.multiplierMaxDigits);
  if (state.multiplierMinDigits > state.multiplierMaxDigits) state.multiplierMaxDigits = state.multiplierMinDigits;

  state.divisorMinDigits = clampInt(state.divisorMinDigits, 1, 6, DEFAULT_TTT_STATE.divisorMinDigits);
  state.divisorMaxDigits = clampInt(state.divisorMaxDigits, 1, 6, DEFAULT_TTT_STATE.divisorMaxDigits);
  if (state.divisorMinDigits > state.divisorMaxDigits) state.divisorMaxDigits = state.divisorMinDigits;

  state.pages = clampInt(state.pages, 1, 10, DEFAULT_TTT_STATE.pages);
  state.gamesPerPage = [1, 2, 4].includes(parseInt(state.gamesPerPage, 10))
    ? parseInt(state.gamesPerPage, 10)
    : DEFAULT_TTT_STATE.gamesPerPage;

  if (!['easy', 'medium', 'hard', 'custom'].includes(state.difficulty)) {
    state.difficulty = DEFAULT_TTT_STATE.difficulty;
  }

  applyDifficultyPreset(state);
  return state;
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
  if (digits <= 1) return randomInt(1, 9);
  const min = Math.pow(10, digits - 1);
  const max = Math.pow(10, digits) - 1;
  return randomInt(min, max);
}

function getActiveOperations(state) {
  const ops = [];
  if (state.operations.add) ops.push(OP_SYMBOLS.add);
  if (state.operations.sub) ops.push(OP_SYMBOLS.sub);
  if (state.operations.mul) ops.push(OP_SYMBOLS.mul);
  if (state.operations.div) ops.push(OP_SYMBOLS.div);
  return ops.length ? ops : [OP_SYMBOLS.add];
}

function getOperandCount(state) {
  if (state.difficulty === 'easy' || state.difficulty === 'medium') return 2;
  if (state.difficulty === 'hard') return randomInt(2, 6);
  return state.numOperands;
}

function getDigitRange(state) {
  if (state.difficulty === 'easy' || state.difficulty === 'medium') {
    const digits = randomInt(state.minDigits, state.maxDigits);
    return { min: digits, max: digits };
  }
  return { min: state.minDigits, max: state.maxDigits };
}

function randomByRange(minDigits, maxDigits) {
  return generateNumberByDigits(randomInt(minDigits, maxDigits));
}

function pickDivisor(total, minDigits, maxDigits) {
  const min = Math.pow(10, minDigits - 1);
  const max = Math.pow(10, maxDigits) - 1;
  const possible = [];

  for (let d = Math.max(2, min); d <= Math.min(max, total - 1); d++) {
    if (total % d === 0) possible.push(d);
  }

  if (!possible.length) return null;
  return possible[randomInt(0, possible.length - 1)];
}

function signatureFor(operands, operators) {
  let signature = String(operands[0]);
  for (let i = 0; i < operators.length; i++) {
    signature += operators[i] + operands[i + 1];
  }
  return signature;
}

function fallbackProblem(activeOps) {
  const op = activeOps[0] || OP_SYMBOLS.add;
  if (op === OP_SYMBOLS.sub) return { operands: [34, 12], operators: [op], answer: 22 };
  if (op === OP_SYMBOLS.mul) return { operands: [12, 3], operators: [op], answer: 36 };
  if (op === OP_SYMBOLS.div) return { operands: [12, 3], operators: [op], answer: 4 };
  return { operands: [12, 34], operators: [op], answer: 46 };
}

export function generateTicTacToeProblem(state, usedProblems = new Set()) {
  const normalized = normalizeTicTacToeState(state);
  const activeOps = getActiveOperations(normalized);

  for (let attempts = 0; attempts < 200; attempts++) {
    const operands = [];
    const operators = [];
    const operandCount = getOperandCount(normalized);
    const digitRange = getDigitRange(normalized);
    const mixed = normalized.multiOperator || normalized.difficulty === 'hard';
    const primaryOp = activeOps[randomInt(0, activeOps.length - 1)];

    for (let i = 0; i < operandCount - 1; i++) {
      operators.push(mixed ? activeOps[randomInt(0, activeOps.length - 1)] : primaryOp);
    }

    let total = randomByRange(digitRange.min, digitRange.max);
    operands.push(total);
    let valid = true;

    for (const op of operators) {
      let nextOperand;

      if (op === OP_SYMBOLS.add) {
        nextOperand = randomByRange(digitRange.min, digitRange.max);
        total += nextOperand;
      } else if (op === OP_SYMBOLS.sub) {
        const min = Math.max(1, Math.pow(10, digitRange.min - 1));
        const max = Math.min(total - 1, Math.pow(10, digitRange.max) - 1);
        if (min > max) {
          valid = false;
          break;
        }
        nextOperand = randomInt(min, max);
        total -= nextOperand;
      } else if (op === OP_SYMBOLS.mul) {
        let minD = normalized.multiplierMinDigits;
        let maxD = normalized.multiplierMaxDigits;
        if (normalized.difficulty === 'easy' || normalized.difficulty === 'medium') {
          minD = digitRange.min;
          maxD = digitRange.max;
        } else if (normalized.difficulty === 'hard') {
          minD = 1;
          maxD = 2;
        }
        nextOperand = randomByRange(minD, maxD);
        total *= nextOperand;
      } else if (op === OP_SYMBOLS.div) {
        let minD = normalized.divisorMinDigits;
        let maxD = normalized.divisorMaxDigits;
        if (normalized.difficulty !== 'custom') {
          minD = 1;
          maxD = 2;
        }
        nextOperand = pickDivisor(total, minD, maxD);
        if (nextOperand === null) {
          valid = false;
          break;
        }
        total /= nextOperand;
      }

      operands.push(nextOperand);
    }

    if (!valid) continue;

    const signature = signatureFor(operands, operators);
    if (!usedProblems.has(signature)) {
      usedProblems.add(signature);
      return { operands, operators, answer: total, signature };
    }
  }

  const fallback = fallbackProblem(activeOps);
  fallback.signature = signatureFor(fallback.operands, fallback.operators);
  usedProblems.add(fallback.signature);
  return fallback;
}

export function generateTicTacToeWorksheet(rawState) {
  const state = normalizeTicTacToeState(rawState);
  setTicTacToeSeed(state.randomSeed);

  const usedProblems = new Set();
  const pages = [];

  for (let pageIndex = 0; pageIndex < state.pages; pageIndex++) {
    const games = [];
    for (let gameIndex = 0; gameIndex < state.gamesPerPage; gameIndex++) {
      const cells = [];
      for (let cellIndex = 0; cellIndex < 9; cellIndex++) {
        cells.push(generateTicTacToeProblem(state, usedProblems));
      }
      games.push(cells);
    }
    pages.push(games);
  }

  return {
    state,
    pages,
    problemCount: usedProblems.size,
  };
}
