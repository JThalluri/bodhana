// Tier presets — spec §3. Applying a tier overwrites these fields only; every
// value stays editable afterwards. All tiers are portrait (agreed: no landscape).

const SEYES_ROW_INCH = 8 / 25.4;

export const TIERS = {
  tier1: {
    label: 'Tier 1 — Pre-K / Kindergarten',
    geometry: { gridType: 'zaner_bloser', lineHeightInch: 1.125, hasSkipSpace: true, skipSpaceHeightInch: 0.5625, hasMidline: true, midlineDashPattern: '4 4' },
    typography: { fontFamily: 'Andika', fontSizeFill: 0.86 },
    layout: { leftMarginInch: 1.0, rightMarginInch: 0.5 },
  },
  tier2: {
    label: 'Tier 2 — 1st Grade',
    geometry: { gridType: 'zaner_bloser', lineHeightInch: 0.625, hasSkipSpace: true, skipSpaceHeightInch: 0.25, hasMidline: true, midlineDashPattern: '4 4' },
    typography: { fontFamily: 'Andika', fontSizeFill: 0.82 },
    layout: { leftMarginInch: 0.75, rightMarginInch: 0.4 },
  },
  tier3: {
    label: 'Tier 3 — 2nd Grade',
    geometry: { gridType: 'zaner_bloser', lineHeightInch: 0.5, hasSkipSpace: true, skipSpaceHeightInch: 0.1875, hasMidline: true, midlineDashPattern: '4 4' },
    typography: { fontFamily: 'Andika', fontSizeFill: 0.80 },
    layout: { leftMarginInch: 0.75, rightMarginInch: 0.4 },
  },
  tier4: {
    label: 'Tier 4 — 3rd–4th Grade (Seyès-style)',
    geometry: { gridType: 'seyes_french', lineHeightInch: SEYES_ROW_INCH, hasSkipSpace: false, skipSpaceHeightInch: 0, hasMidline: false, midlineDashPattern: 'solid' },
    typography: { fontFamily: 'Andika', fontSizeFill: 0.90 },
    layout: { leftMarginInch: 0.6, rightMarginInch: 0.4 },
  },
  tier5: {
    label: 'Tier 5 — 5th Grade to Adult',
    geometry: { gridType: 'single_rule', lineHeightInch: 0.28125, hasSkipSpace: false, skipSpaceHeightInch: 0, hasMidline: false, midlineDashPattern: 'solid' },
    typography: { fontFamily: 'Open Sans', fontSizeFill: 0.90 },
    layout: { leftMarginInch: 0.4, rightMarginInch: 0.4 },
  },
};

export function applyTier(state, tierId) {
  const preset = TIERS[tierId];
  if (!preset) return;
  state.activeTier = tierId;
  Object.assign(state.geometry, preset.geometry);
  Object.assign(state.typography, preset.typography);
  Object.assign(state.layout, preset.layout);
}
