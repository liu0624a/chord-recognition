// Shows the recognized chord (with slash bass and omit markers), up to two
// alternatives, the chord tones in context spelling, and a status label. The
// area is always rendered at a fixed size — when there is nothing to show the
// slots stay empty (no placeholder text), so the page never jumps.
//
// A footer stays pinned to the bottom of the window: the three piano pedals on
// the left and the always-visible "Play chord" controls on the right. The piano
// offers a block/arpeggio mode toggle; guitar/ukulele offer pluck/arpeggio/strum.
// Playback itself is owned by the app (which keeps preview voices separate from
// the user's notes); here the component only renders the button and the notes
// currently being previewed.

import { useState } from 'react';
import { ChordPlayMode } from '../audio/preview';
import { Instrument } from '../audio/synth';
import { formatDegreeParts } from '../chords/degree';
import { Confidence, RecognitionResult } from '../chords/recognizer';
import { recognizeInterval, suggestiveChordCandidates } from '../chords/interval';
import { formatChordComposition, formatOmitSuffix } from '../chords/notation';
import {
  canonicalNoteName,
  canonicalPitchClassName,
  pitchClass,
  pitchClassNameWithAccidental,
  spellingToPitchClassName,
} from '../chords/notes';
import { spellPitchClassInKey } from '../chords/spelling';
import { intervalName, MessageKey } from '../i18n/translations';
import { useSettings } from '../state/SettingsContext';
import { IconPlay, IconStop } from './icons';
import { PedalBar } from './PedalBar';

const CONFIDENCE_KEY: Partial<Record<Confidence, MessageKey>> = {
  note: 'chord.note',
  interval: 'chord.interval',
  confident: 'chord.confident',
  ambiguous: 'chord.ambiguous',
  partial: 'chord.partial',
  unknown: 'chord.unknown',
};

type PianoMode = 'block' | 'arpeggio';
type FretMode = 'pluck' | 'arpeggio' | 'strum';

interface Props {
  result: RecognitionResult;
  notes: number[];
  /** Context-aware spelling for the current chord, when one is recognized. */
  spell?: (midi: number) => string;
  instrument: Instrument;
  previewing: boolean;
  /** MIDI notes sounding from the preview right now (display only). */
  previewNotes: number[];
  onPlay: (mode: ChordPlayMode, useSelectedNotes: boolean) => void;
  onStop: () => void;
  // Pedal state + handlers, rendered in the chord window's bottom-left corner.
  sustain: boolean;
  sostenuto: boolean;
  soft: boolean;
  onSustain: (down: boolean) => void;
  onSostenuto: (down: boolean) => void;
  onSoft: (down: boolean) => void;
}

