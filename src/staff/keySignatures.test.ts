import { describe, expect, it } from 'vitest';
import {
  keySignature,
  keySignatureSymbols,
  MODE_INTERVALS,
  scaleSpellings,
} from './keySignatures';

describe('keySignature', () => {
  it('uses the standard signature for every natural major key', () => {
    const major = (root: number) => keySignature(root, 'ionian');
    expect(major(0)).toEqual({ sharps: 0, flats: 0 }); // C
    expect(major(4)).toEqual({ sharps: 1, flats: 0 }); // G
    expect(major(1)).toEqual({ sharps: 2, flats: 0 }); // D
    expect(major(5)).toEqual({ sharps: 3, flats: 0 }); // A
    expect(major(2)).toEqual({ sharps: 4, flats: 0 }); // E
    expect(major(6)).toEqual({ sharps: 5, flats: 0 }); // B
    expect(major(3)).toEqual({ sharps: 0, flats: 1 }); // F
  });

  it('uses the relative-major signature for minor (Aeolian) keys', () => {
    const minor = (root: number) => keySignature(root, 'aeolian');
    expect(minor(5)).toEqual({ sharps: 0, flats: 0 }); // A minor
    expect(minor(2)).toEqual({ sharps: 1, flats: 0 }); // E minor
    expect(minor(6)).toEqual({ sharps: 2, flats: 0 }); // B minor
    expect(minor(1)).toEqual({ sharps: 0, flats: 1 }); // D minor
    expect(minor(0)).toEqual({ sharps: 0, flats: 3 }); // C minor
  });

  it('uses the relative-major signature for the other church modes', () => {
    // D Dorian -> C major; E Phrygian -> C major; F Lydian -> C major;
    // G Mixolydian -> C major; B Locrian -> C major.
    expect(keySignature(1, 'dorian')).toEqual({ sharps: 0, flats: 0 });
    expect(keySignature(2, 'phrygian')).toEqual({ sharps: 0, flats: 0 });
    expect(keySignature(3, 'lydian')).toEqual({ sharps: 0, flats: 0 });
    expect(keySignature(4, 'mixolydian')).toEqual({ sharps: 0, flats: 0 });
    expect(keySignature(6, 'locrian')).toEqual({ sharps: 0, flats: 0 });
    // A Dorian -> G major (1 sharp); G Dorian -> F major (1 flat).
    expect(keySignature(5, 'dorian')).toEqual({ sharps: 1, flats: 0 });
    expect(keySignature(4, 'dorian')).toEqual({ sharps: 0, flats: 1 });
  });

  it('never emits sharps and flats at the same time', () => {
    for (let root = 0; root < 7; root++) {
      for (const mode of ['ionian', 'dorian', 'phrygian', 'lydian', 'mixolydian', 'aeolian', 'locrian'] as const) {
        const { sharps, flats } = keySignature(root, mode);
        expect(sharps === 0 || flats === 0).toBe(true);
      }
    }
  });
});

