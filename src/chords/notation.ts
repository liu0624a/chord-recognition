// Chord notation: map a chord to a display name using a customizable suffix map.
// This is presentation-only; it never affects recognition results.

import { CHORD_TYPES, ChordTypeId, getChordType } from './chordTypes';
import { canonicalPitchClassName, pitchClassNameWithAccidental } from './notes';
import { chordToneNames } from './spelling';

export type SuffixMap = Record<ChordTypeId, string>;

export interface NotationPreset {
  id: string;
  label: string;
  /** Suffix overrides relative to each type's default (symbols[0]). */
  suffixes: Partial<SuffixMap>;
}

export const NOTATION_PRESETS: NotationPreset[] = [
  {
    id: 'standard',
    label: 'Standard',
    suffixes: { halfDim7: 'ø7' },
  },
  {
    id: 'letter',
    label: 'Letter-based',
    suffixes: {
      major: 'Maj',
      minor: 'min',
      maj7: 'Maj7',
      m7: 'min7',
      m6: 'min6',
      m9: 'min9',
      m11: 'min11',
      m13: 'min13',
      maj9: 'Maj9',
      maj11: 'Maj11',
      maj13: 'Maj13',
      halfDim7: 'm7b5',
      m6Nine: 'min6/9',
      madd9: 'minadd9',
      madd11: 'minadd11',
      augMaj7: 'AugMaj7',
      maj7Flat5: 'Maj7♭5',
      maj9sharp11: 'Maj9♯11',
      maj13sharp11: 'Maj13♯11',
    },
  },
  {
    id: 'symbol',
    label: 'Symbol-based',
    suffixes: {
      minor: '−',
      diminished: '°',
      augmented: '+',
      maj7: 'Δ7',
      m7: '−7',
      dim7: '°7',
      halfDim7: 'ø7',
      mMaj7: 'mΔ7',
      aug7: '+7',
      m6: '−6',
      maj9: 'Δ9',
      m9: '−9',
      maj11: 'Δ11',
      m11: '−11',
      maj13: 'Δ13',
      m13: '−13',
      m6Nine: '−6/9',
      madd9: '−add9',
      madd11: '−add11',
      mMaj9: 'mΔ9',
      mMaj11: 'mΔ11',
      mMaj13: 'mΔ13',
      maj9sharp11: 'Δ9♯11',
      maj13sharp11: 'Δ13♯11',
    },
  },
  {
    id: 'jazz',
    label: 'Jazz notation',
    suffixes: {
      diminished: '°',
      dim7: '°7',
      halfDim7: 'ø7',
    },
  },
];

/** The default suffix for every chord type (its first symbol option). */
export function defaultSuffixes(): SuffixMap {
  const map = {} as SuffixMap;
  for (const t of CHORD_TYPES) map[t.id] = t.symbols[0];
  return map;
}

/** A full suffix map for a preset, overriding the defaults. */
export function presetSuffixes(presetId: string): SuffixMap {
  const base = defaultSuffixes();
  const preset = NOTATION_PRESETS.find((p) => p.id === presetId);
  if (preset) Object.assign(base, preset.suffixes);
  return base;
}

/** Format a chord as a name, e.g. root 10 + "maj7" -> "Bbmaj7". */
export function formatChordName(
  root: number,
  typeId: ChordTypeId,
  suffixes: SuffixMap,
  accidental: 'sharp' | 'flat' | 'none' = 'none',
): string {
  const suffix = suffixes[typeId] ?? '';
  return pitchClassNameWithAccidental(root, accidental) + suffix;
}

/** Format a chord, adding a slash bass when it differs from the root (inversion). */
export function formatSlashChord(
  root: number,
  typeId: ChordTypeId,
  bassPc: number | null,
  suffixes: SuffixMap,
): string {
  const name = formatChordName(root, typeId, suffixes);
  if (bassPc == null) return name;
  if (canonicalPitchClassName(bassPc) === canonicalPitchClassName(root)) return name;
  return `${name}/${canonicalPitchClassName(bassPc)}`;
}

/** Format omitted degrees as a "(no5)" or "(no3,no5)" suffix. */
export function formatOmitSuffix(omitted: readonly number[]): string {
  if (omitted.length === 0) return '';
  return `(no${omitted.join(',no')})`;
}

/** Format a chord name including an omit marker, e.g. "C7(no5)". */
export function formatChordWithOmit(
  root: number,
  typeId: ChordTypeId,
  suffixes: SuffixMap,
  omitted: readonly number[],
  accidental: 'sharp' | 'flat' | 'none' = 'none',
): string {
  return formatChordName(root, typeId, suffixes, accidental) + formatOmitSuffix(omitted);
}

/** Chord tone names in context spelling, e.g. F# major -> ["F#", "A#", "C#"]. */
export function formatChordTones(root: number, typeId: ChordTypeId): string[] {
  return chordToneNames(root, typeId);
}

/**
 * Format a chord's composition expression: the base chord's name plus its
 * stacked extension/alteration labels and any omitted degrees, e.g.
 * `('C','m11',s,[]) -> 'Cm7(9, 11)'`, `('C','dom13',s,[5]) -> 'C7(9, 11, 13, no5)'`.
 * `rootName` is already context-spelled by the caller (kept pure here).
 */
export function formatChordComposition(
  rootName: string,
  typeId: ChordTypeId,
  suffixes: SuffixMap,
  omitted: readonly number[],
): string {
  const comp = getChordType(typeId).composition;
  const base = rootName + (suffixes[comp.base] ?? '');
  const parts = [...comp.extensions];
  for (const d of omitted) parts.push(`no${d}`);
  return parts.length === 0 ? base : `${base}(${parts.join(', ')})`;
}
