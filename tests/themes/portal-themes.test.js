import { readFileSync } from 'node:fs';
import postcss from 'postcss';
import { describe, expect, it } from 'vitest';

const base = postcss.parse(readFileSync(new URL('../../src/styles/tokens.css', import.meta.url), 'utf8'));
const themes = postcss.parse(readFileSync(new URL('../../src/styles/portal-themes.css', import.meta.url), 'utf8'));
const declarations = rule => Object.fromEntries(rule.nodes.filter(node => node.type === 'decl').map(node => [node.prop, node.value]));
function tokens(theme) {
  let result = declarations(base.nodes.find(node => node.type === 'rule'));
  base.walkRules(rule => { if (rule.selector === `[data-theme="${theme}"]`) result = { ...result, ...declarations(rule) }; });
  themes.walkRules(rule => { if (rule.selector === `html[data-theme="${theme}"]`) result = { ...result, ...declarations(rule) }; });
  return result;
}
function contrast(a, b) {
  const luminance = hex => {
    const rgb = hex.slice(1).match(/../g).map(n => parseInt(n, 16) / 255)
      .map(n => n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4);
    return rgb.reduce((sum, n, i) => sum + n * [0.2126, 0.7152, 0.0722][i], 0);
  };
  const x = luminance(a), y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

describe('Portal theme boundaries', () => {
  it('scopes every theme rule to one theme and screen media', () => {
    themes.walkRules(rule => {
      expect(rule.selector).toMatch(/^html\[data-theme="(?:light|dark)"\]/);
      expect(rule.parent.type).toBe('atrule');
      expect(rule.parent.name).toBe('media');
      expect(rule.parent.params).toBe('screen');
    });
  });
  it('keeps the dark surface palette unchanged', () => {
    const dark = tokens('dark');
    expect(dark['--bg-body']).toBe('#0f172a');
    expect(dark['--bg-surface']).toBe('#1e293b');
    expect(dark['--tool-workspace-bg']).toBe('#0b1220');
  });
  it('uses legible themed placeholders in both modes', () => {
    const rules = [];
    themes.walkRules(rule => { if (rule.selector.endsWith('::placeholder')) rules.push(rule); });
    expect(rules).toHaveLength(2);
    for (const rule of rules) {
      expect(declarations(rule).color).toBe('var(--text-muted)');
      expect(declarations(rule).opacity).toBe('1');
    }
  });
  it('keeps resting control outlines softer than the previous high-contrast palette', () => {
    const light = tokens('light');
    const dark = tokens('dark');
    expect(contrast(light['--light-control-border'], light['--bg-input']))
      .toBeLessThan(contrast('#8396a2', light['--bg-input']));
    expect(contrast(dark['--dark-control-border'], dark['--bg-input']))
      .toBeLessThan(contrast('#73859b', dark['--bg-input']));
  });
  it('uses crisp one-pixel secondary button and control borders', () => {
    const rules = [];
    themes.walkRules(rule => {
      if (rule.selector.endsWith('.btn-secondary') || rule.selector.includes(':is(select, textarea,')) rules.push(rule);
    });
    expect(rules).toHaveLength(4);
    for (const rule of rules) expect(declarations(rule)['border-width']).toBe('1px');
  });
  it('uses a distinct destructive hover and keyboard-focus state for word exclusion', () => {
    const rules = [];
    themes.walkRules(rule => { if (rule.selector.includes('.wp-btn-remove-word')) rules.push(rule); });
    expect(rules).toHaveLength(2);
    for (const rule of rules) {
      for (const control of ['.wp-btn-remove-word', '.hw-btn-remove-word', '.phx-btn-remove', '.db-word-exclude-btn']) {
        expect(rule.selector).toContain(control);
      }
      expect(rule.selector).toContain(':is(:hover, :focus-visible)');
      expect(rule.selector).toContain(':not(:disabled)');
      expect(declarations(rule).background).toBe('var(--danger)');
      expect(declarations(rule).color).toBe(rule.selector.includes('"dark"') ? 'var(--dark-danger-text)' : 'var(--accent-text)');
    }
  });
  it('separates light-mode navigation and settings from white content with legible grey surfaces', () => {
    const light = tokens('light');
    for (const bg of ['--sidebar-bg', '--light-header-bg', '--light-settings-bg', '--light-rail-bg']) {
      expect(contrast(light[bg], light['--bg-surface'])).toBeGreaterThan(1.1);
      expect(contrast(light['--text-muted'], light[bg])).toBeGreaterThanOrEqual(4.5);
    }
  });
  for (const theme of ['light', 'dark']) {
    it(`${theme} text meets AA contrast on body, panel, input, and hover surfaces`, () => {
      const values = tokens(theme);
      for (const text of ['--text-primary', '--text-secondary', '--text-muted']) {
        for (const bg of ['--bg-body', '--bg-surface', '--bg-input', '--bg-hover']) {
          expect(contrast(values[text], values[bg]), `${theme} ${text} on ${bg}`).toBeGreaterThanOrEqual(4.5);
        }
      }
    });
    it(`${theme} primary action text meets AA in normal and hover states`, () => {
      const values = tokens(theme);
      for (const bg of ['--accent', '--accent-hover']) {
        expect(contrast(values['--accent-text'], values[bg])).toBeGreaterThanOrEqual(4.5);
      }
    });
  }
  it('dark danger and operation colors meet AA on their UI surfaces', () => {
    const dark = tokens('dark');
    for (const bg of ['--danger', '--danger-hover']) expect(contrast(dark['--dark-danger-text'], dark[bg])).toBeGreaterThanOrEqual(4.5);
    for (const color of ['--color-add', '--color-sub', '--color-mul', '--color-div']) {
      expect(contrast(dark[color], dark['--bg-surface'])).toBeGreaterThanOrEqual(4.5);
    }
  });
  it('preserves printable color tokens in both themes', () => {
    for (const theme of ['light', 'dark']) {
      const rule = themes.nodes.flatMap(node => node.nodes || []).find(node => node.type === 'rule' && node.selector.startsWith(`html[data-theme="${theme}"] :is(.paper-page`));
      const protectedTokens = declarations(rule);
      expect(protectedTokens['--text-muted']).toBe(theme === 'dark' ? '#64748b' : '#94a3b8');
      expect(protectedTokens['--color-add']).toBe('#3b82f6');
      expect(protectedTokens['--color-div']).toBe('#6366f1');
    }
  });
});
