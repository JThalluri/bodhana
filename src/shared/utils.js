/** Random integer in [min, max] inclusive */
export function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Random element from array */
export function pick(arr) {
  return arr[rand(0, arr.length - 1)];
}

/** Fisher-Yates shuffle — returns a new array */
export function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = rand(0, i);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Clamp a value between min and max */
export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/** Parse integer from a DOM input by ID, with fallback */
export function readInt(id, fallback) {
  const el = document.getElementById(id);
  const v = parseInt(el?.value ?? '', 10);
  return isNaN(v) ? fallback : v;
}
