import { describe, expect, it } from 'vitest';
import {
  initialState,
  pedalAllNotesOff,
  pedalNoteOff,
  pedalNoteOn,
  pedalSetSostenuto,
  pedalSetSustain,
  soundingNotes,
} from './pedal';

describe('pedal state machine', () => {
  it('sounds only physically held notes with no pedals', () => {
    let s = initialState();
    s = pedalNoteOn(s, 60);
    s = pedalNoteOn(s, 64);
    expect(soundingNotes(s)).toEqual([60, 64]);
    s = pedalNoteOff(s, 60);
    expect(soundingNotes(s)).toEqual([64]);
  });

  it('holds a released note over while sustain is down, then stops it on release', () => {
    let s = initialState();
    s = pedalSetSustain(s, true);
    s = pedalNoteOn(s, 60);
    s = pedalNoteOff(s, 60);
    expect(soundingNotes(s)).toEqual([60]); // still sounding via sustain
    s = pedalSetSustain(s, false);
    expect(soundingNotes(s)).toEqual([]);
  });

  it('does not hold a note over after sustain is released', () => {
    let s = initialState();
    s = pedalSetSustain(s, true);
    s = pedalSetSustain(s, false);
    s = pedalNoteOn(s, 60);
    s = pedalNoteOff(s, 60);
    expect(soundingNotes(s)).toEqual([]);
  });

  it('sostenuto captures only the notes held at press time', () => {
    let s = initialState();
    s = pedalNoteOn(s, 60);
    s = pedalSetSostenuto(s, true); // captures {60}
    s = pedalNoteOn(s, 64);         // played after the press
    s = pedalNoteOff(s, 60);        // released but captured -> still sounds
    s = pedalNoteOff(s, 64);        // not captured -> stops
    expect(soundingNotes(s)).toEqual([60]);
    s = pedalSetSostenuto(s, false);
    expect(soundingNotes(s)).toEqual([]);
  });

  it('keeps a sostenuto-captured note through a sustain release', () => {
    let s = initialState();
    s = pedalNoteOn(s, 60);
    s = pedalSetSostenuto(s, true);
    s = pedalSetSustain(s, true);
    s = pedalNoteOff(s, 60); // in sustainReleased and sostenutoHeld
    s = pedalSetSustain(s, false); // sustainReleased cleared
    expect(soundingNotes(s)).toEqual([60]); // still held by sostenuto
    s = pedalSetSostenuto(s, false);
    expect(soundingNotes(s)).toEqual([]);
  });

  it('deduplicates notes sounding through several paths', () => {
    let s = initialState();
    s = pedalSetSustain(s, true);
    s = pedalSetSostenuto(s, true);
    s = pedalNoteOn(s, 60);
    s = pedalNoteOff(s, 60);
    expect(soundingNotes(s)).toEqual([60]);
  });

  it('all notes off resets everything', () => {
    let s = initialState();
    s = pedalSetSustain(s, true);
    s = pedalNoteOn(s, 60);
    s = pedalNoteOff(s, 60);
    s = pedalAllNotesOff();
    expect(soundingNotes(s)).toEqual([]);
    expect(s.sustainDown).toBe(false);
    expect(s.held).toEqual([]);
  });
});
