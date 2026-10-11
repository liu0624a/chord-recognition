import { describe, expect, it } from 'vitest';
import {
  defaultSuffixes,
  formatChordComposition,
  formatChordName,
  formatChordTones,
  formatChordWithOmit,
  formatOmitSuffix,
  formatSlashChord,
  presetSuffixes,
} from './notation';

describe('notation', () => {
  it('formats a major chord with no suffix', () => {
    expect(formatChordName(0, 'major', defaultSuffixes())).toBe('C');
    expect(formatChordName(0, 'minor', defaultSuffixes())).toBe('Cm');
  });

  it('applies preset suffix maps', () => {
    expect(presetSuffixes('standard').halfDim7).toBe('ø7');
    expect(presetSuffixes('symbol').minor).toBe('−');
    expect(presetSuffixes('symbol').maj7).toBe('Δ7');
    expect(presetSuffixes('letter').major).toBe('Maj');
    expect(presetSuffixes('letter').m7).toBe('min7');
  });

  it('formats symbol-based names correctly', () => {
    const symbol = presetSuffixes('symbol');
    expect(formatChordName(0, 'minor', symbol)).toBe('C−');
    expect(formatChordName(0, 'diminished', symbol)).toBe('C°');
    expect(formatChordName(0, 'augmented', symbol)).toBe('C+');
    expect(formatChordName(0, 'maj7', symbol)).toBe('CΔ7');
  });

  it('adds a slash bass for inversions only when it differs', () => {
    const s = defaultSuffixes();
    expect(formatSlashChord(0, 'major', 4, s)).toBe('C/E');
    expect(formatSlashChord(0, 'major', 0, s)).toBe('C');
    expect(formatSlashChord(0, 'major', null, s)).toBe('C');
  });

  it('formats flat and sharp roots canonically', () => {
    const s = defaultSuffixes();
    expect(formatChordName(10, 'major', s)).toBe('Bb');
    expect(formatChordName(6, 'major', s)).toBe('F#');
    expect(formatChordName(8, 'major', s)).toBe('Ab');
  });

  it('formats omitted degrees as a suffix', () => {
    const s = defaultSuffixes();
    expect(formatChordWithOmit(0, 'dom7', s, [5])).toBe('C7(no5)');
    expect(formatChordWithOmit(0, 'dom7', s, [3, 5])).toBe('C7(no3,no5)');
    expect(formatOmitSuffix([])).toBe('');
  });

  it('formats chord tones in context spelling', () => {
    expect(formatChordTones(6, 'major')).toEqual(['F#', 'A#', 'C#']);
  });
});

describe('formatChordComposition', () => {
  const s = defaultSuffixes();

  it('renders base chords as their own name', () => {
    expect(formatChordComposition('C', 'major', s, [])).toBe('C');
    expect(formatChordComposition('C', 'm7', s, [])).toBe('Cm7');
    expect(formatChordComposition('C', 'six', s, [])).toBe('C6');
    expect(formatChordComposition('C', 'add9', s, [])).toBe('Cadd9');
  });

  it('expands extended chords into base + stacked extensions', () => {
    expect(formatChordComposition('C', 'm11', s, [])).toBe('Cm7(9, 11)');
    expect(formatChordComposition('C', 'dom9', s, [])).toBe('C7(9)');
    expect(formatChordComposition('C', 'dom13', s, [])).toBe('C7(9, 11, 13)');
    expect(formatChordComposition('C', 'sixNine', s, [])).toBe('C6(9)');
    expect(formatChordComposition('C', 'mMaj11', s, [])).toBe('CmMaj7(9, 11)');
  });

  it('appends omitted degrees inside the parentheses', () => {
    expect(formatChordComposition('C', 'dom13', s, [5])).toBe('C7(9, 11, 13, no5)');
    expect(formatChordComposition('C', 'dom7', s, [5, 3])).toBe('C7(no5, no3)');
  });

  it('follows the active suffix style for the base chord', () => {
    const symbol = presetSuffixes('symbol');
    expect(formatChordComposition('C', 'm11', symbol, [])).toBe('C−7(9, 11)');
    expect(formatChordComposition('C', 'dom13', symbol, [])).toBe('C7(9, 11, 13)');
  });

  it('renders altered dominants with their alteration labels', () => {
    expect(formatChordComposition('C', 'dom7b9', s, [])).toBe('C7(♭9)');
    expect(formatChordComposition('C', 'dom7flat9sharp11', s, [])).toBe('C7(♭9, ♯11)');
    expect(formatChordComposition('C', 'sevenAlt', s, [])).toBe('C7(alt)');
  });
});

describe('new chord suffix presets', () => {
  it('exposes new chord suffixes in the letter and symbol presets', () => {
    const letter = presetSuffixes('letter');
    const symbol = presetSuffixes('symbol');
    expect(letter.m6Nine).toBe('min6/9');
    expect(letter.madd9).toBe('minadd9');
    expect(letter.augMaj7).toBe('AugMaj7');
    expect(letter.maj7Flat5).toBe('Maj7♭5');
    expect(letter.maj13sharp11).toBe('Maj13♯11');
    expect(symbol.m6Nine).toBe('−6/9');
    expect(symbol.madd11).toBe('−add11');
    expect(symbol.mMaj9).toBe('mΔ9');
    expect(symbol.mMaj13).toBe('mΔ13');
    expect(symbol.maj9sharp11).toBe('Δ9♯11');
  });
});
