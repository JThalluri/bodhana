// ─── PRNG ─────────────────────────────────────────────────────────────────────
// Seeded LCG so the same seed always produces the same worksheets.

let _random = Math.random;

export function setSeed(seed) {
  if (!seed) { _random = Math.random; return; }
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

// ─── Number generation ────────────────────────────────────────────────────────

function hasUniqueDigits(n) {
  const d = String(n).split('');
  return new Set(d).size === d.length;
}

export function generateNumber(state, requireUnique = false) {
  const { minDigits, maxDigits, includeDecimals, decimalPlaces, decimalMix } = state;
  const numDigits = randomInt(
    Math.min(minDigits, maxDigits),
    Math.max(minDigits, maxDigits)
  );
  const lo = Math.pow(10, numDigits - 1);
  const hi = Math.pow(10, numDigits) - 1;

  let intPart;
  if (requireUnique) {
    let attempts = 0;
    do {
      intPart = randomInt(lo, hi);
      attempts++;
    } while (attempts < 100 && !hasUniqueDigits(intPart));
  } else {
    intPart = randomInt(lo, hi);
  }

  let decPart = 0, decPlaces = 0;
  if (includeDecimals) {
    decPlaces = decimalMix ? randomInt(0, decimalPlaces) : decimalPlaces;
    if (decPlaces > 0) {
      decPart = randomInt(1, Math.pow(10, decPlaces) - 1);
    }
  }

  return { intPart, decPart, decPlaces };
}

// ─── Formatting ──────────────────────────────────────────────────────────────

export function getLocaleStr(state) {
  return state.locale === 'in' ? 'en-IN' : 'en-US';
}

export function formatNumber(numObj, state, forceDecimals = null) {
  const { intPart, decPart, decPlaces } = numObj;
  const dp = forceDecimals !== null ? forceDecimals : decPlaces;
  const locale = getLocaleStr(state);

  if (dp === 0 || decPart === 0) {
    return new Intl.NumberFormat(locale).format(intPart);
  }

  const fullNum = intPart + decPart / Math.pow(10, dp);
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: dp,
    maximumFractionDigits: dp,
  }).format(fullNum);
}

function fmtInt(n, locale) {
  return new Intl.NumberFormat(locale).format(n);
}

// ─── Place value names ────────────────────────────────────────────────────────

export function getPlaceValueName(position, locale) {
  const us = ['Ones','Tens','Hundreds','Thousands','Ten Thousands',
              'Hundred Thousands','Millions','Ten Millions','Hundred Millions','Billions'];
  const indian = ['Ones','Tens','Hundreds','Thousands','Ten Thousands',
                  'Lakhs','Ten Lakhs','Crores','Ten Crores','Hundred Crores'];
  const names = locale === 'in' ? indian : us;
  return names[position] ?? `10^${position}`;
}

export function getPlaceValue(position) {
  return Math.pow(10, position);
}

// ─── Number → words ───────────────────────────────────────────────────────────

const _ones = ['','one','two','three','four','five','six','seven','eight','nine',
               'ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen',
               'seventeen','eighteen','nineteen'];
const _tens = ['','','twenty','thirty','forty','fifty','sixty','seventy','eighty','ninety'];

function _below100(n) {
  if (n === 0) return '';
  if (n < 20) return _ones[n];
  return _tens[Math.floor(n / 10)] + (n % 10 ? '-' + _ones[n % 10] : '');
}

function _below1000(n) {
  if (n === 0) return '';
  if (n < 100) return _below100(n);
  return _ones[Math.floor(n / 100)] + ' hundred' + (n % 100 ? ' ' + _below100(n % 100) : '');
}

export function numberToWordsUS(num) {
  if (num === 0) return 'zero';
  if (num < 0) return 'negative ' + numberToWordsUS(-num);
  let n = num, parts = [];
  if (n >= 1e9) { parts.push(_below1000(Math.floor(n / 1e9)) + ' billion'); n %= 1e9; }
  if (n >= 1e6) { parts.push(_below1000(Math.floor(n / 1e6)) + ' million'); n %= 1e6; }
  if (n >= 1e3) { parts.push(_below1000(Math.floor(n / 1e3)) + ' thousand'); n %= 1e3; }
  if (n > 0)    { parts.push(_below1000(n)); }
  return parts.join(' ');
}

