// Note / pitch-class utilities shared across the whole app.

export const NOTE_NAMES = [
  'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B',
] as const;

export const FLAT_NAMES = [
  'C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B',
] as const;

/** Diatonic letters in order (index 0 = C, 6 = B). */
export const LETTER_NAMES = ['C', 'D', 'E', 'F', 'G', 'A', 'B'] as const;

/** Natural (un-accidented) pitch class of each letter index 0..6 (C..B). */
export const LETTER_PCS = [0, 2, 4, 5, 7, 9, 11] as const;

/** Number of semitones an accidental adds: -2 = double-flat … +2 = double-sharp. */
export type Accidental = -2 | -1 | 0 | 1 | 2;

export interface PitchSpelling {
  /** Diatonic letter index 0..6 (C = 0, D = 1, … B = 6). */
  letter: number;
  /** Accidental in semitones (-2 .. +2); 0 = natural. */
  accidental: Accidental;
}

/**
 * Canonical spelling for each pitch class, choosing the common chord-chart
 * letter (sharps for F#/C#-side, flats for Db/Eb/Ab/Bb-side). Produces
 * C, Db, D, Eb, E, F, F#, G, Ab, A, Bb, B.
 */
export const CANONICAL_SPELLING: PitchSpelling[] = [
  { letter: 0, accidental: 0 }, // C
  { letter: 1, accidental: -1 }, // Db
  { letter: 1, accidental: 0 }, // D
  { letter: 2, accidental: -1 }, // Eb
  { letter: 2, accidental: 0 }, // E
  { letter: 3, accidental: 0 }, // F
  { letter: 3, accidental: 1 }, // F#
  { letter: 4, accidental: 0 }, // G
  { letter: 5, accidental: -1 }, // Ab
  { letter: 5, accidental: 0 }, // A
  { letter: 6, accidental: -1 }, // Bb
  { letter: 6, accidental: 0 }, // B
];

/** Normalize any integer (MIDI note or pitch class) to a pitch class 0..11 (C = 0). */
export function pitchClass(value: number): number {
  return ((value % 12) + 12) % 12;
}

/** Pitch class name without octave, using sharps, e.g. 0 -> "C", 1 -> "C#". */
export function pitchClassName(pc: number): string {
  return NOTE_NAMES[pitchClass(pc)];
}

/** Pitch class name with an explicit sharp/flat preference, e.g. 10 -> "A#" | "Bb". */
export function spellPitchClass(pc: number, preferFlat = false): string {
  const p = pitchClass(pc);
  return preferFlat ? FLAT_NAMES[p] : NOTE_NAMES[p];
}

/** Canonical pitch-class name, e.g. 1 -> "Db", 6 -> "F#", 10 -> "Bb". */
export function canonicalPitchClassName(pc: number): string {
  return spellingToPitchClassName(CANONICAL_SPELLING[pitchClass(pc)]);
}

/**
 * Pitch-class name under a spelling preference: 'sharp' -> "C#"/"D#"/"F#",
 * 'flat' -> "Db"/"Eb"/"Gb", 'none' -> canonical (a sharps/flats mix). Used for
 * chord-root spelling; never changes the pitch class.
 */
export function pitchClassNameWithAccidental(
  pc: number,
  accidental: 'sharp' | 'flat' | 'none',
): string {
  const p = pitchClass(pc);
  if (accidental === 'sharp') return NOTE_NAMES[p];
  if (accidental === 'flat') return FLAT_NAMES[p];
  return canonicalPitchClassName(p);
}

/**
 * Structured pitch-class spelling (letter + accidental) under a preference:
 * 'sharp' -> C♯/D♯/F♯…, 'flat' -> D♭/E♭/G♭…, 'none' -> the canonical mix
 * ("D♭"/"F♯"/"A♭"…). This is the enharmonic *fallback* used only when a note has
 * no stronger musical context (key scale or chord structure); it never changes
 * the pitch class.
 */
