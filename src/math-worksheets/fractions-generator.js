let _random = Math.random;

export const FRACTION_PRESETS = {
  grades34: { label: 'Grades 3-4 (2-8)', numMin: 1, numMax: 5, denMin: 2, denMax: 8 },
  grade5: { label: 'Grade 5 (2-12)', numMin: 1, numMax: 8, denMin: 2, denMax: 12 },
  grades6: { label: 'Grades 6+ (2-20)', numMin: 1, numMax: 12, denMin: 2, denMax: 20 },
  custom: { label: 'Custom' },
};

export const FRACTION_TYPES = {
  identify: 'Identify Fraction',
  shade: 'Shade the Fraction',
  compare: 'Compare Fractions',
  numberline: 'Number Line',
  simplify: 'Simplify Fractions',
  'mixed-to-improper': 'Mixed to Improper',
  'improper-to-mixed': 'Improper to Mixed',
  'decimal-fraction': 'Decimal to Fraction',
  'percent-fraction': 'Percent to Fraction',
  operations: 'Operations Drills',
  'missing-operand': 'Missing Operand',
  'word-problems': 'Word Problems',
};

const DECIMAL_DENOMINATORS = [2, 4, 5, 10, 20, 25, 50, 100];
const OPS = { add: '+', sub: '-', mul: 'x', div: '/' };

export function setFractionSeed(seed) {
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

export function randomInt(min, max) {
  return Math.floor(_random() * (max - min + 1)) + min;
}

function clampInt(value, min, max, fallback) {
  const parsed = parseInt(value, 10);
  const n = Number.isFinite(parsed) ? parsed : fallback;
  return Math.min(max, Math.max(min, n));
}

function gcd(a, b) {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y) [x, y] = [y, x % y];
  return x || 1;
}

function lcm(a, b) {
  return Math.abs(a * b) / gcd(a, b);
}

export function normalizeFractionState(raw = {}) {
  const state = {
    subType: 'identify',
    rangePreset: 'grade5',
    numMin: 1,
    numMax: 8,
    denMin: 2,
    denMax: 12,
    pages: 1,
    fontSize: 'm',
    shapePreference: 'grid',
    questionMode: 'numerals',
    denomMode: 'unlike',
    ops: { add: true, sub: false, mul: false, div: false },
    workspace: true,
    includeAnswers: true,
    wpTopic: 'recipe-scaling',
    currency: 'inr',
    randomSeed: '',
    ...raw,
    ops: { add: true, sub: false, mul: false, div: false, ...(raw.ops || {}) },
  };

  if (!FRACTION_TYPES[state.subType]) state.subType = 'identify';
  if (!FRACTION_PRESETS[state.rangePreset]) state.rangePreset = 'grade5';
  state.pages = clampInt(state.pages, 1, 20, 1);
  if (!['s', 'm', 'l', 'xl'].includes(state.fontSize)) state.fontSize = 'm';
  if (!['grid', 'bar'].includes(state.shapePreference)) state.shapePreference = 'grid';
  if (!['numerals', 'visual', 'mixed'].includes(state.questionMode)) state.questionMode = 'numerals';
  if (!['same', 'unlike'].includes(state.denomMode)) state.denomMode = 'unlike';

  const cap = denominatorCapFor(state.subType);
  state.numMin = clampInt(state.numMin, 1, 100, 1);
  state.numMax = clampInt(state.numMax, state.numMin, 100, state.numMin);
  state.denMin = clampInt(state.denMin, 2, cap, 2);
  state.denMax = clampInt(state.denMax, state.denMin, cap, state.denMin);

  if (state.subType !== 'improper-to-mixed' && state.subType !== 'mixed-to-improper') {
    const properMax = Math.max(1, state.denMax - 1);
    state.numMax = Math.min(state.numMax, properMax);
    state.numMin = Math.min(state.numMin, state.numMax);
  }

  if (state.subType === 'decimal-fraction' || state.subType === 'percent-fraction') {
    state.denMin = 2;
    state.denMax = 100;
  }

  return state;
}

export function denominatorCapFor(subType) {
  if (subType === 'identify' || subType === 'shade' || subType === 'compare') return 16;
  if (subType === 'numberline') return 24;
  return 100;
}