export function numberToWordsIN(num) {
  if (num === 0) return 'zero';
  if (num < 0) return 'negative ' + numberToWordsIN(-num);
  let n = num, parts = [];
  if (n >= 1e7) { parts.push(_below100(Math.floor(n / 1e7)) + ' crore'); n %= 1e7; }
  if (n >= 1e5) { parts.push(_below100(Math.floor(n / 1e5)) + ' lakh'); n %= 1e5; }
  if (n >= 1e3) { parts.push(_below1000(Math.floor(n / 1e3)) + ' thousand'); n %= 1e3; }
  if (n >= 100) { parts.push(_ones[Math.floor(n / 100)] + ' hundred'); n %= 100; }
  if (n > 0)    { parts.push(_below100(n)); }
  return parts.join(' ');
}

// ─── Base-ten blocks ──────────────────────────────────────────────────────────

export function getBaseTenBlocks(num) {
  const n = Math.abs(Math.floor(num)) % 1000;
  const hundreds = Math.floor(n / 100);
  const tens     = Math.floor((n % 100) / 10);
  const ones     = n % 10;

  let html = '<div class="bt-blocks">';
  for (let i = 0; i < hundreds; i++) html += '<div class="bt-hundreds"></div>';
  for (let i = 0; i < tens; i++)     html += '<div class="bt-tens"></div>';
  for (let i = 0; i < ones; i++)     html += '<div class="bt-ones"></div>';
  html += '</div>';
  return html;
}

// ─── Worksheet type generators ────────────────────────────────────────────────
// Each returns { question: HTML string, answer: plain string }

export function generateType1(state) {
  const numObj = generateNumber(state, true);
  const locale = getLocaleStr(state);
  const numStr  = String(numObj.intPart);
  const pos     = randomInt(0, numStr.length - 1);
  const digit   = numStr[pos];
  const placeFromRight = numStr.length - 1 - pos;
  const value   = parseInt(digit) * getPlaceValue(placeFromRight);
  const formatted   = formatNumber(numObj, state, 0);
  const valueFmt    = fmtInt(value, locale);

  return {
    question: `What is the value of the <strong>${digit}</strong> in the number ${formatted}?
      <span class="solution-text">${valueFmt}</span>`,
    answer: `${valueFmt}`,
  };
}

export function generateType2(state) {
  const s = { ...state, includeDecimals: false };
  const numObj    = generateNumber(s);
  const locale    = getLocaleStr(state);
  const formatted = formatNumber(numObj, s, 0);
  const numStr    = String(numObj.intPart);
  const numDigits = numStr.length;

  let headers = '', cells = '';
  const expandParts = [];

  for (let i = numDigits - 1; i >= 0; i--) {
    const digit = parseInt(numStr[numDigits - 1 - i]);
    headers += `<th>${getPlaceValueName(i, state.locale)}</th>`;
    cells   += `<td><span class="solution-text">${digit}</span>&nbsp;&nbsp;</td>`;
    if (digit > 0) {
      expandParts.push(fmtInt(digit * getPlaceValue(i), locale));
    }
  }

  const expandedAns = expandParts.join(' + ');

  return {
    question: `<div style="margin-bottom:6px;font-weight:700">${formatted}</div>
      <table class="pv-chart"><thead><tr>${headers}</tr></thead>
      <tbody><tr>${cells}</tr></tbody></table>
      <div style="margin-top:8px">Expanded form:
        <span class="solution-text">${expandedAns}</span>
        <span class="pv-blank" style="min-width:160px"></span>
      </div>`,
    answer: `${formatted} = ${expandedAns}`,
  };
}

export function generateType3(state) {
  const numObj  = generateNumber(state);
  const locale  = getLocaleStr(state);
  const numStr  = String(numObj.intPart);
  const parts   = [];

  for (let i = 0; i < numStr.length; i++) {
    const digit = parseInt(numStr[i]);
    if (digit > 0) {
      const pv = numStr.length - 1 - i;
      parts.push(fmtInt(digit * getPlaceValue(pv), locale));
    }
  }

  if (numObj.decPlaces > 0 && numObj.decPart > 0) {
    const decStr = String(numObj.decPart).padStart(numObj.decPlaces, '0');
    for (let i = 0; i < decStr.length; i++) {
      const digit = parseInt(decStr[i]);
      if (digit > 0) {
        const val = digit / Math.pow(10, i + 1);
        parts.push(val.toFixed(i + 1));
      }
    }
  }

  const expanded  = parts.join(' + ');
  const formatted = formatNumber(numObj, state);

  return {
    question: `${expanded} = <span class="pv-blank"></span>
      <span class="solution-text">${formatted}</span>`,
    answer: formatted,
  };
}

