// Chord fingering for the strum preview: choose a string+fret combination that
// plays a chord's tones in standard tuning, preferring a reasonable voicing
// (root in the bass, low frets, all tones covered). Pure module so it can be
// unit-tested independently of the Web Audio engine.

import { pitchClass } from '../chords/notes';

/** One fret per string (0 = open string); `null` means the string is muted. */
export type Fingering = (number | null)[];

/** Highest fret still considered a comfortable "open" voicing. */
const MAX_COMFORT_FRET = 4;

interface VoicingScore {
  /** Distinct chord pitch classes sounded — more is more accurate. */
  covered: number;
  /** 1 when the lowest sounding note is the root (root-position feel). */
  rootInBass: number;
  /** 1 when every fret stays within `MAX_COMFORT_FRET` (open position beats a barre). */
  comfortable: number;
  /** Number of strings that sound — fuller is better among equally comfortable shapes. */
  sounding: number;
  /** Highest fret used — lower is easier to play. */
  maxFret: number;
  /** Total frets used — lower is easier to play. */
  sumFret: number;
}

/** Return true when `a` is a preferable voicing than `b`. */
function better(a: VoicingScore, b: VoicingScore): boolean {
  if (a.covered !== b.covered) return a.covered > b.covered;
  if (a.rootInBass !== b.rootInBass) return a.rootInBass > b.rootInBass;
  if (a.comfortable !== b.comfortable) return a.comfortable > b.comfortable;
  if (a.sounding !== b.sounding) return a.sounding > b.sounding;
  if (a.maxFret !== b.maxFret) return a.maxFret < b.maxFret;
  return a.sumFret < b.sumFret;
}

/**
 * Find a reasonable fingering for `chordPcs` (the chord's pitch classes) on a
 * `tuning`-tuned instrument, across frets 0..`frets`. Returns a fret per string
 * (0 = open, null = muted). The search covers every combination of the (few)
 * per-string candidate frets and keeps the best, so it favors accurate,
 * comfortable voicings without a hardcoded chord chart.
 */
export function findChordFingering(
  tuning: readonly number[],
  frets: number,
  chordPcs: ReadonlySet<number>,
  rootPc: number,
): Fingering {
  const strings = tuning.length;

  // Candidate frets per string — only frets that land on a chord tone (or mute).
  const options: (number | null)[][] = [];
  for (let string = 0; string < strings; string++) {
    const opts: (number | null)[] = [null];
    for (let fret = 0; fret <= frets; fret++) {
      if (chordPcs.has(pitchClass(tuning[string] + fret))) opts.push(fret);
    }
    options.push(opts);
  }

  function score(assignment: (number | null)[]): VoicingScore {
    const covered = new Set<number>();
    let maxFret = 0;
    let sumFret = 0;
    let sounding = 0;
    let lowest: number | null = null;
    let lowestPc: number | null = null;
    for (let string = 0; string < strings; string++) {
      const fret = assignment[string];
      if (fret == null) continue;
      sounding++;
      const midi = tuning[string] + fret;
      const pc = pitchClass(midi);
      covered.add(pc);
      if (fret > maxFret) maxFret = fret;
      sumFret += fret;
      if (lowest == null || midi < lowest) {
        lowest = midi;
        lowestPc = pc;
      }
    }
    return {
      covered: covered.size,
      rootInBass: lowestPc === rootPc ? 1 : 0,
      comfortable: maxFret <= MAX_COMFORT_FRET ? 1 : 0,
      sounding,
      maxFret,
      sumFret,
    };
  }

  const assignment: (number | null)[] = new Array(strings).fill(null);
  let best: Fingering | null = null;
  let bestScore: VoicingScore | null = null;

  function search(string: number): void {
    if (string === strings) {
      const current = score(assignment);
      if (!bestScore || better(current, bestScore)) {
        bestScore = current;
        best = [...assignment];
      }
      return;
    }
    for (const fret of options[string]) {
      assignment[string] = fret;
      search(string + 1);
    }
    assignment[string] = null;
  }

  search(0);
  return best ?? new Array(strings).fill(null);
}
