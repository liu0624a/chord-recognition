// Color-utility tests: hex parsing/formatting, and the shade derivation used
// by the custom accent-color setting.

import { describe, expect, it } from 'vitest';
import {
  hexToRgb,
  isValidHex,
  normalizeHex,
  rgbToHex,
  shade,
  withAlpha,
} from './color';

describe('normalizeHex', () => {
  it('normalizes to lowercase #rrggbb', () => {
    expect(normalizeHex('#4F8CFF')).toBe('#4f8cff');
    expect(normalizeHex('4f8cff')).toBe('#4f8cff');
    expect(normalizeHex(' #4F8CFF ')).toBe('#4f8cff');
  });

  it('expands #rgb shorthand', () => {
    expect(normalizeHex('#f00')).toBe('#ff0000');
    expect(normalizeHex('abc')).toBe('#aabbcc');
  });

  it('rejects malformed input', () => {
    expect(normalizeHex('#12')).toBeNull();
    expect(normalizeHex('#12345')).toBeNull();
    expect(normalizeHex('red')).toBeNull();
    expect(normalizeHex('')).toBeNull();
  });
});

describe('isValidHex', () => {
  it('accepts valid hex strings only', () => {
    expect(isValidHex('#4f8cff')).toBe(true);
    expect(isValidHex('fff')).toBe(true);
    expect(isValidHex('#12345g')).toBe(false);
    expect(isValidHex(123)).toBe(false);
    expect(isValidHex(null)).toBe(false);
  });
});

describe('hexToRgb / rgbToHex', () => {
  it('round-trips', () => {
    expect(hexToRgb('#4f8cff')).toEqual({ r: 79, g: 140, b: 255 });
    expect(rgbToHex(79, 140, 255)).toBe('#4f8cff');
  });

  it('returns null for invalid hex', () => {
    expect(hexToRgb('nope')).toBeNull();
  });

  it('clamps channels to 0..255', () => {
    expect(rgbToHex(300, -5, 128)).toBe('#ff0080');
  });
});

describe('shade', () => {
  it('darkens toward black by the given factor', () => {
    expect(shade('#ffffff', 0.5)).toBe('#808080');
    expect(shade('#000000', 0.5)).toBe('#000000');
    expect(shade('#4f8cff', 0)).toBe('#4f8cff');
  });

  it('clamps the factor to 0..1', () => {
    expect(shade('#ffffff', 2)).toBe('#000000');
    expect(shade('#ffffff', -1)).toBe('#ffffff');
  });
});

describe('withAlpha', () => {
  it('formats a translucent rgba() color', () => {
    expect(withAlpha('#4f8cff', 0.18)).toBe('rgba(79, 140, 255, 0.18)');
    expect(withAlpha('#ffffff', 1)).toBe('rgba(255, 255, 255, 1)');
  });
});
