import { describe, expect, it } from 'vitest';
import type { InstrumentSample } from './sampleManifest';
import { nearestSample, samplePlaybackRate } from './sampler';

const SAMPLES: InstrumentSample[] = [
  { file: 'a.mp3', midi: 60 },
  { file: 'b.mp3', midi: 63 },
  { file: 'c.mp3', midi: 66 },
];

describe('nearestSample', () => {
  it('picks the closest recorded pitch', () => {
    expect(nearestSample(SAMPLES, 62)).toBe(SAMPLES[1]); // 63 (dist 1) beats 60 (dist 2)
    expect(nearestSample(SAMPLES, 64)).toBe(SAMPLES[1]); // 63 (dist 1) beats 66 (dist 2)
    expect(nearestSample(SAMPLES, 61)).toBe(SAMPLES[0]); // 60 (dist 1) beats 63 (dist 2)
  });

  it('returns an exact match', () => {
    expect(nearestSample(SAMPLES, 63)).toBe(SAMPLES[1]);
  });

  it('handles a single sample', () => {
    expect(nearestSample([SAMPLES[0]], 72)).toBe(SAMPLES[0]);
  });

  it('applies the instrument shift to the search target', () => {
    const uke: InstrumentSample[] = [
      { file: 'C3.mp3', midi: 48 },
      { file: 'Eb3.mp3', midi: 51 },
    ];
    expect(nearestSample(uke, 60, 12).midi).toBe(48); // 60 - 12 = 48, exact
    expect(nearestSample(uke, 62, 12).midi).toBe(51); // 62 - 12 = 50 -> 51 (1) beats 48 (2)
  });
});

describe('samplePlaybackRate', () => {
  it('is 1 for the same pitch', () => {
    expect(samplePlaybackRate(60, 60)).toBeCloseTo(1);
  });

  it('doubles an octave up', () => {
    expect(samplePlaybackRate(60, 72)).toBeCloseTo(2);
  });

  it('halves an octave down', () => {
    expect(samplePlaybackRate(72, 60)).toBeCloseTo(0.5);
  });
});
