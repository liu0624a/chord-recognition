# Chord Recognition

A dependency-free, front-end **play + notate + recognize** tool. Play the 88-key
piano, a guitar/ukulele fretboard, or a MIDI keyboard; the app sounds each note,
shows it on a real staff, and recognizes the chord — all with no backend, no
API keys, and no accounts. React + TypeScript + Vite.

## Features

- **88-key piano (A0–C8)** — click a key to select it (like the fretboard): it
  sounds until clicked again, so you can build multi-note chords. Each key
  selects and deselects independently — clicking an already-selected key closes
  only that note, leaving every other sounding note untouched. Only notes that
  are actually sounding (selected, MIDI-pressed, or still held by the sustain
  pedal) are highlighted — never inferred chord tones. An optional note-name
  setting reveals black keys as sharps, flats, or both (`C♯4` / `D♭4`, with the
  two enharmonic names stacked vertically) without changing key geometry.
- **Staff notation** — hand-rolled SVG treble / bass / grand staff with ledger
  lines, accidentals, naturals, pedal marks (`Ped.`), and octave signs (`8va` /
  `8vb`) — `8va` when every high-register note is above C6, `8vb` when every
  low-register note is below C2, each judged independently (toggleable at the
  staff's bottom-left corner). Selected notes sync to the staff and are spelled in chord context
  (e.g. F♯ major → F♯ A♯ C♯, not G♭ B♭ D♭). The octave sign only changes how a
  note is written — never its pitch, key highlight, or chord recognition.
- **Key settings** — four coordinated controls in Settings: a **Key State**
  toggle (Active / None), an **Accidental** spelling preference (Sharps / Flats
  / None), a **Root Note** (C–B), and a **Mode** (Ionian … Locrian). The staff
  shows the key name (`Key: …`) and draws the mode's relative-major key
  signature after each clef at standard positions, updating instantly. Setting
  Key State to **None** disables tonal analysis (no degree labels, no key
  signature) while piano / guitar / mic / MIDI keep working, and restores the
  previous key when switched back on.
- **Chord degrees** — when a chord is recognized and a key is active, its scale
  degree is shown beneath the chord name (C–Am–F–G in C → `I – vi – IV – V`).
  A Settings dropdown switches between six display formats — Roman numerals
  (case + °), Roman + quality (`Imaj7` / `V7` / `ii7`), Arabic/Nashville
  numbers (`1maj7` / `6m7`), accidental Roman (`♭VII` / `♯iv°`), and functional
  T/S/D — reformatting the same analysis without re-recognition.
- **Chord recognition** — strict subset matching with omit markers
  (`C7(no5)`), up to two sorted candidates when genuinely ambiguous, and a
  special case for C6 vs Am7. No unfounded confidence percentages.
- **Guitar + ukulele fretboards** — one shown at a time (toggle in Settings).
  Strings run in standard order bottom-to-top (guitar low E / 6th string to high
  E / 1st; ukulele G C E A). Every string × fret (including open strings) is an
  independent tappable target with an instant hover note-name tooltip; each
  string is monophonic (selecting a new position on a string replaces the old
  one), while same-pitch positions on different strings stay independent.
  Clicking a marked position closes just that note — and a position matching a
  piano-triggered note closes that piano note, without stopping other notes.
- **Three timbres** — piano, guitar, and ukulele use real per-note samples
  (FluidR3 GM soundfont, MIT licensed) played through the Web Audio API and
  pitch-shifted by `playbackRate`. Switching timbre never changes pitch,
  recognition, or notation.
- **Play selected chord** — a play button in the chord window sounds the
  recognized chord with the current timbre. The piano offers block (simultaneous)
  and ascending-arpeggio modes; guitar/ukulele play an upward strum through a
  string+fret voicing chosen from the chord's tones. The preview is a separate
  voice group: it never changes your selections, MIDI, fretboard marks, or the
  recognized chord, and the Stop button (or switching instruments) ends it.
- **Play mode** — a toolbar toggle that switches the piano and fretboard from
  selection to pure playing: pressing a key or fret position sounds the note and
  releasing it stops the note (momentary, like a real instrument). Enabling it
  clears all current selections; disabling it restores selection. Play-mode notes
  are polyphonic and honour the sustain pedal, but never become selections.
- **Sustain / sostenuto / soft pedals** — on-screen buttons and MIDI CC 64/66/67
  both drive the same state. Sustain keeps notes sounding after key release, and
  the staff/chord keep showing them until they truly stop sounding; the staff
  marks `Ped.` / `Sost.` while a pedal is down.
- **MIDI input** — Web MIDI note on/off (including velocity-0 note-off), CC64 /
  CC66 / CC67 pedals, all-notes-off, and device selection/reconnect. MIDI keys
  highlight on the piano and mark every matching position on the current
  fretboard, fade out at a velocity-scaled rate when released, and keep a soft
  "held" ring while their keys stay pressed.
- **English / 简体中文** — full UI, tooltips, and settings switch language, with
  a dark/light theme that follows the OS by default.

## Requirements

- Node.js 18+ (for development and builds)

## Getting started

```bash
npm install
npm run dev      # start the dev server (http://localhost:5173)
```

## Build, preview, test

```bash
npm run build    # typecheck + production build into dist/
npm run preview  # preview the production build
npm test         # run unit tests (Vitest)
```

Tests cover the chord recognizer, chord notation formatting, context-aware note
spelling, the sustain/sostenuto pedal state machine, fretboard pitch mapping,
staff layout, key signatures, scale-degree formatting, and sample selection /
playback-rate.

## Usage

- **Play** with the on-screen piano, a fretboard (enable it in Settings), or a
  MIDI keyboard via **Enable MIDI**.
- **Sound** follows the selected instrument (toolbar icons). The first
  click/tap creates the `AudioContext`, satisfying autoplay policies.
- **Pedals** live below the keyboard; press **Sustain** to hold notes after you
  release the keys.
- **Settings** (gear icon) control language, theme, fretboard type, note-name
  labels, key (state / accidental / root / mode), chord-degree display, and
  chord-notation style. Octave signs (8va/8vb) are toggled from the staff's
  bottom-left corner.

## Browser compatibility

| Feature | Chrome / Edge | Firefox | Safari |
| --- | --- | --- | --- |
| Web MIDI API | ✅ | ❌ | ❌ |
| Web Audio synthesis | ✅ | ✅ | ✅ |

## Project structure

```
src/
  chords/        chord recognition engine, chord-type definitions, notation + spelling (pure logic)
  audio/         sampled-instrument engine + sustain/sostenuto pedal state machine
  instruments/   guitar / ukulele fretboard geometry and pitch mapping
  staff/         staff notation model (clef selection, positions, ledger lines)
  midi/          Web MIDI device management and message parsing
  i18n/          English / Chinese UI strings
  state/         settings context, persistence, unified note identity
  components/    piano, staff, fretboard, chord display, toolbar, settings, pedals
  App.tsx        state orchestration (held notes → recognition / audio / notation)
```

Sample audio lives in `public/samples/` (per-instrument per-note MP3s, generated
by `scripts/fetch-samples.mjs` from the FluidR3 GM soundfont).

## Known limitations

- Chord recognition uses strict subset matching ("every input note must be a
  chord tone"); a passing non-chord tone shows as unrecognized rather than
  forcing a guess.
- Recognition and notation follow the *sounding* notes (held ∪ sustain-held-over
  ∪ sostenuto ∪ selections), so a note held over by the sustain pedal keeps
  showing until the pedal is released. Piano keys highlight those same sounding
  notes, and the fretboard "×" marks reflect directly-selected positions plus
  piano-selected and MIDI-sounding notes mapped onto their matching strings/frets.
  Notes from different sources are independent instances: closing a fretboard
  position stops only that position (a matching position also closes a piano note
  of the same pitch), and closing a piano note stops only that note, leaving
  other selected, held, and pedal-sustained notes sounding.
- Diminished 7ths are spelled with a theoretical double-flat 7th (e.g. C E♭ G♭
  B♭♭) as is conventional for chord spelling.
- Roots are natural letters only (C–B), so sharp/flat major keys such as F♯ or
  B♭ are not selectable. The Accidental setting is a spelling preference for
  chord names and degree accidentals (♯/♭), never a change of key or pitch.
- The ukulele timbre is approximated with nylon-guitar plucks pitched up an
  octave, since freely licensed per-note ukulele samples are scarce. To use real
  ukulele samples, drop per-note MP3s into `public/samples/ukulele/` and update
  `src/audio/sampleManifest.ts`.
- Samples are the FluidR3 GM soundfont (MIT). The first press of an instrument
  whose samples are still decoding may be silent for a brief moment.
