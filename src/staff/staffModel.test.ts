// Staff model tests: clef selection and note placement (positions + ledger lines).

import { describe, expect, it } from 'vitest';
import { CANONICAL_SPELLING, pitchClass } from '../chords/notes';
import { accidentalRank, chooseClef, chordRegister, diatonicStep, octaveSignForNote, octaveSignsFor, placeNote, spreadPositions } from './staffModel';

function canonical(midi: number) {
  return { midi, spelling: CANONICAL_SPELLING[pitchClass(midi)] };
}

describe('chooseClef', () => {
  it('uses treble when every note is C4 or above', () => {
    expect(chooseClef([60, 64, 67])).toBe('treble');
  });

  it('uses bass when every note is below C4', () => {
    expect(chooseClef([48, 52, 55])).toBe('bass');
  });

  it('uses the grand staff when notes span both clefs', () => {
    expect(chooseClef([43, 60])).toBe('grand');
  });

  it('defaults to grand for no notes', () => {
    expect(chooseClef([])).toBe('grand');
  });
});

describe('diatonicStep', () => {
  it('distinguishes B#3 from C4 (octave edge case)', () => {
    // B#3 (letter 6, +1) is MIDI 60, one diatonic step below C4.
    expect(diatonicStep({ letter: 6, accidental: 1 }, 60)).toBe(27);
    expect(diatonicStep({ letter: 0, accidental: 0 }, 60)).toBe(28);
  });
});

describe('chordRegister', () => {
  it('judges C at other octaves by actual pitch, never as C4', () => {
    expect(chordRegister([36])).toBe('low'); // C2
    expect(chordRegister([48])).toBe('low'); // C3
    expect(chordRegister([72])).toBe('high'); // C5
    expect(chordRegister([84])).toBe('high'); // C6
  });

  it('defaults a lone C4 to the high register', () => {
    expect(chordRegister([60])).toBe('high');
  });

  it('assigns C4 to the majority register of the other notes', () => {
    expect(chordRegister([60, 48, 43])).toBe('low'); // C4 + two low notes
    expect(chordRegister([60, 72, 76])).toBe('high'); // C4 + two high notes
  });

  it('breaks a tie toward high', () => {
    expect(chordRegister([48, 72])).toBe('high');
  });
});

describe('octaveSignsFor', () => {
  it('shows 8va when every high-register note is above C6', () => {
    expect(octaveSignsFor([96, 100, 103])).toEqual({ show8va: true, show8vb: false }); // C7 E7 G7
    expect(octaveSignsFor([85, 96])).toEqual({ show8va: true, show8vb: false }); // just above C6
  });

  it('suppresses 8va when a high-register note sits in [C4, C6]', () => {
    expect(octaveSignsFor([84, 96])).toEqual({ show8va: false, show8vb: false }); // C6
    expect(octaveSignsFor([60, 96])).toEqual({ show8va: false, show8vb: false }); // C4 defaults high
    expect(octaveSignsFor([64, 67])).toEqual({ show8va: false, show8vb: false }); // in-range
  });

  it('lets low-register notes leave 8va alone', () => {
    expect(octaveSignsFor([48, 96])).toEqual({ show8va: true, show8vb: false }); // C3 + C7
  });

  it('shows 8vb when every low-register note is below C2', () => {
    expect(octaveSignsFor([21, 24, 28])).toEqual({ show8va: false, show8vb: true }); // A0 C1 E1
    expect(octaveSignsFor([31, 35])).toEqual({ show8va: false, show8vb: true }); // just below C2
  });

  it('suppresses 8vb when a low-register note sits in [C2, C4]', () => {
    expect(octaveSignsFor([36, 31])).toEqual({ show8va: false, show8vb: false }); // C2
    expect(octaveSignsFor([60, 48])).toEqual({ show8va: false, show8vb: false }); // C4 assigned low
    expect(octaveSignsFor([48, 55])).toEqual({ show8va: false, show8vb: false }); // in-range
  });

  it('lets high-register notes leave 8vb alone', () => {
    expect(octaveSignsFor([72, 24])).toEqual({ show8va: false, show8vb: true }); // C5 + C1
  });

  it('decides the two signs independently', () => {
    expect(octaveSignsFor([12, 108])).toEqual({ show8va: true, show8vb: true }); // C0 + C8
    expect(octaveSignsFor([36, 84])).toEqual({ show8va: false, show8vb: false }); // C2 + C6 suppress both
  });

  it('assigns C4 to the low register when the chord is mostly low', () => {
    // C4 joins the low notes, so it suppresses 8vb rather than 8va.
    expect(octaveSignsFor([60, 48, 24])).toEqual({ show8va: false, show8vb: false });
    // C4 (low) + a C7 above C6 still shows 8va for the high note.
    expect(octaveSignsFor([60, 48, 43, 96])).toEqual({ show8va: true, show8vb: false });
  });

  it('shows nothing when there are no notes', () => {
    expect(octaveSignsFor([])).toEqual({ show8va: false, show8vb: false });
  });
});