export function generateType4(state) {
  const numObj  = generateNumber(state);
  const locale  = getLocaleStr(state);
  const numStr  = String(numObj.intPart);
  const parts   = [];

  for (let i = 0; i < numStr.length; i++) {
    const digit = parseInt(numStr[i]);
    if (digit > 0) {
      const pv  = numStr.length - 1 - i;
      const val = digit * getPlaceValue(pv);
      parts.push({ val, fmt: fmtInt(val, locale) });
    }
  }

  if (parts.length === 0) {
    parts.push({ val: numObj.intPart, fmt: fmtInt(numObj.intPart, locale) });
  }

  const hideIdx   = randomInt(0, parts.length - 1);
  const hidden    = parts[hideIdx];
  const formatted = formatNumber(numObj, state, 0);

  const expandDisplay = parts.map((p, i) =>
    i === hideIdx
      ? `<span class="pv-blank" style="min-width:60px"></span>`
      : p.fmt
  ).join(' + ');

  return {
    question: `${formatted} = ${expandDisplay}
      <span class="solution-text">${hidden.fmt}</span>`,
    answer: hidden.fmt,
  };
}

function answerLines(state) {
  const count = Math.min(2, Math.max(0, parseInt(state.emptyLines) || 0));
  if (count === 0) return '';

  const lines = Array.from({ length: count }, () => '<span></span>').join('');
  return `<span class="pv-wordform-answer-lines" aria-hidden="true">${lines}</span>`;
}

export function generateType5(state) {
  const numObj  = generateNumber(state, false);
  const formatted = formatNumber(numObj, state, 0);
  const wordsFunc = state.locale === 'in' ? numberToWordsIN : numberToWordsUS;
  const words     = wordsFunc(numObj.intPart);
  const toWords   = _random() < 0.5;
  const blankLines = answerLines(state);

  if (toWords) {
    return {
      question: `Write the word form for: <strong>${formatted}</strong>
        <span class="solution-text">${words}</span>${blankLines}`,
      answer: words,
    };
  }
  return {
    question: `Write the number for: <em>${words}</em>
      <span class="solution-text">${formatted}</span>${blankLines}`,
    answer: formatted,
  };
}

export function generateType6(state) {
  const locale = getLocaleStr(state);
  const n1 = generateNumber(state);
  const n2 = generateNumber(state);

  const v1 = n1.intPart + (n1.decPlaces > 0 ? n1.decPart / Math.pow(10, n1.decPlaces) : 0);
  const v2 = n2.intPart + (n2.decPlaces > 0 ? n2.decPart / Math.pow(10, n2.decPlaces) : 0);

  const maxDp = Math.max(n1.decPlaces, n2.decPlaces);
  const fmt1 = formatNumber(n1, state, maxDp || null);
  const fmt2 = formatNumber(n2, state, maxDp || null);

  const sym = v1 > v2 ? '>' : v1 < v2 ? '<' : '=';

  return {
    question: `${fmt1} <span class="pv-blank" style="min-width:30px"></span> ${fmt2}
      <span class="solution-text">${sym}</span>`,
    answer: `${fmt1} ${sym} ${fmt2}`,
  };
}

export function generateType7(state) {
  const places = [10, 100, 1000];
  const placeNames = { 10: 'ten', 100: 'hundred', 1000: 'thousand' };
  const place  = places[randomInt(0, 2)];
  const s      = { ...state, includeDecimals: false };
  const numObj = generateNumber(s);
  const locale = getLocaleStr(state);

  const formatted = formatNumber(numObj, s, 0);
  const rounded   = Math.round(numObj.intPart / place) * place;
  const roundedFmt = fmtInt(rounded, locale);

  return {
    question: `Round ${formatted} to the nearest ${placeNames[place]}.
      <span class="solution-text">${roundedFmt}</span>`,
    answer: roundedFmt,
  };
}

export function generateType8(state) {
  const s = { ...state, includeDecimals: false, minDigits: 1, maxDigits: 3 };
  const numObj = generateNumber(s);
  const n      = numObj.intPart % 1000;
  const locale = getLocaleStr(state);
  const blocks = getBaseTenBlocks(n);
  const fmt    = fmtInt(n, locale);

  return {
    question: `Write the number represented by the blocks:<br>${blocks}
      <span class="solution-text">${fmt}</span>`,
    answer: fmt,
  };
}

