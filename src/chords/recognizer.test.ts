import { describe, expect, it } from 'vitest';
import { recognizeChord } from './recognizer';
import { pitchClass } from './notes';

describe('recognizeChord', () => {
  it('identifies a C major triad', () => {
    const r = recognizeChord([0, 4, 7], 0);
    expect(r.chord).toEqual({ root: 0, typeId: 'major' });
    expect(r.confidence).toBe('confident');
  });

  it('identifies a minor triad', () => {
    const r = recognizeChord([0, 3, 7], 0);
    expect(r.chord).toEqual({ root: 0, typeId: 'minor' });
  });

  it('identifies all 12 major triads by root', () => {
    for (let root = 0; root < 12; root++) {
      const r = recognizeChord([root, root + 4, root + 7], root);
      expect(r.chord).toEqual({ root, typeId: 'major' });
    }
  });

  it('identifies the triads', () => {
    expect(recognizeChord([0, 3, 6], 0).chord?.typeId).toBe('diminished');
    expect(recognizeChord([0, 4, 8], 0).chord?.typeId).toBe('augmented');
    expect(recognizeChord([0, 2, 7], 0).chord?.typeId).toBe('sus2');
    expect(recognizeChord([0, 5, 7], 0).chord?.typeId).toBe('sus4');
  });

  it('identifies the seventh chords', () => {
    expect(recognizeChord([0, 4, 7, 10], 0).chord?.typeId).toBe('dom7');
    expect(recognizeChord([0, 4, 7, 11], 0).chord?.typeId).toBe('maj7');
    expect(recognizeChord([0, 3, 7, 10], 0).chord?.typeId).toBe('m7');
    expect(recognizeChord([0, 3, 6, 9], 0).chord?.typeId).toBe('dim7');
    expect(recognizeChord([0, 3, 6, 10], 0).chord?.typeId).toBe('halfDim7');
    expect(recognizeChord([0, 3, 7, 11], 0).chord?.typeId).toBe('mMaj7');
    expect(recognizeChord([0, 4, 8, 10], 0).chord?.typeId).toBe('aug7');
  });

  it('recognizes an inversion with the correct root and bass', () => {
    // E4, G4, C5 -> C major, first inversion (bass E)
    const r = recognizeChord([64, 67, 72], pitchClass(64));
    expect(r.chord).toEqual({ root: 0, typeId: 'major' });
    expect(r.bassPc).toBe(4);
    expect(r.confidence).toBe('confident');
  });

  it('disambiguates C6 vs Am7 using the bass note', () => {
    const pcs = [0, 4, 7, 9];
    expect(recognizeChord(pcs, 0).chord).toEqual({ root: 0, typeId: 'six' });
    expect(recognizeChord(pcs, 9).chord).toEqual({ root: 9, typeId: 'm7' });
    expect(recognizeChord(pcs, null).confidence).toBe('ambiguous');
  });

  it('returns interval for two notes and note for one', () => {
    expect(recognizeChord([0, 4], null).confidence).toBe('interval');
    expect(recognizeChord([0], null).confidence).toBe('note');
    expect(recognizeChord([], null).confidence).toBe('none');
  });

  it('returns unknown when no chord explains the notes', () => {
    const r = recognizeChord([0, 1, 2], null);
    expect(r.chord).toBeNull();
    expect(r.confidence).toBe('unknown');
  });

  it('identifies extended chords', () => {
    expect(recognizeChord([0, 2, 4, 7], 0).chord).toEqual({ root: 0, typeId: 'add9' });
    expect(recognizeChord([0, 2, 4, 7, 10], 0).chord).toEqual({ root: 0, typeId: 'dom9' });
    expect(recognizeChord([0, 3, 7, 9], 0).chord?.typeId).toBe('m6');
  });

  it('marks a partial voicing as partial, not confident', () => {
    // C E G A Bb (C13 without the 9th)
    const r = recognizeChord([0, 4, 7, 9, 10], 0);
    expect(r.chord?.typeId).toBe('dom13');
    expect(r.confidence).toBe('partial');
  });

  it('marks an omitted fifth on a dominant seventh', () => {
    const r = recognizeChord([0, 4, 10], null);
    expect(r.chord).toEqual({ root: 0, typeId: 'dom7' });
    expect(r.confidence).toBe('partial');
    expect(r.candidates[0].omitted).toEqual([5]);
  });

  it('marks an omitted fifth on maj7, dom9 and maj9', () => {
    expect(recognizeChord([0, 4, 11], null).candidates[0].omitted).toEqual([5]);
    expect(recognizeChord([0, 2, 4, 10], null).candidates[0].omitted).toEqual([5]);
    expect(recognizeChord([0, 2, 4, 11], null).candidates[0].omitted).toEqual([5]);
  });

  it('does not mark a complete triad as an omitted chord', () => {
    const r = recognizeChord([0, 4, 7], null);
    expect(r.chord).toEqual({ root: 0, typeId: 'major' });
    expect(r.candidates[0].omitted).toEqual([]);
  });

  it('keeps two candidates when the third is missing (quality ambiguity)', () => {
    const r = recognizeChord([0, 7, 10], null);
    expect(r.candidates.length).toBe(2);
    expect(r.confidence).toBe('ambiguous');
  });

  it('never returns more than two candidates', () => {
    // A fully-diminished seventh is symmetric: several roots explain it.
    const r = recognizeChord([0, 3, 6, 9], null);
    expect(r.candidates.length).toBeLessThanOrEqual(2);
    expect(r.confidence).toBe('ambiguous');
  });

  it('identifies the new extended chords', () => {
    expect(recognizeChord([0, 2, 4, 7, 9], 0).chord).toEqual({ root: 0, typeId: 'sixNine' });
    expect(recognizeChord([0, 2, 3, 7, 9], 0).chord).toEqual({ root: 0, typeId: 'm6Nine' });
    expect(recognizeChord([0, 2, 3, 7], 0).chord).toEqual({ root: 0, typeId: 'madd9' });
    expect(recognizeChord([0, 3, 5, 7], 0).chord).toEqual({ root: 0, typeId: 'madd11' });
    expect(recognizeChord([0, 4, 6, 7], 0).chord).toEqual({ root: 0, typeId: 'addSharp11' });
    expect(recognizeChord([0, 1, 4, 7], 0).chord).toEqual({ root: 0, typeId: 'addFlat9' });
    expect(recognizeChord([0, 2, 5, 7, 10], 0).chord).toEqual({ root: 0, typeId: 'nineSus4' });
    expect(recognizeChord([0, 2, 5, 7, 9, 10], 0).chord).toEqual({ root: 0, typeId: 'thirteenSus4' });
    expect(recognizeChord([0, 2, 4, 6, 7, 11], 0).chord).toEqual({ root: 0, typeId: 'maj9sharp11' });
    expect(recognizeChord([0, 2, 4, 6, 7, 9, 11], 0).chord).toEqual({ root: 0, typeId: 'maj13sharp11' });
    expect(recognizeChord([0, 2, 3, 7, 11], 0).chord).toEqual({ root: 0, typeId: 'mMaj9' });
    expect(recognizeChord([0, 2, 3, 5, 7, 11], 0).chord).toEqual({ root: 0, typeId: 'mMaj11' });
    expect(recognizeChord([0, 2, 3, 5, 7, 9, 11], 0).chord).toEqual({ root: 0, typeId: 'mMaj13' });
  });

  it('identifies the new seventh and altered chords', () => {
    expect(recognizeChord([0, 2, 7, 10], 0).chord).toEqual({ root: 0, typeId: 'sevenSus2' });
    expect(recognizeChord([0, 5, 7, 10], 0).chord).toEqual({ root: 0, typeId: 'sevenSus4' });
    expect(recognizeChord([0, 4, 8, 11], 0).chord).toEqual({ root: 0, typeId: 'augMaj7' });
    expect(recognizeChord([0, 4, 6, 11], 0).chord).toEqual({ root: 0, typeId: 'maj7Flat5' });
    expect(recognizeChord([0, 4, 6, 7, 10], 0).chord).toEqual({ root: 0, typeId: 'dom7sharp11' });
    expect(recognizeChord([0, 4, 7, 8, 10], 0).chord).toEqual({ root: 0, typeId: 'dom7flat13' });
    expect(recognizeChord([0, 1, 4, 6, 7, 10], 0).chord).toEqual({ root: 0, typeId: 'dom7flat9sharp11' });
    expect(recognizeChord([0, 3, 4, 7, 8, 10], 0).chord).toEqual({ root: 0, typeId: 'dom7sharp9flat13' });
  });

  it('prefers specific altered chords over 7alt, which wins only for unnamed combinations', () => {
    expect(recognizeChord([0, 1, 4, 7, 10], 0).chord?.typeId).toBe('dom7b9');
    expect(recognizeChord([0, 3, 4, 7, 10], 0).chord?.typeId).toBe('dom7sharp9');
    // C7♭9♯5 (C E G♯ B♭ D♭) has no specific name -> 7alt.
    const r = recognizeChord([0, 1, 4, 8, 10], 0);
    expect(r.chord).toEqual({ root: 0, typeId: 'sevenAlt' });
    expect(r.confidence).toBe('partial');
    // The full altered set resolves to 7alt directly.
    expect(recognizeChord([0, 1, 3, 4, 6, 8, 10], 0).chord).toEqual({ root: 0, typeId: 'sevenAlt' });
  });

  it('resolves C6/9 as sixNine, never dom13', () => {
    const r = recognizeChord([0, 2, 4, 7, 9], 0);
    expect(r.chord).toEqual({ root: 0, typeId: 'sixNine' });
    expect(r.confidence).toBe('confident');
  });

  it('keeps a dyad as an interval, never a triad', () => {
    expect(recognizeChord([0, 7], 0).confidence).toBe('interval');
  });

  it('keeps the root with a non-root bass for a new chord inversion', () => {
    const r = recognizeChord([0, 4, 6, 11], 6); // Cmaj7♭5 over F♯
    expect(r.chord).toEqual({ root: 0, typeId: 'maj7Flat5' });
    expect(r.bassPc).toBe(6);
  });

  it('marks omitted fifths on the new extended chords', () => {
    // C6/9 without the 5th is enharmonically D7sus2, so it resolves to the
    // complete chord rather than a partial sixNine.
    expect(recognizeChord([0, 2, 4, 9], null).candidates[0]).toMatchObject({
      typeId: 'sevenSus2',
      root: 2,
      omitted: [],
    });
    expect(recognizeChord([0, 2, 4, 6, 11], null).candidates[0]).toMatchObject({
      typeId: 'maj9sharp11',
      omitted: [5],
    });
  });

  it('uses the key/mode to pick a diatonic root for the augmented triad', () => {
    expect(recognizeChord([0, 4, 8], null).confidence).toBe('ambiguous');
    const inD = recognizeChord([0, 4, 8], null, { root: 1, mode: 'ionian', accidental: 'none' });
    expect(inD.chord).toEqual({ root: 4, typeId: 'augmented' });
    expect(inD.confidence).toBe('confident');
  });
});