describe('octaveSignForNote', () => {
  const va = { show8va: true, show8vb: false };
  const vb = { show8va: false, show8vb: true };
  const both = { show8va: true, show8vb: true };
  const neither = { show8va: false, show8vb: false };

  it('applies 8va only to notes above C6', () => {
    expect(octaveSignForNote(96, va)).toBe('8va');
    expect(octaveSignForNote(85, va)).toBe('8va');
    expect(octaveSignForNote(60, va)).toBeNull(); // C4 never carries 8va
    expect(octaveSignForNote(48, va)).toBeNull();
  });

  it('applies 8vb only to notes below C2', () => {
    expect(octaveSignForNote(24, vb)).toBe('8vb');
    expect(octaveSignForNote(35, vb)).toBe('8vb');
    expect(octaveSignForNote(36, vb)).toBeNull(); // C2 never carries 8vb
    expect(octaveSignForNote(60, vb)).toBeNull();
  });

  it('keeps the two signs independent', () => {
    expect(octaveSignForNote(108, both)).toBe('8va');
    expect(octaveSignForNote(12, both)).toBe('8vb');
    expect(octaveSignForNote(60, both)).toBeNull();
  });

  it('returns null when no sign is shown', () => {
    expect(octaveSignForNote(96, neither)).toBeNull();
    expect(octaveSignForNote(24, neither)).toBeNull();
  });
});

describe('placeNote', () => {
  it('places A0 (MIDI 21) well below the bass staff with 6 ledger lines', () => {
    const placed = placeNote(canonical(21), 'bass');
    expect(placed.position).toBeCloseTo(-6.5);
    expect(placed.ledgerLines).toEqual([-1, -2, -3, -4, -5, -6]);
  });

  it('places C8 (MIDI 108) far above the treble staff with 9 ledger lines', () => {
    const placed = placeNote(canonical(108), 'treble');
    expect(placed.position).toBeCloseTo(13);
    expect(placed.ledgerLines).toEqual([5, 6, 7, 8, 9, 10, 11, 12, 13]);
  });

  it('places middle C (MIDI 60) on one ledger line below the treble staff', () => {
    const placed = placeNote(canonical(60), 'treble');
    expect(placed.position).toBeCloseTo(-1);
    expect(placed.ledgerLines).toEqual([-1]);
  });

  it('needs no ledger lines for notes inside the staff', () => {
    const placed = placeNote(canonical(64), 'treble'); // E4, bottom line
    expect(placed.position).toBeCloseTo(0);
    expect(placed.ledgerLines).toEqual([]);
  });
});

describe('spreadPositions', () => {
  it('returns positions unchanged when already spaced apart', () => {
    expect(spreadPositions([0, 20, 40], 12)).toEqual([0, 20, 40]);
  });

  it('spreads a crowded cluster to the minimum gap, centred', () => {
    const out = spreadPositions([0, 5, 10], 12);
    expect(out[1] - out[0]).toBeCloseTo(12);
    expect(out[2] - out[1]).toBeCloseTo(12);
    // The cluster stays centred on its original centre (5).
    expect((out[0] + out[1] + out[2]) / 3).toBeCloseTo(5);
  });

  it('enforces the gap on a long run of stacked notes', () => {
    const ys = [0, 1, 2, 3, 4, 5, 6];
    const out = spreadPositions(ys, 12);
    for (let i = 1; i < out.length; i++) {
      expect(out[i] - out[i - 1]).toBeGreaterThanOrEqual(12);
    }
  });

  it('handles a single position and an empty list', () => {
    expect(spreadPositions([7], 12)).toEqual([7]);
    expect(spreadPositions([], 12)).toEqual([]);
  });
});

describe('accidentalRank', () => {
  it('orders sharp above natural above flat', () => {
    expect(accidentalRank(1)).toBeLessThan(accidentalRank(0));
    expect(accidentalRank(0)).toBeLessThan(accidentalRank(-1));
  });

  it('keeps double accidentals in their own group', () => {
    expect(accidentalRank(2)).toBeLessThan(accidentalRank(0)); // ♯♯ is still a sharp
    expect(accidentalRank(-2)).toBeGreaterThan(accidentalRank(0)); // ♭♭ is still a flat
    expect(accidentalRank(2)).toBe(accidentalRank(1));
    expect(accidentalRank(-2)).toBe(accidentalRank(-1));
  });
});
