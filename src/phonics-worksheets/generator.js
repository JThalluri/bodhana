import { splitSyllablesForWord } from '../phonics/PhonicsEngine.mjs';

function tokens(record) {
  return record.tokens || record.graphemes.split('|');
}

function buildRimeIndex(pool) {
  const idx = Object.create(null);
  for (const r of pool) {
    if (r.rime) {
      if (!idx[r.rime]) idx[r.rime] = [];
      idx[r.rime].push(r.word);
    }
  }
  return idx;
}

export function generateDissect(words) {
  return {
    type: 'dissect',
    words: words.map(w => ({ word: w.word, tokens: tokens(w) })),
  };
}

export function generateElkonin(words) {
  return {
    type: 'elkonin',
    words: words.map(w => ({ word: w.word, tokens: tokens(w), phonemeCount: w.phoneme_count })),
  };
}

export function generateOnsetRime(words, fullPool) {
  const rimeIndex = buildRimeIndex(fullPool);
  return {
    type: 'onsetRime',
    words: words.map(w => ({
      word: w.word,
      onset: w.onset || '',
      rime: w.rime || '',
      rhymeFamily: (rimeIndex[w.rime] || []).filter(x => x !== w.word).slice(0, 6),
    })),
  };
}

export function generateSyllableSplit(words) {
  return {
    type: 'syllableSplit',
    words: words.map(w => ({
      word: w.word,
      syllables: splitSyllablesForWord(w.word),
    })),
  };
}