export function pitchClassSpelling(
  pc: number,
  accidental: 'sharp' | 'flat' | 'none',
): PitchSpelling {
  const p = pitchClass(pc);
  if (accidental === 'sharp') {
    const name = NOTE_NAMES[p];
    return { letter: 'CDEFGAB'.indexOf(name[0]), accidental: name.includes('#') ? 1 : 0 };
  }
  if (accidental === 'flat') {
    const name = FLAT_NAMES[p];
    return { letter: 'CDEFGAB'.indexOf(name[0]), accidental: name.includes('b') ? -1 : 0 };
  }
  return CANONICAL_SPELLING[p];
}

/**
 * Pitch-class name with proper musical ♯/♭ glyphs (never ASCII '#'/'b'), spelled
 * under a preference: 'sharp' -> "C♯"/"D♯"/"F♯"…, 'flat' -> "D♭"/"E♭"/"G♭"…,
 * 'none' -> the canonical sharps/flats mix ("D♭"/"F♯"/"A♭"…). Used for staff note
 * labels so the same pitch reads "C♯" or "D♭" depending on the spelling rule.
 */
export function pitchClassNameGlyphs(
  pc: number,
  accidental: 'sharp' | 'flat' | 'none',
): string {
  return pitchClassNameWithAccidental(pc, accidental)
    .replace('#', '♯')
    .replace('b', '♭');
}

/** Full note name with octave, e.g. 60 -> "C4", with optional flat preference. */
export function noteName(midi: number, preferFlat = false): string {
  const octave = Math.floor(midi / 12) - 1;
  return `${spellPitchClass(midi, preferFlat)}${octave}`;
}

/** Canonical full note name with octave, e.g. 58 -> "Bb3", 66 -> "F#4". */
export function canonicalNoteName(midi: number): string {
  return spellingToName(CANONICAL_SPELLING[pitchClass(midi)], midi);
}

/** How piano key labels are shown: hidden, sharps/flats/both, or only the C keys. */
export type NoteNameMode = 'off' | 'sharp' | 'flat' | 'both' | 'cOnly';

/** How fretboard note names are labeled: sharps only, flats only, or both. */
export type FretNoteDisplay = 'sharp' | 'flat' | 'both';

const SHARP = '♯';
const FLAT = '♭';

/**
 * Piano key label for a MIDI note under a note-name mode. White keys always show
 * their letter + octave ("C4"); black keys show their enharmonic name(s) per the
 * mode ("C♯4" / "D♭4" / two stacked lines "C♯4\nD♭4" for 'both'). Returns '' when
 * the mode is 'off'. In 'cOnly' mode only the C keys are labeled ("C1", "C2", …)
 * as octave landmarks, and every other key returns ''. This is a display label
 * only — it never changes the note's pitch, MIDI number, or identity.
 */
export function keyNoteLabel(midi: number, mode: NoteNameMode): string {
  if (mode === 'off') return '';
  if (mode === 'cOnly') {
    return pitchClass(midi) === 0 ? `C${Math.floor(midi / 12) - 1}` : '';
  }
  const pc = pitchClass(midi);
  const octave = Math.floor(midi / 12) - 1;
  const name = NOTE_NAMES[pc];
  if (name.length === 1) return `${name}${octave}`; // natural white key
  const sharp = name.replace('#', SHARP);
  const flat = FLAT_NAMES[pc].replace('b', FLAT);
  if (mode === 'sharp') return `${sharp}${octave}`;
  if (mode === 'flat') return `${flat}${octave}`;
  // Two enharmonic names stacked vertically (sharp on top, flat below); the
  // component renders the newline as a line break, keeping each name narrow
  // enough to sit fully inside the black key.
  return `${sharp}${octave}\n${flat}${octave}`;
}

/**
 * Fretboard note-name label, chosen by the display mode:
 *  - 'sharp': black keys show only the sharp name ("C♯4");
 *  - 'flat':  black keys show only the flat name ("D♭4");
 *  - 'both':  black keys show both enharmonic names ("C♯4/D♭4").
 * White keys always show their single name ("C4"). Display only — it never
 * changes the note's pitch, MIDI number, or identity, and is independent of any
 * active key or chord spelling.
 */
