// Root component. Wires the pure logic (recognition, spelling, pedal) to the
// Web Audio synth and the UI. Notes are tracked as *independent instances* keyed
// by `noteId` (source + position + pitch) — never by pitch alone, so the same
// pitch triggered from several sources stays independent:
//  - `selected: Set<midi>` — persistent toggle selections, shared across the
//    piano, guitar, and ukulele and keyed by pitch (MIDI note number). Selecting
//    a note on any instrument marks every matching position on the others;
//    deselecting removes it everywhere. Selecting bypasses the pedals (it sounds
//    at once), and switching instruments keeps the shared selection intact.
//  - `heldRef: Map<noteId, midi>` — MIDI notes physically pressed (`midi:midi`).
//    Subject to the sustain/sostenuto pedals. In play mode, the piano and
//    fretboard also feed this path (press = note on, release = note off) instead
//    of `selected`, so played notes are momentary and never persist.
// The pedal state machine turns the MIDI `held` notes into sustain-held-over
// notes; that set combined with `selected` is the set of notes that actually
// *sound*. That set drives recognition, the staff, the chord display, the synth
// voices, and the piano key highlight.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  buildPreviewPlan,
  buildSelectedNotesPlan,
  ChordPlayMode,
  PreviewPlan,
  PreviewSourceNote,
} from './audio/preview';
import { createSynthEngine, Instrument, SynthEngine } from './audio/synth';
import {
  initialState,
  pedalAllNotesOff,
  pedalNoteOff,
  pedalNoteOn,
  pedalSetSostenuto,
  pedalSetSustain,
  PedalState,
  soundingNotes,
} from './audio/pedal';
import { canonicalNoteName, LETTER_PCS, pitchClass, type PitchSpelling } from './chords/notes';
import { recognizeChord } from './chords/recognizer';
import {
  chordSpellContext,
  chordSpellingFor,
  contextualSpelling,
  contextualSpellingName,
} from './chords/spelling';
import { keyDisplayName } from './i18n/translations';
import { findFretPositions, GUITAR_FRET_COUNT, GUITAR_TUNING, UKULELE_FRET_COUNT, UKULELE_TUNING } from './instruments/fretboard';
import { midiId } from './state/noteIds';
import { keySignature, scaleSpellings } from './staff/keySignatures';
import { useSettings } from './state/SettingsContext';
import { ChordDisplay } from './components/ChordDisplay';
import { Fretboard } from './components/Fretboard';
import { PianoKeyboard, type ScaleHighlight } from './components/PianoKeyboard';
import { SettingsPanel } from './components/SettingsPanel';
import { Staff } from './components/Staff';
import { Toolbar } from './components/Toolbar';

/** The full set of notes that sound: pedal-driven (held ∪ sustain ∪ sostenuto) plus selections. */
function computeSounding(pedal: PedalState, selected: ReadonlySet<number>): Set<number> {
  const sounding = new Set(soundingNotes(pedal));
  for (const midi of selected) sounding.add(midi);
  return sounding;
}

/** Velocity used for chord-preview notes. */
const PREVIEW_VELOCITY = 100;

/**
 * Selected notes for playback, in selection order. The selection is a shared
 * pitch set, so every instrument plays the same notes. Fretted instruments map
 * each note to its lowest-string position so a strum follows physical string
 * order; a note outside the instrument's range still plays, just without a
 * string assignment.
 */
function selectedNotesFor(
  instrument: Instrument,
  selected: ReadonlySet<number>,
): PreviewSourceNote[] {
  if (instrument === 'piano') {
    return Array.from(selected, (midi) => ({ midi }));
  }
  const tuning = instrument === 'guitar' ? GUITAR_TUNING : UKULELE_TUNING;
  const frets = instrument === 'guitar' ? GUITAR_FRET_COUNT : UKULELE_FRET_COUNT;
  return Array.from(selected, (midi) => {
    const positions = findFretPositions(tuning, frets, midi);
    const string = positions.length > 0 ? positions[0].string : undefined;
    return string != null ? { midi, string } : { midi };
  });
}

