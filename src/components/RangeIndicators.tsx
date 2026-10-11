// Instrument range indicator bars, rendered directly below the piano. Two thin,
// minimal lines show the fixed playable ranges of the guitar (E2–E6) and ukulele
// (C4–E♭6) — independent of tuning, fret count, or which instrument panels are
// visible. Each bar spans from the left edge of its lowest key to the right edge
// of its highest key, using the same percentage key geometry as the keyboard, so
// it stays aligned as the piano resizes. Purely visual — no input or audio.

import { useMemo } from 'react';
import type { MessageKey } from '../i18n/translations';
import { useSettings } from '../state/SettingsContext';
import { keyEdges, PIANO_HIGH_MIDI, PIANO_LOW_MIDI, pianoGeometry } from './pianoGeometry';

/** Fixed instrument ranges (inclusive MIDI endpoints). */
const RANGES = [
  { id: 'guitar', start: 40, end: 88 }, // E2–E6
  { id: 'ukulele', start: 60, end: 87 }, // C4–E♭6
] as const;

const RANGE_LABELS: Record<(typeof RANGES)[number]['id'], MessageKey> = {
  guitar: 'toolbar.guitar',
  ukulele: 'toolbar.ukulele',
};

export function RangeIndicators({
  lowMidi = PIANO_LOW_MIDI,
  highMidi = PIANO_HIGH_MIDI,
}: {
  lowMidi?: number;
  highMidi?: number;
}) {
  const { t } = useSettings();

  // Each bar's left/width as a % of the piano width, clipped to the visible
  // range. Bars whose range lies entirely outside the visible keys are dropped.
  const bars = useMemo(() => {
    const geometry = pianoGeometry(lowMidi, highMidi);
    const out: { id: 'guitar' | 'ukulele'; left: number; width: number }[] = [];
    for (const range of RANGES) {
      const start = keyEdges(geometry, range.start);
      const end = keyEdges(geometry, range.end);
      if (!start || !end) continue;
      const left = Math.max(0, start.left);
      const right = Math.min(100, end.right);
      if (right > left) out.push({ id: range.id, left, width: right - left });
    }
    return out;
  }, [lowMidi, highMidi]);

  return (
    <div className="range-indicators" aria-hidden="true">
      {bars.map((bar) => (
        <div key={bar.id} className="range" data-range={bar.id}>
          <span className="range__label">{t(RANGE_LABELS[bar.id])}</span>
          <span className="range__track">
            <span className="range__bar" style={{ left: `${bar.left}%`, width: `${bar.width}%` }} />
          </span>
        </div>
      ))}
    </div>
  );
}
