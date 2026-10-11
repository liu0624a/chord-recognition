import { describe, expect, it } from 'vitest';
import { recognizeInterval, suggestiveChordCandidates } from './interval';
import { KeyInfo } from './degree';

const E_MAJOR: KeyInfo = { root: 2, mode: 'ionian', accidental: 'none' };

describe('recognizeInterval — basic intervals (canonical spelling)', () => {
  it('names every basic interval by degree and semitones', () => {
    expect(recognizeInterval([60, 61], null)?.quality).toBe('minor2'); // C–Db
    expect(recognizeInterval([60, 62], null)?.quality).toBe('major2'); // C–D
    expect(recognizeInterval([60, 63], null)?.quality).toBe('minor3'); // C–Eb
    expect(recognizeInterval([60, 64], null)?.quality).toBe('major3'); // C–E
    expect(recognizeInterval([60, 65], null)?.quality).toBe('perfect4'); // C–F
    expect(recognizeInterval([60, 68], null)?.quality).toBe('minor6'); // C–Ab
    expect(recognizeInterval([60, 69], null)?.quality).toBe('major6'); // C–A
    expect(recognizeInterval([60, 70], null)?.quality).toBe('minor7'); // C–Bb
    expect(recognizeInterval([60, 71], null)?.quality).toBe('major7'); // C–B
  });

  it('spells the note names canonically', () => {
    expect(recognizeInterval([60, 64], null)).toMatchObject({ lowerName: 'C', upperName: 'E' });
    expect(recognizeInterval([60, 61], null)).toMatchObject({ lowerName: 'C', upperName: 'Db' });
    expect(recognizeInterval([60, 68], null)).toMatchObject({ lowerName: 'C', upperName: 'Ab' });
    expect(recognizeInterval([66, 71], null)).toMatchObject({ lowerName: 'F#', upperName: 'B' });
  });
});

describe('recognizeInterval — power chord and octaves', () => {
  it('recognizes a perfect fifth as a power chord', () => {
    const r = recognizeInterval([60, 67], null);
    expect(r?.kind).toBe('power');
    expect(r?.quality).toBe('perfect5');
    expect(r?.lowerName).toBe('C');
  });

  it('does not treat a compound twelfth as a power chord', () => {
    const r = recognizeInterval([60, 79], null); // C4–G5 = 19 semitones
    expect(r?.kind).toBe('interval');
    expect(r?.quality).toBe('perfect5');
  });

  it('recognizes an octave and two octaves', () => {
    expect(recognizeInterval([60, 72], null)).toMatchObject({ kind: 'octave', octaves: 1, quality: 'perfect8' });
    expect(recognizeInterval([60, 84], null)).toMatchObject({ kind: 'octave', octaves: 2 });
  });
});

describe('recognizeInterval — enharmonic spelling', () => {
  it('distinguishes the augmented fourth from the diminished fifth', () => {
    expect(recognizeInterval([65, 71], null)?.quality).toBe('aug4'); // F–B
    expect(recognizeInterval([71, 77], null)?.quality).toBe('dim5'); // B–F
  });

  it('uses the key/mode to spell chromatic notes (G♯ in E major, never A♭)', () => {
    expect(recognizeInterval([68, 69], E_MAJOR)).toMatchObject({ lowerName: 'G#', upperName: 'A', quality: 'minor2' });
  });

  it('re-spells C–A♭ as C–G♯ (augmented 5th) under E major', () => {
    expect(recognizeInterval([60, 68], null)).toMatchObject({ quality: 'minor6', upperName: 'Ab' });
    expect(recognizeInterval([60, 68], E_MAJOR)).toMatchObject({ quality: 'aug5', upperName: 'G#' });
  });
});

describe('recognizeInterval — arity and ordering', () => {
  it('returns null unless there are exactly two notes', () => {
    expect(recognizeInterval([], null)).toBeNull();
    expect(recognizeInterval([60], null)).toBeNull();
    expect(recognizeInterval([60, 64, 67], null)).toBeNull();
  });

  it('sorts the notes so the lower note always leads', () => {
    expect(recognizeInterval([64, 60], null)).toMatchObject({ lowerName: 'C', upperName: 'E', quality: 'major3' });
  });
});

describe('suggestiveChordCandidates', () => {
  it('suggests the closest chord for a dyad, fewest missing first', () => {
    const candidates = suggestiveChordCandidates([0, 4]); // C + E
    expect(candidates.length).toBe(2);
    expect(candidates[0]).toEqual({ root: 0, typeId: 'major' });
  });

  it('returns nothing for empty input', () => {
    expect(suggestiveChordCandidates([])).toEqual([]);
  });
});
