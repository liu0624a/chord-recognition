// Guitar / ukulele fretboard drawn as geometric SVG (strings, frets, and their
// intersections) — no native button chrome. Each intersection is an independent
// hit target; selecting one toggles its pitch in the shared selection (a "×"
// marks every position of that pitch, here and on the other instruments), and
// deselecting removes it. In play mode, positions play momentarily instead
// (press = note on, release = off). A floating note-name tooltip follows the
// pointer with no delay.

import { useMemo, useState } from 'react';
import { GUITAR_FRET_COUNT, UKULELE_FRET_COUNT, fretboardPositions } from '../instruments/fretboard';
import { fretNoteLabel } from '../chords/notes';
import { useSettings } from '../state/SettingsContext';

// Geometry (pixels).
const LABEL_W = 44; // room for open-string note names
const FRET_SPACING = 44;
const STRING_SPACING = 30;
const TOP = 40; // headroom for fret numbers + tooltip
const BOTTOM = 14;
const HIT_R = 20; // touch-target radius
const MARK = 7; // half-length of the "×" strokes
const DOT_R = 4; // inlay-dot radius

// Standard fretboard inlay dots, placed in the middle of the space *between* the
// neighbouring fret wires. The guitar doubles its dots at the 12th and 24th
// frets; the ukulele doubles only at the 12th.
const GUITAR_INLAYS: readonly number[] = [3, 5, 7, 9, 12, 15, 17, 19, 21, 24];
const UKULELE_INLAYS: readonly number[] = [5, 7, 10, 12, 15];
const DOUBLE_INLAYS: Record<'guitar' | 'ukulele', ReadonlySet<number>> = {
  guitar: new Set([12, 24]),
  ukulele: new Set([12]),
};

interface Hover {
  x: number;
  y: number;
  name: string;
}

interface Props {
  source: 'guitar' | 'ukulele';
  tuning: readonly number[];
  /** MIDI notes currently sounding (selected or played): every matching position shows a "×". */
  markedMidis: Set<number>;
  onToggle: (midi: number) => void;
  /** When true, positions play momentarily (press/release) instead of toggling. */
  playMode: boolean;
  /** Note-on for a play-mode press. */
  onPlayOn: (midi: number) => void;
  /** Note-off for a play-mode release. */
  onPlayOff: (midi: number) => void;
  ariaLabel: string;
}

