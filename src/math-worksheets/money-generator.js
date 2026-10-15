const topicModules = import.meta.glob('./money/topics/*.json', { eager: true, import: 'default' });
const TOPICS = Object.values(topicModules)
  .filter(topic => topic?.topicId)
  .sort((a, b) => a.title.localeCompare(b.title));

export const MONEY_TYPES = { 'word-problems': 'Word Problems', arithmetic: 'Money Arithmetic' };

function bounded(value, min, max, fallback) {
  const n = Number(value);
  return Math.min(max, Math.max(min, Number.isFinite(n) ? n : fallback));
}

export function normalizeMoneyState(raw = {}) {
  const state = {
    subType: 'word-problems', currency: 'inr', grade: 'all', difficulty: 'all',
    operation: 'mixed', minDifference: 0, pages: 1, fontSize: 'm',
    workspace: true, includeAnswers: true, randomSeed: '', ...raw,
  };
  if (!Object.hasOwn(MONEY_TYPES, state.subType)) state.subType = 'word-problems';
  if (!['inr', 'usd'].includes(state.currency)) state.currency = 'inr';
  state.grade = String(state.grade);
  if (!['all', '1', '2', '3', '4'].includes(state.grade)) state.grade = 'all';
  if (!['all', 'easy', 'medium', 'hard'].includes(state.difficulty)) state.difficulty = 'all';
  if (!['add', 'sub', 'mixed'].includes(state.operation)) state.operation = 'mixed';
  if (!['s', 'm', 'l', 'xl'].includes(state.fontSize)) state.fontSize = 'm';
  state.pages = Math.floor(bounded(state.pages, 1, 20, 1));
  state.minDifference = Math.round(bounded(state.minDifference, 0, (arithmeticLimit(state) - 1) / 100, 0) * 100) / 100;
  state.randomSeed = String(state.randomSeed || '');
  return state;
}

export function arithmeticLimit(state) {
  const gradeMax = { all: 10000, 1: 1000, 2: 5000, 3: 10000, 4: 100000 }[state.grade] || 10000;
  const factor = { all: 1, easy: 0.5, medium: 1, hard: 2 }[state.difficulty] || 1;
  return Math.round(gradeMax * factor);
}

export function moneyPool(state) {
  const unit = state.currency === 'usd' ? 'dollars' : 'rupees';
  return TOPICS.flatMap(topic => topic.questions || []).filter(q => q.answer.unit === unit
    && (state.grade === 'all' || q.grades.includes(Number(state.grade)))
    && (state.difficulty === 'all' || q.difficulty === state.difficulty));
}

export function formatMoney(cents, currency) {
  return `${currency === 'usd' ? '$' : '\u20b9'}${(cents / 100).toFixed(2)}`;
}

function seededRandom(seed) {
  if (!seed) return Math.random;
  let s = 1;
  for (const char of seed) s = (Math.imul(31, s) + char.charCodeAt(0)) | 0;
  return () => {
    s = (Math.imul(1664525, s) + 1013904223) | 0;
    return (s >>> 0) / 0x100000000;
  };
}

export function createMoneyGenerator(raw = {}) {
  const state = normalizeMoneyState(raw);
  const random = seededRandom(state.randomSeed);
  const int = (min, max) => min + Math.floor(random() * (max - min + 1));
  const pool = moneyPool(state);
  let deck = [];
  let previousId;
  return {
    state,
    next() {
      if (state.subType === 'word-problems') {
        if (!pool.length) throw new Error('No scenarios match this grade and difficulty. Choose another difficulty.');
        if (!deck.length) {
          deck = [...pool];
          for (let i = deck.length - 1; i > 0; i--) {
            const j = int(0, i);
            [deck[i], deck[j]] = [deck[j], deck[i]];
          }
          if (deck.length > 1 && deck.at(-1).questionId === previousId) {
            [deck[0], deck[deck.length - 1]] = [deck.at(-1), deck[0]];
          }
        }
        const q = deck.pop();
        previousId = q.questionId;
        return { id: q.questionId, text: q.question,
          answer: formatMoney(Math.round(Number(q.answer.value) * 100), state.currency),
          steps: (q.solutionSteps || []).join(' ') };
      }
      const op = state.operation === 'mixed' ? (random() < 0.5 ? 'add' : 'sub') : state.operation;
      const max = arithmeticLimit(state);
      const diff = Math.round(state.minDifference * 100);
      // Generate in cents/paise so subtraction and answer keys remain exact.
      const b = int(1, op === 'sub' ? max - diff : max);
      const a = op === 'sub' ? int(b + diff, max) : int(1, max);
      const answerCents = op === 'sub' ? a - b : a + b;
      return { a, b, op, answerCents,
        text: `${formatMoney(a, state.currency)} ${op === 'sub' ? '-' : '+'} ${formatMoney(b, state.currency)} =`,
        answer: formatMoney(answerCents, state.currency), steps: '' };
    },
  };
}
