// Piano key-geometry tests: white/black key split and each key's left/right edge
// as a % of the piano width, used by the keyboard and the range indicators.

import { describe, expect, it } from 'vitest';
import { keyEdges, pianoGeometry } from './pianoGeometry';

const GEO = pianoGeometry(21, 108); // full 88-key piano (A0–C8)
const WW = 100 / 52; // one white-key slot width

describe('pianoGeometry', () => {
  it('splits the 88-key piano into 52 white and 36 black keys', () => {
    expect(GEO.whiteCount).toBe(52);
    expect(GEO.whiteKeys.length).toBe(52);
    expect(GEO.blackKeys.length).toBe(36);
    expect(GEO.whiteIndex.get(21)).toBe(0); // A0 is the first white key
  });
});

describe('keyEdges', () => {
  it('spans one full white-key slot for a white key', () => {
    const c4 = keyEdges(GEO, 60)!;
    expect(c4.left).toBeCloseTo(23 * WW); // C4 is the 24th white key (index 23)
    expect(c4.right).toBeCloseTo(24 * WW);
    expect(c4.right - c4.left).toBeCloseTo(WW);
  });

  it('spans 0.6 slot at a 0.7 offset for a black key', () => {
    const eb6 = keyEdges(GEO, 87)!; // E♭6 = D♯6, the black key above D6
    const d6 = GEO.whiteIndex.get(86)!;
    expect(eb6.left).toBeCloseTo((d6 + 0.7) * WW);
    expect(eb6.right).toBeCloseTo((d6 + 1.3) * WW);
    expect(eb6.right - eb6.left).toBeCloseTo(0.6 * WW);
  });

  it('returns null for notes outside the visible range', () => {
    expect(keyEdges(GEO, 20)).toBeNull(); // below A0
    expect(keyEdges(GEO, 109)).toBeNull(); // above C8
  });
});
