// Chord type definitions: each type is described by its interval structure
// (semitones above the root, always including 0) and a list of display suffixes.

export type ChordTypeId =
  | 'major' | 'minor' | 'diminished' | 'augmented' | 'sus2' | 'sus4'
  | 'dom7' | 'maj7' | 'm7' | 'dim7' | 'halfDim7' | 'mMaj7' | 'aug7'
  | 'sevenSus2' | 'sevenSus4' | 'augMaj7' | 'maj7Flat5'
  | 'six' | 'm6' | 'add9' | 'add11' | 'sixNine' | 'm6Nine'
  | 'madd9' | 'madd11' | 'addSharp11' | 'addFlat9'
  | 'dom9' | 'maj9' | 'm9'
  | 'nineSus4' | 'thirteenSus4' | 'maj9sharp11' | 'maj13sharp11'
  | 'mMaj9' | 'mMaj11' | 'mMaj13'
  | 'dom11' | 'maj11' | 'm11'
  | 'dom13' | 'maj13' | 'm13'
  | 'dom7b5' | 'dom7b9' | 'dom7sharp9'
  | 'dom7sharp11' | 'dom7flat13' | 'dom7flat9sharp11' | 'dom7sharp9flat13' | 'sevenAlt';

export type ChordGroup = 'triad' | 'seventh' | 'extended' | 'altered';

/** Scale degree of a chord tone (1..13); drives diatonic spelling of the note. */
export type ChordDegree = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 9 | 11 | 13;

/** How a chord is expressed as a base chord plus stacked extensions. */
export interface ChordComposition {
  /** Base chord whose suffix is rendered before the parenthesized extensions. */
  base: ChordTypeId;
  /** Extension/alteration degree labels, in order, e.g. ['9'], ['♭9','♯11']. */
  extensions: string[];
}

export interface ChordType {
  id: ChordTypeId;
  name: string;
  /** Sorted intervals (semitones above the root), always starting at 0. */
  intervals: number[];
  /** Scale degree of each interval, parallel to `intervals` (for spelling). */
  degrees: ChordDegree[];
  /** Suffix options; the root letter is prepended when formatting ("" = major). */
  symbols: string[];
  group: ChordGroup;
  /** Base chord + extensions used to render the chord-composition expression. */
  composition: ChordComposition;
}

