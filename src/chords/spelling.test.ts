import { describe, expect, it } from 'vitest';
import {
  canonicalNoteName,
  canonicalPitchClassName,
  parseNoteName,
  parsePitchClassName,
  spellPitchClass,
  spellingToPitchClassName,
} from './notes';
import {
  chordToneNames,
  chordToneNamesInKey,
  contextualSpelling,
  spellPitchClassInKey,
} from './spelling';

describe('note spelling', () => {
  it('spells pitch classes with sharps or flats', () => {
    expect(spellPitchClass(1)).toBe('C#');
    expect(spellPitchClass(1, true)).toBe('Db');
    expect(spellPitchClass(10)).toBe('A#');
    expect(spellPitchClass(10, true)).toBe('Bb');
    expect(spellPitchClass(11)).toBe('B');
    expect(spellPitchClass(0)).toBe('C');
  });

  it('uses canonical spelling for each pitch class', () => {
    const expected = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
    for (let pc = 0; pc < 12; pc++) {
      expect(canonicalPitchClassName(pc)).toBe(expected[pc]);
    }
  });

  it('formats canonical full note names with octave', () => {
    expect(canonicalNoteName(58)).toBe('Bb3'); // A#3 -> Bb3
    expect(canonicalNoteName(66)).toBe('F#4'); // F#4
    expect(canonicalNoteName(60)).toBe('C4');
  });

  it('parses note names back to MIDI numbers', () => {
    expect(parseNoteName('C#4')).toBe(61);
    expect(parseNoteName('Bb3')).toBe(58);
    expect(parseNoteName('A0')).toBe(21);
    expect(parseNoteName('C8')).toBe(108);
    expect(parseNoteName('C4')).toBe(60);
  });

  it('accepts unicode accidentals and rejects invalid names', () => {
    expect(parseNoteName('C♯4')).toBe(61);
    expect(parseNoteName('B♭3')).toBe(58);
    expect(parseNoteName('H4')).toBeNull();
    expect(parseNoteName('C#')).toBeNull();
    expect(parseNoteName('')).toBeNull();
  });

  it('parses pitch class names', () => {
    expect(parsePitchClassName('C#')).toBe(1);
    expect(parsePitchClassName('Db')).toBe(1);
    expect(parsePitchClassName('B')).toBe(11);
    expect(parsePitchClassName('X')).toBeNull();
  });
});

describe('chord context spelling', () => {
  it('spells F# major with sharps', () => {
    expect(chordToneNames(6, 'major')).toEqual(['F#', 'A#', 'C#']);
  });

  it('spells Ab major with flats', () => {
    expect(chordToneNames(8, 'major')).toEqual(['Ab', 'C', 'Eb']);
  });

  it('spells Bb major with flats', () => {
    expect(chordToneNames(10, 'major')).toEqual(['Bb', 'D', 'F']);
  });

  it('spells a diminished seventh with a double-flat seventh', () => {
    expect(chordToneNames(0, 'dim7')).toEqual(['C', 'Eb', 'Gb', 'Bbb']);
  });

  it('spells altered dominants correctly', () => {
    expect(chordToneNames(0, 'dom7b9')).toEqual(['C', 'Db', 'E', 'G', 'Bb']);
    expect(chordToneNames(0, 'dom7sharp9')).toEqual(['C', 'D#', 'E', 'G', 'Bb']);
  });

  it('spells the new extended and altered chords by degree', () => {
    expect(chordToneNames(0, 'dom7sharp11')).toEqual(['C', 'E', 'F#', 'G', 'Bb']);
    expect(chordToneNames(0, 'augMaj7')).toEqual(['C', 'E', 'G#', 'B']);
    expect(chordToneNames(0, 'mMaj9')).toEqual(['C', 'D', 'Eb', 'G', 'B']);
  });
});

describe('key-aware note spelling', () => {
  const E_MAJOR = { root: 2, mode: 'ionian', accidental: 'none' } as const;

  it('spells the E major scale degree pc 8 as G♯, never A♭', () => {
    expect(spellingToPitchClassName(spellPitchClassInKey(8, E_MAJOR))).toBe('G#');
  });

  it('spells every E major scale note on its correct letter', () => {
    // E F♯ G♯ A B C♯ D♯
    const names = [4, 6, 8, 9, 11, 1, 3].map((pc) =>
      spellingToPitchClassName(spellPitchClassInKey(pc, E_MAJOR)),
    );
    expect(names).toEqual(['E', 'F#', 'G#', 'A', 'B', 'C#', 'D#']);
  });

  it('uses the accidental preference only for chromatic notes', () => {
    // pc 6 is chromatic in C major; the preference picks F♯ vs G♭.
    const C_NONE = { root: 0, mode: 'ionian', accidental: 'none' } as const;
    const C_SHARP = { root: 0, mode: 'ionian', accidental: 'sharp' } as const;
    const C_FLAT = { root: 0, mode: 'ionian', accidental: 'flat' } as const;
    expect(spellingToPitchClassName(spellPitchClassInKey(6, C_NONE))).toBe('F#');
    expect(spellingToPitchClassName(spellPitchClassInKey(6, C_SHARP))).toBe('F#');
    expect(spellingToPitchClassName(spellPitchClassInKey(6, C_FLAT))).toBe('Gb');
  });

  it('spells an E major chord as E G♯ B (interval, not enharmonic)', () => {
    const spell = contextualSpelling(E_MAJOR, 4, 'major');
    expect(spellingToPitchClassName(spell(64))).toBe('E');
    expect(spellingToPitchClassName(spell(68))).toBe('G#');
    expect(spellingToPitchClassName(spell(71))).toBe('B');
  });

  it('spells a G♯ major chord in E major as G♯ B♯ D♯', () => {
    expect(chordToneNamesInKey(8, 'major', E_MAJOR)).toEqual(['G#', 'B#', 'D#']);
  });

  it('spells a chromatic chord by interval from its key-aware root', () => {
    // Ab major (pcs 8 0 3) in C major: Ab is chromatic (spelled from the root),
    // C is diatonic, Eb is chromatic (interval above Ab).
    const C_MAJOR = { root: 0, mode: 'ionian', accidental: 'none' } as const;
    expect(chordToneNamesInKey(8, 'major', C_MAJOR)).toEqual(['Ab', 'C', 'Eb']);
  });
});
