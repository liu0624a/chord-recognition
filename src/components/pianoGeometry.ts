// Shared piano key geometry: which MIDI notes are white/black keys over a visible
// range, and where each key's left/right edge sits (as a % of the piano width).
// The piano lays white keys out as equal-width percentage slots and positions each
// black key in the gap to the right of the white key below it (0.7 slot offset,
// 0.6 slot wide). Both the keyboard and the range indicators under it derive their
// positions from this module, so the two stay perfectly aligned.

import { pitchClass } from '../chords/notes';

/** Lowest MIDI note shown by the full 88-key piano (A0). */
export const PIANO_LOW_MIDI = 21;
/** Highest MIDI note shown by the full 88-key piano (C8). */
export const PIANO_HIGH_MIDI = 108;

/** Pitch classes of the white keys. */
export const WHITE_PCS = new Set([0, 2, 4, 5, 7, 9, 11]);

export interface PianoGeometry {
  /** Lowest MIDI note shown. */
  lowMidi: number;
  /** Highest MIDI note shown. */
  highMidi: number;
  /** White-key MIDI notes in ascending order. */
  whiteKeys: number[];
  /** Black-key MIDI notes in ascending order. */
  blackKeys: number[];
  /** MIDI note -> white-key slot index (white keys only). */
  whiteIndex: Map<number, number>;
  /** Total number of white keys in the visible range. */
  whiteCount: number;
}

/** Split the visible MIDI range into white/black keys and index the white slots. */
export function pianoGeometry(lowMidi: number, highMidi: number): PianoGeometry {
  const whiteKeys: number[] = [];
  const blackKeys: number[] = [];
  for (let m = lowMidi; m <= highMidi; m++) {
    if (WHITE_PCS.has(pitchClass(m))) whiteKeys.push(m);
    else blackKeys.push(m);
  }
  const whiteIndex = new Map<number, number>();
  whiteKeys.forEach((m, i) => whiteIndex.set(m, i));
  return { lowMidi, highMidi, whiteKeys, blackKeys, whiteIndex, whiteCount: whiteKeys.length };
}

/** Left/right edge of a note's key as a % of the full piano width, or null when
 *  the note falls outside the visible range. */
export function keyEdges(
  geometry: PianoGeometry,
  midi: number,
): { left: number; right: number } | null {
  if (midi < geometry.lowMidi || midi > geometry.highMidi) return null;
  const ww = 100 / geometry.whiteCount;
  if (WHITE_PCS.has(pitchClass(midi))) {
    const i = geometry.whiteIndex.get(midi);
    return i == null ? null : { left: i * ww, right: (i + 1) * ww };
  }
  const wi = geometry.whiteIndex.get(midi - 1);
  return wi == null ? null : { left: (wi + 0.7) * ww, right: (wi + 1.3) * ww };
}
