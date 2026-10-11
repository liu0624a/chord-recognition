// Chord-degree (scale-degree) analysis and formatting. Given a recognized chord
// (root pitch class + type) and the active key (root letter + mode + accidental
// preference), map the chord to a scale degree with a ♯/♭ alteration and format
// it six ways (roman numerals, roman + quality, arabic/Nashville numbers,
// accidental roman, and functional T/S/D). Pure logic, presentation-only — it
// never changes the recognized chord, its root, quality, or extensions.
//
// Degree alterations are measured against the *parallel major* (Ionian) on the
// same tonic — the standard convention, e.g. ♭III / ♭VI / ♭VII in minor. The
// mode therefore changes the diatonic chord *qualities* (the 7-triad template),
// while a chord's degree + alteration label is mode-independent.

import { ChordTypeId } from './chordTypes';
import {
  CANONICAL_SPELLING,
  LETTER_PCS,
  pitchClass,
} from './notes';
import {
  IONIAN_INTERVALS,
  KeyAccidental,
  keyRootPc,
  ModeId,
  scaleSpellings,
} from '../staff/keySignatures';

/** The six chord-degree display formats. */
export type DegreeDisplay =
  | 'roman' //        Roman numerals (case + °, triad-level quality)
  | 'romanQuality' // Roman numerals + explicit 7th/extension quality
  | 'arabicQuality' // Arabic numbers + quality (1, 2m, 5⁷ …)
  | 'nashville' //    Nashville numbers (concise band/pop notation)
  | 'accidentalRoman' // Roman numerals emphasizing ♯/♭ alterations
  | 'functional' //    T / S / D functional labels
  | 'functionalFull'; // Tonic / Subdominant / Dominant (full names)

/** The active key, for degree analysis. `root` is a letter index 0..6 (C..B). */
export interface KeyInfo {
  root: number;
  mode: ModeId;
  accidental: KeyAccidental;
}

/** A resolved scale degree and its alteration (in semitones, 0 = natural). */
export interface DegreeAnalysis {
  /** 1..7 — the scale degree of the chord root. */
  degree: number;
  /** -2..+2 — how the root is altered relative to the parallel major. */
  alteration: number;
}

const ROMAN_UPPER = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];
const ROMAN_LOWER = ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii'];

/** Letter index (0..6) of each pitch class under the sharp / flat spellings. */
const SHARP_LETTERS = [0, 0, 1, 1, 2, 3, 3, 4, 4, 5, 5, 6]; // C C# D D# E F F# G G# A A# B
const FLAT_LETTERS = [0, 1, 1, 2, 2, 3, 4, 4, 5, 5, 6, 6]; // C Db D Eb E F Gb G Ab A Bb B

/** Chord types whose roman numeral is lowercase (minor / diminished / sus). */
const LOWERCASE_TYPES: ReadonlySet<ChordTypeId> = new Set([
  'minor',
  'diminished',
  'sus2',
  'sus4',
  'm7',
  'm6',
  'm9',
  'm11',
  'm13',
  'mMaj7',
  'dim7',
  'halfDim7',
  'm6Nine',
  'madd9',
  'madd11',
  'sevenSus2',
  'sevenSus4',
  'nineSus4',
  'thirteenSus4',
  'mMaj9',
  'mMaj11',
  'mMaj13',
]);

/** Quality suffix appended to an *arabic/Nashville* degree numeral. */
const ARABIC_SUFFIX: Record<ChordTypeId, string> = {
  major: '', minor: 'm', diminished: '°', augmented: '+',
  sus2: 'sus2', sus4: 'sus4',
  dom7: '7', maj7: 'maj7', m7: 'm7', dim7: '°7', halfDim7: 'ø7', mMaj7: 'mMaj7', aug7: 'aug7',
  sevenSus2: '7sus2', sevenSus4: '7sus4', augMaj7: 'augMaj7', maj7Flat5: 'maj7♭5',
  six: '6', m6: 'm6', add9: 'add9', add11: 'add11',
  sixNine: '6/9', m6Nine: 'm6/9', madd9: 'madd9', madd11: 'madd11',
  addSharp11: 'add♯11', addFlat9: 'add♭9',
  dom9: '9', maj9: 'maj9', m9: 'm9',
  nineSus4: '9sus4', thirteenSus4: '13sus4', maj9sharp11: 'maj9♯11', maj13sharp11: 'maj13♯11',
  mMaj9: 'mMaj9', mMaj11: 'mMaj11', mMaj13: 'mMaj13',
  dom11: '11', maj11: 'maj11', m11: 'm11',
  dom13: '13', maj13: 'maj13', m13: 'm13',
  dom7b5: '7♭5', dom7b9: '7♭9', dom7sharp9: '7♯9',
  dom7sharp11: '7♯11', dom7flat13: '7♭13', dom7flat9sharp11: '7♭9♯11',
  dom7sharp9flat13: '7♯9♭13', sevenAlt: '7alt',
};

