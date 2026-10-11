// Two-note interval recognition: given exactly two sounding notes (actual MIDI
// numbers, not deduped pitch classes), name the interval between them under the
// active key/mode, and optionally suggest chords that could contain the dyad as
// clearly-marked speculation. Pure module, no UI.

import { CHORD_TYPES, chordTypeOrder, ChordTypeId } from './chordTypes';
import type { ChordMatch } from './recognizer';
import {
  CANONICAL_SPELLING,
  pitchClass,
  PitchSpelling,
  spellingToPitchClassName,
} from './notes';
import type { KeyInfo } from './degree';
import { spellPitchClassInKey } from './spelling';

export type IntervalQualityId =
  | 'minor2' | 'major2' | 'aug2'
  | 'minor3' | 'major3'
  | 'dim4' | 'perfect4' | 'aug4'
  | 'dim5' | 'perfect5' | 'aug5'
  | 'minor6' | 'major6' | 'aug6'
  | 'dim7' | 'minor7' | 'major7'
  | 'perfect8';

export interface IntervalResult {
  kind: 'octave' | 'power' | 'interval';
  /** Ascending semitones between the two notes (>= 1). */
  semitones: number;
  /** Number of octaves spanned when the dyad is an exact octave multiple, else 0. */
  octaves: number;
  /** Diatonic degree 1..8 within the octave (1 = unison … 8 = octave). */
  degree: number;
  quality: IntervalQualityId;
  /** Key/canonical spelling of the lower note's pitch class. */
  lower: PitchSpelling;
  /** Key/canonical spelling of the upper note's pitch class. */
  upper: PitchSpelling;
  /** Spelled pitch-class name (ASCII #/b), e.g. "C" | "F#" | "Ab". */
  lowerName: string;
  upperName: string;
}

/**
 * Interval quality by (degree, simple-semitones). Only the entries reachable
 * with single-accidental / scale spellings are listed; the rest fall back to a
 * major/perfect default (unreachable in practice, kept so the result is always
 * a valid interval name).
 */
const QUALITY_BY_DEGREE: Record<number, Record<number, IntervalQualityId>> = {
  1: { 1: 'minor2' }, // augmented unison -> enharmonic minor 2nd
  2: { 1: 'minor2', 2: 'major2', 3: 'aug2' },
  3: { 3: 'minor3', 4: 'major3' },
  4: { 4: 'dim4', 5: 'perfect4', 6: 'aug4' },
  5: { 6: 'dim5', 7: 'perfect5', 8: 'aug5' },
  6: { 8: 'minor6', 9: 'major6', 10: 'aug6' },
  7: { 9: 'dim7', 10: 'minor7', 11: 'major7' },
};

const FALLBACK_QUALITY: Record<number, IntervalQualityId> = {
  1: 'minor2', 2: 'major2', 3: 'major3', 4: 'perfect4',
  5: 'perfect5', 6: 'major6', 7: 'major7', 8: 'perfect8',
};

function qualityFor(degree: number, simple: number): IntervalQualityId {
  return QUALITY_BY_DEGREE[degree]?.[simple] ?? FALLBACK_QUALITY[degree];
}

export function recognizeInterval(notes: number[], key: KeyInfo | null): IntervalResult | null {
  if (notes.length !== 2) return null;
  const [lowerMidi, upperMidi] = notes[0] <= notes[1] ? notes : [notes[1], notes[0]];

  const lowerPc = pitchClass(lowerMidi);
  const upperPc = pitchClass(upperMidi);
  const lower = key ? spellPitchClassInKey(lowerPc, key) : CANONICAL_SPELLING[lowerPc];
  const upper = key ? spellPitchClassInKey(upperPc, key) : CANONICAL_SPELLING[upperPc];

  const semitones = upperMidi - lowerMidi;
  const lowerName = spellingToPitchClassName(lower);
  const upperName = spellingToPitchClassName(upper);

  if (semitones % 12 === 0) {
    return {
      kind: 'octave',
      semitones,
      octaves: semitones / 12,
      degree: 8,
      quality: 'perfect8',
      lower,
      upper,
      lowerName,
      upperName,
    };
  }

  const simple = ((semitones - 1) % 12) + 1; // 1..11
  const degree = ((((upper.letter - lower.letter) % 7) + 7) % 7) + 1;
  const quality = qualityFor(degree, simple);
  const kind: IntervalResult['kind'] = quality === 'perfect5' && semitones === 7 ? 'power' : 'interval';

  return {
    kind,
    semitones,
    octaves: 0,
    degree,
    quality,
    lower,
    upper,
    lowerName,
    upperName,
  };
}

/**
 * Chords that contain every pitch class in `pcs`, ranked by fewest missing
 * tones. Used only to show a clearly-marked speculative candidate for a dyad —
 * never part of the primary 3+-note recognition path.
 */
export function suggestiveChordCandidates(pcs: number[]): ChordMatch[] {
  const input = Array.from(new Set(pcs.map((p) => pitchClass(p))));
  if (input.length === 0) return [];

  const matches: { root: number; typeId: ChordTypeId; missing: number }[] = [];
  for (const type of CHORD_TYPES) {
    for (let root = 0; root < 12; root++) {
      const chordSet = new Set<number>(type.intervals.map((iv) => pitchClass(root + iv)));
      let isSubset = true;
      for (const pc of input) {
        if (!chordSet.has(pc)) {
          isSubset = false;
          break;
        }
      }
      if (!isSubset) continue;
      matches.push({ root, typeId: type.id, missing: chordSet.size - input.length });
    }
  }

  matches.sort(
    (a, b) =>
      a.missing - b.missing || a.root - b.root || chordTypeOrder(a.typeId) - chordTypeOrder(b.typeId),
  );

  return matches.slice(0, 2).map(({ root, typeId }) => ({ root, typeId }));
}
