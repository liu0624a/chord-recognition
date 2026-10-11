import { describe, expect, it } from 'vitest';
import {
  analyzeDegree,
  formatDegree,
  formatDegreeParts,
  formatDiatonicTemplate,
  KeyInfo,
} from './degree';

function key(root: number, mode: KeyInfo['mode'], accidental: KeyInfo['accidental'] = 'none'): KeyInfo {
  return { root, mode, accidental };
}

// The 7 diatonic triad templates from the spec, keyed by mode.
const ROMAN_TEMPLATES: Record<KeyInfo['mode'], string> = {
  ionian: 'I – ii – iii – IV – V – vi – vii°',
  dorian: 'i – ii – ♭III – IV – v – vi° – ♭VII',
  phrygian: 'i – ♭II – ♭III – iv – v° – ♭VI – ♭vii',
  lydian: 'I – II – iii – ♯iv° – V – vi – vii',
  mixolydian: 'I – ii – iii° – IV – v – vi – ♭VII',
  aeolian: 'i – ii° – ♭III – iv – v – ♭VI – ♭VII',
  locrian: 'i° – ♭II – ♭iii – iv – ♭V – ♭VI – ♭vii',
};

describe('formatDiatonicTemplate', () => {
  it('renders the exact spec template for every mode (roman numerals)', () => {
    for (const [mode, expected] of Object.entries(ROMAN_TEMPLATES) as [KeyInfo['mode'], string][]) {
      // The root letter is irrelevant for the template (alterations are relative
      // to the parallel major), so any root yields the same template.
      expect(formatDiatonicTemplate(key(0, mode), 'roman').join(' – ')).toBe(expected);
    }
  });

  it('keeps the template fixed when the root changes (only names change)', () => {
    expect(formatDiatonicTemplate(key(0, 'dorian'), 'roman').join(' – ')).toBe(
      formatDiatonicTemplate(key(5, 'dorian'), 'roman').join(' – '),
    );
  });

  it('keeps the template fixed when the accidental changes (spelling only)', () => {
    expect(formatDiatonicTemplate(key(3, 'ionian', 'sharp'), 'roman').join(' – ')).toBe(
      formatDiatonicTemplate(key(3, 'ionian', 'none'), 'roman').join(' – '),
    );
  });

  it('renders the acceptance cases for the default display', () => {
    expect(formatDiatonicTemplate(key(0, 'ionian'), 'roman').join(' – ')).toBe(
      'I – ii – iii – IV – V – vi – vii°',
    );
    expect(formatDiatonicTemplate(key(5, 'aeolian'), 'roman').join(' – ')).toBe(
      'i – ii° – ♭III – iv – v – ♭VI – ♭VII',
    );
    expect(formatDiatonicTemplate(key(4, 'mixolydian'), 'roman').join(' – ')).toBe(
      'I – ii – iii° – IV – v – vi – ♭VII',
    );
  });
});

