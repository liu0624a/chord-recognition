// Staff notation model (pure). Maps spelled notes to diatonic positions on a
// treble or bass staff, computing ledger lines. Pixel coordinates are the
// responsibility of the Staff component; this module works in abstract units.

import { LETTER_PCS, PitchSpelling } from '../chords/notes';

export type Clef = 'treble' | 'bass';

export interface StaffNote {
  midi: number;
  spelling: PitchSpelling;
}

export interface PlacedNote {
  midi: number;
  spelling: PitchSpelling;
  /** Vertical position in "staff-line units": 0 = bottom line, 0.5 = first space, … */
  position: number;
  /** Ledger-line positions (same units) outside the staff, if any. */
  ledgerLines: number[];
}

/** Diatonic step (letter-in-octave) of a spelled note; 7 per octave. */
export function diatonicStep(spelling: PitchSpelling, midi: number): number {
  const letter = ((spelling.letter % 7) + 7) % 7;
  const octave = (midi - LETTER_PCS[letter] - spelling.accidental) / 12 - 1;
  return octave * 7 + letter;
}

/** Bottom-line diatonic step for each clef (treble = E4, bass = G2). */
export function bottomLineStep(clef: Clef): number {
  return clef === 'treble' ? 30 : 18;
}

/** Octave-sign notation applied to notes that would otherwise fall far off the staff. */
export type OctaveSign = '8va' | '8vb';

/** MIDI numbers of the octave-sign decision boundaries. */
const C2 = 36;
const C4 = 60;
const C6 = 84;

export interface OctaveSignDecision {
  /** Show 8va on the treble staff (every high-register note is above C6). */
  show8va: boolean;
  /** Show 8vb on the bass staff (every low-register note is below C2). */
  show8vb: boolean;
}

/** The register a note belongs to, for octave-sign placement. */
export type Register = 'high' | 'low';

/**
 * The register C4 (middle C, MIDI 60) belongs to — and, by extension, the
 * chord's overall register. Only C4 is boundary-special: every other pitch
 * (including C at other octaves) votes strictly by actual MIDI pitch (> C4 →
 * high, < C4 → low). C4 itself follows the majority of those votes, defaulting
 * to high on a tie.
 */
export function chordRegister(notes: readonly number[]): Register {
  let high = 0;
  let low = 0;
  for (const midi of notes) {
    if (midi > C4) high++;
    else if (midi < C4) low++;
  }
  // C4 (MIDI 60) follows the majority; a tie defaults to high.
  return high >= low ? 'high' : 'low';
}

/** Register of a single note, given the chord's C4 register. */
function noteRegister(midi: number, c4Register: Register): Register {
  if (midi > C4) return 'high';
  if (midi < C4) return 'low';
  return c4Register;
}

/**
 * Decide whether to show 8va / 8vb for a chord, judged on actual MIDI pitches
 * (not note names alone).
 *
 * 8va (treble) looks only at the high-register notes and shows iff every one of
 * them is above C6 (84); a high-register note in [C4, C6] suppresses it, while
 * low-register notes never influence it. 8vb (bass) looks only at the
 * low-register notes and shows iff every one is below C2 (36); a low-register
 * note in [C2, C4] suppresses it, while high-register notes never influence it.
 * The two signs are decided independently.
 */
export function octaveSignsFor(notes: readonly number[]): OctaveSignDecision {
  if (notes.length === 0) return { show8va: false, show8vb: false };

  const c4Register = chordRegister(notes);
  const high = notes.filter((n) => noteRegister(n, c4Register) === 'high');
  const low = notes.filter((n) => noteRegister(n, c4Register) === 'low');
  return {
    show8va: high.length > 0 && high.every((n) => n > C6),
    show8vb: low.length > 0 && low.every((n) => n < C2),
  };
}

/**
 * The octave sign a single note is drawn with, given the chord's decision. A
 * sign only ever applies to notes that actually lie beyond its boundary: above
 * C6 for 8va, below C2 for 8vb. (A boundary-straddling C4 never carries a sign.)
 */
export function octaveSignForNote(midi: number, decision: OctaveSignDecision): OctaveSign | null {
  if (decision.show8va && midi > C6) return '8va';
  if (decision.show8vb && midi < C2) return '8vb';
  return null;
}

/**
 * Choose which clef(s) to show: all notes ≥ C4 (60) are treble, all below are
 * bass; a mix uses the grand staff.
 */
export function chooseClef(notes: number[]): Clef | 'grand' {
  if (notes.length === 0) return 'grand';
  const allTreble = notes.every((n) => n >= 60);
  const allBass = notes.every((n) => n < 60);
  if (allTreble) return 'treble';
  if (allBass) return 'bass';
  return 'grand';
}

/** Place a single spelled note on a clef (position + ledger lines). */
export function placeNote(note: StaffNote, clef: Clef): PlacedNote {
  const step = diatonicStep(note.spelling, note.midi);
  const position = (step - bottomLineStep(clef)) / 2;

  const ledgerLines: number[] = [];
  if (position < 0) {
    for (let q = -1; q >= Math.ceil(position); q--) ledgerLines.push(q);
  } else if (position > 4) {
    for (let q = 5; q <= Math.floor(position); q++) ledgerLines.push(q);
  }

  return { midi: note.midi, spelling: note.spelling, position, ledgerLines };
}

/** Place notes on a clef, sorted ascending by pitch. */
export function placeNotes(notes: StaffNote[], clef: Clef): PlacedNote[] {
  return notes.map((n) => placeNote(n, clef)).sort((a, b) => a.midi - b.midi);
}

/**
 * Spread a list of vertical positions (ascending) so consecutive entries are at
 * least `minGap` apart, with the smallest total displacement: a forward pass
 * pushes entries down, a backward pass pushes them up, and each entry takes the
 * average of the two — so a crowded cluster spreads symmetrically around its
 * centre while every gap stays >= `minGap`. Used to keep note-name labels from
 * overlapping on the staff.
 */
export function spreadPositions(ys: number[], minGap: number): number[] {
  const n = ys.length;
  if (n <= 1) return ys.slice();

  const down = ys.slice();
  for (let i = 1; i < n; i++) {
    if (down[i] < down[i - 1] + minGap) down[i] = down[i - 1] + minGap;
  }
  const up = ys.slice();
  for (let i = n - 2; i >= 0; i--) {
    if (up[i] > up[i + 1] - minGap) up[i] = up[i + 1] - minGap;
  }
  return ys.map((_, i) => (down[i] + up[i]) / 2);
}

/**
 * Ordering rank of an accidental for stacking note-name labels that share a
 * staff position, top to bottom: sharp (♯) first, then natural (♮), then flat
 * (♭). Double sharps/flats fall in the same group as their single counterparts.
 */
export function accidentalRank(accidental: number): number {
  if (accidental > 0) return 0;
  if (accidental < 0) return 2;
  return 1;
}
