// Chord-type data integrity: interval structures are well-formed and unique, and
// every composition descriptor points at a real chord type.

import { describe, expect, it } from 'vitest';
import { CHORD_TYPES, getChordType } from './chordTypes';

describe('CHORD_TYPES', () => {
  it('defines each type with sorted intervals starting at 0 and parallel degrees', () => {
    for (const t of CHORD_TYPES) {
      expect(t.intervals[0]).toBe(0);
      expect([...t.intervals].sort((a, b) => a - b)).toEqual(t.intervals);
      expect(t.degrees.length).toBe(t.intervals.length);
      expect(t.symbols.length).toBeGreaterThan(0);
      expect(t.name.length).toBeGreaterThan(0);
    }
  });

  it('gives every type a valid composition base', () => {
    for (const t of CHORD_TYPES) {
      // getChordType throws on an unknown id, so a successful lookup validates it.
      expect(getChordType(t.composition.base).id).toBe(t.composition.base);
    }
  });

  it('has no two types with the same interval structure', () => {
    const seen = new Map<string, string>();
    for (const t of CHORD_TYPES) {
      const key = t.intervals.join(',');
      expect(seen.has(key)).toBe(false);
      seen.set(key, t.id);
    }
  });

  it('has no duplicate type ids', () => {
    const ids = CHORD_TYPES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
