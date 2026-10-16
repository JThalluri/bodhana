import { describe, expect, it } from 'vitest';
import { createTimeGenerator, formatDuration, normalizeTimeState, timeArithmeticProfile, timePool } from '../src/math-worksheets/time-generator.js';

describe('Time Problems', () => {
  it('loads the curated file and filters by grade and difficulty', () => {
    expect(timePool(normalizeTimeState())).toHaveLength(200);
    for (const grade of ['1', '2']) {
      for (const difficulty of ['easy', 'medium', 'hard']) {
        const pool = timePool(normalizeTimeState({ grade, difficulty }));
        expect(pool.length).toBeGreaterThan(0);
        expect(pool.every(q => q.grades.includes(Number(grade)) && q.difficulty === difficulty)).toBe(true);
      }
    }
    expect(timePool({ grade: '3', difficulty: 'all' })).toEqual([]);
  });

  it('preserves all curated answers, including clock times, durations and comparisons', () => {
    const generator = createTimeGenerator({ randomSeed: 'curated' });
    const pool = timePool(generator.state);
    const ids = new Set();
    for (let i = 0; i < pool.length; i++) {
      const item = generator.next();
      const source = pool.find(q => q.questionId === item.id);
      ids.add(item.id);
      expect(item.text).toBe(source.question);
      expect(item.answer).toBe(source.answer.value);
      expect(item.steps).toBe(source.solutionSteps.join(' '));
    }
    expect(ids.size).toBe(pool.length);
  });

  it('reproduces seeds and avoids repeats until each deck is exhausted', () => {
    const raw = { difficulty: 'easy', randomSeed: 'time' };
    const a = createTimeGenerator(raw), b = createTimeGenerator(raw);
    const size = timePool(a.state).length;
    const ids = [];
    for (let i = 0; i < size * 3; i++) {
      const item = a.next();
      expect(item).toEqual(b.next());
      if (i) expect(item.id).not.toBe(ids.at(-1));
      ids.push(item.id);
    }
    for (let i = 0; i < 3; i++) expect(new Set(ids.slice(i * size, (i + 1) * size)).size).toBe(size);
  });

  it('formats durations without decimal hours or wrapping at 24 hours', () => {
    expect(formatDuration(0)).toBe('0 h 0 min');
    expect(formatDuration(59)).toBe('0 h 59 min');
    expect(formatDuration(60)).toBe('1 h 0 min');
    expect(formatDuration(135)).toBe('2 h 15 min');
    expect(formatDuration(1501)).toBe('25 h 1 min');
  });

  for (const grade of ['all', '1', '2']) {
    for (const difficulty of ['all', 'easy', 'medium', 'hard']) {
      for (const operation of ['add', 'sub', 'mixed']) {
        it(`generates exact nonnegative ${grade}/${difficulty}/${operation} arithmetic`, () => {
          const generator = createTimeGenerator({ subType: 'arithmetic', grade, difficulty, operation,
            minDifference: 17, randomSeed: 'minutes' });
          const { max, step } = timeArithmeticProfile(generator.state);
          const ops = new Set();
          for (let i = 0; i < 200; i++) {
            const q = generator.next();
            ops.add(q.op);
            for (const operand of [q.a, q.b]) {
              expect(operand).toBeGreaterThan(0);
              expect(operand).toBeLessThanOrEqual(max);
              expect(operand % step).toBe(0);
            }
            expect(q.answerMinutes).toBe(q.op === 'sub' ? q.a - q.b : q.a + q.b);
            expect(q.answerMinutes).toBeGreaterThanOrEqual(0);
            expect(q.answer).toBe(formatDuration(q.answerMinutes));
            if (q.op === 'sub') expect(q.answerMinutes).toBeGreaterThanOrEqual(generator.state.minDifference);
          }
          expect(ops.size).toBe(operation === 'mixed' ? 2 : 1);
        });
      }
    }
  }

  it('covers carrying, borrowing, and zero differences', () => {
    const a = createTimeGenerator({ subType: 'arithmetic', operation: 'add', randomSeed: 'carry' });
    const s = createTimeGenerator({ subType: 'arithmetic', operation: 'sub', randomSeed: 'borrow' });
    const sums = Array.from({ length: 1000 }, () => a.next());
    const differences = Array.from({ length: 1000 }, () => s.next());
    expect(sums.some(q => q.a % 60 + q.b % 60 >= 60)).toBe(true);
    expect(differences.some(q => q.a % 60 < q.b % 60)).toBe(true);
    expect(differences.some(q => q.answerMinutes === 0)).toBe(true);
  });

  it('clamps impossible settings and minimum differences without negative operands', () => {
    const state = normalizeTimeState({ subType: 'bad', grade: 99, operation: 'bad', difficulty: 'bad',
      fontSize: 'bad', pages: NaN, minDifference: Infinity });
    expect(state).toMatchObject({ subType: 'word-problems', grade: 'all', operation: 'mixed',
      difficulty: 'all', fontSize: 'm', pages: 1, minDifference: 0 });
    const generator = createTimeGenerator({ subType: 'arithmetic', grade: 1, difficulty: 'easy',
      operation: 'sub', minDifference: 999999, pages: 999, randomSeed: 'limit' });
    expect(generator.state.pages).toBe(20);
    expect(generator.state.minDifference).toBe(90);
    for (let i = 0; i < 100; i++) expect(generator.next()).toMatchObject({ a: 120, b: 30, answerMinutes: 90 });
    const one = createTimeGenerator({ subType: 'arithmetic', randomSeed: 'repro' });
    const two = createTimeGenerator({ subType: 'arithmetic', randomSeed: 'repro' });
    for (let i = 0; i < 50; i++) expect(one.next()).toEqual(two.next());
  });
});
