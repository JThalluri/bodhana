/**
 * Tests for src/shared/investigationBriefs.js
 *
 * B.5 acceptance criteria:
 *   B.5.1  buildInvestigationBriefs([]) returns ''
 *   B.5.2  flagged word with a note → note verbatim as "Expected behavior"
 *   B.5.3  flagged word with no note → explicit fallback message, not blank
 *   B.5.4  multiple flagged words → multiple clearly separated brief sections
 *   B.5.5  describeSuspectedArea lists only populated buckets — verified against
 *          a real parseWord() output, not a hand-constructed record
 *   B.5.6  sync-check: CLASSIFY_BOILERPLATE and CONTEXT_LOCATIONS_BOILERPLATE
 *          match (whitespace-normalized) the §2 and §5 sections of the shipped template
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';

import {
  buildInvestigationBriefs,
  CLASSIFY_BOILERPLATE,
  CONTEXT_LOCATIONS_BOILERPLATE,
  describeSuspectedArea,
} from '../../src/shared/investigationBriefs.js';
import { parseWord } from '../../src/phonics/PhonicsEngine.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const TEMPLATE_PATH = join(root, 'tools/constructs-workbench/CONSTRUCT_INVESTIGATION_BRIEF_TEMPLATE.md');

function normalize(s) {
  return s.trim().replace(/\s+/g, ' ');
}

function extractSection(lines, startPattern, endPattern) {
  const startIdx = lines.findIndex(l => startPattern.test(l));
  if (startIdx === -1) throw new Error(`Section not found: ${startPattern}`);
  const body = [];
  for (let i = startIdx + 1; i < lines.length; i++) {
    if (endPattern && endPattern.test(lines[i])) break;
    body.push(lines[i]);
  }
  return body.join('\n').trim();
}

// ── B.5.1 — empty input ───────────────────────────────────────────────────────

describe('buildInvestigationBriefs — empty/nullish input', () => {
  it('returns empty string for []', () => {
    expect(buildInvestigationBriefs([])).toBe('');
  });

  it('returns empty string for null', () => {
    expect(buildInvestigationBriefs(null)).toBe('');
  });

  it('returns empty string for undefined', () => {
    expect(buildInvestigationBriefs(undefined)).toBe('');
  });
});

// ── B.5.2 — note appears verbatim ────────────────────────────────────────────

describe('buildInvestigationBriefs — single flag with note', () => {
  const record = parseWord('breathe');
  const flaggedAt = '2025-01-01T00:00:00.000Z';
  const note = 'ea should sound short_e here like bread';
  const md = buildInvestigationBriefs([{ word: 'breathe', record, note, flaggedAt }]);

  it('contains the note verbatim as Expected behavior', () => {
    expect(md).toContain(`**Expected behavior:** ${note}`);
  });

  it('contains the flaggedAt timestamp in the brief header', () => {
    expect(md).toContain(flaggedAt);
  });

  it('contains the word in the brief header', () => {
    expect(md).toContain('## Brief: "breathe"');
  });

  it('contains vowel_team_sounds from the real record', () => {
    expect(md).toContain(`vowel_team_sounds = "${record.vowel_team_sounds}"`);
  });
});

// ── B.5.3 — no-note fallback ──────────────────────────────────────────────────

describe('buildInvestigationBriefs — flag with no note produces explicit fallback', () => {
  const record = parseWord('breathe');
  const flaggedAt = '2025-06-15T12:00:00.000Z';

  it('empty string note → explicit fallback message', () => {
    const md = buildInvestigationBriefs([{ word: 'breathe', record, note: '', flaggedAt }]);
    expect(md).toContain(
      '[no note given — contact the flagger for the expected behavior before proceeding]'
    );
    expect(md).not.toMatch(/\*\*Expected behavior:\*\*\s*\n/);
  });

  it('null note → explicit fallback message', () => {
    const md = buildInvestigationBriefs([{ word: 'breathe', record, note: null, flaggedAt }]);
    expect(md).toContain(
      '[no note given — contact the flagger for the expected behavior before proceeding]'
    );
  });

  it('whitespace-only note → explicit fallback message, not blank', () => {
    const md = buildInvestigationBriefs([{ word: 'breathe', record, note: '   ', flaggedAt }]);
    expect(md).toContain(
      '[no note given — contact the flagger for the expected behavior before proceeding]'
    );
  });
});

// ── B.5.4 — multiple flags produce multiple sections ─────────────────────────

describe('buildInvestigationBriefs — multiple flags', () => {
  const flaggedAt = '2025-01-01T00:00:00.000Z';
  const flags = [
    { word: 'breathe', record: parseWord('breathe'), note: 'note A', flaggedAt },
    { word: 'bread',   record: parseWord('bread'),   note: 'note B', flaggedAt },
  ];
  const md = buildInvestigationBriefs(flags);

  it('contains a brief section for each flagged word', () => {
    expect(md).toContain('## Brief: "breathe"');
    expect(md).toContain('## Brief: "bread"');
  });

  it('sections are separated by a horizontal rule', () => {
    expect(md).toContain('---');
  });

  it('each note appears in its own section', () => {
    expect(md).toContain('**Expected behavior:** note A');
    expect(md).toContain('**Expected behavior:** note B');
  });
});

// ── B.5.5 — describeSuspectedArea against real parseWord() output ─────────────

describe('describeSuspectedArea — real parseWord() output', () => {
  const record = parseWord('breathe'); // digraphs=th, blends=br, vowel_teams=ea (real engine output)

  it('includes vowel_teams=ea (populated bucket)', () => {
    expect(describeSuspectedArea(record)).toContain('vowel_teams=ea');
  });

  it('does NOT include trigraphs (empty bucket in breathe)', () => {
    expect(describeSuspectedArea(record)).not.toContain('trigraphs');
  });

  it('does NOT include clusters3 (empty bucket in breathe)', () => {
    expect(describeSuspectedArea(record)).not.toContain('clusters3');
  });

  it('returns the no-record fallback when record is null', () => {
    expect(describeSuspectedArea(null)).toBe('(record unavailable — recompute first, see §0)');
  });

  it('returns the no-buckets fallback for a record with all-empty pattern fields', () => {
    const bare = {
      digraphs: '', trigraphs: '', blends: '', vowel_teams: '',
      r_controlled: '', clusters3: '', floss: '',
    };
    expect(describeSuspectedArea(bare)).toBe('(no pattern buckets populated on this record)');
  });
});

// ── hoisting regression guard — shared boilerplate appears exactly once ──────

describe('buildInvestigationBriefs — boilerplate hoisting (signal/noise)', () => {
  const flaggedAt = '2025-01-01T00:00:00.000Z';
  const flags = [
    { word: 'breathe', record: parseWord('breathe'), note: 'note A', flaggedAt },
    { word: 'bread',   record: parseWord('bread'),   note: 'note B', flaggedAt },
    { word: 'create',  record: parseWord('create'),  note: 'note C', flaggedAt },
  ];
  const md = buildInvestigationBriefs(flags);

  it('CLASSIFY_BOILERPLATE appears exactly once for 3 flags', () => {
    expect(md.split('Trace the real algorithm by hand').length - 1).toBe(1);
  });

  it('CONTEXT_LOCATIONS_BOILERPLATE appears exactly once for 3 flags', () => {
    expect(md.split('Compiled constructs: constructs/phonics-constructs.yaml').length - 1).toBe(1);
  });

  it('staleness instruction appears exactly once for 3 flags', () => {
    expect(md.split('Staleness check').length - 1).toBe(1);
  });

  it('each brief header includes its own flaggedAt timestamp', () => {
    expect(md.split(flaggedAt).length - 1).toBe(3);
  });
});

// ── B.5.6 — sync-check: boilerplate matches shipped template ─────────────────

describe('boilerplate sync-check — CLASSIFY_BOILERPLATE and CONTEXT_LOCATIONS_BOILERPLATE match template', () => {
  const templateContent = readFileSync(TEMPLATE_PATH, 'utf8');
  const lines = templateContent.split('\n');

  it('CLASSIFY_BOILERPLATE matches §2 body text (whitespace-normalized)', () => {
    const section2Body = extractSection(lines, /^2\. Required first step/, /^3\. /);
    expect(normalize(CLASSIFY_BOILERPLATE)).toBe(normalize(section2Body));
  });

  it('CONTEXT_LOCATIONS_BOILERPLATE matches §5 body text (whitespace-normalized)', () => {
    const section5Body = extractSection(lines, /^5\. Where the rest of the context/, null);
    expect(normalize(CONTEXT_LOCATIONS_BOILERPLATE)).toBe(normalize(section5Body));
  });
});
