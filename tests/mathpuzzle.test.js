import { describe, expect, it } from 'vitest';
import { DEFAULTS } from '../src/math/generator.js';
import { buildEquationPool, generatePuzzle } from '../src/mathpuzzle/generator.js';

const subtraction = overrides => ({ ...DEFAULTS, includeAdd: false, includeSub: true,
  includeMul: false, includeDiv: false, ...overrides });

describe('Math puzzle subtraction minimum difference', () => {
  it('filters by the minimum difference, including the exact boundary', () => {
    const equations = buildEquationPool(subtraction({ subMinDiff: 7 }));
    expect(equations.length).toBeGreaterThan(0);
    expect(equations.every(eq => eq.op === '−' && eq.c === eq.a - eq.b && eq.c >= 7)).toBe(true);
    expect(equations).toContainEqual({ op: '−', a: 7, b: 0, c: 7 });
    expect(equations).not.toContainEqual({ op: '−', a: 7, b: 1, c: 6 });
  });

  it('preserves zero differences when omitted or explicitly zero', () => {
    for (const subMinDiff of [undefined, null, 0]) {
      const equations = buildEquationPool(subtraction({ subMmin: 0, subMmax: 2, subSmin: 0, subSmax: 2, subMinDiff }));
      expect(equations).toHaveLength(6);
      expect(equations.filter(eq => eq.c === 0)).toHaveLength(3);
      expect(equations.every(eq => eq.c >= 0)).toBe(true);
    }
  });

  it.each([-20, -Infinity, NaN, 'invalid', ''])('keeps negative results out for malformed minimum %s', subMinDiff => {
    const equations = buildEquationPool(subtraction({ subMmin: 0, subMmax: 3, subSmin: 0, subSmax: 5, subMinDiff }));
    expect(equations).toHaveLength(10);
    expect(equations.every(eq => eq.a >= eq.b && eq.c >= 0)).toBe(true);
  });

  it('accepts numeric strings and fractional thresholds without rounding below them', () => {
    for (const subMinDiff of ['7', 6.5]) {
      const equations = buildEquationPool(subtraction({ subMinDiff }));
      expect(equations.length).toBeGreaterThan(0);
      expect(equations.every(eq => eq.c >= 7)).toBe(true);
    }
  });

  it('normalizes reversed and negative operand ranges without negative totals', () => {
    const equations = buildEquationPool(subtraction({ subMmin: 10, subMmax: -5, subSmin: 8, subSmax: -2, subMinDiff: 3 }));
    expect(equations.length).toBeGreaterThan(0);
    expect(equations.every(eq => eq.a >= 0 && eq.b >= 0 && eq.c >= 3 && eq.c === eq.a - eq.b)).toBe(true);
  });

  it.each([21, Infinity])('returns no subtraction puzzle for impossible minimum %s', subMinDiff => {
    const config = subtraction({ subMinDiff });
    expect(buildEquationPool(config)).toEqual([]);
    expect(generatePuzzle(config, 10)).toBeNull();
  });

  it('returns no equations when every minuend is below every subtrahend', () => {
    expect(buildEquationPool(subtraction({ subMmin: 0, subMmax: 3, subSmin: 4, subSmax: 8, subMinDiff: -1 }))).toEqual([]);
  });

  it('does not filter other operations or reintroduce disabled subtraction', () => {
    const config = { ...DEFAULTS, includeAdd: true, includeMul: true, includeDiv: true };
    const other = buildEquationPool({ ...config, includeSub: false });
    expect(buildEquationPool({ ...config, subMinDiff: 999 })).toEqual(other);
    expect(buildEquationPool({ ...config, includeSub: false, subMinDiff: 7 })).toEqual(other);
    expect(other.every(eq => Number.isFinite(eq.c) && eq.c >= 0)).toBe(true);
  });

  it.each(['easy', 'medium', 'hard'])('keeps generated %s puzzle values nonnegative and subtraction answers above the minimum', difficulty => {
    const config = subtraction({ difficulty, subMmin: 12, subMmax: 12, subSmin: 4, subSmax: 4, subMinDiff: 8 });
    const puzzle = generatePuzzle(config, 10);
    expect(puzzle.equationCount).toBe(1);
    const cells = puzzle.grid.flat().filter(Boolean);
    expect(cells.filter(cell => cell.type === 'num').map(cell => Number(cell.value)).sort((a, b) => a - b)).toEqual([4, 8, 12]);
  });
});
