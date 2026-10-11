// On-screen pedal controls (sustain / sostenuto / soft). These drive the same
// state as MIDI CC64/66/67, so audio, staff marks, and MIDI stay in sync.

import { useSettings } from '../state/SettingsContext';

interface Props {
  sustain: boolean;
  sostenuto: boolean;
  soft: boolean;
  onSustain: (down: boolean) => void;
  onSostenuto: (down: boolean) => void;
  onSoft: (down: boolean) => void;
}

export function PedalBar({ sustain, sostenuto, soft, onSustain, onSostenuto, onSoft }: Props) {
  const { t } = useSettings();

  const buttons = [
    { label: t('pedal.soft'), active: soft, onToggle: onSoft },
    { label: t('pedal.sostenuto'), active: sostenuto, onToggle: onSostenuto },
    { label: t('pedal.sustain'), active: sustain, onToggle: onSustain },
  ];

  return (
    <div className="pedalbar" role="group" aria-label="Pedals">
      {buttons.map((b) => (
        <button
          key={b.label}
          type="button"
          className="pedal-btn"
          aria-pressed={b.active}
          onClick={() => b.onToggle(!b.active)}
        >
          {b.label}
        </button>
      ))}
    </div>
  );
}
