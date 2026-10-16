const topicModules = import.meta.glob('./time/topics/*.json', { eager: true, import: 'default' });
const TOPICS = Object.values(topicModules).filter(topic => topic?.topicId);

export const TIME_TYPES = { 'word-problems': 'Word Problems', arithmetic: 'Time Arithmetic' };

function bounded(value, min, max, fallback) {
  const n = Number(value);
  return Math.min(max, Math.max(min, Number.isFinite(n) ? n : fallback));
}

export function timeArithmeticProfile(state) {
  const gradeMax = { all: 720, 1: 240, 2: 720 }[state.grade] || 720;
  const factor = { all: 1, easy: 0.5, medium: 1, hard: 2 }[state.difficulty] || 1;
  return { max: gradeMax * factor, step: { easy: 30, medium: 5, hard: 1, all: 1 }[state.difficulty] || 1 };
}

export function normalizeTimeState(raw = {}) {
  const state = { subType: 'word-problems', grade: 'all', difficulty: 'all', operation: 'mixed',
    minDifference: 0, pages: 1, fontSize: 'm', workspace: true, includeAnswers: true, randomSeed: '', ...raw };
  if (!Object.hasOwn(TIME_TYPES, state.subType)) state.subType = 'word-problems';
  state.grade = String(state.grade);
  if (!['all', '1', '2'].includes(state.grade)) state.grade = 'all';
  if (!['all', 'easy', 'medium', 'hard'].includes(state.difficulty)) state.difficulty = 'all';
  if (!['add', 'sub', 'mixed'].includes(state.operation)) state.operation = 'mixed';
  if (!['s', 'm', 'l', 'xl'].includes(state.fontSize)) state.fontSize = 'm';
  state.pages = Math.floor(bounded(state.pages, 1, 20, 1));
  const { max, step } = timeArithmeticProfile(state);
  state.minDifference = Math.ceil(bounded(state.minDifference, 0, max - step, 0) / step) * step;
  state.randomSeed = String(state.randomSeed || '');
  return state;
}

export function timePool(state) {
  return TOPICS.flatMap(topic => topic.questions || []).filter(q =>
    (state.grade === 'all' || q.grades.includes(Number(state.grade)))
    && (state.difficulty === 'all' || q.difficulty === state.difficulty));
}

export function formatDuration(minutes) {
  return `${Math.floor(minutes / 60)} h ${minutes % 60} min`;
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

export function createTimeGenerator(raw = {}) {
  const state = normalizeTimeState(raw);
  const random = seededRandom(state.randomSeed);
  const int = (min, max) => min + Math.floor(random() * (max - min + 1));
  const pool = timePool(state);
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
        return { id: q.questionId, text: q.question, answer: String(q.answer.value), steps: (q.solutionSteps || []).join(' ') };
      }
      const op = state.operation === 'mixed' ? (random() < 0.5 ? 'add' : 'sub') : state.operation;
      const { max, step } = timeArithmeticProfile(state);
      const limit = max / step;
      const difference = state.minDifference / step;
      // Work in whole minutes, ordering subtraction operands before formatting hours/minutes.
      const b = int(1, op === 'sub' ? limit - difference : limit) * step;
      const a = op === 'sub' ? int(b / step + difference, limit) * step : int(1, limit) * step;
      const answerMinutes = op === 'sub' ? a - b : a + b;
      return { a, b, op, answerMinutes, text: `${formatDuration(a)} ${op === 'sub' ? '-' : '+'} ${formatDuration(b)} =`,
        answer: formatDuration(answerMinutes), steps: '' };
    },
  };
}