export function fretNoteLabel(midi: number, mode: FretNoteDisplay): string {
  const pc = pitchClass(midi);
  const octave = Math.floor(midi / 12) - 1;
  const name = NOTE_NAMES[pc];
  if (name.length === 1) return `${name}${octave}`; // natural white key
  const sharp = name.replace('#', SHARP);
  const flat = FLAT_NAMES[pc].replace('b', FLAT);
  if (mode === 'sharp') return `${sharp}${octave}`;
  if (mode === 'flat') return `${flat}${octave}`;
  return `${sharp}${octave}/${flat}${octave}`;
}

/** Convert a spelling to a pitch-class name (no octave), e.g. {letter:6, accidental:-1} -> "Bb". */
export function spellingToPitchClassName(sp: PitchSpelling): string {
  const letter = LETTER_NAMES[((sp.letter % 7) + 7) % 7];
  const acc = sp.accidental;
  const suffix = acc === -2 ? 'bb' : acc === -1 ? 'b' : acc === 1 ? '#' : acc === 2 ? '##' : '';
  return letter + suffix;
}

/**
 * A spelling as a pitch-class name with musical ♯/♭ glyphs (never ASCII '#'/'b'),
 * so a note's label always matches its written accidental, e.g.
 * {letter:0, accidental:1} -> "C♯", {letter:6, accidental:-1} -> "B♭",
 * {letter:0, accidental:2} -> "C♯♯". Used for staff note-name labels.
 */
export function spellingToPitchClassNameGlyphs(sp: PitchSpelling): string {
  return spellingToPitchClassName(sp)
    .replace(/#/g, '♯')
    .replace(/b/g, '♭');
}

/** Convert a spelling plus a MIDI number to a full note name with octave. */
export function spellingToName(sp: PitchSpelling, midi: number): string {
  return `${spellingToPitchClassName(sp)}${spellingOctave(sp, midi)}`;
}

/**
 * Diatonic octave of a spelled note, correct even for edge cases like B# or Cb
 * where the naive `floor(midi/12)-1` would cross an octave boundary. Derived
 * from the fact that midi = 12*(octave+1) + LETTER_PCS[letter] + accidental.
 */
export function spellingOctave(sp: PitchSpelling, midi: number): number {
  const letter = ((sp.letter % 7) + 7) % 7;
  return (midi - LETTER_PCS[letter] - sp.accidental) / 12 - 1;
}

const ACCIDENTAL_CHARS: Record<string, number> = {
  '#': 1, '♯': 1, b: -1, '♭': -1,
};

const LETTER_INDEX: Record<string, number> = { C: 0, D: 1, E: 2, F: 3, G: 4, A: 5, B: 6 };

/** Parse a pitch-class name ("C", "C#", "Db", "C##", "Bbb") into a pitch class 0..11, or null. */
export function parsePitchClassName(text: string): number | null {
  const m = /^\s*([A-Ga-g])\s*([#♯b♭]{0,2})\s*$/.exec(text);
  if (!m) return null;
  const letterIdx = LETTER_INDEX[m[1].toUpperCase()];
  if (letterIdx == null) return null;
  let acc = 0;
  for (const ch of m[2]) acc += ACCIDENTAL_CHARS[ch] ?? 0;
  return pitchClass(LETTER_PCS[letterIdx] + acc);
}

/** Parse a full note name ("C#4", "Bb3", "A0", "C8") into a MIDI note number, or null. */
export function parseNoteName(text: string): number | null {
  const m = /^\s*([A-Ga-g])\s*([#♯b♭]{0,2})\s*(-?\d+)\s*$/.exec(text);
  if (!m) return null;
  const pc = parsePitchClassName(m[1] + m[2]);
  if (pc == null) return null;
  const octave = parseInt(m[3], 10);
  const midi = (octave + 1) * 12 + pc;
  return midi >= 0 && midi <= 127 ? midi : null;
}

/** MIDI note number -> frequency in Hz (A4 = 440). */
export function midiToFrequency(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/** Frequency in Hz -> nearest MIDI note number. */
export function frequencyToMidi(frequency: number): number {
  return Math.round(69 + 12 * Math.log2(frequency / 440));
}
