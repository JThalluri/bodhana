// Handwriting Lines worksheet state.
// Mirrors DEFAULT_STATE from writing_worksheets_integration_spec_v1.1.md §2,
// plus the agreed additions: Nunito as a font option, letter spacing and
// tracing opacity (see docs/DECISIONS.md).

export const DEFAULT_STATE = {
  activeTier: 'tier3',            // 'tier1' | 'tier2' | 'tier3' | 'tier4' | 'tier5'
  exerciseFormat: 'top_box',      // 'alternating' | 'top_box' | 'jumbled'
  userContentText: 'apple, banana, carrot, dates, elderberry, fig',
  refTitle: 'Read, then copy below',

  geometry: {
    gridType: 'zaner_bloser',     // 'zaner_bloser' | 'seyes_french' | 'single_rule'
    lineHeightInch: 0.5,
    hasMidline: true,
    midlineDashPattern: '4 4',    // '4 4' | 'solid' | 'none'
    hasSkipSpace: true,
    skipSpaceHeightInch: 0.1875,
    lineColorPrimary: '#3b82f6',
    lineColorBaseline: '#ef4444',
    lineColorMidline: '#93c5fd',
  },

  typography: {
    fontFamily: 'Andika',         // 'Andika' | 'Nunito' | 'Open Sans'
    fontSizeMode: 'auto',         // 'auto' | 'manual'
    fontSizePx: 38,
    fontSizeFill: 0.80,           // 0.5 – 1.0
    baselineShiftPx: 0,
    letterSpacingEm: 0,           // -0.05 – 0.3
  },

  layout: {
    totalPages: 1,                // editable in top_box only
    pictureBlockHeightPct: 0,     // 0 – 50
    leftMarginInch: 0.75,
    rightMarginInch: 0.4,
    topMarginInch: 0.5,
    bottomMarginInch: 0.5,
    showLeftMarginVerticalLine: true,
    leftMarginLineColor: '#fca5a5',
  },

  scaffolding: {
    fadingMethod: 'none',         // 'none' | 'faded_tracing'
    tracingOpacity: 0.2,          // 0.05 – 0.7
    showLineNumbers: false,
    blankRowsBetween: 2,          // 1 – 4
  },

  seed: null,                     // null → new arrangement per session
};

export const REF_TITLE_DEFAULTS = {
  alternating: '',
  top_box: 'Read, then copy below',
  jumbled: 'Unjumble — rewrite in the correct order below',
};

export const FONT_OPTIONS = ['Andika', 'Nunito', 'Open Sans'];

export function freshState() {
  return structuredClone(DEFAULT_STATE);
}

export function getPath(obj, path) {
  return path.split('.').reduce((o, k) => (o == null ? o : o[k]), obj);
}

export function setPath(obj, path, value) {
  const keys = path.split('.');
  const last = keys.pop();
  const target = keys.reduce((o, k) => o[k], obj);
  target[last] = value;
}

export const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
