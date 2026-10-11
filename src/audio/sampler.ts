// Pure sample-selection helpers for the sampled-instrument engine. Kept free of
// Web Audio so they can be unit-tested.

import { midiToFrequency } from '../chords/notes';
import type { InstrumentSample } from './sampleManifest';

/**
 * Pick the sample whose *recorded* pitch is closest to the target. `shift`
 * (semitones) raises the instrument's sound above its samples (e.g. the ukulele
 * plays nylon-guitar plucks an octave up), so the search targets `midi - shift`.
 */
export function nearestSample(
  samples: readonly InstrumentSample[],
  midi: number,
  shift = 0,
): InstrumentSample {
  const target = midi - shift;
  let best = samples[0];
  let bestDist = Infinity;
  for (const s of samples) {
    const dist = Math.abs(s.midi - target);
    if (dist < bestDist) {
      bestDist = dist;
      best = s;
    }
  }
  return best;
}

/** Playback rate that pitches a sample recorded at `sampleMidi` up/down to `targetMidi`. */
export function samplePlaybackRate(sampleMidi: number, targetMidi: number): number {
  return midiToFrequency(targetMidi) / midiToFrequency(sampleMidi);
}
