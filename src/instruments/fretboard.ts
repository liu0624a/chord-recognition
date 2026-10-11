// Fretboard geometry + pitch mapping for guitar and ukulele. Pure module shared
// by the Fretboard component and its tests. Tuning arrays are listed in standard
// playing orientation bottom-to-top: string 0 is the string at the bottom of the
// screen (guitar low E / 6th string, ukulele G / 4th string), and higher indices
// sit above it. Pitch mapping is independent of the on-screen direction.

/** Standard guitar tuning, bottom-to-top (6th→1st string): E2 A2 D3 G3 B3 E4. */
export const GUITAR_TUNING: readonly number[] = [40, 45, 50, 55, 59, 64];

/** Standard (re-entrant) ukulele tuning, bottom-to-top (4th→1st string): G4 C4 E4 A4. */
export const UKULELE_TUNING: readonly number[] = [67, 60, 64, 69];

/** Frets shown and playable on the guitar fretboard (fret 0 is the open string). */
export const GUITAR_FRET_COUNT = 24;

/** Frets shown and playable on the ukulele fretboard. */
export const UKULELE_FRET_COUNT = 18;

/** Upper fret bound for the strum-preview fingering search (kept small for speed). */
export const FINGERING_FRETS = 12;

export interface FretPosition {
  /** String index into the tuning array (0 = bottom string). */
  string: number;
  /** Fret number; 0 means the open string. */
  fret: number;
  /** MIDI note number at this string/fret. */
  midi: number;
}

/** MIDI note number at a given string and fret. */
export function fretMidi(tuning: readonly number[], string: number, fret: number): number {
  return tuning[string] + fret;
}

/** Every playable string×fret position (including open strings), in string-major order. */
export function fretboardPositions(tuning: readonly number[], frets: number): FretPosition[] {
  const out: FretPosition[] = [];
  for (let string = 0; string < tuning.length; string++) {
    for (let fret = 0; fret <= frets; fret++) {
      out.push({ string, fret, midi: tuning[string] + fret });
    }
  }
  return out;
}

/** All string/fret positions that produce a given MIDI note (independent alternatives). */
export function findFretPositions(
  tuning: readonly number[],
  frets: number,
  midi: number,
): FretPosition[] {
  return fretboardPositions(tuning, frets).filter((p) => p.midi === midi);
}