export default function App() {
  const {
    instrument,
    noteNameMode,
    panels,
    playMode,
    setPlayMode,
    keyState,
    keyRoot,
    keyMode,
    keyAccidental,
    language,
    octaveSignsEnabled,
    setOctaveSignsEnabled,
    scaleHighlighting,
    rangeIndicators,
    t,
  } = useSettings();

  // `held` is only read synchronously (via the ref) inside the note handlers;
  // the pedal state it feeds already drives every re-render we need.
  const heldRef = useRef<Map<string, number>>(new Map());

  // MIDI note -> last velocity. Drives the piano "held" ring and the fade-out
  // duration; kept after release so a note fades at its own velocity's rate.
  const [midiVelocities, setMidiVelocities] = useState<Map<number, number>>(() => new Map());

  // Persistent toggle selections (shared across piano + fretboards), keyed by
  // pitch. Bypass the pedal.
  const [selected, setSelected] = useState<Set<number>>(() => new Set());
  const selectedRef = useRef<Set<number>>(new Set());

  const [pedalState, setPedalState] = useState<PedalState>(() => initialState());
  const pedalRef = useRef<PedalState>(initialState());
  const [soft, setSoft] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const synthRef = useRef<SynthEngine | null>(null);

  // Chord-preview state. Kept entirely separate from `selected` / `held` /
  // `pedalState`: preview notes never enter `sounding`, so they never affect
  // recognition, the staff, the piano highlight, or the fretboard marks.
  const [previewing, setPreviewing] = useState(false);
  const [previewNotes, setPreviewNotes] = useState<number[]>([]);
  const previewTimerRef = useRef<number | null>(null);

  const getSynth = useCallback((): SynthEngine => {
    if (!synthRef.current) synthRef.current = createSynthEngine();
    return synthRef.current;
  }, []);

  const clearPreviewTimer = useCallback(() => {
    if (previewTimerRef.current != null) {
      window.clearTimeout(previewTimerRef.current);
      previewTimerRef.current = null;
    }
  }, []);

  /** Stop the preview: only preview-triggered voices are silenced. */
  const stopPreview = useCallback(() => {
    clearPreviewTimer();
    getSynth().previewStop();
    setPreviewing(false);
    setPreviewNotes([]);
  }, [clearPreviewTimer, getSynth]);

  useEffect(() => {
    getSynth().setInstrument(instrument);
  }, [instrument, getSynth]);

  // Switching instrument stops any in-flight preview so no strum/arpeggio voice
  // lingers under the new timbre.
  useEffect(() => {
    stopPreview();
  }, [instrument, stopPreview]);

  useEffect(() => {
    return () => synthRef.current?.dispose();
  }, []);

  /** Replace the MIDI-held map and keep the ref mirror in sync. */
  const commitHeld = useCallback((next: Map<string, number>) => {
    heldRef.current = next;
  }, []);

  /** Replace selections and keep the ref mirror + audio in sync. */
  const commitSelected = useCallback(
    (next: Set<number>) => {
      selectedRef.current = next;
      setSelected(next);
      getSynth().syncSounding(computeSounding(pedalRef.current, next));
    },
    [getSynth],
  );

  /** Apply a pedal transition: mirror it, push the new sounding set to audio, render. */
  const commitPedal = useCallback(
    (next: PedalState) => {
      pedalRef.current = next;
      setPedalState(next);
      getSynth().syncSounding(computeSounding(next, selectedRef.current));
    },
    [getSynth],
  );

  const handleMidiOn = useCallback(
    (midi: number, velocity: number) => {
      getSynth().noteOn(midi, velocity);
      const next = new Map(heldRef.current);
      next.set(midiId(midi), midi);
      commitHeld(next);
      setMidiVelocities((prev) => {
        const updated = new Map(prev);
        updated.set(midi, velocity);
        return updated;
      });
      commitPedal(pedalNoteOn(pedalRef.current, midi));
    },
    [getSynth, commitHeld, commitPedal],
  );

  const handleMidiOff = useCallback(
    (midi: number) => {
      const next = new Map(heldRef.current);
      if (!next.delete(midiId(midi))) return;
      commitHeld(next);
      commitPedal(pedalNoteOff(pedalRef.current, midi));
    },
    [commitHeld, commitPedal],
  );

  // Global "close all": silence every voice at once (bypassing the sustain pedal)
  // and clear every source's state — MIDI-held, piano, and fretboard — so no
  // residual sound, highlight, or fretboard mark survives.
  const handleAllNotesOff = useCallback(() => {
    getSynth().allNotesOff();
    stopPreview();
    commitHeld(new Map());
    setMidiVelocities(new Map());
    commitSelected(new Set());
    commitPedal(pedalAllNotesOff());
  }, [getSynth, stopPreview, commitHeld, commitSelected, commitPedal]);

  // Selecting is a shared, pitch-keyed toggle: selecting a note on any instrument
  // (a piano key or a fretboard position) sounds it at once and marks every
  // matching position across the piano, guitar, and ukulele; deselecting removes
  // that pitch everywhere. The selection persists across instrument switches.
  const handleSelectToggle = useCallback(
    (midi: number) => {
      const next = new Set(selectedRef.current);
      if (next.has(midi)) {
        next.delete(midi);
        commitSelected(next);
        return;
      }
      next.add(midi);
      getSynth().noteOn(midi, 100);
      commitSelected(next);
    },
    [getSynth, commitSelected],
  );

  // Play mode: the piano and fretboard stop toggling selections and instead act
  // like a real instrument — press = note on, release = note off (momentary).
  // Notes are routed through the same held/pedal path as MIDI, so they are
  // polyphonic and honour the sustain pedal, but never become a selection.
  const handlePlayOn = useCallback(
    (midi: number) => handleMidiOn(midi, 100),
    [handleMidiOn],
  );
  const handlePlayOff = useCallback((midi: number) => handleMidiOff(midi), [handleMidiOff]);

  // Toggle play mode. Entering it clears every selection so the instruments are
  // purely played (no persistent notes); leaving it restores selection.
  const handleTogglePlayMode = useCallback(() => {
    const next = !playMode;
    setPlayMode(next);
    if (next) commitSelected(new Set());
  }, [playMode, setPlayMode, commitSelected]);

  const handleSustain = useCallback(
    (down: boolean) => commitPedal(pedalSetSustain(pedalRef.current, down)),
    [commitPedal],
  );
  const handleSostenuto = useCallback(
    (down: boolean) => commitPedal(pedalSetSostenuto(pedalRef.current, down)),
    [commitPedal],
  );
  const handleSoft = useCallback(
    (down: boolean) => {
      setSoft(down);
      getSynth().setSoft(down);
    },
    [getSynth],
  );

  const handleControl = useCallback(
    (controller: number, value: number) => {
      const down = value > 63;
      if (controller === 64) handleSustain(down);
      else if (controller === 66) handleSostenuto(down);
      else if (controller === 67) handleSoft(down);
    },
    [handleSustain, handleSostenuto, handleSoft],
  );

  // The notes that actually sound right now (held ∪ sustain ∪ sostenuto ∪ selections).
  const sounding = useMemo(() => computeSounding(pedalState, selected), [pedalState, selected]);
  // MIDI notes still physically held — shown with a soft ring on the piano.
  const heldNotes = useMemo(() => new Set(pedalState.held), [pedalState]);

  // The active key (root + mode + accidental) when tonal analysis is on. Hoisted
  // above `result` so recognition can prefer a diatonic root on ambiguity.
  const keyInfo = useMemo(
    () =>
      keyState === 'active'
        ? { root: keyRoot, mode: keyMode, accidental: keyAccidental }
        : null,
    [keyState, keyRoot, keyMode, keyAccidental],
  );

  // Scale highlighting: when enabled and a key is active, the piano shows the
  // in-scale pitch classes (key-aware spelling) and marks the tonic with a "T".
  // Non-scale note labels are hidden. Visual only — no input/playback effect.
  const scaleHighlight = useMemo<ScaleHighlight | null>(() => {
    if (!scaleHighlighting || !keyInfo) return null;
    const spellings = scaleSpellings(keyInfo.root, keyInfo.mode, keyInfo.accidental);
    const scalePcs = new Set<number>();
    const spelling = new Map<number, PitchSpelling>();
    for (const sp of spellings) {
      const pc = pitchClass(LETTER_PCS[sp.letter] + sp.accidental);
      scalePcs.add(pc);
      spelling.set(pc, sp);
    }
    const tonic = spellings[0];
    return {
      tonicPc: pitchClass(LETTER_PCS[tonic.letter] + tonic.accidental),
      scalePcs,
      spelling,
    };
  }, [scaleHighlighting, keyInfo]);

  const noteList = useMemo(() => Array.from(sounding).sort((a, b) => a - b), [sounding]);
  const pcs = useMemo(() => noteList.map((n) => pitchClass(n)), [noteList]);
  const bassPc = noteList.length > 0 ? pitchClass(noteList[0]) : null;
  const result = useMemo(() => recognizeChord(pcs, bassPc, keyInfo), [pcs, bassPc, keyInfo]);

  // Start a computed preview plan, then auto-stop it after the last note rings.
  const playPlan = useCallback(
    (plan: PreviewPlan) => {
      clearPreviewTimer();
      getSynth().previewStop();
      for (const note of plan.notes) {
        getSynth().previewNoteOn(note.midi, PREVIEW_VELOCITY, note.delay);
      }
      setPreviewNotes(plan.notes.map((n) => n.midi));
      setPreviewing(true);
      previewTimerRef.current = window.setTimeout(() => {
        getSynth().previewStop();
        setPreviewing(false);
        setPreviewNotes([]);
        previewTimerRef.current = null;
      }, Math.ceil(plan.duration * 1000));
    },
    [getSynth, clearPreviewTimer],
  );

  // Play the recognized chord, or — when `useSelectedNotes` is set — the notes
  // the user has actually selected on the current instrument (pitch, octave and
  // duplicates preserved). Any prior preview is stopped first so re-clicking or
  // switching mode never stacks or leaves residual notes.
  const playPreview = useCallback(
    (mode: ChordPlayMode, useSelectedNotes: boolean) => {
      if (useSelectedNotes) {
        const selectedNotes = selectedNotesFor(instrument, selected);
        if (selectedNotes.length === 0) return;
        playPlan(buildSelectedNotesPlan(selectedNotes, mode));
        return;
      }
      const chord = result.chord;
      if (!chord) return;
      playPlan(buildPreviewPlan(instrument, chord.root, chord.typeId, mode));
    },
    [result, instrument, selected, playPlan],
  );

  // Note spelling: key + mode first (diatonic notes follow the scale), then chord
  // structure, then accidental preference. Without an active key, fall back to
  // chord-context / canonical spelling.
  const spellStruct = useMemo(
    () =>
      keyInfo
        ? contextualSpelling(keyInfo, result.chord?.root, result.chord?.typeId)
        : result.chord
          ? chordSpellingFor(result.chord.root, result.chord.typeId)
          : undefined,
    [keyInfo, result],
  );
  const spellName = useMemo(
    () =>
      keyInfo
        ? contextualSpellingName(keyInfo, result.chord?.root, result.chord?.typeId)
        : result.chord
          ? chordSpellContext(result.chord.root, result.chord.typeId)
          : canonicalNoteName,
    [keyInfo, result],
  );

  const keySig = useMemo(
    () => (keyState === 'active' ? keySignature(keyRoot, keyMode, keyAccidental) : { sharps: 0, flats: 0 }),
    [keyState, keyRoot, keyMode, keyAccidental],
  );
  const keyLabel = useMemo(
    () =>
      keyState === 'active' ? keyDisplayName(language, keyRoot, keyMode, keyAccidental) : t('settings.currentKeyNone'),
    [keyState, language, keyRoot, keyMode, keyAccidental, t],
  );

  return (
    <div className="app">
      <Toolbar
        settingsOpen={settingsOpen}
        onToggleSettings={() => setSettingsOpen((s) => !s)}
        onTogglePlayMode={handleTogglePlayMode}
        onNoteOn={handleMidiOn}
        onNoteOff={handleMidiOff}
        onAllNotesOff={handleAllNotesOff}
        onControl={handleControl}
        onEnabled={() => getSynth().resume()}
      />

      {settingsOpen && <SettingsPanel onClose={() => setSettingsOpen(false)} />}

      <main className="main">
        <div className="notation-row">
          <Staff
            notes={noteList}
            spell={spellStruct}
            sustainDown={pedalState.sustainDown}
            sostenutoDown={pedalState.sostenutoDown}
            sharps={keySig.sharps}
            flats={keySig.flats}
            keyLabel={keyLabel}
            octaveSignsEnabled={octaveSignsEnabled}
            octaveSignsLabel={t('settings.octaveSigns')}
            onOctaveSignsChange={setOctaveSignsEnabled}
          />
          <ChordDisplay
            result={result}
            notes={noteList}
            spell={spellName}
            instrument={instrument}
            previewing={previewing}
            previewNotes={previewNotes}
            onPlay={playPreview}
            onStop={stopPreview}
            sustain={pedalState.sustainDown}
            sostenuto={pedalState.sostenutoDown}
            soft={soft}
            onSustain={handleSustain}
            onSostenuto={handleSostenuto}
            onSoft={handleSoft}
          />
        </div>
        {panels.map((panel) => {
          if (panel === 'piano') {
            return (
              <PianoKeyboard
                key="piano"
                activeNotes={sounding}
                heldNotes={heldNotes}
                velocities={midiVelocities}
                noteNameMode={noteNameMode}
                scaleHighlight={scaleHighlight}
                showRangeIndicators={rangeIndicators}
                onToggle={handleSelectToggle}
                playMode={playMode}
                onPlayOn={handlePlayOn}
                onPlayOff={handlePlayOff}
              />
            );
          }
          const source = panel === 'guitar' ? 'guitar' : 'ukulele';
          return (
            <Fretboard
              key={panel}
              source={source}
              tuning={panel === 'guitar' ? GUITAR_TUNING : UKULELE_TUNING}
              markedMidis={sounding}
              onToggle={handleSelectToggle}
              playMode={playMode}
              onPlayOn={handlePlayOn}
              onPlayOff={handlePlayOff}
              ariaLabel={t(panel === 'guitar' ? 'fretboard.guitarLabel' : 'fretboard.ukuleleLabel')}
            />
          );
        })}
      </main>
    </div>
  );
}
