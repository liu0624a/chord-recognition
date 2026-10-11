// Full 88-key piano (A0–C8, MIDI 21–108). Clicking a key toggles a persistent
// selection (like the fretboard) — the note sounds while selected and stops at
// once when cancelled. In play mode, keys play momentarily instead: press = note
// on, release = note off. Keys highlight only for notes that are actually
// sounding (held, still held by the pedal, or selected) — never for inferred
// chord tones. A soft ring marks keys still physically held, and a released note
// fades out over a velocity-scaled duration instead of vanishing. Note labels are
// optional (off by default) and only change text — key geometry never changes.

import { memo, useMemo } from 'react';
import type { CSSProperties } from 'react';
import {
  keyNoteLabel,
  NoteNameMode,
  pitchClass,
  spellingOctave,
  spellingToPitchClassNameGlyphs,
  type PitchSpelling,
} from '../chords/notes';
import { PIANO_HIGH_MIDI, PIANO_LOW_MIDI, pianoGeometry } from './pianoGeometry';
import { RangeIndicators } from './RangeIndicators';

/** Scale-highlighting data: the tonic + in-scale pitch classes, plus each scale
 *  pitch class's diatonic spelling for key-aware note labels. Null when off. */
export interface ScaleHighlight {
  tonicPc: number;
  scalePcs: Set<number>;
  spelling: Map<number, PitchSpelling>;
}

interface Props {
  /** Notes that are sounding (pressed / sustain-held / selected): highlighted. */
  activeNotes: Set<number>;
  /** MIDI notes still physically held: shown with a soft held ring. */
  heldNotes: Set<number>;
  /** MIDI note -> last velocity, used to scale the fade-out duration. */
  velocities: Map<number, number>;
  noteNameMode: NoteNameMode;
  /** Scale highlighting: tonic pitch class + in-scale pitch classes (null when off). */
  scaleHighlight?: ScaleHighlight | null;
  /** Show instrument range indicator bars below the keys (settings-controlled). */
  showRangeIndicators?: boolean;
  onToggle: (midi: number) => void;
  /** When true, keys play momentarily (press/release) instead of toggling. */
  playMode: boolean;
  /** Note-on for a play-mode press. */
  onPlayOn: (midi: number) => void;
  /** Note-off for a play-mode release. */
  onPlayOff: (midi: number) => void;
  lowMidi?: number;
  highMidi?: number;
}

/** Fade-out duration for a MIDI note, scaled by its velocity (200–700ms). */
function fadeMs(velocity: number): number {
  return Math.min(700, Math.max(200, 160 + velocity * 4));
}

export const PianoKeyboard = memo(function PianoKeyboard({
  activeNotes,
  heldNotes,
  velocities,
  noteNameMode,
  scaleHighlight,
  showRangeIndicators,
  onToggle,
  playMode,
  onPlayOn,
  onPlayOff,
  lowMidi = PIANO_LOW_MIDI,
  highMidi = PIANO_HIGH_MIDI,
}: Props) {
  const { whiteKeys, blackKeys, whiteIndex, whiteCount } = useMemo(
    () => pianoGeometry(lowMidi, highMidi),
    [lowMidi, highMidi],
  );

  const whiteWidth = 100 / whiteCount;

  /** Key position/width, plus the velocity-scaled fade duration for MIDI notes. */
  const keyStyle = (left: string, width: string, midi: number): CSSProperties => {
    const style: CSSProperties = { left, width };
    const velocity = velocities.get(midi);
    if (velocity != null) {
      (style as Record<string, unknown>)['--fade-ms'] = `${fadeMs(velocity)}ms`;
    }
    return style;
  };

  // Scale highlighting shows note names only for the in-scale pitch classes (with
  // a key-aware spelling) and bolds the tonic's label; otherwise the global
  // note-name mode governs labels. Purely visual — key geometry, input, and
  // playback are untouched.
  const isScale = (midi: number) =>
    scaleHighlight != null && scaleHighlight.scalePcs.has(pitchClass(midi));
  const isTonic = (midi: number) =>
    scaleHighlight != null && scaleHighlight.tonicPc === pitchClass(midi);

  const showLabel = (midi: number) => (scaleHighlight ? isScale(midi) : noteNameMode !== 'off');

  const label = (midi: number) => {
    const sp = scaleHighlight?.spelling.get(pitchClass(midi));
    if (sp) return `${spellingToPitchClassNameGlyphs(sp)}${spellingOctave(sp, midi)}`;
    return keyNoteLabel(midi, noteNameMode);
  };

  return (
    <div className="piano" role="img" aria-label="Piano keyboard">
      <div className="piano__keys">
        {whiteKeys.map((m) => (
          <div
            key={m}
            className={`key key--white${activeNotes.has(m) ? ' key--active' : ''}${
              heldNotes.has(m) ? ' key--held' : ''
            }`}
            style={keyStyle(
              `${(whiteIndex.get(m)! / whiteCount) * 100}%`,
              `${whiteWidth}%`,
              m,
            )}
            onClick={playMode ? undefined : () => onToggle(m)}
            onPointerDown={playMode ? () => onPlayOn(m) : undefined}
            onPointerUp={playMode ? () => onPlayOff(m) : undefined}
            onPointerLeave={playMode ? () => onPlayOff(m) : undefined}
            onPointerCancel={playMode ? () => onPlayOff(m) : undefined}
          >
            {showLabel(m) && (
              <span className={`key__label${isTonic(m) ? ' key__label--tonic' : ''}`}>
                {label(m)}
              </span>
            )}
          </div>
        ))}
        {blackKeys.map((m) => {
          const wi = whiteIndex.get(m - 1);
          if (wi == null) return null;
          return (
            <div
              key={m}
              className={`key key--black${activeNotes.has(m) ? ' key--active' : ''}${
                heldNotes.has(m) ? ' key--held' : ''
              }`}
              style={keyStyle(`${((wi + 0.7) / whiteCount) * 100}%`, `${0.6 * whiteWidth}%`, m)}
              onClick={playMode ? undefined : () => onToggle(m)}
              onPointerDown={playMode ? () => onPlayOn(m) : undefined}
              onPointerUp={playMode ? () => onPlayOff(m) : undefined}
              onPointerLeave={playMode ? () => onPlayOff(m) : undefined}
              onPointerCancel={playMode ? () => onPlayOff(m) : undefined}
            >
              {showLabel(m) && (
                <span
                  className={`key__label${
                    noteNameMode === 'both' && !scaleHighlight ? ' key__label--stack' : ''
                  }${isTonic(m) ? ' key__label--tonic' : ''}`}
                >
                  {label(m)}
                </span>
              )}
            </div>
          );
        })}
      </div>
      {showRangeIndicators && <RangeIndicators lowMidi={lowMidi} highMidi={highMidi} />}
    </div>
  );
});