export function capNoteFor(subType) {
  const cap = denominatorCapFor(subType);
  if (cap === 16) return 'Visual shapes are capped at denominator 16.';
  if (cap === 24) return 'Number lines are capped at denominator 24.';
  return '';
}

export function applyRangePreset(state, presetKey) {
  const preset = FRACTION_PRESETS[presetKey];
  if (!preset || presetKey === 'custom') return normalizeFractionState({ ...state, rangePreset: 'custom' });
  return normalizeFractionState({ ...state, ...preset, rangePreset: presetKey });
}

export function makeFraction(state, options = {}) {
  const s = normalizeFractionState(state);
  let d = randomInt(s.denMin, s.denMax);
  let maxN = options.allowImproper ? Math.max(s.numMax, d + s.numMax) : Math.min(s.numMax, d - 1);
  let minN = Math.min(s.numMin, maxN);
  if (options.nonUnit) minN = Math.max(2, minN);
  let n = randomInt(minN, maxN);
  if (!options.allowImproper && n >= d) n = d - 1;
  return reduce({ n, d });
}

function reduce(frac) {
  const sign = frac.n < 0 ? -1 : 1;
  const div = gcd(frac.n, frac.d);
  return { n: sign * Math.abs(frac.n / div), d: Math.abs(frac.d / div) };
}

function add(a, b) {
  return reduce({ n: a.n * b.d + b.n * a.d, d: a.d * b.d });
}

function sub(a, b) {
  return reduce({ n: a.n * b.d - b.n * a.d, d: a.d * b.d });
}

function mul(a, b) {
  return reduce({ n: a.n * b.n, d: a.d * b.d });
}

function div(a, b) {
  return reduce({ n: a.n * b.d, d: a.d * b.n });
}

function compare(a, b) {
  return a.n * b.d - b.n * a.d;
}

export function fractionText(frac) {
  if (frac.d === 1) return String(frac.n);
  return `${frac.n}/${frac.d}`;
}

export function mixedText(frac) {
  const whole = Math.floor(frac.n / frac.d);
  const rem = frac.n % frac.d;
  if (!whole) return fractionText(frac);
  if (!rem) return String(whole);
  return `${whole} ${rem}/${frac.d}`;
}

export function fractionHTML(frac) {
  const f = typeof frac === 'string' ? parseFraction(frac) : frac;
  if (!f) return '';
  if (f.whole) {
    return `<span class="frac-mixed"><span class="frac-whole">${f.whole}</span>${fractionHTML({ n: f.n, d: f.d })}</span>`;
  }
  if (f.d === 1) return `<span class="frac-number">${f.n}</span>`;
  return `<span class="frac-text"><span>${f.n}</span><span>${f.d}</span></span>`;
}

function parseFraction(value) {
  const mixed = /^(\d+)\s+(\d+)\/(\d+)$/.exec(value);
  if (mixed) return { whole: Number(mixed[1]), n: Number(mixed[2]), d: Number(mixed[3]) };
  const simple = /^(-?\d+)\/(\d+)$/.exec(value);
  if (simple) return { n: Number(simple[1]), d: Number(simple[2]) };
  return null;
}

export function fractionShapeSVG(frac, options = {}) {
  const f = options.preserveDenominator ? frac : reduce(frac);
  const d = Math.min(options.cap || 16, Math.max(2, f.d));
  const shaded = Math.min(d, Math.max(0, Math.round((f.n / f.d) * d)));
  if (options.shapePreference === 'bar') {
    const cells = Array.from({ length: d }, (_, i) => {
      const x = (i * 100) / d;
      const w = 100 / d;
      return `<rect x="${x}" y="0" width="${w}" height="100" class="${i < shaded ? 'frac-svg-shaded' : 'frac-svg-empty'}"></rect>
        <line x1="${x + w}" y1="0" x2="${x + w}" y2="100"></line>`;
    }).join('');
    return `<svg class="frac-shape-svg frac-shape-bar" viewBox="0 0 100 100" aria-hidden="true">
      <rect x="0" y="0" width="100" height="100" fill="white"></rect>${cells}
      <rect x="0" y="0" width="100" height="100" fill="none"></rect>
    </svg>`;
  }
  const cols = Math.ceil(Math.sqrt(d));
  const rows = Math.ceil(d / cols);
  const cellW = 100 / cols;
  const cellH = 100 / rows;
  const cells = Array.from({ length: rows * cols }, (_, i) => {
    const x = (i % cols) * cellW;
    const y = Math.floor(i / cols) * cellH;
    const klass = i >= d ? 'frac-svg-unused' : i < shaded ? 'frac-svg-shaded' : 'frac-svg-empty';
    return `<rect x="${x}" y="${y}" width="${cellW}" height="${cellH}" class="${klass}"></rect>`;
  }).join('');
  return `<svg class="frac-shape-svg" viewBox="0 0 100 100" aria-hidden="true">${cells}</svg>`;
}

