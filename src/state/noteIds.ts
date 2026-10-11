// Unified note identity. Several input surfaces (piano keys, MIDI, guitar and
// ukulele frets) can produce the same pitch; a note is keyed by its SOURCE
// position so releasing one does not delete a same-pitch note from another.
// `held: Map<noteId, midi>` is the single source of truth for what is pressed.

export type NoteSource = 'piano' | 'midi' | 'guitar' | 'ukulele';

/** Identity of a piano key (one per MIDI note). */
export function pianoId(midi: number): string {
  return `piano:${midi}`;
}

/** Identity of a MIDI note-on (keyed by note number). */
export function midiId(midi: number): string {
  return `midi:${midi}`;
}

/** Identity of a fretboard position (independent per string × fret). */
export function fretId(source: 'guitar' | 'ukulele', string: number, fret: number): string {
  return `${source}:${string}:${fret}`;
}

/** The distinct MIDI notes in a held map, sorted ascending. */
export function uniqueMidiNotes(held: ReadonlyMap<string, number>): number[] {
  return Array.from(new Set(held.values())).sort((a, b) => a - b);
}