/**
 * Quality suffix for a *roman* numeral. Case already distinguishes major (upper)
 * from minor (lower), so the leading "m" is dropped for the minor family; the
 * 7th/extension marker is kept.
 */
const ROMAN_SUFFIX: Record<ChordTypeId, string> = {
  ...ARABIC_SUFFIX,
  minor: '',
  m7: '7',
  m6: '6',
  m9: '9',
  m11: '11',
  m13: '13',
  m6Nine: '6/9',
  madd9: 'add9',
  madd11: 'add11',
};

/** Normalize a semitone difference into a double-flat..double-sharp accidental. */
function normalizeAccidental(diff: number): number {
  let d = diff;
  while (d > 2) d -= 12;
  while (d < -2) d += 12;
  return d;
}

/** The parallel-major (Ionian) scale letters and pitch classes on the same root. */
function parallelMajor(root: number, accidental: KeyAccidental): { letter: number; pc: number }[] {
  const rootPc = keyRootPc(root, accidental);
  return IONIAN_INTERVALS.map((iv, i) => ({
    letter: (root + i) % 7,
    pc: pitchClass(rootPc + iv),
  }));
}

/** Letter index (0..6) of a pitch class under the key's spelling preference. */
function rootLetter(
  pc: number,
  accidental: KeyAccidental,
  major: { letter: number; pc: number }[],
): number {
  if (accidental === 'sharp') return SHARP_LETTERS[pc];
  if (accidental === 'flat') return FLAT_LETTERS[pc];
  // 'none': prefer the parallel major's own letter when the pitch is diatonic to
  // it, otherwise fall back to canonical spelling.
  const hit = major.find((d) => d.pc === pc);
  if (hit) return hit.letter;
  return CANONICAL_SPELLING[pc].letter;
}

/** Map a chord root pitch class to a scale degree + alteration under a key. */
export function analyzeDegree(rootPc: number, key: KeyInfo): DegreeAnalysis {
  const major = parallelMajor(key.root, key.accidental);
  const pc = pitchClass(rootPc);
  const letter = rootLetter(pc, key.accidental, major);
  const degreeIndex = ((letter - key.root) % 7 + 7) % 7;
  const alteration = normalizeAccidental(pc - major[degreeIndex].pc);
  return { degree: degreeIndex + 1, alteration };
}

/** The ♯/♭/𝄪/𝄫 prefix for an alteration ('' when natural). */
function alterationPrefix(alteration: number): string {
  if (alteration <= -2) return '𝄫';
  if (alteration === -1) return '♭';
  if (alteration === 0) return '';
  if (alteration === 1) return '♯';
  return '𝄪';
}

/** Roman numeral for a degree, with the case chosen by the chord type. */
function romanNumeral(degree: number, typeId: ChordTypeId): string {
  const idx = degree - 1;
  return LOWERCASE_TYPES.has(typeId) ? ROMAN_LOWER[idx] : ROMAN_UPPER[idx];
}

/** Triad-level quality marker for method A: ° for diminished, + for augmented. */
function triadRomanSuffix(typeId: ChordTypeId): string {
  if (typeId === 'diminished' || typeId === 'dim7' || typeId === 'halfDim7') return '°';
  if (typeId === 'augmented' || typeId === 'aug7') return '+';
  return '';
}

/** Functional label (T/S/D) for a scale degree. */
function functionalLabel(degree: number): string {
  if (degree === 1 || degree === 3 || degree === 6) return 'T';
  if (degree === 2 || degree === 4) return 'S';
  return 'D'; // 5 and 7
}