export const CHORD_TYPES: ChordType[] = [
  // Triads
  { id: 'major', name: 'Major', intervals: [0, 4, 7], degrees: [1, 3, 5], symbols: ['', 'Maj', 'M', 'Δ'], group: 'triad', composition: { base: 'major', extensions: [] } },
  { id: 'minor', name: 'Minor', intervals: [0, 3, 7], degrees: [1, 3, 5], symbols: ['m', 'min', '−'], group: 'triad', composition: { base: 'minor', extensions: [] } },
  { id: 'diminished', name: 'Diminished', intervals: [0, 3, 6], degrees: [1, 3, 5], symbols: ['dim', '°'], group: 'triad', composition: { base: 'diminished', extensions: [] } },
  { id: 'augmented', name: 'Augmented', intervals: [0, 4, 8], degrees: [1, 3, 5], symbols: ['aug', '+'], group: 'triad', composition: { base: 'augmented', extensions: [] } },
  { id: 'sus2', name: 'Suspended 2nd', intervals: [0, 2, 7], degrees: [1, 2, 5], symbols: ['sus2'], group: 'triad', composition: { base: 'sus2', extensions: [] } },
  { id: 'sus4', name: 'Suspended 4th', intervals: [0, 5, 7], degrees: [1, 4, 5], symbols: ['sus4'], group: 'triad', composition: { base: 'sus4', extensions: [] } },

  // Seventh chords
  { id: 'dom7', name: 'Dominant 7th', intervals: [0, 4, 7, 10], degrees: [1, 3, 5, 7], symbols: ['7'], group: 'seventh', composition: { base: 'dom7', extensions: [] } },
  { id: 'maj7', name: 'Major 7th', intervals: [0, 4, 7, 11], degrees: [1, 3, 5, 7], symbols: ['maj7', 'M7', 'Δ7'], group: 'seventh', composition: { base: 'maj7', extensions: [] } },
  { id: 'm7', name: 'Minor 7th', intervals: [0, 3, 7, 10], degrees: [1, 3, 5, 7], symbols: ['m7', 'min7', '−7'], group: 'seventh', composition: { base: 'm7', extensions: [] } },
  { id: 'dim7', name: 'Diminished 7th', intervals: [0, 3, 6, 9], degrees: [1, 3, 5, 7], symbols: ['dim7', '°7'], group: 'seventh', composition: { base: 'dim7', extensions: [] } },
  { id: 'halfDim7', name: 'Half-diminished 7th', intervals: [0, 3, 6, 10], degrees: [1, 3, 5, 7], symbols: ['m7♭5', 'ø7'], group: 'seventh', composition: { base: 'halfDim7', extensions: [] } },
  { id: 'mMaj7', name: 'Minor-major 7th', intervals: [0, 3, 7, 11], degrees: [1, 3, 5, 7], symbols: ['mMaj7', 'mΔ7'], group: 'seventh', composition: { base: 'mMaj7', extensions: [] } },
  { id: 'aug7', name: 'Augmented 7th', intervals: [0, 4, 8, 10], degrees: [1, 3, 5, 7], symbols: ['aug7', '+7', '7♯5'], group: 'seventh', composition: { base: 'aug7', extensions: [] } },
  { id: 'sevenSus2', name: 'Dominant 7 sus2', intervals: [0, 2, 7, 10], degrees: [1, 2, 5, 7], symbols: ['7sus2'], group: 'seventh', composition: { base: 'sevenSus2', extensions: [] } },
  { id: 'sevenSus4', name: 'Dominant 7 sus4', intervals: [0, 5, 7, 10], degrees: [1, 4, 5, 7], symbols: ['7sus4'], group: 'seventh', composition: { base: 'sevenSus4', extensions: [] } },
  { id: 'augMaj7', name: 'Augmented major 7th', intervals: [0, 4, 8, 11], degrees: [1, 3, 5, 7], symbols: ['augMaj7', 'maj7♯5', 'maj7#5', 'AugMaj7'], group: 'seventh', composition: { base: 'augMaj7', extensions: [] } },
  { id: 'maj7Flat5', name: 'Major 7♭5', intervals: [0, 4, 6, 11], degrees: [1, 3, 5, 7], symbols: ['maj7♭5', 'maj7b5', 'Maj7♭5'], group: 'seventh', composition: { base: 'maj7Flat5', extensions: [] } },

  // Extended chords
  { id: 'six', name: 'Major 6th', intervals: [0, 4, 7, 9], degrees: [1, 3, 5, 6], symbols: ['6', 'add13'], group: 'extended', composition: { base: 'six', extensions: [] } },
  { id: 'm6', name: 'Minor 6th', intervals: [0, 3, 7, 9], degrees: [1, 3, 5, 6], symbols: ['m6', 'min6', '−6'], group: 'extended', composition: { base: 'm6', extensions: [] } },
  { id: 'add9', name: 'Add 9', intervals: [0, 2, 4, 7], degrees: [1, 9, 3, 5], symbols: ['add9'], group: 'extended', composition: { base: 'add9', extensions: [] } },
  { id: 'add11', name: 'Add 11', intervals: [0, 4, 5, 7], degrees: [1, 3, 11, 5], symbols: ['add11'], group: 'extended', composition: { base: 'add11', extensions: [] } },
  { id: 'sixNine', name: 'Major 6/9', intervals: [0, 2, 4, 7, 9], degrees: [1, 9, 3, 5, 6], symbols: ['6/9'], group: 'extended', composition: { base: 'six', extensions: ['9'] } },
  { id: 'm6Nine', name: 'Minor 6/9', intervals: [0, 2, 3, 7, 9], degrees: [1, 9, 3, 5, 6], symbols: ['m6/9', 'min6/9', '−6/9'], group: 'extended', composition: { base: 'm6', extensions: ['9'] } },
  { id: 'madd9', name: 'Minor add 9', intervals: [0, 2, 3, 7], degrees: [1, 9, 3, 5], symbols: ['madd9', 'minadd9', '−add9'], group: 'extended', composition: { base: 'madd9', extensions: [] } },
  { id: 'madd11', name: 'Minor add 11', intervals: [0, 3, 5, 7], degrees: [1, 3, 11, 5], symbols: ['madd11', 'minadd11', '−add11'], group: 'extended', composition: { base: 'madd11', extensions: [] } },
  { id: 'addSharp11', name: 'Add ♯11', intervals: [0, 4, 6, 7], degrees: [1, 3, 11, 5], symbols: ['add♯11', 'add#11'], group: 'extended', composition: { base: 'addSharp11', extensions: [] } },
  { id: 'addFlat9', name: 'Add ♭9', intervals: [0, 1, 4, 7], degrees: [1, 9, 3, 5], symbols: ['add♭9', 'addb9'], group: 'extended', composition: { base: 'addFlat9', extensions: [] } },
  { id: 'dom9', name: 'Dominant 9th', intervals: [0, 2, 4, 7, 10], degrees: [1, 9, 3, 5, 7], symbols: ['9'], group: 'extended', composition: { base: 'dom7', extensions: ['9'] } },
  { id: 'maj9', name: 'Major 9th', intervals: [0, 2, 4, 7, 11], degrees: [1, 9, 3, 5, 7], symbols: ['maj9', 'M9', 'Δ9'], group: 'extended', composition: { base: 'maj7', extensions: ['9'] } },
  { id: 'm9', name: 'Minor 9th', intervals: [0, 2, 3, 7, 10], degrees: [1, 9, 3, 5, 7], symbols: ['m9', 'min9', '−9'], group: 'extended', composition: { base: 'm7', extensions: ['9'] } },
  { id: 'nineSus4', name: 'Dominant 9 sus4', intervals: [0, 2, 5, 7, 10], degrees: [1, 9, 4, 5, 7], symbols: ['9sus4'], group: 'extended', composition: { base: 'sevenSus4', extensions: ['9'] } },
  { id: 'thirteenSus4', name: 'Dominant 13 sus4', intervals: [0, 2, 5, 7, 9, 10], degrees: [1, 9, 4, 5, 13, 7], symbols: ['13sus4'], group: 'extended', composition: { base: 'sevenSus4', extensions: ['9', '13'] } },
  { id: 'maj9sharp11', name: 'Major 9♯11', intervals: [0, 2, 4, 6, 7, 11], degrees: [1, 9, 3, 11, 5, 7], symbols: ['maj9♯11', 'M9♯11', 'Δ9♯11', 'Maj9♯11'], group: 'extended', composition: { base: 'maj7', extensions: ['9', '♯11'] } },
  { id: 'maj13sharp11', name: 'Major 13♯11', intervals: [0, 2, 4, 6, 7, 9, 11], degrees: [1, 9, 3, 11, 5, 13, 7], symbols: ['maj13♯11', 'M13♯11', 'Δ13♯11', 'Maj13♯11'], group: 'extended', composition: { base: 'maj7', extensions: ['9', '♯11', '13'] } },
  { id: 'mMaj9', name: 'Minor-major 9th', intervals: [0, 2, 3, 7, 11], degrees: [1, 9, 3, 5, 7], symbols: ['mMaj9', 'mM9', 'mΔ9'], group: 'extended', composition: { base: 'mMaj7', extensions: ['9'] } },
  { id: 'mMaj11', name: 'Minor-major 11th', intervals: [0, 2, 3, 5, 7, 11], degrees: [1, 9, 3, 11, 5, 7], symbols: ['mMaj11', 'mM11', 'mΔ11'], group: 'extended', composition: { base: 'mMaj7', extensions: ['9', '11'] } },
  { id: 'mMaj13', name: 'Minor-major 13th', intervals: [0, 2, 3, 5, 7, 9, 11], degrees: [1, 9, 3, 11, 5, 13, 7], symbols: ['mMaj13', 'mM13', 'mΔ13'], group: 'extended', composition: { base: 'mMaj7', extensions: ['9', '11', '13'] } },
  { id: 'dom11', name: 'Dominant 11th', intervals: [0, 2, 4, 5, 7, 10], degrees: [1, 9, 3, 11, 5, 7], symbols: ['11'], group: 'extended', composition: { base: 'dom7', extensions: ['9', '11'] } },
  { id: 'maj11', name: 'Major 11th', intervals: [0, 2, 4, 5, 7, 11], degrees: [1, 9, 3, 11, 5, 7], symbols: ['maj11', 'M11', 'Δ11'], group: 'extended', composition: { base: 'maj7', extensions: ['9', '11'] } },
  { id: 'm11', name: 'Minor 11th', intervals: [0, 2, 3, 5, 7, 10], degrees: [1, 9, 3, 11, 5, 7], symbols: ['m11', 'min11', '−11'], group: 'extended', composition: { base: 'm7', extensions: ['9', '11'] } },
  { id: 'dom13', name: 'Dominant 13th', intervals: [0, 2, 4, 7, 9, 10], degrees: [1, 9, 3, 5, 13, 7], symbols: ['13'], group: 'extended', composition: { base: 'dom7', extensions: ['9', '11', '13'] } },
  { id: 'maj13', name: 'Major 13th', intervals: [0, 2, 4, 7, 9, 11], degrees: [1, 9, 3, 5, 13, 7], symbols: ['maj13', 'M13', 'Δ13'], group: 'extended', composition: { base: 'maj7', extensions: ['9', '11', '13'] } },
  { id: 'm13', name: 'Minor 13th', intervals: [0, 2, 3, 7, 9, 10], degrees: [1, 9, 3, 5, 13, 7], symbols: ['m13', 'min13', '−13'], group: 'extended', composition: { base: 'm7', extensions: ['9', '11', '13'] } },

  // Altered dominant chords
  { id: 'dom7b5', name: 'Dominant 7♭5', intervals: [0, 4, 6, 10], degrees: [1, 3, 5, 7], symbols: ['7♭5'], group: 'altered', composition: { base: 'dom7b5', extensions: [] } },
  { id: 'dom7b9', name: 'Dominant 7♭9', intervals: [0, 1, 4, 7, 10], degrees: [1, 9, 3, 5, 7], symbols: ['7♭9'], group: 'altered', composition: { base: 'dom7', extensions: ['♭9'] } },
  { id: 'dom7sharp9', name: 'Dominant 7♯9', intervals: [0, 3, 4, 7, 10], degrees: [1, 9, 3, 5, 7], symbols: ['7♯9'], group: 'altered', composition: { base: 'dom7', extensions: ['♯9'] } },
  { id: 'dom7sharp11', name: 'Dominant 7♯11', intervals: [0, 4, 6, 7, 10], degrees: [1, 3, 11, 5, 7], symbols: ['7♯11', '7#11'], group: 'altered', composition: { base: 'dom7', extensions: ['♯11'] } },
  { id: 'dom7flat13', name: 'Dominant 7♭13', intervals: [0, 4, 7, 8, 10], degrees: [1, 3, 5, 13, 7], symbols: ['7♭13', '7b13'], group: 'altered', composition: { base: 'dom7', extensions: ['♭13'] } },
  { id: 'dom7flat9sharp11', name: 'Dominant 7♭9♯11', intervals: [0, 1, 4, 6, 7, 10], degrees: [1, 9, 3, 11, 5, 7], symbols: ['7♭9♯11', '7b9♯11'], group: 'altered', composition: { base: 'dom7', extensions: ['♭9', '♯11'] } },
  { id: 'dom7sharp9flat13', name: 'Dominant 7♯9♭13', intervals: [0, 3, 4, 7, 8, 10], degrees: [1, 9, 3, 5, 13, 7], symbols: ['7♯9♭13', '7♯9b13'], group: 'altered', composition: { base: 'dom7', extensions: ['♯9', '♭13'] } },
  { id: 'sevenAlt', name: 'Altered dominant', intervals: [0, 1, 3, 4, 6, 8, 10], degrees: [1, 9, 9, 3, 11, 13, 7], symbols: ['7alt'], group: 'altered', composition: { base: 'dom7', extensions: ['alt'] } },
];

export function getChordType(id: ChordTypeId): ChordType {
  const type = CHORD_TYPES.find((t) => t.id === id);
  if (!type) throw new Error(`Unknown chord type: ${id}`);
  return type;
}

/** Stable ordering used to pick a deterministic primary result on ties. */
export function chordTypeOrder(id: ChordTypeId): number {
  return CHORD_TYPES.findIndex((t) => t.id === id);
}
