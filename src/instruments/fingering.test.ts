import { describe, expect, it } from 'vitest';
import { getChordType } from '../chords/chordTypes';
import { pitchClass } from '../chords/notes';
import { findChordFingering } from './fingering';
import { FINGERING_FRETS, GUITAR_TUNING, UKULELE_TUNING } from './fretboard';

/** The pitch classes of a chord, computed like the strum preview does. */
function chordPcs(root: number, typeId: Parameters<typeof getChordType>[0]): Set<number> {
  const type = getChordType(typeId);
  const rootPc = pitchClass(root);
  return new Set(type.intervals.map((iv) => pitchClass(rootPc + iv)));
}

describe('findChordFingering', () => {
  it('voices C major on the guitar as the open X-3-2-0-1-0 shape', () => {
    const fingering = findChordFingering(GUITAR_TUNING, FINGERING_FRETS, chordPcs(0, 'major'), 0);
    expect(fingering).toEqual([null, 3, 2, 0, 1, 0]);
  });

  it('voices A minor on the guitar as the open X-0-2-2-1-0 shape', () => {
    const fingering = findChordFingering(GUITAR_TUNING, FINGERING_FRETS, chordPcs(9, 'minor'), 9);
    expect(fingering).toEqual([null, 0, 2, 2, 1, 0]);
  });

  it('voices C major on the ukulele as the open 0-0-0-3 shape', () => {
    const fingering = findChordFingering(UKULELE_TUNING, FINGERING_FRETS, chordPcs(0, 'major'), 0);
    expect(fingering).toEqual([0, 0, 0, 3]);
  });

  it('only ever places fingers on chord tones', () => {
    const cases: Array<[readonly number[], number, 'major' | 'minor' | 'dom7' | 'maj13']> = [
      [GUITAR_TUNING, 0, 'major'],
      [GUITAR_TUNING, 6, 'dom7'],
      [GUITAR_TUNING, 11, 'maj13'],
      [UKULELE_TUNING, 3, 'dom7'],
    ];
    for (const [tuning, root, typeId] of cases) {
      const pcs = chordPcs(root, typeId);
      const fingering = findChordFingering(tuning, FINGERING_FRETS, pcs, pitchClass(root));
      for (let string = 0; string < fingering.length; string++) {
        const fret = fingering[string];
        if (fret == null) continue;
        expect(pcs.has(pitchClass(tuning[string] + fret))).toBe(true);
      }
    }
  });

  it('covers every chord tone the instrument has strings for', () => {
    // A four-note 7th chord fits on all four ukulele strings.
    const pcs = chordPcs(0, 'dom7');
    const fingering = findChordFingering(UKULELE_TUNING, FINGERING_FRETS, pcs, 0);
    const sounded: number[] = [];
    fingering.forEach((fret, string) => {
      if (fret != null) sounded.push(UKULELE_TUNING[string] + fret);
    });
    expect(new Set(sounded.map((midi) => pitchClass(midi))).size).toBe(pcs.size);
  });
});
