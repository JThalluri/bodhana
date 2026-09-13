import { shuffle } from '../shared/utils.js';

/**
 * Reads config from the math tool DOM and builds question pools.
 * Returns { pools, combined, papers } or null if no operations selected.
 */
export function generate(config) {
  const pools = buildPools(config);
  const types = selectedTypes(config);
  const combined = types.flatMap(t => pools[t]);

  if (!combined.length) return null;

  const questionCount = Math.min(
    Math.max(1, Math.min(100, config.qPerPaper)),
    combined.length
  );
  const paperCount = Math.max(1, Math.min(20, config.numPapers));

  const papers = Array.from({ length: paperCount }, () =>
    shuffle(combined).slice(0, questionCount)
  );

  return { pools, combined, papers, questionCount, paperCount };
}

function buildPools(c) {
  const pools = { add: [], sub: [], mul: [], div: [] };
  const addSeen = new Set();
  const mulSeen = new Set();

  const [addAMin, addAMax] = normalizeRange(c.addAmin, c.addAmax);
  const [addBMin, addBMax] = normalizeRange(c.addBmin, c.addBmax);
  const [subMMin, subMMax] = normalizeRange(c.subMmin, c.subMmax);
  const [subSMin, subSMax] = normalizeRange(c.subSmin, c.subSmax);
  const [mulAMin, mulAMax] = normalizeRange(c.mulAmin, c.mulAmax);
  const [mulBMin, mulBMax] = normalizeRange(c.mulBmin, c.mulBmax);
  const [divQMin, divQMax] = normalizeRange(c.divQmin, c.divQmax);
  const [divDMin, divDMax] = normalizeRange(Math.max(1, c.divDmin), Math.max(1, c.divDmax));

  for (let a = addAMin; a <= addAMax; a++) {
    for (let b = addBMin; b <= addBMax; b++) {
      addUnique(pools.add, addSeen, `${Math.min(a, b)} + ${Math.max(a, b)}`);
    }
  }

  for (let m = subMMin; m <= subMMax; m++) {
    for (let s = subSMin; s <= subSMax; s++) {
      if (m >= s) pools.sub.push(`${m} − ${s}`);
    }
  }

  for (let a = mulAMin; a <= mulAMax; a++) {
    for (let b = mulBMin; b <= mulBMax; b++) {
      addUnique(pools.mul, mulSeen, `${Math.min(a, b)} × ${Math.max(a, b)}`);
    }
  }

  for (let q = divQMin; q <= divQMax; q++) {
    for (let d = divDMin; d <= divDMax; d++) {
      pools.div.push(`${q * d} ÷ ${d}`);
    }
  }

  return pools;
}

function selectedTypes(c) {
  const checked = [
    c.includeAdd && 'add',
    c.includeSub && 'sub',
    c.includeMul && 'mul',
    c.includeDiv && 'div',
  ].filter(Boolean);
  return c.questionMode === 'single' ? checked.slice(0, 1) : checked;
}

function addUnique(pool, seen, expr) {
  if (!seen.has(expr)) {
    seen.add(expr);
    pool.push(expr);
  }
}

function normalizeRange(a, b) {
  let lo = Math.max(0, a ?? 0);
  let hi = Math.max(0, b ?? 0);
  if (lo > hi) [lo, hi] = [hi, lo];
  return [lo, hi];
}

export const DEFAULTS = {
  addAmin: 0, addAmax: 9, addBmin: 0, addBmax: 9,
  subMmin: 0, subMmax: 20, subSmin: 0, subSmax: 9,
  mulAmin: 0, mulAmax: 10, mulBmin: 0, mulBmax: 10,
  divQmin: 0, divQmax: 10, divDmin: 1, divDmax: 10,
  includeAdd: true, includeSub: true, includeMul: false, includeDiv: false,
  questionMode: 'mix',
  numPapers: 8,
  qPerPaper: 51,
};
