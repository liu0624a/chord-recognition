// Builds a concrete "play this chord" plan for the preview button: which MIDI
// notes to sound, at what offsets, and how long the whole preview lasts. The
// synth plays these through a voice group that is kept separate from the user's
// held/selected notes, so a preview never touches the user's state.
//
// There are two note sources: the recognized chord (regenerated as a reasonable
// voicing) and the user's actually-selected notes (pitch/octave/duplicates
// preserved). Either source is scheduled by a playback mode.

import { ChordTypeId, getChordType } from '../chords/chordTypes';
import { pitchClass } from '../chords/notes';
import { findChordFingering } from '../instruments/fingering';
import { FINGERING_FRETS, GUITAR_TUNING, UKULELE_TUNING } from '../instruments/fretboard';
import type { Instrument } from './synth';

/**
 * How the preview plays:
 *  - 'block'    (piano)        all notes simultaneously;
 *  - 'arpeggio' (piano/frets)  notes low-to-high;
 *  - 'pluck'    (frets)        all selected strings simultaneously;
 *  - 'strum'    (frets)        strings in physical order, lightly staggered.
 */
export type ChordPlayMode = 'block' | 'arpeggio' | 'pluck' | 'strum';

export interface PreviewNote {
  midi: number;
  /** Seconds after the preview starts that this note begins. */
  delay: number;
}

/** A note to preview, optionally tied to a physical string (for strum order). */
export interface PreviewSourceNote {
  midi: number;
  /** String index into the tuning (0 = bottom string); undefined for piano. */
  string?: number;
}

export interface PreviewPlan {
  notes: PreviewNote[];
  /** Total preview length in seconds (after which the app stops the voices). */
  duration: number;
}

/** Piano root octave: a C root sounds as C4 (middle C). */
const PIANO_ROOT = 60;
/** Seconds between successive arpeggio notes. */
const ARP_INTERVAL = 0.12;
/** Seconds between successive strummed strings. */
const STRUM_INTERVAL = 0.055;
/** Seconds a note rings after the last one starts, before the preview stops. */
const RING = 1.2;

/** Piano chord tones in root position, ascending by interval. */
function pianoNotes(root: number, typeId: ChordTypeId): PreviewSourceNote[] {
  const base = PIANO_ROOT + pitchClass(root);
  return getChordType(typeId).intervals.map((iv) => ({ midi: base + iv }));
}

/**
 * Guitar/ukulele chord notes, in actual string order (bottom → top). The
 * fingering mutes any string that can't sound a chord tone at a reasonable
 * fret, so every note is a chord tone; the strum itself follows string order,
 * which is the physical up-stroke order (and low→high pitch on the guitar).
 */
function strumNotes(instrument: Instrument, root: number, typeId: ChordTypeId): PreviewSourceNote[] {
  const tuning = instrument === 'guitar' ? GUITAR_TUNING : UKULELE_TUNING;
  const type = getChordType(typeId);
  const rootPc = pitchClass(root);
  const chordPcs = new Set(type.intervals.map((iv) => pitchClass(rootPc + iv)));
  const fingering = findChordFingering(tuning, FINGERING_FRETS, chordPcs, rootPc);

  const notes: PreviewSourceNote[] = [];
  for (let string = 0; string < fingering.length; string++) {
    const fret = fingering[string];
    if (fret != null) notes.push({ midi: tuning[string] + fret, string });
  }
  return notes;
}

/** Apply a playback mode to a set of source notes, producing a timed plan. */
function scheduleNotes(notes: PreviewSourceNote[], mode: ChordPlayMode): PreviewPlan {
  let ordered: PreviewSourceNote[];
  let interval: number;
  if (mode === 'arpeggio') {
    ordered = [...notes].sort((a, b) => a.midi - b.midi);
    interval = ARP_INTERVAL;
  } else if (mode === 'strum') {
    ordered = [...notes].sort((a, b) => (a.string ?? 0) - (b.string ?? 0));
    interval = STRUM_INTERVAL;
  } else {
    // 'block' (piano) and 'pluck' (frets): every note sounds at once.
    ordered = notes;
    interval = 0;
  }

  const preview: PreviewNote[] = ordered.map((n, i) => ({ midi: n.midi, delay: i * interval }));
  const lastDelay = preview.length > 0 ? preview[preview.length - 1].delay : 0;
  return { notes: preview, duration: lastDelay + RING };
}

/** Build a preview plan from the recognized chord (root + type). */
export function buildPreviewPlan(
  instrument: Instrument,
  root: number,
  typeId: ChordTypeId,
  mode: ChordPlayMode,
): PreviewPlan {
  const notes = instrument === 'piano' ? pianoNotes(root, typeId) : strumNotes(instrument, root, typeId);
  return scheduleNotes(notes, mode);
}

/** Build a preview plan from the user's selected notes (pitch/octave preserved). */
export function buildSelectedNotesPlan(
  notes: PreviewSourceNote[],
  mode: ChordPlayMode,
): PreviewPlan {
  return scheduleNotes(notes, mode);
}
