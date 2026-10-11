import { describe, expect, it } from 'vitest';
import {
  findFretPositions,
  fretMidi,
  fretboardPositions,
  GUITAR_TUNING,
  UKULELE_TUNING,
} from './fretboard';

describe('fretboard model', () => {
  it('maps guitar strings and frets to MIDI notes', () => {
    expect(fretMidi(GUITAR_TUNING, 0, 0)).toBe(40); // low E2 open
    expect(fretMidi(GUITAR_TUNING, 0, 12)).toBe(52); // E3 at the octave
    expect(fretMidi(GUITAR_TUNING, 5, 0)).toBe(64); // high E4 open
  });

  it('maps ukulele strings and frets to MIDI notes', () => {
    expect(fretMidi(UKULELE_TUNING, 0, 0)).toBe(67); // G4 open
    expect(fretMidi(UKULELE_TUNING, 1, 0)).toBe(60); // C4 open (re-entrant)
    expect(fretMidi(UKULELE_TUNING, 3, 2)).toBe(71); // A4 + 2 = B4
  });

  it('enumerates every position including open strings', () => {
    const positions = fretboardPositions(GUITAR_TUNING, 12);
    expect(positions).toHaveLength(6 * 13);
    expect(positions[0]).toEqual({ string: 0, fret: 0, midi: 40 });
  });

  it('finds independent positions for the same pitch', () => {
    // A2 (45) is string 1 open and string 0 fret 5 — two independent ways to play it.
    const positions = findFretPositions(GUITAR_TUNING, 12, 45);
    expect(positions).toHaveLength(2);
    expect(positions.map((p) => [p.string, p.fret])).toContainEqual([0, 5]);
    expect(positions.map((p) => [p.string, p.fret])).toContainEqual([1, 0]);
  });

  it('returns no positions for a pitch beyond the board', () => {
    expect(findFretPositions(GUITAR_TUNING, 12, 21)).toEqual([]);
  });
});