export function Fretboard({
  source,
  tuning,
  markedMidis,
  onToggle,
  playMode,
  onPlayOn,
  onPlayOff,
  ariaLabel,
}: Props) {
  const frets = source === 'guitar' ? GUITAR_FRET_COUNT : UKULELE_FRET_COUNT;
  const positions = useMemo(() => fretboardPositions(tuning, frets), [tuning, frets]);
  const [hover, setHover] = useState<Hover | null>(null);
  const { fretNoteDisplay } = useSettings();

  const x0 = LABEL_W;
  const xLine = (fret: number) => x0 + fret * FRET_SPACING;
  const xCenter = (fret: number) => x0 + (fret + 0.5) * FRET_SPACING;

  const stringCount = tuning.length;
  // Strings run in standard order from the bottom of the screen upward: string 0
  // (guitar low E / 6th string, ukulele G / 4th string) is at the bottom, and the
  // highest-pitched string is at the top.
  const y = (string: number) => TOP + (stringCount - 1 - string) * STRING_SPACING;

  const width = xLine(frets) + FRET_SPACING + 6;
  const height = TOP + (stringCount - 1) * STRING_SPACING + BOTTOM;

  return (
    <div className="fretboard" role="group" aria-label={ariaLabel}>
      <div className="fretboard__inner">
        <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMinYMin meet">
          {/* Fret numbers (0 = open string, then 1..N centered in each fret region) */}
          {Array.from({ length: frets + 1 }, (_, i) => (
            <text
              key={`num-${i}`}
              x={xLine(i - 0) + FRET_SPACING / 2}
              y={TOP - 14}
              className="fretboard__fretnum"
            >
              {i}
            </text>
          ))}

          {/* Open-string note names */}
          {tuning.map((midi, string) => (
            <text key={`label-${string}`} x={LABEL_W - 8} y={y(string) + 4} className="fretboard__label">
              {fretNoteLabel(midi, fretNoteDisplay)}
            </text>
          ))}

          {/* Inlay dots, centered in the space between adjacent fret wires */}
          {(source === 'guitar' ? GUITAR_INLAYS : UKULELE_INLAYS).map((fret) => {
            const x = xLine(fret) - FRET_SPACING / 2;
            const middle = TOP + ((stringCount - 1) * STRING_SPACING) / 2;
            const ys = DOUBLE_INLAYS[source].has(fret)
              ? [middle - STRING_SPACING, middle + STRING_SPACING]
              : [middle];
            return (
              <g key={`inlay-${fret}`}>
                {ys.map((cy, i) => (
                  <circle key={i} cx={x} cy={cy} r={DOT_R} className="fretboard__dot" />
                ))}
              </g>
            );
          })}

          {/* Strings */}
          {tuning.map((_, string) => (
            <line
              key={`string-${string}`}
              x1={x0}
              x2={width - 6}
              y1={y(string)}
              y2={y(string)}
              className="fretboard__string"
            />
          ))}

          {/* Frets (the nut is drawn at fret 1, thicker; the rest are ordinary wires) */}
          {Array.from({ length: frets }, (_, i) => {
            const fret = i + 1;
            return (
              <line
                key={`fret-${fret}`}
                x1={xLine(fret)}
                x2={xLine(fret)}
                y1={y(0)}
                y2={y(stringCount - 1)}
                className={fret === 1 ? 'fretboard__fret fretboard__nut' : 'fretboard__fret'}
              />
            );
          })}

          {/* Intersection hit targets + "×" markers */}
          {positions.map((p) => {
            const cx = xCenter(p.fret);
            const cy = y(p.string);
            const active = markedMidis.has(p.midi);
            const name = fretNoteLabel(p.midi, fretNoteDisplay);
            return (
              <g
                key={`${p.string}:${p.fret}`}
                className="fretboard__point"
                role="button"
                tabIndex={0}
                aria-label={name}
                aria-pressed={active}
                onClick={playMode ? undefined : () => onToggle(p.midi)}
                onPointerDown={playMode ? () => onPlayOn(p.midi) : undefined}
                onPointerUp={playMode ? () => onPlayOff(p.midi) : undefined}
                onPointerCancel={playMode ? () => onPlayOff(p.midi) : undefined}
                onPointerEnter={() => setHover({ x: cx, y: cy, name })}
                onPointerLeave={() => {
                  setHover(null);
                  if (playMode) onPlayOff(p.midi);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    if (playMode) onPlayOn(p.midi);
                    else onToggle(p.midi);
                  }
                }}
                onKeyUp={
                  playMode
                    ? (e) => {
                        if (e.key === 'Enter' || e.key === ' ') onPlayOff(p.midi);
                      }
                    : undefined
                }
              >
                <circle cx={cx} cy={cy} r={HIT_R} className="fretboard__hit" />
                {active && (
                  <g className="fretboard__mark">
                    <line x1={cx - MARK} y1={cy - MARK} x2={cx + MARK} y2={cy + MARK} />
                    <line x1={cx - MARK} y1={cy + MARK} x2={cx + MARK} y2={cy - MARK} />
                  </g>
                )}
              </g>
            );
          })}
        </svg>
        {hover && (
          <div
            className="fretboard__tooltip"
            style={{
              left: `${(hover.x / width) * 100}%`,
              top: `${(hover.y / height) * 100}%`,
            }}
          >
            {hover.name}
          </div>
        )}
      </div>
    </div>
  );
}
