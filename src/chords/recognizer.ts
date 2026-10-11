// Chord recognition: map a set of pitch classes (plus an optional reliable bass
// note) to the most likely chord(s). Pure module, shared by all input paths.

import { CHORD_TYPES, ChordType, ChordTypeId, chordTypeOrder, getChordType } from './chordTypes';
import { LETTER_PCS, pitchClass } from './notes';
import type { KeyInfo } from './degree';
import { scaleSpellings } from '../staff/keySignatures';

export type Confidence =
  | 'none'      // no notes at all
  | 'note'      // single note (not a chord)
  | 'interval'  // two notes (a dyad, not enough to name a chord)
  | 'confident' // unambiguous match
  | 'ambiguous' // more than one plausible match (shown as alternatives)
  | 'partial'   // matches a chord but some chord tones are missing
  | 'unknown';  // >=3 notes but no known chord explains them

/** Scale degrees that are idiomatically omittable from a chord (e.g. the 5th). */
export type OmittedDegree = 3 | 5 | 7 | 9 | 11 | 13;

export interface ChordMatch {
  root: number;
  typeId: ChordTypeId;
}

export interface ChordCandidate extends ChordMatch {
  /** Chord-tone scale degrees absent from the input (may include the root). */
  missing: number[];
  /** Subset of `missing` that is idiomatically omittable, for "(no5)" markers. */
  omitted: OmittedDegree[];
  /** Count of chord tones present in the input. */
  matched: number;
  /** Number of distinct chord-tone pitch classes in the type. */
  size: number;
}

export interface RecognitionResult {
  chord: ChordMatch | null;
  confidence: Confidence;
  /** Best candidates, most likely first (at most 2). */
  candidates: ChordCandidate[];
  /** Reliable bass pitch class (0-11) if known, otherwise null. */
  bassPc: number | null;
  hasBass: boolean;
}

/**
 * Which degrees may be omitted from each chord type without changing its
 * identity. `no3` is only listed for dominant-family chords where the 7th pins
 * the quality, but the recognition still treats a missing 3rd as ambiguous
 * (C7 vs Cm7) rather than asserting a single answer.
 */
const OMITTABLE_DEGREES: Partial<Record<ChordTypeId, readonly OmittedDegree[]>> = {
  dom7: [5, 3], maj7: [5], m7: [5], mMaj7: [5], halfDim7: [5], aug7: [5],
  dom9: [5, 3], maj9: [5], m9: [5],
  dom11: [5, 3], maj11: [5], m11: [5],
  dom13: [5, 3], maj13: [5], m13: [5],
  sixNine: [5], m6Nine: [5], madd9: [5], madd11: [5], addSharp11: [5], addFlat9: [5],
  sevenSus2: [5], sevenSus4: [5], nineSus4: [5], thirteenSus4: [5],
  augMaj7: [5], maj7Flat5: [5],
  maj9sharp11: [5], maj13sharp11: [5], mMaj9: [5], mMaj11: [5], mMaj13: [5],
  dom7sharp11: [5, 3], dom7flat13: [5, 3], dom7flat9sharp11: [5, 3], dom7sharp9flat13: [5, 3],
};

/** Interval (semitones) of a scale degree within a chord type, or null if absent. */
function degreeInterval(type: ChordType, degree: number): number | null {
  const i = type.degrees.indexOf(degree as ChordType['degrees'][number]);
  return i >= 0 ? type.intervals[i] : null;
}

/**
 * Quality signature "3rdInterval:7thInterval". Two chords that share a root and
 * this signature differ only in color tones (5th / extensions); they are
 * collapsed to the simplest one. Different signatures (or roots) stay as
 * genuine alternatives.
 */
function qualityKey(type: ChordType): string {
  return `${degreeInterval(type, 3)}:${degreeInterval(type, 7)}`;
}

