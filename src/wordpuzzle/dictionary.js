export const DEMO_WORDS = [
  'apple', 'banana', 'cherry', 'dragon', 'eagle', 'forest', 'garden',
  'happy', 'island', 'jungle', 'kayak', 'lemon', 'mango', 'night',
  'ocean', 'puzzle', 'queen', 'river', 'sunny', 'tiger', 'unicorn',
  'violet', 'water', 'xenon', 'yummy', 'zebra', 'butter', 'cloud',
  'dream', 'ember', 'flame', 'grace', 'heart', 'ivory', 'jolly',
  'koala', 'lunar', 'magic', 'noble', 'orbit', 'peace', 'quiet',
  'radar', 'solar', 'tulip', 'ultra', 'vivid', 'whale', 'youth',
];

export function loadDictionaryFromFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const words = text.split(/\r?\n/)
        .map(w => w.trim().toLowerCase())
        .filter(w => w.length > 0 && /^[a-z]+$/.test(w));
      resolve(Array.from(new Set(words)));
    };
    reader.onerror = () => reject(new Error('Failed to read file.'));
    reader.readAsText(file);
  });
}
