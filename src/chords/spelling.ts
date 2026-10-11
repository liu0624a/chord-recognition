// Chord-context note spelling: choose sharps/flats for chord tones based on the
// chord's root letter so the printed accidentals are musically correct, e.g.
// F# major -> F# A# C# (not Gb Bb Db), Ab major -> Ab C Eb, Bb major -> Bb D F.

import { ChordTypeId, getChordType } from './chordTypes';
import { KeyInfo } from './degree';
import {
  Accidental,
  CANONICAL_SPELLING,
  LETTER_PCS,
  pitchClass,
  pitchClassSpelling,
  PitchSpelling,
  spellingToName,
  spellingToPitchClassName,
} from './notes';
import { scaleSpellings } from '../staff/keySignatures';

/** Normalize a semitone difference into a double-flat..double-sharp accidental. */
function normalizeAccidental(diff: number): Accidental {
  let d = diff;
  while (d > 2) d -= 12;
  while (d < -2) d += 12;
  return d as Accidental;
}

/**
 * Spell one chord tone given the root spelling and the tone's scale degree
 * (letter position relative to the root). `degree` is 1..13 (9/11/13 map to
 * the 2nd/4th/6th letters).
 */
export function spellChordTone(rootSpelling: PitchSpelling, degree: number, targetPc: number): PitchSpelling {
  const letter = ((rootSpelling.letter + (degree - 1)) % 7 + 7) % 7;
  const letterPc = LETTER_PCS[letter];
  const accidental = normalizeAccidental(targetPc - letterPc);
  return { letter, accidental };
}

/** Spell all chord tones of `root` + `typeId`, aligned with `intervals`. */
export function chordToneSpelling(root: number, typeId: ChordTypeId): PitchSpelling[] {
  const type = getChordType(typeId);
  const rootPc = pitchClass(root);
  const rootSpelling = CANONICAL_SPELLING[rootPc];
  return type.intervals.map((iv, i) =>
    spellChordTone(rootSpelling, type.degrees[i], pitchClass(rootPc + iv)),
  );
}

/** Chord tone names in context spelling, e.g. F# major -> ["F#", "A#", "C#"]. */
export function chordToneNames(root: number, typeId: ChordTypeId): string[] {
  return chordToneSpelling(root, typeId).map((sp) => spellingToPitchClassName(sp));
}

/**
 * Return a function that spells any MIDI note's pitch class in the context of
 * `root`+`typeId` as a structured `PitchSpelling`. Chord tones get context
 * spelling; other pitch classes fall back to canonical spelling.
 */
export function chordSpellingFor(root: number, typeId: ChordTypeId): (midi: number) => PitchSpelling {
  const type = getChordType(typeId);
  const rootPc = pitchClass(root);
  const tones = chordToneSpelling(root, typeId);
  const byPc = new Map<number, PitchSpelling>();
  type.intervals.forEach((iv, i) => {
    const pc = pitchClass(rootPc + iv);
    if (!byPc.has(pc)) byPc.set(pc, tones[i]);
  });

  return (midi: number) => byPc.get(pitchClass(midi)) ?? CANONICAL_SPELLING[pitchClass(midi)];
}

/**
 * Return a function that spells any MIDI note in the context of `root`+`typeId`.
 * Chord tones get context spelling; other pitch classes fall back to canonical
 * spelling.
 */
export function chordSpellContext(root: number, typeId: ChordTypeId): (midi: number) => string {
  const spell = chordSpellingFor(root, typeId);
  return (midi: number) => spellingToName(spell(midi), midi);
}

/**
 * Spell a pitch class under an active key: diatonic notes take their scale
 * spelling (each letter once — e.g. pc 8 is G♯ in E major, never A♭); chromatic
 * notes fall back to the accidental preference / canonical spelling.
 */
export function spellPitchClassInKey(pc: number, key: KeyInfo): PitchSpelling {
  const target = pitchClass(pc);
  for (const sp of scaleSpellings(key.root, key.mode, key.accidental)) {
    if (pitchClass(LETTER_PCS[sp.letter] + sp.accidental) === target) return sp;
  }
  return pitchClassSpelling(target, key.accidental);
}

/**
 * Build a note-spelling function that resolves every sounding pitch class in full
 * musical context, in priority order:
 *   1. Key + Mode — diatonic notes keep their scale spelling (G♯ in E major).
 *   2. Chord structure — chromatic chord tones are spelled by interval from a
 *      key-aware root (E→G♯ = major third, never a diminished fourth).
 *   3. Accidental preference — the enharmonic tiebreaker for everything else.
 * This is the source of truth for the staff and single-note labels, so a note's
 * written name always matches the active key and the recognized chord.
 */
export function contextualSpelling(
  key: KeyInfo,
  chordRoot: number | undefined,
  chordTypeId: ChordTypeId | undefined,
): (midi: number) => PitchSpelling {
  // 1. Key + Mode: the 7 diatonic spellings, keyed by pitch class.
  const scaleByPc = new Map<number, PitchSpelling>();
  for (const sp of scaleSpellings(key.root, key.mode, key.accidental)) {
    const pc = pitchClass(LETTER_PCS[sp.letter] + sp.accidental);
    if (!scaleByPc.has(pc)) scaleByPc.set(pc, sp);
  }

  // 2. Chord structure: chord-tone spellings keyed by pitch class, spelled from
  //    a key-aware root (scale spelling when the root is diatonic).
  const chordByPc = new Map<number, PitchSpelling>();
  if (chordRoot != null && chordTypeId != null) {
    const type = getChordType(chordTypeId);
    const rootPc = pitchClass(chordRoot);
    const rootSpelling = scaleByPc.get(rootPc) ?? pitchClassSpelling(rootPc, key.accidental);
    type.intervals.forEach((iv, i) => {
      const pc = pitchClass(rootPc + iv);
      if (!chordByPc.has(pc)) chordByPc.set(pc, spellChordTone(rootSpelling, type.degrees[i], pc));
    });
  }

  return (midi: number) => {
    const pc = pitchClass(midi);
    return scaleByPc.get(pc) ?? chordByPc.get(pc) ?? pitchClassSpelling(pc, key.accidental);
  };
}

/**
 * Like `contextualSpelling`, but returns full note names ("G♯4" style with ASCII
 * accidentals) for the single-note and fretboard labels.
 */
export function contextualSpellingName(
  key: KeyInfo,
  chordRoot: number | undefined,
  chordTypeId: ChordTypeId | undefined,
): (midi: number) => string {
  const spell = contextualSpelling(key, chordRoot, chordTypeId);
  return (midi: number) => spellingToName(spell(midi), midi);
}

/** Chord tone names spelled in key + chord context (diatonic notes follow the scale). */
export function chordToneNamesInKey(
  root: number,
  typeId: ChordTypeId,
  key: KeyInfo,
): string[] {
  const spell = contextualSpelling(key, root, typeId);
  const type = getChordType(typeId);
  const rootPc = pitchClass(root);
  return type.intervals.map((iv) => spellingToPitchClassName(spell(pitchClass(rootPc + iv))));
}