function numberLineSVG(frac, markOnly = false) {
  const d = Math.min(24, frac.d);
  const n = Math.min(d, frac.n);
  const ticks = Array.from({ length: d + 1 }, (_, i) => {
    const x = 8 + (i * 84) / d;
    return `<line x1="${x}" y1="35" x2="${x}" y2="${i === 0 || i === d ? 48 : 43}"></line>`;
  }).join('');
  const markerX = 8 + (n * 84) / d;
  return `<svg class="frac-numberline-svg" viewBox="0 0 100 62" aria-hidden="true">
    <line x1="8" y1="35" x2="92" y2="35"></line>${ticks}
    <text x="8" y="58">0</text><text x="90" y="58">1</text>
    ${markOnly ? '' : `<path d="M ${markerX} 14 l -5 9 h 10 z" class="frac-marker"></path>`}
  </svg>`;
}

function blank(width = 70) {
  return `<span class="frac-blank" style="min-width:${width}px"></span>`;
}

function operationProblem(state) {
  const active = Object.entries(state.ops).filter(([, on]) => on).map(([op]) => op);
  const ops = active.length ? active : ['add'];
  let selected = ops[randomInt(0, ops.length - 1)];
  for (let attempts = 0; attempts < 40; attempts++) {
    const a = makeFraction(state);
    const b = state.denomMode === 'same' ? makeFraction({ ...state, denMin: a.d, denMax: a.d }) : makeFraction(state);
    let answer = add(a, b);
    if (selected === 'sub') answer = sub(a, b);
    if (selected === 'mul') answer = mul(a, b);
    if (selected === 'div') answer = div(a, b);
    if (answer.n >= 0 && answer.d > 0) return { a, b, op: selected, answer };
  }
  const a = makeFraction(state);
  const b = makeFraction(state);
  return { a, b, op: 'add', answer: add(a, b) };
}

