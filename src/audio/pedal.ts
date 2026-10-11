// Sustain / sostenuto pedal state machine. Pure and deterministic so the audio
// engine and the on-screen / MIDI pedal controls all share one source of truth.
//
// Semantics (mirroring a real piano):
//  - Sustain (CC64): while down, a released note keeps sounding until the pedal
//    is released. Releasing the pedal stops exactly those held-over notes.
//  - Sostenuto (CC66): captures the notes physically held at the moment it is
//    pressed; only those notes are held over after their keys are released.
//    Notes played after the press behave normally.
//  - Soft (CC67) only affects timbre/volume and is handled by the synth, not here.

export interface PedalState {
  /** Notes whose keys are currently physically held down (MIDI numbers). */
  held: number[];
  /** Sustain pedal currently depressed. */
  sustainDown: boolean;
  /** Sostenuto pedal currently depressed. */
  sostenutoDown: boolean;
  /** Notes captured by sostenuto at the moment it was pressed. */
  sostenutoHeld: number[];
  /** Notes released while sustain was down and still sounding. */
  sustainReleased: number[];
}

export function initialState(): PedalState {
  return { held: [], sustainDown: false, sostenutoDown: false, sostenutoHeld: [], sustainReleased: [] };
}

/** A key is pressed. */
export function pedalNoteOn(s: PedalState, midi: number): PedalState {
  if (s.held.includes(midi)) return s;
  return { ...s, held: [...s.held, midi] };
}

/** A key is released; the note keeps sounding if a pedal holds it over. */
export function pedalNoteOff(s: PedalState, midi: number): PedalState {
  const held = s.held.filter((n) => n !== midi);
  // If sustain is down, remember this note so it keeps sounding; a note already
  // captured by sostenuto keeps sounding regardless of sustain.
  const sustainReleased =
    s.sustainDown && !s.sustainReleased.includes(midi)
      ? [...s.sustainReleased, midi]
      : s.sustainReleased;
  return { ...s, held, sustainReleased };
}

/** Sustain pedal pressed or released. Releasing stops only the held-over notes. */
export function pedalSetSustain(s: PedalState, down: boolean): PedalState {
  return { ...s, sustainDown: down, sustainReleased: down ? s.sustainReleased : [] };
}

/** Sostenuto pedal pressed (captures `held`) or released (releases captured notes). */
export function pedalSetSostenuto(s: PedalState, down: boolean): PedalState {
  return { ...s, sostenutoDown: down, sostenutoHeld: down ? [...s.held] : [] };
}

/** Panic / all-notes-off: silence everything and reset all pedal state. */
export function pedalAllNotesOff(): PedalState {
  return initialState();
}

/**
 * The set of notes that should currently sound: physically held notes, notes
 * held over by sustain, and notes captured by sostenuto. Sorted and unique.
 */
export function soundingNotes(s: PedalState): number[] {
  const set = new Set<number>(s.held);
  for (const n of s.sustainReleased) set.add(n);
  for (const n of s.sostenutoHeld) set.add(n);
  return [...set].sort((a, b) => a - b);
}