describe('scaleSpellings', () => {
  it('spells D Ionian as D E F# G A B C#', () => {
    const scale = scaleSpellings(1, 'ionian');
    expect(scale.map((n) => [n.letter, n.accidental])).toEqual([
      [1, 0], // D
      [2, 0], // E
      [3, 1], // F#
      [4, 0], // G
      [5, 0], // A
      [6, 0], // B
      [0, 1], // C#
    ]);
  });

  it('spells A Aeolian as A B C D E F G (no accidentals)', () => {
    const scale = scaleSpellings(5, 'aeolian');
    expect(scale.map((n) => [n.letter, n.accidental])).toEqual([
      [5, 0],
      [6, 0],
      [0, 0],
      [1, 0],
      [2, 0],
      [3, 0],
      [4, 0],
    ]);
  });

  it('spells every mode using each letter exactly once', () => {
    for (let root = 0; root < 7; root++) {
      for (const mode of ['ionian', 'dorian', 'phrygian', 'lydian', 'mixolydian', 'aeolian', 'locrian'] as const) {
        const letters = scaleSpellings(root, mode).map((n) => n.letter).sort((a, b) => a - b);
        expect(letters).toEqual([0, 1, 2, 3, 4, 5, 6]);
      }
    }
  });

  it('uses the exact interval structure for each mode', () => {
    expect(MODE_INTERVALS.ionian).toEqual([0, 2, 4, 5, 7, 9, 11]);
    expect(MODE_INTERVALS.dorian).toEqual([0, 2, 3, 5, 7, 9, 10]);
    expect(MODE_INTERVALS.phrygian).toEqual([0, 1, 3, 5, 7, 8, 10]);
    expect(MODE_INTERVALS.lydian).toEqual([0, 2, 4, 6, 7, 9, 11]);
    expect(MODE_INTERVALS.mixolydian).toEqual([0, 2, 4, 5, 7, 9, 10]);
    expect(MODE_INTERVALS.aeolian).toEqual([0, 2, 3, 5, 7, 8, 10]);
    expect(MODE_INTERVALS.locrian).toEqual([0, 1, 3, 5, 6, 8, 10]);
  });
});

describe('keySignatureSymbols', () => {
  it('places treble sharps at the standard positions', () => {
    const symbols = keySignatureSymbols('treble', 4, 0); // E major: F# C# G# D#
    expect(symbols.map((s) => s.glyph)).toEqual(['♯', '♯', '♯', '♯']);
    expect(symbols.map((s) => s.position)).toEqual([4, 2.5, 4.5, 3]);
  });

  it('places bass flats at the standard positions', () => {
    const symbols = keySignatureSymbols('bass', 0, 3); // Eb major: Bb Eb Ab
    expect(symbols.map((s) => s.glyph)).toEqual(['♭', '♭', '♭']);
    expect(symbols.map((s) => s.position)).toEqual([1, 2.5, 0.5]);
  });

  it('returns no symbols for a natural key signature', () => {
    expect(keySignatureSymbols('treble', 0, 0)).toEqual([]);
    expect(keySignatureSymbols('bass', 0, 0)).toEqual([]);
  });
});

describe('keySignature with an accidental tonic', () => {
  it('distinguishes enharmonic sharp/flat major keys by spelling', () => {
    expect(keySignature(3, 'ionian', 'sharp')).toEqual({ sharps: 6, flats: 0 }); // F♯
    expect(keySignature(4, 'ionian', 'flat')).toEqual({ sharps: 0, flats: 6 }); // G♭
  });

  it('uses 7 sharps / 7 flats for C♯ / C♭ major', () => {
    expect(keySignature(0, 'ionian', 'sharp')).toEqual({ sharps: 7, flats: 0 }); // C♯
    expect(keySignature(0, 'ionian', 'flat')).toEqual({ sharps: 0, flats: 7 }); // C♭
  });

  it('uses the relative-major signature for accidental minor keys', () => {
    expect(keySignature(0, 'aeolian', 'sharp')).toEqual({ sharps: 4, flats: 0 }); // C♯ minor
    expect(keySignature(6, 'aeolian', 'flat')).toEqual({ sharps: 0, flats: 5 }); // B♭ minor
  });
});

describe('scaleSpellings with an accidental tonic', () => {
  it('spells F♯ Ionian as F♯ G♯ A♯ B C♯ D♯ E♯', () => {
    const scale = scaleSpellings(3, 'ionian', 'sharp');
    expect(scale.map((n) => [n.letter, n.accidental])).toEqual([
      [3, 1],
      [4, 1],
      [5, 1],
      [6, 0],
      [0, 1],
      [1, 1],
      [2, 1],
    ]);
  });

  it('spells G♭ Ionian as G♭ A♭ B♭ C♭ D♭ E♭ F', () => {
    const scale = scaleSpellings(4, 'ionian', 'flat');
    expect(scale.map((n) => [n.letter, n.accidental])).toEqual([
      [4, -1],
      [5, -1],
      [6, -1],
      [0, -1],
      [1, -1],
      [2, -1],
      [3, 0],
    ]);
  });
});
