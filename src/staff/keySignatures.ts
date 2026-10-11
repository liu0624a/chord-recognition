// Key signature and scale definitions: the 7 diatonic modes (their interval
// structures, scale spellings, and the traditional key signature each implies),
// plus the sharps/flats each key signature places and where each accidental sits
// on the treble and bass staves (standard notation positions). Pure logic — the
// Staff component turns the symbols below into SVG glyphs.
//
// The key model is (root letter, accidental, mode): the root is a natural letter
// C..B plus an optional ♯/♭, and the mode fixes the scale. The key signature is
// the one of the mode's *relative major* key, so only Ionian/Major and
// Aeolian/Minor carry their own major/minor signature; the other modes carry
// their relative major's signature and express their altered degrees as
// on-the-note accidentals.

import type { Clef } from './staffModel';
import { LETTER_NAMES, LETTER_PCS, pitchClass, PitchSpelling } from '../chords/notes';

export type ModeId =
  | 'ionian'
  | 'dorian'
  | 'phrygian'
  | 'lydian'
  | 'mixolydian'
  | 'aeolian'
  | 'locrian';

/** Semitone intervals of each mode relative to its root (index 0 = tonic). */
export const MODE_INTERVALS: Record<ModeId, readonly number[]> = {
  ionian: [0, 2, 4, 5, 7, 9, 11],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
  lydian: [0, 2, 4, 6, 7, 9, 11],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
  aeolian: [0, 2, 3, 5, 7, 8, 10],
  locrian: [0, 1, 3, 5, 6, 8, 10],
};

/** Display order for the Mode dropdown. */
export const MODE_ORDER: ModeId[] = [
  'ionian',
  'dorian',
  'phrygian',
  'lydian',
  'mixolydian',
  'aeolian',
  'locrian',
];

/** The Ionian (major) intervals — the reference for scale-degree alterations. */
export const IONIAN_INTERVALS = MODE_INTERVALS.ionian;

/** Root letters for the Root Note dropdown (index 0 = C … 6 = B). */
export const ROOT_LETTERS = LETTER_NAMES;

/** The tonic's accidental: 'sharp' -> ♯ tonic (e.g. F♯), 'flat' -> ♭ tonic
 *  (e.g. B♭), 'none' -> natural tonic. Also drives chord/note sharp-flat spelling. */
export type KeyAccidental = 'sharp' | 'flat' | 'none';

/** Tonic pitch class of a root letter + accidental (♯ = +1, ♭ = -1, none = natural). */
export function keyRootPc(root: number, accidental: KeyAccidental): number {
  const pc = LETTER_PCS[root];
  if (accidental === 'sharp') return pitchClass(pc + 1);
  if (accidental === 'flat') return pitchClass(pc - 1);
  return pc;
}

/** Semitones from a mode's root down to its relative major tonic. */
const RELATIVE_MAJOR_OFFSET: Record<ModeId, number> = {
  ionian: 0,
  dorian: 2,
  phrygian: 4,
  lydian: 5,
  mixolydian: 7,
  aeolian: 9,
  locrian: 11,
};

/** Diatonic letters down from a mode's root to its relative major tonic. */
const RELATIVE_MAJOR_LETTER_OFFSET: Record<ModeId, number> = {
  ionian: 0,
  dorian: 1,
  phrygian: 2,
  lydian: 3,
  mixolydian: 4,
  aeolian: 5,
  locrian: 6,
};

/** Major-key fifths count (positive = sharps, negative = flats) for each natural
 *  letter: C→0, D→2, E→4, F→-1, G→1, A→3, B→5. */
const LETTER_FIFTHS = [0, 2, 4, -1, 1, 3, 5];

/**
 * Key signature (count of sharps / flats) for a root + accidental + mode. The
 * signature is the traditional one of the mode's relative major key, computed on
 * the circle of fifths from the relative major's *spelled* letter + accidental
 * (so F♯ and G♭, though enharmonic, get 6 sharps vs. 6 flats respectively).
 * At most one of `sharps` / `flats` is non-zero.
 */
export function keySignature(
  root: number,
  mode: ModeId,
  accidental: KeyAccidental = 'none',
): { sharps: number; flats: number } {
  const tonicPc = keyRootPc(root, accidental);
  const relLetter = ((root - RELATIVE_MAJOR_LETTER_OFFSET[mode]) % 7 + 7) % 7;
  const relPc = pitchClass(tonicPc - RELATIVE_MAJOR_OFFSET[mode]);
  const relAccidental = normalizeAccidental(relPc - LETTER_PCS[relLetter]);
  const fifths = LETTER_FIFTHS[relLetter] + 7 * relAccidental;
  return fifths >= 0 ? { sharps: fifths, flats: 0 } : { sharps: 0, flats: -fifths };
}

/** Normalize a semitone difference into a double-flat..double-sharp accidental. */
function normalizeAccidental(diff: number): -2 | -1 | 0 | 1 | 2 {
  let d = diff;
  while (d > 2) d -= 12;
  while (d < -2) d += 12;
  return d as -2 | -1 | 0 | 1 | 2;
}

/**
 * The 7 scale notes of `root` + `accidental` + `mode`, each spelled on its
 * correct diatonic letter (every letter A..G used exactly once). Accidentals
 * follow the mode's interval structure, e.g. D Ionian -> D E F# G A B C#,
 * F♯ Ionian -> F♯ G♯ A♯ B C♯ D♯ E♯.
 */
export function scaleSpellings(
  root: number,
  mode: ModeId,
  accidental: KeyAccidental = 'none',
): PitchSpelling[] {
  const rootPc = keyRootPc(root, accidental);
  const intervals = MODE_INTERVALS[mode];
  return intervals.map((iv, i) => {
    const letter = (root + i) % 7;
    const pc = pitchClass(rootPc + iv);
    return { letter, accidental: normalizeAccidental(pc - LETTER_PCS[letter]) };
  });
}

/** Standard key-signature positions on each clef, in the order the accidentals appear. */
const TREBLE_SHARP_POSITIONS = [4, 2.5, 4.5, 3, 1.5, 3.5, 2];
const TREBLE_FLAT_POSITIONS = [2, 3.5, 1.5, 3, 1, 2.5, 0.5];
const BASS_SHARP_POSITIONS = [3, 1.5, 3.5, 2, 0.5, 2.5, 1];
const BASS_FLAT_POSITIONS = [1, 2.5, 0.5, 2, 0, 1.5, 3];

export interface KeySignatureSymbol {
  glyph: '♯' | '♭';
  /** Vertical position in staff-line units (0 = bottom line). */
  position: number;
}

/** The ordered accidental symbols a key signature places on a clef. */
export function keySignatureSymbols(
  clef: Clef,
  sharps: number,
  flats: number,
): KeySignatureSymbol[] {
  const symbols: KeySignatureSymbol[] = [];
  if (sharps > 0) {
    const positions = clef === 'treble' ? TREBLE_SHARP_POSITIONS : BASS_SHARP_POSITIONS;
    for (let i = 0; i < Math.min(sharps, positions.length); i++) {
      symbols.push({ glyph: '♯', position: positions[i] });
    }
  } else if (flats > 0) {
    const positions = clef === 'treble' ? TREBLE_FLAT_POSITIONS : BASS_FLAT_POSITIONS;
    for (let i = 0; i < Math.min(flats, positions.length); i++) {
      symbols.push({ glyph: '♭', position: positions[i] });
    }
  }
  return symbols;
}