export function recognizeChord(
  pitchClasses: number[],
  bassPc: number | null,
  key?: KeyInfo | null,
): RecognitionResult {
  const input = Array.from(new Set(pitchClasses.map((p) => pitchClass(p))));
  const bass = bassPc == null ? null : pitchClass(bassPc);

  if (input.length === 0) {
    return { chord: null, confidence: 'none', candidates: [], bassPc: bass, hasBass: bass != null };
  }
  if (input.length === 1) {
    return { chord: null, confidence: 'note', candidates: [], bassPc: bass, hasBass: bass != null };
  }
  if (input.length === 2) {
    return { chord: null, confidence: 'interval', candidates: [], bassPc: bass, hasBass: bass != null };
  }

  const inputSet = new Set(input);
  const all: ChordCandidate[] = [];

  for (const type of CHORD_TYPES) {
    for (let root = 0; root < 12; root++) {
      const chordSet = new Set<number>();
      for (const iv of type.intervals) chordSet.add(pitchClass(root + iv));

      let isSubset = true;
      for (const pc of inputSet) {
        if (!chordSet.has(pc)) {
          isSubset = false;
          break;
        }
      }
      if (!isSubset) continue;

      const missing: number[] = [];
      let matched = 0;
      for (let i = 0; i < type.intervals.length; i++) {
        if (inputSet.has(pitchClass(root + type.intervals[i]))) matched++;
        else missing.push(type.degrees[i]);
      }

      const omittable = OMITTABLE_DEGREES[type.id] ?? [];
      const omitted: OmittedDegree[] = [];
      for (const d of missing) {
        if ((omittable as readonly number[]).includes(d)) omitted.push(d as OmittedDegree);
      }

      all.push({ root, typeId: type.id, missing, omitted, matched, size: chordSet.size });
    }
  }

  if (all.length === 0) {
    return { chord: null, confidence: 'unknown', candidates: [], bassPc: bass, hasBass: bass != null };
  }

  const bestMissing = Math.min(...all.map((c) => c.missing.length));
  let coBest = all.filter((c) => c.missing.length === bestMissing);

  // Prefer candidates whose root is actually sounded; rootless voicings
  // (a missing degree 1) are speculative and only kept if nothing else fits.
  const bestHasRoot = Math.max(...coBest.map((c) => (c.missing.includes(1) ? 0 : 1)));
  coBest = coBest.filter((c) => (c.missing.includes(1) ? 0 : 1) === bestHasRoot);

  // Prefer candidates whose root matches the bass note, when available.
  if (bass != null) {
    const withBass = coBest.filter((c) => c.root === bass);
    if (withBass.length > 0) coBest = withBass;
  }

  // Prefer candidates whose root is diatonic to the active key/mode. A late
  // tiebreak only — never overrides interval structure, root presence, or bass.
  if (key != null) {
    const scalePcs = new Set(
      scaleSpellings(key.root, key.mode, key.accidental).map((sp) =>
        pitchClass(LETTER_PCS[sp.letter] + sp.accidental),
      ),
    );
    const withKey = coBest.filter((c) => scalePcs.has(c.root));
    if (withKey.length > 0) coBest = withKey;
  }

  // Collapse same-root "color variants" (same 3rd + 7th, differing only in the
  // 5th or extensions) to the simplest chord, keeping genuine ambiguities.
  const byRootQuality = new Map<string, ChordCandidate>();
  for (const c of coBest) {
    const key = `${c.root}:${qualityKey(getChordType(c.typeId))}`;
    const prev = byRootQuality.get(key);
    if (!prev || chordTypeOrder(c.typeId) < chordTypeOrder(prev.typeId)) {
      byRootQuality.set(key, c);
    }
  }
  const collapsed = [...byRootQuality.values()];

  const ordered = collapsed.sort(
    (a, b) => a.root - b.root || chordTypeOrder(a.typeId) - chordTypeOrder(b.typeId),
  );

  const candidates = ordered.slice(0, 2);
  const primary = candidates[0];
  const multi = candidates.length > 1;
  const confidence: Confidence = multi ? 'ambiguous' : bestMissing !== 0 ? 'partial' : 'confident';

  return {
    chord: { root: primary.root, typeId: primary.typeId },
    confidence,
    candidates,
    bassPc: bass,
    hasBass: bass != null,
  };
}
