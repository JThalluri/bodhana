/**
 * phonicsWordDetail.js — pure render function for the phonics Detail tab.
 *
 * Takes a word + its enrichment Record (or null) + opts → HTML markup string.
 * Zero Dictionary-Builder-specific code: no references to state, dbWordGrid,
 * or any module-specific identifiers. Importable by Phase 5 unchanged.
 */

import { SOUND_LABELS, splitSyllablesForWord } from '../phonics/PhonicsEngine.mjs';

const CATEGORY_LABELS = {
  digraphs:    'Digraphs',
  trigraphs:   'Trigraphs',
  blends:      'Blends',
  vowel_teams: 'Vowel Teams',
  r_controlled: 'R-Controlled',
  clusters3:   '3-Clusters',
  floss:       'Floss',
};

const CATEGORY_CSS = {
  digraphs:    'wd-badge-digraph',
  trigraphs:   'wd-badge-trigraph',
  blends:      'wd-badge-blend',
  vowel_teams: 'wd-badge-vowel-team',
  r_controlled: 'wd-badge-rcontrolled',
  clusters3:   'wd-badge-cluster',
  floss:       'wd-badge-floss',
};

/**
 * Render the Detail tab for a single word.
 *
 * Three states (all explicit — none blank):
 *   1. word is null/''  → "click a word" empty-state
 *   2. word but no record → selected-not-enriched prompt
 *   3. word + record     → full phonics breakdown
 *
 * @param {string|null} word
 * @param {object|null} record   — parseWord() output or null
 * @param {{ freq?: number, isCommon?: boolean|null, alreadyFlagged?: boolean, flagCount?: number }} opts
 * @returns {string} HTML markup string
 */
export function renderWordDetail(word, record, {
  freq          = 0,
  isCommon      = null,
  alreadyFlagged = false,
  flagCount     = 0,
} = {}) {

  // ── State 1: no word selected ─────────────────────────────────────────────
  if (!word) {
    return `
      <div class="empty-state">
        <i class="fas fa-book-open"></i>
        <p>Click a word to see its phonics detail.</p>
      </div>`;
  }

  // ── State 2: word selected, not yet enriched ──────────────────────────────
  if (!record) {
    return `
      <div class="wd-not-enriched">
        <div class="wd-word-header">
          <span class="wd-word">${word}</span>
        </div>
        <div class="wd-meta-row">
          <span class="wd-meta-chip">${word.length} letter${word.length !== 1 ? 's' : ''}</span>
          ${freq > 1 ? `<span class="wd-meta-chip">${freq}&times; in text</span>` : ''}
        </div>
        <p class="wd-enrich-nudge">
          <i class="fas fa-magic"></i>
          Run <strong>Enrich</strong> to see pattern breakdown, syllables, and
          sounds for this word.
        </p>
      </div>`;
  }

  // ── State 3: word selected and enriched ───────────────────────────────────
  const syllables = splitSyllablesForWord(word);
  const tokens    = record.tokens || record.graphemes.split('|');

  // Parse pattern fields from record (avoids a second findAllPatterns call)
  const patternFields = [
    ['digraphs',     record.digraphs],
    ['trigraphs',    record.trigraphs],
    ['blends',       record.blends],
    ['vowel_teams',  record.vowel_teams],
    ['r_controlled', record.r_controlled],
    ['clusters3',    record.clusters3],
    ['floss',        record.floss],
  ];

  const patternGroups = patternFields
    .map(([key, raw]) => ({ key, items: (raw || '').split(',').filter(Boolean) }))
    .filter(g => g.items.length)
    .map(g => `
      <div class="wd-pattern-group">
        <span class="wd-pattern-cat-label">${CATEGORY_LABELS[g.key] || g.key}</span>
        ${g.items.map(p => `<span class="badge ${CATEGORY_CSS[g.key] || 'badge-accent'}">${p}</span>`).join('')}
      </div>`).join('');

  // Vowel team sounds
  const soundEntries = (record.vowel_team_sounds || '')
    .split(',').filter(Boolean)
    .map(s => s.split(':'));

  const soundsHtml = soundEntries.length ? `
    <div class="wd-section">
      <div class="wd-section-label">Vowel Sounds</div>
      ${soundEntries.map(([pat, snd]) => `
        <div class="wd-sound-row">
          <span class="wd-sound-pattern">${pat}</span>
          <span class="wd-sound-arrow">&rarr;</span>
          <span class="wd-sound-label">${SOUND_LABELS[snd] || snd}</span>
        </div>`).join('')}
    </div>` : '';

  // Stats
  const stats = [
    { label: 'Difficulty', value: `${record.difficulty}/3` },
    { label: 'Level',      value: record.level },
    { label: 'Syllables',  value: record.syllable_count },
    { label: 'Letters',    value: record.letter_count },
    { label: 'Phonemes',   value: record.phoneme_count },
    { label: 'Common',     value: isCommon === null ? '—' : (isCommon ? 'yes' : 'no') },
  ];

  return `
    <div class="wd-detail">

      <div class="wd-word-header">
        <span class="wd-word">${word}</span>
        <div class="wd-btn-row">
          <button class="btn btn-sm btn-ghost wd-speak-btn" data-action="speak-word" title="Speak word">
            <i class="fas fa-volume-up"></i>
          </button>
          <button class="btn btn-sm btn-ghost" data-action="lookup" title="Look up in Wiktionary">
            <i class="fas fa-book"></i> Look up
          </button>
        </div>
        <span class="wd-syllables">${syllables.join(' · ')}</span>
        <button class="btn btn-sm btn-ghost wd-speak-btn" data-action="speak-syllables" title="Speak syllables">
          <i class="fas fa-volume-up"></i>
        </button>
      </div>

      <div class="wd-graphemes">
        ${tokens.map(t => `<span class="wd-grapheme-box">${t}</span>`).join('')}
      </div>

      ${patternGroups ? `<div class="wd-section wd-patterns">${patternGroups}</div>` : ''}

      ${soundsHtml}

      <div class="wd-stats-row">
        ${stats.map(s => `
          <span class="wd-stat">
            <span class="wd-stat-label">${s.label}</span>
            <span class="wd-stat-value">${s.value}</span>
          </span>`).join('')}
      </div>

      <div class="wd-lookup-result" data-lookup-result style="display:none"></div>

      <div class="wd-section wd-flag-section">
        <div class="wd-section-label">Flag for Review</div>
        <div class="wd-flag-row">
          <input class="wd-flag-note" data-flag-note type="text"
            placeholder="What should this be instead, and why? (e.g. 'ie should sound long_e like believe, not long_i')" />
          <button class="btn btn-sm btn-secondary" data-action="flag"
            ${alreadyFlagged ? 'disabled' : ''}>
            ${alreadyFlagged ? '<i class="fas fa-check"></i> Flagged' : '<i class="fas fa-flag"></i> Flag'}
          </button>
        </div>
        ${flagCount > 0 ? `
          <button class="btn btn-sm btn-ghost wd-export-flags-btn" data-action="export-flags">
            <i class="fas fa-download"></i> Export ${flagCount} flag${flagCount !== 1 ? 's' : ''}
          </button>
          <button class="btn btn-sm btn-ghost wd-export-briefs-btn" data-action="export-briefs">
            <i class="fas fa-file-alt"></i> Export briefs
          </button>` : ''}
      </div>

    </div>`;
}
