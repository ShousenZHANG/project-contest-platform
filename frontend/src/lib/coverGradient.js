/**
 * Deterministic cover art for contests/submissions that have no uploaded image.
 * Same input string always yields the same brand-family gradient + initials, so
 * lists stay visually stable without depending on fragile external image URLs.
 */

const PALETTES = [
  ['239 84% 67%', '263 85% 68%'], // indigo → violet
  ['199 89% 48%', '239 84% 67%'], // sky → indigo
  ['158 64% 42%', '199 89% 48%'], // emerald → sky
  ['38 92% 55%', '0 84% 63%'], // amber → red
  ['316 73% 60%', '263 85% 68%'], // pink → violet
  ['172 66% 45%', '199 89% 48%'], // teal → sky
];

function hash(seed) {
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) {
    h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return h;
}

/**
 * @param {string} seed
 * @returns {string} a CSS linear-gradient using brand-family hues.
 */
export function coverGradient(seed = '') {
  const h = hash(String(seed));
  const [a, b] = PALETTES[h % PALETTES.length];
  const angle = 110 + (h % 80);
  return `linear-gradient(${angle}deg, hsl(${a}), hsl(${b}))`;
}

/**
 * @param {string} text
 * @returns {string} 1-2 uppercase initials for a placeholder cover.
 */
export function initials(text = '') {
  const words = String(text).trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  return (words[0][0] + (words[1]?.[0] ?? '')).toUpperCase();
}
