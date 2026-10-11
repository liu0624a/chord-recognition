// Note-name label tests: piano key labels across the sharp/flat/both modes.

import { describe, expect, it } from 'vitest';
import {
  fretNoteLabel,
  keyNoteLabel,
  pitchClassNameGlyphs,
  spellingToPitchClassNameGlyphs,
} from './notes';

describe('keyNoteLabel', () => {
  it('returns empty when the mode is off', () => {
    expect(keyNoteLabel(60, 'off')).toBe('');
    expect(keyNoteLabel(61, 'off')).toBe('');
  });

  it('labels white keys with letter + octave in every mode', () => {
    expect(keyNoteLabel(60, 'sharp')).toBe('C4');
    expect(keyNoteLabel(60, 'flat')).toBe('C4');
    expect(keyNoteLabel(60, 'both')).toBe('C4');
    expect(keyNoteLabel(21, 'both')).toBe('A0');
  });

  it('labels black keys with sharps', () => {
    expect(keyNoteLabel(61, 'sharp')).toBe('C♯4');
    expect(keyNoteLabel(66, 'sharp')).toBe('F♯4');
    expect(keyNoteLabel(58, 'sharp')).toBe('A♯3');
  });

  it('labels black keys with flats', () => {
    expect(keyNoteLabel(61, 'flat')).toBe('D♭4');
    expect(keyNoteLabel(66, 'flat')).toBe('G♭4');
    expect(keyNoteLabel(58, 'flat')).toBe('B♭3');
  });

  it('labels black keys with both enharmonic names stacked on two lines', () => {
    expect(keyNoteLabel(61, 'both')).toBe('C♯4\nD♭4');
    expect(keyNoteLabel(70, 'both')).toBe('A♯4\nB♭4');
  });

  it('labels only the C keys in cOnly mode', () => {
    expect(keyNoteLabel(60, 'cOnly')).toBe('C4');
    expect(keyNoteLabel(48, 'cOnly')).toBe('C3');
    expect(keyNoteLabel(36, 'cOnly')).toBe('C2');
    expect(keyNoteLabel(61, 'cOnly')).toBe('');
    expect(keyNoteLabel(69, 'cOnly')).toBe('');
  });

  it('handles the lowest black key (A♯0/B♭0)', () => {
    expect(keyNoteLabel(22, 'sharp')).toBe('A♯0');
    expect(keyNoteLabel(22, 'flat')).toBe('B♭0');
    expect(keyNoteLabel(22, 'both')).toBe('A♯0\nB♭0');
  });
});

describe('fretNoteLabel', () => {
  it('labels white keys with a single name + octave in every mode', () => {
    for (const mode of ['sharp', 'flat', 'both'] as const) {
      expect(fretNoteLabel(60, mode)).toBe('C4');
      expect(fretNoteLabel(64, mode)).toBe('E4');
      expect(fretNoteLabel(69, mode)).toBe('A4');
      expect(fretNoteLabel(71, mode)).toBe('B4');
      expect(fretNoteLabel(21, mode)).toBe('A0');
    }
  });

  it('labels black keys with sharps only in sharp mode', () => {
    expect(fretNoteLabel(61, 'sharp')).toBe('C♯4');
    expect(fretNoteLabel(66, 'sharp')).toBe('F♯4');
    expect(fretNoteLabel(58, 'sharp')).toBe('A♯3');
  });

  it('labels black keys with flats only in flat mode', () => {
    expect(fretNoteLabel(61, 'flat')).toBe('D♭4');
    expect(fretNoteLabel(66, 'flat')).toBe('G♭4');
    expect(fretNoteLabel(58, 'flat')).toBe('B♭3');
  });

  it('labels black keys with both enharmonic names in both mode', () => {
    expect(fretNoteLabel(61, 'both')).toBe('C♯4/D♭4');
    expect(fretNoteLabel(63, 'both')).toBe('D♯4/E♭4');
    expect(fretNoteLabel(66, 'both')).toBe('F♯4/G♭4');
    expect(fretNoteLabel(68, 'both')).toBe('G♯4/A♭4');
    expect(fretNoteLabel(70, 'both')).toBe('A♯4/B♭4');
    expect(fretNoteLabel(58, 'both')).toBe('A♯3/B♭3');
  });
});

describe('pitchClassNameGlyphs', () => {
  it('uses musical ♯/♭ glyphs (never ASCII #/b)', () => {
    expect(pitchClassNameGlyphs(1, 'sharp')).toBe('C♯');
    expect(pitchClassNameGlyphs(1, 'flat')).toBe('D♭');
    expect(pitchClassNameGlyphs(6, 'sharp')).toBe('F♯');
    expect(pitchClassNameGlyphs(6, 'flat')).toBe('G♭');
    expect(pitchClassNameGlyphs(10, 'sharp')).toBe('A♯');
    expect(pitchClassNameGlyphs(10, 'flat')).toBe('B♭');
  });

  it('spells the same pitch differently under sharp vs flat', () => {
    expect(pitchClassNameGlyphs(1, 'sharp')).toBe('C♯');
    expect(pitchClassNameGlyphs(1, 'flat')).toBe('D♭');
  });

  it('uses canonical mixed spelling for none', () => {
    expect(pitchClassNameGlyphs(0, 'none')).toBe('C');
    expect(pitchClassNameGlyphs(1, 'none')).toBe('D♭');
    expect(pitchClassNameGlyphs(6, 'none')).toBe('F♯');
    expect(pitchClassNameGlyphs(10, 'none')).toBe('B♭');
  });
});

describe('spellingToPitchClassNameGlyphs', () => {
  it('names a note by its written spelling, not an enharmonic equivalent', () => {
    expect(spellingToPitchClassNameGlyphs({ letter: 0, accidental: 1 })).toBe('C♯'); // not D♭
    expect(spellingToPitchClassNameGlyphs({ letter: 1, accidental: -1 })).toBe('D♭'); // not C♯
    expect(spellingToPitchClassNameGlyphs({ letter: 6, accidental: -1 })).toBe('B♭');
    expect(spellingToPitchClassNameGlyphs({ letter: 3, accidental: 1 })).toBe('F♯');
  });

  it('renders naturals without a sign', () => {
    expect(spellingToPitchClassNameGlyphs({ letter: 0, accidental: 0 })).toBe('C');
    expect(spellingToPitchClassNameGlyphs({ letter: 2, accidental: 0 })).toBe('E');
  });

  it('renders double accidentals with doubled ♯/♭ glyphs', () => {
    expect(spellingToPitchClassNameGlyphs({ letter: 0, accidental: 2 })).toBe('C♯♯');
    expect(spellingToPitchClassNameGlyphs({ letter: 0, accidental: -2 })).toBe('C♭♭');
  });
});
