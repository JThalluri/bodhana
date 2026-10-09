/** Feature detection — call once, use to disable buttons gracefully if unsupported. */
export function isSpeechSupported() {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

/** Cancel any in-progress speech. Call before starting anything new. */
export function cancelSpeech() {
  if (isSpeechSupported()) window.speechSynthesis.cancel();
}

/** Speak a single string. Cancels any in-progress speech first. */
export function speakText(text, opts = {}) {
  if (!isSpeechSupported() || !text) return;
  cancelSpeech();
  const utter = new SpeechSynthesisUtterance(text);
  if (opts.rate) utter.rate = opts.rate;
  window.speechSynthesis.speak(utter);
}

/**
 * Speak an array of parts in sequence, with an explicit pause between each —
 * not relying on the engine's natural inter-utterance gap, since that's too
 * short to be pedagogically useful. pauseMs defaults to 400.
 *
 * @param {string[]} parts
 * @param {{ pauseMs?: number, onDone?: () => void }} [opts]
 */
export function speakSequence(parts, opts = {}) {
  if (!isSpeechSupported() || !parts?.length) return;
  cancelSpeech();
  const pauseMs = opts.pauseMs ?? 200;
  let i = 0;
  function speakNext() {
    if (i >= parts.length) { opts.onDone?.(); return; }
    const utter = new SpeechSynthesisUtterance(parts[i]);
    utter.onend = () => { i++; setTimeout(speakNext, pauseMs); };
    window.speechSynthesis.speak(utter);
  }
  speakNext();
}