export function generateType9(state) {
  const s      = { ...state, includeDecimals: false };
  const numObj = generateNumber(s);
  const step   = state.skipCountStep || 10;
  const locale = getLocaleStr(state);

  const seq = Array.from({ length: 5 }, (_, i) => numObj.intPart + i * step);

  // Pick 2 distinct positions from indices 1-4 to hide
  const pool = [1, 2, 3, 4];
  const h1   = pool.splice(randomInt(0, 3), 1)[0];
  const h2   = pool[randomInt(0, 2)];
  const hide = new Set([h1, h2]);

  const cells = seq.map((v, i) => {
    const fmt = fmtInt(v, locale);
    if (hide.has(i)) {
      return `<td><span class="pv-blank" style="min-width:70px"></span>
        <span class="solution-text">${fmt}</span></td>`;
    }
    return `<td>${fmt}</td>`;
  }).join('');

  return {
    question: `<table class="pv-skip-table"><tr>${cells}</tr></table>`,
    answer: seq.map(v => fmtInt(v, locale)).join(', '),
  };
}

export function generateType10(state) {
  const mults   = [10, 100, 1000];
  const mult    = mults[randomInt(0, 2)];
  const numObj  = generateNumber(state);
  const locale  = getLocaleStr(state);
  const formatted = formatNumber(numObj, state);

  const base   = numObj.intPart + (numObj.decPlaces > 0 ? numObj.decPart / Math.pow(10, numObj.decPlaces) : 0);
  const result = base * mult;

  const newDp  = Math.max(0, numObj.decPlaces - Math.log10(mult));
  const resultFmt = new Intl.NumberFormat(locale, {
    minimumFractionDigits: newDp,
    maximumFractionDigits: Math.max(0, numObj.decPlaces),
  }).format(result);

  return {
    question: `${formatted} × ${fmtInt(mult, locale)} = <span class="pv-blank"></span>
      <span class="solution-text">${resultFmt}</span>`,
    answer: resultFmt,
  };
}

// ─── Type dispatch map ────────────────────────────────────────────────────────

const HINT_PLACE_NAMES = {
  3: ['hundreds', 'tens', 'ones'],
  4: ['thousands', 'hundreds', 'tens', 'ones'],
  5: ['ten-thousands', 'thousands', 'hundreds', 'tens', 'ones'],
  6: ['hundred-thousands', 'ten-thousands', 'thousands', 'hundreds', 'tens', 'ones'],
};

