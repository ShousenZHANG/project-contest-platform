/**
 * Returns an array of 8 chart color strings derived from the CSS design tokens
 * --chart-1 … --chart-8. Falls back to static indigo-family values when running
 * outside a browser (e.g. SSR / test environments where getComputedStyle is absent).
 *
 * Usage inside a component:
 *   const colors = useMemo(() => getChartColors(), []);
 */

const FALLBACK_COLORS = [
  'hsl(239 84% 67%)',
  'hsl(271 91% 65%)',
  'hsl(158 64% 40%)',
  'hsl(38 92% 50%)',
  'hsl(199 89% 48%)',
  'hsl(0 84% 60%)',
  'hsl(316 73% 58%)',
  'hsl(142 71% 45%)',
];

/**
 * @returns {string[]} Array of 8 `hsl(...)` color strings.
 */
export function getChartColors() {
  if (typeof document === 'undefined') return FALLBACK_COLORS;

  const style = getComputedStyle(document.documentElement);

  return Array.from({ length: 8 }, (_, i) => {
    const raw = style.getPropertyValue(`--chart-${i + 1}`).trim();
    return raw ? `hsl(${raw})` : FALLBACK_COLORS[i];
  });
}
