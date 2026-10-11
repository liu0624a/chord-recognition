import { describe, expect, it } from 'vitest';
import { buildPreviewPlan, buildSelectedNotesPlan } from './preview';

describe('buildPreviewPlan', () => {
  it('plays a piano block chord as simultaneous root-position tones', () => {
    const plan = buildPreviewPlan('piano', 0, 'major', 'block');
    expect(plan.notes.map((n) => n.midi)).toEqual([60, 64, 67]); // C4 E4 G4
    expect(plan.notes.every((n) => n.delay === 0)).toBe(true);
  });

  it('arpeggiates a piano chord low to high at a uniform interval', () => {
    const plan = buildPreviewPlan('piano', 0, 'major', 'arpeggio');
    expect(plan.notes.map((n) => n.delay)).toEqual([0, 0.12, 0.24]);
    expect(plan.duration).toBeCloseTo(0.24 + 1.2);
  });

  it('strums a guitar chord in string order with a light stagger', () => {
    const plan = buildPreviewPlan('guitar', 0, 'major', 'strum');
    expect(plan.notes.map((n) => n.midi)).toEqual([48, 52, 55, 60, 64]); // C3 E3 G3 C4 E4
    expect(plan.notes.map((n) => n.delay)).toEqual([0, 0.055, 0.11, 0.165, 0.22]);
  });

  it('strums a ukulele chord across its four strings', () => {
    const plan = buildPreviewPlan('ukulele', 0, 'major', 'strum');
    expect(plan.notes.map((n) => n.midi)).toEqual([67, 60, 64, 72]); // G4 C4 E4 C5
    expect(plan.notes).toHaveLength(4);
  });

  it('plucks a guitar chord as simultaneous strings', () => {
    const plan = buildPreviewPlan('guitar', 0, 'major', 'pluck');
    expect(plan.notes.map((n) => n.midi)).toEqual([48, 52, 55, 60, 64]);
    expect(plan.notes.every((n) => n.delay === 0)).toBe(true);
  });

  it('arpeggiates a guitar chord by pitch, not string order', () => {
    const plan = buildPreviewPlan('guitar', 0, 'major', 'arpeggio');
    expect(plan.notes.map((n) => n.midi)).toEqual([48, 52, 55, 60, 64]); // already ascending
    expect(plan.notes.map((n) => n.delay)).toEqual([0, 0.12, 0.24, 0.36, 0.48]);
  });

  it('uses the block duration for simultaneous notes', () => {
    expect(buildPreviewPlan('piano', 0, 'major', 'block').duration).toBeCloseTo(1.2);
  });
});

describe('buildSelectedNotesPlan', () => {
  it('plucks selected notes simultaneously, preserving pitch and duplicates', () => {
    const plan = buildSelectedNotesPlan(
      [{ midi: 48, string: 0 }, { midi: 60, string: 1 }, { midi: 60, string: 2 }],
      'pluck',
    );
    expect(plan.notes.map((n) => n.midi)).toEqual([48, 60, 60]);
    expect(plan.notes.every((n) => n.delay === 0)).toBe(true);
  });

  it('arpeggiates selected notes by pitch', () => {
    const plan = buildSelectedNotesPlan(
      [{ midi: 67, string: 0 }, { midi: 60, string: 1 }, { midi: 64, string: 2 }],
      'arpeggio',
    );
    expect(plan.notes.map((n) => n.midi)).toEqual([60, 64, 67]);
    expect(plan.notes.map((n) => n.delay)).toEqual([0, 0.12, 0.24]);
  });

  it('strums selected notes in physical string order', () => {
    const plan = buildSelectedNotesPlan(
      [{ midi: 67, string: 3 }, { midi: 60, string: 0 }, { midi: 64, string: 1 }],
      'strum',
    );
    expect(plan.notes.map((n) => n.midi)).toEqual([60, 64, 67]);
    expect(plan.notes.map((n) => n.delay)).toEqual([0, 0.055, 0.11]);
  });

  it('produces a ring-only duration for an empty selection', () => {
    const plan = buildSelectedNotesPlan([], 'pluck');
    expect(plan.notes).toEqual([]);
    expect(plan.duration).toBeCloseTo(1.2);
  });
});