/** Full functional name (Tonic/Subdominant/Dominant) for a scale degree. */
function functionalFullLabel(degree: number): string {
  if (degree === 1 || degree === 3 || degree === 6) return 'Tonic';
  if (degree === 2 || degree === 4) return 'Subdominant';
  return 'Dominant'; // 5 and 7
}

/** Format an already-resolved (degree, alteration, type) under a display mode. */
function formatResolved(
  degree: number,
  alteration: number,
  typeId: ChordTypeId,
  display: DegreeDisplay,
): string {
  const prefix = alterationPrefix(alteration);
  switch (display) {
    case 'roman':
      return prefix + romanNumeral(degree, typeId) + triadRomanSuffix(typeId);
    case 'romanQuality':
    case 'accidentalRoman':
      return prefix + romanNumeral(degree, typeId) + ROMAN_SUFFIX[typeId];
    case 'arabicQuality':
    case 'nashville':
      return prefix + String(degree) + ARABIC_SUFFIX[typeId];
    case 'functional':
      return functionalLabel(degree);
    case 'functionalFull':
      return functionalFullLabel(degree);
  }
}

/** Format a recognized chord's scale degree under the active key. */
export function formatDegree(
  rootPc: number,
  typeId: ChordTypeId,
  key: KeyInfo,
  display: DegreeDisplay,
): string {
  const a = analyzeDegree(rootPc, key);
  return formatResolved(a.degree, a.alteration, typeId, display);
}

/** A degree label split into a main body and an optional quality superscript. */
export interface DegreeParts {
  /** Roman numeral (I, ii, ♭VII, …) or the full label for non-roman modes. */
  body: string;
  /** Quality marker rendered as a superscript (romanQuality only), else ''. */
  superscript: string;
}

/**
 * Like `formatDegree`, but split for `romanQuality` so its quality marker can be
 * rendered as a small superscript instead of inline text. Every other mode
 * returns the whole label in `body` with an empty `superscript`.
 */
export function formatDegreeParts(
  rootPc: number,
  typeId: ChordTypeId,
  key: KeyInfo,
  display: DegreeDisplay,
): DegreeParts {
  const a = analyzeDegree(rootPc, key);
  if (display === 'romanQuality') {
    return {
      body: alterationPrefix(a.alteration) + romanNumeral(a.degree, typeId),
      superscript: ROMAN_SUFFIX[typeId],
    };
  }
  return { body: formatResolved(a.degree, a.alteration, typeId, display), superscript: '' };
}

/** The triad quality built on a scale degree (stacking two diatonic thirds). */
function diatonicTriadType(scale: { letter: number; accidental: number }[], degreeIndex: number): ChordTypeId {
  const a = scale[degreeIndex];
  const b = scale[(degreeIndex + 2) % 7];
  const c = scale[(degreeIndex + 4) % 7];
  const pcA = LETTER_PCS[a.letter] + a.accidental;
  const pcB = LETTER_PCS[b.letter] + b.accidental;
  const pcC = LETTER_PCS[c.letter] + c.accidental;
  const third = pitchClass(pcB - pcA);
  const fifth = pitchClass(pcC - pcA);
  if (third === 4 && fifth === 7) return 'major';
  if (third === 3 && fifth === 7) return 'minor';
  if (third === 3 && fifth === 6) return 'diminished';
  return 'augmented';
}

/**
 * The 7 diatonic triads of a key (one per scale degree), formatted under the
 * display mode. The alteration of each degree is measured against the parallel
 * major, so e.g. Dorian yields i – ii – ♭III – IV – v – vi° – ♭VII for any root.
 */
export function formatDiatonicTemplate(key: KeyInfo, display: DegreeDisplay): string[] {
  const scale = scaleSpellings(key.root, key.mode, key.accidental);
  const major = parallelMajor(key.root, key.accidental);
  return scale.map((note, i) => {
    const pc = pitchClass(LETTER_PCS[note.letter] + note.accidental);
    const alteration = normalizeAccidental(pc - major[i].pc);
    const typeId = diatonicTriadType(scale, i);
    return formatResolved(i + 1, alteration, typeId, display);
  });
}
