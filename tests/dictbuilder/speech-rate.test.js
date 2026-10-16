import { afterEach, describe, expect, it, vi } from 'vitest';
import PhonicsEngine from '../../src/phonics/PhonicsEngine.mjs';
import { renderWordDetail } from '../../src/shared/phonicsWordDetail.js';
import { speakText } from '../../src/shared/speech.js';

const record = PhonicsEngine.parseWord('reading');

describe('Word detail reading speed', () => {
  it('renders an opt-in compact slider with the requested range and normal default', () => {
    const html = renderWordDetail('reading', record, { speechRate: 1 });
    expect(html).toContain('data-speech-rate min="0.75" max="1.25" step="0.05" value="1"');
    expect(html).toContain('aria-label="Reading speed"');
    expect(html).toContain('aria-valuetext="1.00 times normal speed"');
    expect(html).toContain('data-speech-rate-value>1.00x</output>');
  });
  it('does not change other callers or empty and unenriched detail states', () => {
    expect(renderWordDetail('reading', record)).not.toContain('data-speech-rate');
    expect(renderWordDetail(null, null, { speechRate: 1 })).not.toContain('data-speech-rate');
    expect(renderWordDetail('reading', null, { speechRate: 1 })).not.toContain('data-speech-rate');
  });
  it.each([0.75, 1.25])('displays a selected %sx rate', rate => {
    expect(renderWordDetail('reading', record, { speechRate: rate })).toContain(`data-speech-rate-value>${rate.toFixed(2)}x</output>`);
  });
  it('bounds invalid or out-of-range renderer values', () => {
    expect(renderWordDetail('reading', record, { speechRate: 5 })).toContain('value="1.25"');
    expect(renderWordDetail('reading', record, { speechRate: -1 })).toContain('value="0.75"');
    expect(renderWordDetail('reading', record, { speechRate: NaN })).toContain('value="1"');
  });
});

describe('Reading speed playback', () => {
  afterEach(() => vi.unstubAllGlobals());
  it.each([0.75, 1, 1.25])('passes %sx to the speech engine', rate => {
    const cancel = vi.fn();
    const speak = vi.fn();
    vi.stubGlobal('window', { speechSynthesis: { cancel, speak } });
    vi.stubGlobal('SpeechSynthesisUtterance', class {
      constructor(text) { this.text = text; this.rate = 1; }
    });
    speakText('reading', { rate });
    expect(cancel).toHaveBeenCalledOnce();
    expect(speak).toHaveBeenCalledWith(expect.objectContaining({ text: 'reading', rate }));
  });
  it('does nothing when speech is unavailable', () => {
    vi.stubGlobal('window', {});
    expect(() => speakText('reading', { rate: 0.75 })).not.toThrow();
  });
});