describe('formatDegree (roman numerals)', () => {
  it('maps the C–Am–F–G progression to I – vi – IV – V', () => {
    const k = key(0, 'ionian');
    expect(formatDegree(0, 'major', k, 'roman')).toBe('I');
    expect(formatDegree(9, 'minor', k, 'roman')).toBe('vi');
    expect(formatDegree(5, 'major', k, 'roman')).toBe('IV');
    expect(formatDegree(7, 'major', k, 'roman')).toBe('V');
  });

  it('marks diminished triads with ° and keeps 7th/extension quality only in the quality modes', () => {
    const k = key(0, 'ionian');
    expect(formatDegree(11, 'diminished', k, 'roman')).toBe('vii°');
    // Method A omits the 7th marker; method B keeps it.
    expect(formatDegree(0, 'maj7', k, 'roman')).toBe('I');
    expect(formatDegree(0, 'maj7', k, 'romanQuality')).toBe('Imaj7');
    expect(formatDegree(7, 'dom7', k, 'romanQuality')).toBe('V7');
    expect(formatDegree(2, 'm7', k, 'romanQuality')).toBe('ii7');
  });

  it('uses lowercase for minor/sus/diminished, uppercase for major/augmented', () => {
    const k = key(0, 'ionian');
    expect(formatDegree(9, 'minor', k, 'roman')).toBe('vi');
    expect(formatDegree(0, 'major', k, 'roman')).toBe('I');
    expect(formatDegree(5, 'augmented', k, 'roman')).toBe('IV+');
    expect(formatDegree(9, 'sus4', k, 'roman')).toBe('vi');
  });

  it('labels borrowed chords with an alteration relative to the parallel major', () => {
    const k = key(0, 'ionian');
    // Bb major in C: the ♭VII borrowed chord.
    expect(formatDegree(10, 'major', k, 'accidentalRoman')).toBe('♭VII');
    // Db major in C: the ♭II borrowed chord.
    expect(formatDegree(1, 'major', k, 'accidentalRoman')).toBe('♭II');
  });

  it('shifts the degree label under a minor key (Aeolian)', () => {
    const k = key(5, 'aeolian');
    // A minor in A minor is the tonic.
    expect(formatDegree(9, 'minor', k, 'roman')).toBe('i');
    // C major is the ♭III.
    expect(formatDegree(0, 'major', k, 'roman')).toBe('♭III');
  });
});

describe('formatDegree (other display modes)', () => {
  it('renders arabic + quality and Nashville the same', () => {
    const k = key(0, 'ionian');
    expect(formatDegree(0, 'maj7', k, 'arabicQuality')).toBe('1maj7');
    expect(formatDegree(9, 'm7', k, 'arabicQuality')).toBe('6m7');
    expect(formatDegree(0, 'maj7', k, 'nashville')).toBe('1maj7');
    expect(formatDegree(9, 'm7', k, 'nashville')).toBe('6m7');
  });

  it('renders functional T/S/D labels', () => {
    const k = key(0, 'ionian');
    expect(formatDegree(0, 'major', k, 'functional')).toBe('T');
    expect(formatDegree(2, 'minor', k, 'functional')).toBe('S');
    expect(formatDegree(7, 'major', k, 'functional')).toBe('D');
    expect(formatDegree(5, 'major', k, 'functional')).toBe('S');
    expect(formatDegree(11, 'diminished', k, 'functional')).toBe('D');
  });

  it('renders full functional names (Tonic/Subdominant/Dominant)', () => {
    const k = key(0, 'ionian');
    expect(formatDegree(0, 'major', k, 'functionalFull')).toBe('Tonic');
    expect(formatDegree(4, 'minor', k, 'functionalFull')).toBe('Tonic'); // iii -> tonic family
    expect(formatDegree(9, 'minor', k, 'functionalFull')).toBe('Tonic'); // vi -> tonic family
    expect(formatDegree(2, 'minor', k, 'functionalFull')).toBe('Subdominant'); // ii
    expect(formatDegree(5, 'major', k, 'functionalFull')).toBe('Subdominant'); // IV
    expect(formatDegree(7, 'major', k, 'functionalFull')).toBe('Dominant'); // V
    expect(formatDegree(11, 'diminished', k, 'functionalFull')).toBe('Dominant'); // vii°
  });
});