function shuffleInPlace(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = randomInt(0, i);
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function permutations(items) {
  if (items.length <= 1) return [items];
  const result = [];
  for (let i = 0; i < items.length; i++) {
    const rest = items.slice(0, i).concat(items.slice(i + 1));
    for (const perm of permutations(rest)) result.push([items[i], ...perm]);
  }
  return result;
}

function clueMatches(perm, clue) {
  const value = perm[clue.placeIndex];
  if (clue.type === 'direct') return value === clue.digit;
  if (clue.type === 'biggest') return value === Math.max(...perm);
  if (clue.type === 'smallest') return value === Math.min(...perm);
  if (clue.type === 'even') return value % 2 === 0;
  if (clue.type === 'odd') return value % 2 !== 0;
  if (clue.type === 'diff') {
    const other = perm[clue.otherPlaceIndex];
    return clue.direction === 'more'
      ? value - other === clue.amount
      : other - value === clue.amount;
  }
  return false;
}

function countHintPuzzleSolutions(digits, clues) {
  let count = 0;
  for (const perm of permutations(digits)) {
    if (perm[0] === 0) continue;
    if (clues.every(clue => clueMatches(perm, clue))) count++;
    if (count > 1) return count;
  }
  return count;
}

function uniqueDigits(count) {
  return shuffleInPlace([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]).slice(0, count);
}

function directHintClue(solution, placeIndex) {
  return { type: 'direct', digit: solution[placeIndex], placeIndex };
}

function candidateHintClues(solution, placeIndex, difficulty) {
  const digit = solution[placeIndex];
  const clues = [directHintClue(solution, placeIndex)];
  const maxDigit = Math.max(...solution);
  const minDigit = Math.min(...solution);
  const evens = solution.filter(d => d % 2 === 0).length;
  const odds = solution.length - evens;

  if (difficulty !== 'easy') {
    if (digit === maxDigit) clues.push({ type: 'biggest', placeIndex });
    if (digit === minDigit) clues.push({ type: 'smallest', placeIndex });
    if (digit % 2 === 0 && evens === 1) clues.push({ type: 'even', placeIndex });
    if (digit % 2 !== 0 && odds === 1) clues.push({ type: 'odd', placeIndex });
  }

  if (difficulty === 'hard') {
    const otherIndices = shuffleInPlace([...Array(solution.length).keys()]);
    for (const otherPlaceIndex of otherIndices) {
      if (otherPlaceIndex === placeIndex) continue;
      const diff = digit - solution[otherPlaceIndex];
      if (diff > 0) {
        clues.push({ type: 'diff', placeIndex, otherPlaceIndex, direction: 'more', amount: diff });
      } else if (diff < 0) {
        clues.push({ type: 'diff', placeIndex, otherPlaceIndex, direction: 'less', amount: Math.abs(diff) });
      }
      break;
    }
  }

  return clues;
}

function chooseHintClues(solution, difficulty) {
  const placeCount = solution.length;
  const clues = Array(placeCount);

  for (const placeIndex of shuffleInPlace([...Array(placeCount).keys()])) {
    const candidates = candidateHintClues(solution, placeIndex, difficulty);
    clues[placeIndex] = difficulty === 'easy'
      ? candidates[0]
      : shuffleInPlace(candidates.slice())[0];
  }

  let solutions = countHintPuzzleSolutions(solution, clues);
  const replacementOrder = shuffleInPlace(
    [...Array(placeCount).keys()].filter(i => clues[i].type !== 'direct')
  );

  while (solutions !== 1 && replacementOrder.length) {
    const placeIndex = replacementOrder.pop();
    clues[placeIndex] = directHintClue(solution, placeIndex);
    solutions = countHintPuzzleSolutions(solution, clues);
  }

  return solutions === 1
    ? clues
    : solution.map((_, placeIndex) => directHintClue(solution, placeIndex));
}

function hintClueText(clue, places) {
  const placeName = places[clue.placeIndex];
  if (clue.type === 'direct') return `The ${clue.digit} is in the ${placeName} place.`;
  if (clue.type === 'biggest') return `The biggest number is in the ${placeName} place.`;
  if (clue.type === 'smallest') return `The smallest number is in the ${placeName} place.`;
  if (clue.type === 'even') return `The even number is in the ${placeName} place.`;
  if (clue.type === 'odd') return `The odd number is in the ${placeName} place.`;
  if (clue.type === 'diff') {
    return `The digit in the ${placeName} place is ${clue.amount} ${clue.direction} than the digit in the ${places[clue.otherPlaceIndex]} place.`;
  }
  return '';
}

export function generateType11(state) {
  const minDigits = Math.max(3, Math.min(6, state.minDigits || 4));
  const maxDigits = Math.max(minDigits, Math.min(6, state.maxDigits || 6));
  const numDigits = randomInt(minDigits, maxDigits);
  const places = HINT_PLACE_NAMES[numDigits];
  const digits = uniqueDigits(numDigits);
  const solution = shuffleInPlace(digits.slice());

  if (solution[0] === 0) {
    const swapIndex = solution.findIndex(d => d !== 0);
    [solution[0], solution[swapIndex]] = [solution[swapIndex], solution[0]];
  }

  const difficulty = state.hintDifficulty || 'medium';
  const clues = chooseHintClues(solution, difficulty);
  const answer = solution.join('');
  const boxes = solution.map(digit =>
    `<span class="pv-hint-digit-box"><span class="solution-text">${digit}</span></span>`
  ).join('');
  const clueItems = clues
    .map(clue => `<li>${hintClueText(clue, places)}</li>`)
    .join('');

  return {
    question: `
      <div class="pv-hint-puzzle" data-answer="${answer}">
        <div class="pv-hint-title">Use ${digits.join(', ')} to make the number:</div>
        <div class="pv-hint-digit-boxes">${boxes}</div>
        <ul class="pv-hint-clues">${clueItems}</ul>
      </div>`,
    answer,
    solutionCount: countHintPuzzleSolutions(solution, clues),
  };
}

export const TYPE_GENERATORS = {
  type1: generateType1,
  type2: generateType2,
  type3: generateType3,
  type4: generateType4,
  type5: generateType5,
  type6: generateType6,
  type7: generateType7,
  type8: generateType8,
  type9: generateType9,
  type10: generateType10,
  type11: generateType11,
};

export const TYPE_NAMES = {
  type1:  'Examining Number Value',
  type2:  'Place Value Chart',
  type3:  'Build a Number (Expanded Form)',
  type4:  'Missing Place Value',
  type5:  'Word Form',
  type6:  'Comparing Numbers',
  type7:  'Rounding',
  type8:  'Base-Ten Blocks',
  type9:  'Skip Counting',
  type10: 'Powers of 10',
  type11: 'Place Value Hints',
};
