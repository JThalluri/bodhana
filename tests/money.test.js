import { describe, expect, it } from 'vitest';
import { arithmeticLimit, createMoneyGenerator, formatMoney, moneyPool, normalizeMoneyState } from '../src/math-worksheets/money-generator.js';

describe('Money Counting', () => {
  it('filters curated scenarios by native currency, grade and difficulty', () => {
    for (const currency of ['inr', 'usd']) {
      expect(moneyPool(normalizeMoneyState({ currency }))).toHaveLength(75);
      const pool = moneyPool(normalizeMoneyState({ currency, grade: '2', difficulty: 'medium' }));
      expect(pool).toHaveLength(25);
      expect(pool.every(q => q.grades.includes(2) && q.answer.unit === (currency === 'inr' ? 'rupees' : 'dollars'))).toBe(true);
    }
  });

  it('shuffles without repeats until the pool is exhausted and reproduces seeds', () => {
    const raw = { randomSeed: 'money', difficulty: 'easy', currency: 'usd' };
    const a = createMoneyGenerator(raw);
    const b = createMoneyGenerator(raw);
    const ids = [];
    for (let i = 0; i < 100; i++) {
      const q = a.next();
      expect(q).toEqual(b.next());
      ids.push(q.id);
      if (i) expect(q.id).not.toBe(ids[i - 1]);
    }
    expect(new Set(ids.slice(0, 25)).size).toBe(25);
  });

  it('reports an empty filter instead of silently using unrelated questions', () => {
    expect(() => createMoneyGenerator({ grade: 1, difficulty: 'hard' }).next()).toThrow(/No scenarios/);
  });

  it('uses curated answers and solution steps', () => {
    const state = normalizeMoneyState({ currency: 'inr', randomSeed: 'key' });
    const generator = createMoneyGenerator(state);
    for (let i = 0; i < 75; i++) {
      const item = generator.next();
      const source = moneyPool(state).find(q => q.questionId === item.id);
      expect(item.text).toBe(source.question);
      expect(item.answer).toBe(formatMoney(Math.round(Number(source.answer.value) * 100), 'inr'));
      expect(item.steps).toBe(source.solutionSteps.join(' '));
    }
  });

  for (const currency of ['inr', 'usd']) {
    for (const operation of ['add', 'sub', 'mixed']) {
      it(`generates exact ${currency} ${operation} arithmetic with arbitrary cents`, () => {
        const generator = createMoneyGenerator({ subType: 'arithmetic', currency, operation, minDifference: 1.33, randomSeed: 'decimal' });
        const ops = new Set();
        const cents = new Set();
        for (let i = 0; i < 300; i++) {
          const q = generator.next();
          ops.add(q.op);
          cents.add(q.a % 100);
          expect(q.answerCents).toBe(q.op === 'sub' ? q.a - q.b : q.a + q.b);
          expect(q.answer).toBe(formatMoney(q.answerCents, currency));
          if (q.op === 'sub') expect(q.answerCents).toBeGreaterThanOrEqual(133);
        }
        expect(ops.size).toBe(operation === 'mixed' ? 2 : 1);
        expect(cents.size).toBeGreaterThan(30);
      });
    }
  }

  it('clamps impossible differences and malformed settings', () => {
    const generator = createMoneyGenerator({ subType: 'arithmetic', grade: 1, difficulty: 'easy', operation: 'sub', minDifference: 999999, pages: 500 });
    expect(generator.state.pages).toBe(20);
    expect(generator.state.minDifference).toBe((arithmeticLimit(generator.state) - 1) / 100);
    for (let i = 0; i < 20; i++) {
      const q = generator.next();
      expect(q.b).toBeGreaterThan(0);
      expect(q.a).toBeLessThanOrEqual(arithmeticLimit(generator.state));
      expect(q.answerCents).toBe(499);
    }
  });
});
