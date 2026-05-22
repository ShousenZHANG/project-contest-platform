import { coverGradient, initials } from '../lib/coverGradient';
import { getChartColors } from '../lib/chartColors';

describe('coverGradient', () => {
  it('is deterministic for the same seed', () => {
    expect(coverGradient('Car Design')).toBe(coverGradient('Car Design'));
  });

  it('returns an hsl-based linear-gradient', () => {
    expect(coverGradient('Music')).toMatch(/^linear-gradient\(\d+deg, hsl\(/);
  });

  it('handles empty / undefined seeds without throwing', () => {
    expect(() => coverGradient('')).not.toThrow();
    expect(() => coverGradient(undefined)).not.toThrow();
    expect(typeof coverGradient('')).toBe('string');
  });
});

describe('initials', () => {
  it('uppercases the first letters of the first two words', () => {
    expect(initials('Car Design')).toBe('CD');
    expect(initials('solo')).toBe('S');
    expect(initials('alpha beta gamma')).toBe('AB');
  });

  it('returns ? for blank input', () => {
    expect(initials('')).toBe('?');
    expect(initials('   ')).toBe('?');
  });
});

describe('getChartColors', () => {
  it('returns eight color strings (fallback when CSS vars are unset)', () => {
    const colors = getChartColors();
    expect(colors).toHaveLength(8);
    colors.forEach((c) => expect(typeof c).toBe('string'));
  });
});