export function generateFractionQuestion(state, topics = []) {
  const s = normalizeFractionState(state);
  if (s.subType === 'identify') {
    const f = makeFraction(s);
    return {
      html: `<span class="frac-visual-prompt">${fractionShapeSVG(f, s)}</span><span>Fraction: ${blank()}</span>`,
      answer: fractionText(f),
    };
  }
  if (s.subType === 'shade') {
    const f = makeFraction(s);
    return {
      html: `<span>Shade ${fractionHTML(f)}</span><span class="frac-visual-prompt">${fractionShapeSVG({ n: 0, d: f.d }, s)}</span>`,
      answer: `${f.n} shaded of ${f.d}`,
    };
  }
  if (s.subType === 'compare') {
    const a = makeFraction(s);
    const b = makeFraction(s);
    const left = s.questionMode === 'visual' ? fractionShapeSVG(a, s) : fractionHTML(a);
    const right = s.questionMode === 'visual' ? fractionShapeSVG(b, s) : fractionHTML(b);
    const diff = compare(a, b);
    return {
      html: `<span class="frac-compare-term">${left}</span><span class="frac-compare-box"></span><span class="frac-compare-term">${right}</span>`,
      answer: diff > 0 ? '>' : diff < 0 ? '<' : '=',
    };
  }
  if (s.subType === 'numberline') {
    const f = makeFraction(s);
    return {
      html: `${numberLineSVG(f)}<span>Coordinate: ${blank()}</span>`,
      answer: fractionText(f),
    };
  }
  if (s.subType === 'simplify') {
    const base = makeFraction(s, { nonUnit: true });
    const factor = randomInt(2, 6);
    const unsimplified = { n: base.n * factor, d: base.d * factor };
    return {
      html: `${fractionHTML(unsimplified)} = ${blank(90)}`,
      answer: fractionText(base),
    };
  }
  if (s.subType === 'mixed-to-improper') {
    const whole = randomInt(1, 5);
    const frac = makeFraction(s);
    return {
      html: `${whole} ${fractionHTML(frac)} = ${blank(90)}`,
      answer: fractionText({ n: whole * frac.d + frac.n, d: frac.d }),
    };
  }
  if (s.subType === 'improper-to-mixed') {
    const whole = randomInt(1, 5);
    const frac = makeFraction(s);
    const improper = { n: whole * frac.d + frac.n, d: frac.d };
    return {
      html: `${fractionHTML(improper)} = ${blank(90)}`,
      answer: `${whole} ${fractionText(frac)}`,
    };
  }
  if (s.subType === 'decimal-fraction' || s.subType === 'percent-fraction') {
    const d = DECIMAL_DENOMINATORS[randomInt(0, DECIMAL_DENOMINATORS.length - 1)];
    const n = randomInt(1, d - 1);
    const f = reduce({ n, d });
    const decimal = (f.n / f.d).toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
    const percent = `${Math.round((f.n / f.d) * 100)}%`;
    const prompt = s.subType === 'decimal-fraction' ? decimal : percent;
    return {
      html: `${prompt} = ${blank(90)}`,
      answer: fractionText(f),
    };
  }
  if (s.subType === 'operations') {
    const p = operationProblem(s);
    return {
      html: `${fractionHTML(p.a)} ${OPS[p.op]} ${fractionHTML(p.b)} = ${blank(90)}`,
      answer: mixedText(p.answer),
    };
  }
  if (s.subType === 'missing-operand') {
    const p = operationProblem({ ...s, ops: { add: true, sub: false, mul: false, div: false } });
    return {
      html: `${fractionHTML(p.a)} + ${blank(70)} = ${fractionHTML(p.answer)}`,
      answer: fractionText(p.b),
    };
  }
  return wordProblemQuestion(s, topics);
}

function wordProblemQuestion(state, topics) {
  const topic = topics.find(t => t.topicId === state.wpTopic) || topics[0];
  const questions = topic?.questions || [];
  if (!questions.length) return { html: 'No questions in this topic.', answer: '' };
  const item = questions[randomInt(0, questions.length - 1)];
  const answer = item.answer?.unit ? `${item.answer.value} ${localizedCurrencyText(item.answer.unit, state)}` : (item.answer?.value || '');
  const steps = (item.solutionSteps || []).map(step => renderFractionMarkers(localizedCurrencyText(step, state))).join(' ');
  return {
    html: renderFractionMarkers(localizedCurrencyText(item.question || '', state)),
    answer: steps ? `${answer} [${steps}]` : answer,
  };
}

function localizedCurrencyText(text, state) {
  if (state.currency !== 'usd') return String(text);
  return String(text)
    .replace(/â‚¹/g, '$')
    .replace(/₹/g, '$')
    .replace(/\brupees\b/gi, 'dollars')
    .replace(/\brupee\b/gi, 'dollar')
    .replace(/\bpaise\b/gi, 'cents')
    .replace(/\bpaisa\b/gi, 'cent');
}

export function renderFractionMarkers(text) {
  return String(text).replace(/\{frac:([^}]+)\}/g, (_, raw) => fractionHTML(raw.trim()));
}

export function generateFractionQuestions(rawState, topics = [], targetCount = 160) {
  const state = normalizeFractionState(rawState);
  setFractionSeed(state.randomSeed);
  const questions = [];
  for (let i = 0; i < targetCount; i++) {
    questions.push(generateFractionQuestion(state, topics));
  }
  return { state, questions };
}

export function commonDenominatorAllowed(a, b) {
  return lcm(a.d, b.d) <= 144;
}