describe('formatDegreeParts', () => {
  it('splits the quality marker into a superscript only for romanQuality', () => {
    const k = key(0, 'ionian');
    // dom7 on V -> body 'V', superscript '7'.
    expect(formatDegreeParts(7, 'dom7', k, 'romanQuality')).toEqual({ body: 'V', superscript: '7' });
    // maj7 on I -> body 'I', superscript 'maj7'.
    expect(formatDegreeParts(0, 'maj7', k, 'romanQuality')).toEqual({ body: 'I', superscript: 'maj7' });
    // m7 on ii -> body 'ii', superscript '7'.
    expect(formatDegreeParts(2, 'm7', k, 'romanQuality')).toEqual({ body: 'ii', superscript: '7' });
    // sus4/add9 markers also ride as superscripts (sus4 is a lowercase type).
    expect(formatDegreeParts(7, 'sus4', k, 'romanQuality')).toEqual({ body: 'v', superscript: 'sus4' });
    expect(formatDegreeParts(0, 'add9', k, 'romanQuality')).toEqual({ body: 'I', superscript: 'add9' });
  });

  it('keeps the root accidental in the body, not the superscript', () => {
    const k = key(5, 'aeolian');
    // C major in A minor is the borrowed ♭III.
    expect(formatDegreeParts(0, 'major', k, 'romanQuality')).toEqual({ body: '♭III', superscript: '' });
    expect(formatDegreeParts(0, 'maj7', k, 'romanQuality')).toEqual({ body: '♭III', superscript: 'maj7' });
  });

  it('returns the whole label in body (empty superscript) for every other mode', () => {
    const k = key(0, 'ionian');
    expect(formatDegreeParts(7, 'dom7', k, 'roman')).toEqual({ body: 'V', superscript: '' });
    expect(formatDegreeParts(0, 'maj7', k, 'arabicQuality')).toEqual({ body: '1maj7', superscript: '' });
    expect(formatDegreeParts(9, 'm7', k, 'nashville')).toEqual({ body: '6m7', superscript: '' });
    expect(formatDegreeParts(7, 'major', k, 'functional')).toEqual({ body: 'D', superscript: '' });
    expect(formatDegreeParts(7, 'major', k, 'functionalFull')).toEqual({ body: 'Dominant', superscript: '' });
  });
});

describe('analyzeDegree', () => {
  it('resolves natural scale degrees without alteration', () => {
    const k = key(0, 'ionian');
    expect(analyzeDegree(0, k)).toEqual({ degree: 1, alteration: 0 });
    expect(analyzeDegree(7, k)).toEqual({ degree: 5, alteration: 0 });
  });

  it('reports ♯/♭ alterations relative to the parallel major', () => {
    const minor = key(5, 'aeolian');
    expect(analyzeDegree(0, minor)).toEqual({ degree: 3, alteration: -1 }); // C = ♭III
    expect(analyzeDegree(5, minor)).toEqual({ degree: 6, alteration: -1 }); // F = ♭VI
    expect(analyzeDegree(7, minor)).toEqual({ degree: 7, alteration: -1 }); // G = ♭VII
  });
});

describe('formatDegree in accidental keys', () => {
  it('analyses chords in F♯ major (sharp tonic)', () => {
    const k = key(3, 'ionian', 'sharp');
    expect(formatDegree(6, 'major', k, 'roman')).toBe('I'); // F♯
    expect(formatDegree(8, 'minor', k, 'roman')).toBe('ii'); // G♯m
    expect(formatDegree(1, 'major', k, 'roman')).toBe('V'); // C♯
  });

  it('analyses chords in B♭ major (flat tonic)', () => {
    const k = key(6, 'ionian', 'flat');
    expect(formatDegree(10, 'major', k, 'roman')).toBe('I'); // B♭
    expect(formatDegree(2, 'minor', k, 'roman')).toBe('iii'); // Dm
    expect(formatDegree(3, 'major', k, 'roman')).toBe('IV'); // E♭
  });
});

describe('new chord types in degree display', () => {
  const k = key(0, 'ionian');

  it('renders roman numerals with lowercase for the minor/sus family', () => {
    expect(formatDegree(9, 'm6Nine', k, 'roman')).toBe('vi');
    expect(formatDegree(9, 'madd9', k, 'romanQuality')).toBe('viadd9');
    expect(formatDegree(7, 'sevenSus4', k, 'romanQuality')).toBe('v7sus4');
    expect(formatDegree(2, 'mMaj9', k, 'romanQuality')).toBe('iimMaj9');
  });

  it('renders arabic/nashville with the new quality suffixes', () => {
    expect(formatDegree(0, 'sixNine', k, 'arabicQuality')).toBe('16/9');
    expect(formatDegree(7, 'dom7sharp11', k, 'arabicQuality')).toBe('57♯11');
    expect(formatDegree(0, 'sevenAlt', k, 'arabicQuality')).toBe('17alt');
    expect(formatDegree(0, 'sixNine', k, 'nashville')).toBe('16/9');
  });
});