export function ChordDisplay({
  result,
  notes,
  spell,
  instrument,
  previewing,
  previewNotes,
  onPlay,
  onStop,
  sustain,
  sostenuto,
  soft,
  onSustain,
  onSostenuto,
  onSoft,
}: Props) {
  const { t, suffixes, keyState, keyRoot, keyMode, keyAccidental, degreeDisplay, language, singleNoteRecognition, twoNoteRecognition, chordRecognitionStatus } = useSettings();
  const [pianoMode, setPianoMode] = useState<PianoMode>('block');
  const [fretMode, setFretMode] = useState<FretMode>('strum');
  const [useSelected, setUseSelected] = useState(false);
  const chord = result.chord;

  // The active key, when tonal analysis is enabled — drives the degree label and
  // the key-aware spelling of the chord root, bass, and tones.
  const keyInfo = keyState === 'active' ? { root: keyRoot, mode: keyMode, accidental: keyAccidental } : null;

  // Spell a chord root / bass pitch class: by the key scale when diatonic, else
  // by the accidental preference (canonical when no key is active).
  const rootName = (pc: number): string =>
    keyInfo
      ? spellingToPitchClassName(spellPitchClassInKey(pc, keyInfo))
      : pitchClassNameWithAccidental(pc, keyAccidental);

  // Two sounding notes -> interval/octave recognition, independent of the
  // pitch-class dedup in `recognizeChord` (an octave is one pitch class).
  const intervalRes = notes.length === 2 ? recognizeInterval(notes, keyInfo) : null;

  let main = '';
  let statusConfidence: Confidence | null = null;
  let speculation: string[] = [];

  if (chord) {
    let name = rootName(chord.root) + (suffixes[chord.typeId] ?? '');
    const bass = result.bassPc;
    if (bass != null && canonicalPitchClassName(bass) !== canonicalPitchClassName(chord.root)) {
      name += '/' + rootName(bass);
    }
    main = name;
    statusConfidence = result.confidence;
  } else if (intervalRes) {
    if (twoNoteRecognition) {
      if (intervalRes.kind === 'octave') {
        main =
          intervalRes.octaves === 1
            ? `${intervalRes.lowerName} ${t('interval.octave')}`
            : `${intervalRes.lowerName} ${t('interval.octaves', { n: intervalRes.octaves })}`;
      } else if (intervalRes.kind === 'power') {
        main = `${intervalRes.lowerName}5`;
      } else {
        main = `${intervalRes.lowerName}–${intervalRes.upperName} (${intervalName(language, intervalRes.quality)})`;
      }
      statusConfidence = 'interval';
      if (intervalRes.kind !== 'octave') {
        const pcs = Array.from(new Set(notes.map((n) => pitchClass(n))));
        speculation = suggestiveChordCandidates(pcs).map(
          (c) => rootName(c.root) + (suffixes[c.typeId] ?? ''),
        );
      }
    }
  } else if (notes.length === 1) {
    if (singleNoteRecognition) {
      main = spell ? spell(notes[0]) : canonicalNoteName(notes[0]);
      statusConfidence = 'note';
    }
  }

  // The chord's scale degree under the active key (empty when no chord or key).
  const degreeParts = chord && keyInfo ? formatDegreeParts(chord.root, chord.typeId, keyInfo, degreeDisplay) : null;

  const alternatives = result.candidates.slice(1).map(
    (c) =>
      rootName(c.root) +
      (suffixes[c.typeId] ?? '') +
      (c.omitted.length > 0 ? formatOmitSuffix(c.omitted) : ''),
  );

  const statusKey = statusConfidence ? CONFIDENCE_KEY[statusConfidence] : null;

  const playMode: ChordPlayMode = instrument === 'piano' ? pianoMode : fretMode;

  return (
    <div className="chord">
      <div className="chord__name">{main}</div>
      <div className="chord__degree">
        {degreeParts ? (
          <>
            {degreeParts.body}
            {degreeParts.superscript ? <sup>{degreeParts.superscript}</sup> : null}
          </>
        ) : (
          ''
        )}
      </div>
      <div
        className={`chord__status${
          chordRecognitionStatus && statusConfidence
            ? ` chord__status--${statusConfidence}`
            : ' chord__status--empty'
        }`}
      >
        {chordRecognitionStatus && statusKey ? t(statusKey) : ''}
      </div>
      <div className="chord__composition">
        {chord
          ? formatChordComposition(
              rootName(chord.root),
              chord.typeId,
              suffixes,
              result.candidates[0]?.omitted ?? [],
            )
          : ''}
      </div>
      <div className="chord__alternatives">
        {alternatives.length > 0
          ? `${t('chord.alternatives')}: ${alternatives.join(' / ')}`
          : speculation.length > 0
            ? `${t('chord.speculation')}: ${speculation.join(' / ')}`
            : ''}
      </div>

      {previewing && previewNotes.length > 0 && (
        <div className="chord__preview-notes">
          {previewNotes.map((midi) => spell?.(midi) ?? canonicalNoteName(midi)).join(' · ')}
        </div>
      )}

      <div className="chord__footer">
        <PedalBar
          sustain={sustain}
          sostenuto={sostenuto}
          soft={soft}
          onSustain={onSustain}
          onSostenuto={onSostenuto}
          onSoft={onSoft}
        />
        <div className="chord__play">
          {instrument === 'piano' ? (
            <div className="chord__play-mode" role="group" aria-label={t('chord.playMode')}>
              <button
                type="button"
                aria-pressed={pianoMode === 'block'}
                onClick={() => setPianoMode('block')}
              >
                {t('chord.playBlock')}
              </button>
              <button
                type="button"
                aria-pressed={pianoMode === 'arpeggio'}
                onClick={() => setPianoMode('arpeggio')}
              >
                {t('chord.playArpeggio')}
              </button>
            </div>
          ) : (
            <div className="chord__play-mode" role="group" aria-label={t('chord.playMode')}>
              <button
                type="button"
                aria-pressed={fretMode === 'pluck'}
                onClick={() => setFretMode('pluck')}
              >
                {t('chord.playPluck')}
              </button>
              <button
                type="button"
                aria-pressed={fretMode === 'arpeggio'}
                onClick={() => setFretMode('arpeggio')}
              >
                {t('chord.playArpeggio')}
              </button>
              <button
                type="button"
                aria-pressed={fretMode === 'strum'}
                onClick={() => setFretMode('strum')}
              >
                {t('chord.playStrum')}
              </button>
            </div>
          )}
          <label className="chord__selected">
            <input
              type="checkbox"
              checked={useSelected}
              onChange={(e) => setUseSelected(e.target.checked)}
            />
            <span>{t('chord.selectedNotes')}</span>
          </label>
          <button
            type="button"
            className={`chord__play-btn${previewing ? ' chord__play-btn--stop' : ''}`}
            aria-label={previewing ? t('chord.stopPreview') : t('chord.playChord')}
            onClick={() => (previewing ? onStop() : onPlay(playMode, useSelected))}
          >
            {previewing ? <IconStop size={16} /> : <IconPlay size={16} />}
            {previewing ? t('chord.stopPreview') : t('chord.playChord')}
          </button>
        </div>
      </div>
    </div>
  );
}
