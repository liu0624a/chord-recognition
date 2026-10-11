// Top toolbar: title, instrument buttons (single click = timbre, double click =
// show/hide that panel), MIDI connection, theme toggle, and the settings gear.
// Instrument selection changes the sound only; panel visibility changes what is
// shown below, never the sound, selection, or recognition.

import { useCallback, useRef, type MouseEvent as ReactMouseEvent, type ReactNode } from 'react';
import { Instrument } from '../audio/synth';
import { useSettings } from '../state/SettingsContext';
import { IconButton } from './IconButton';
import { IconGear, IconGuitar, IconMoon, IconPiano, IconPlay, IconSun, IconUkulele } from './icons';
import { MidiPanel } from './MidiPanel';

interface Props {
  settingsOpen: boolean;
  onToggleSettings: () => void;
  onTogglePlayMode: () => void;
  onNoteOn: (midi: number, velocity: number) => void;
  onNoteOff: (midi: number) => void;
  onAllNotesOff: () => void;
  onControl: (controller: number, value: number) => void;
  onEnabled: () => void;
}

export function Toolbar({
  settingsOpen,
  onToggleSettings,
  onTogglePlayMode,
  onNoteOn,
  onNoteOff,
  onAllNotesOff,
  onControl,
  onEnabled,
}: Props) {
  const { instrument, setInstrument, panels, setPanels, theme, toggleTheme, playMode, t } =
    useSettings();

  // The timbre in effect before the first click of a double-click gesture, so a
  // double-click can undo the single-click timbre switch it would otherwise cause.
  const timbreBeforeRef = useRef<Instrument | null>(null);

  const handleInstrumentClick = useCallback(
    (id: Instrument, e: ReactMouseEvent<HTMLButtonElement>) => {
      // Only the first click of a (potential) double-click switches the timbre.
      // `detail` is 0 for keyboard activation and 1 for the first mouse click;
      // repeat clicks (detail >= 2) are left to the double-click handler.
      if (e.detail <= 1) {
        timbreBeforeRef.current = instrument;
        setInstrument(id);
      }
    },
    [instrument, setInstrument],
  );

  const handleInstrumentDoubleClick = useCallback(
    (id: Instrument) => {
      // Undo the timbre switch the double-click's first click made.
      if (timbreBeforeRef.current != null) {
        setInstrument(timbreBeforeRef.current);
        timbreBeforeRef.current = null;
      }
      // Toggle the panel: hidden panels are appended to the bottom; shown panels
      // are removed (the remaining panels keep their order).
      if (panels.includes(id)) setPanels(panels.filter((p) => p !== id));
      else setPanels([...panels, id]);
    },
    [setInstrument, panels, setPanels],
  );

  const renderInstrument = (id: Instrument, label: string, icon: ReactNode) => (
    <IconButton
      label={label}
      aria-pressed={instrument === id}
      data-instrument=""
      onClick={(e) => handleInstrumentClick(id, e)}
      onDoubleClick={() => handleInstrumentDoubleClick(id)}
    >
      {icon}
      {instrument === id && <span className="instrument-ring instrument-ring--timbre" />}
      {panels.includes(id) && <span className="instrument-ring instrument-ring--panel" />}
    </IconButton>
  );

  return (
    <header className="toolbar">
      <h1 className="toolbar__title">{t('app.title')}</h1>

      <div className="toolbar__instruments" role="group" aria-label={t('settings.instrument')}>
        {renderInstrument('piano', t('toolbar.piano'), <IconPiano />)}
        {renderInstrument('guitar', t('toolbar.guitar'), <IconGuitar />)}
        {renderInstrument('ukulele', t('toolbar.ukulele'), <IconUkulele />)}
      </div>

      <MidiPanel
        onNoteOn={onNoteOn}
        onNoteOff={onNoteOff}
        onAllNotesOff={onAllNotesOff}
        onControl={onControl}
        onEnabled={onEnabled}
      />

      <div className="toolbar__actions">
        <IconButton label={t('toolbar.playMode')} active={playMode} onClick={onTogglePlayMode}>
          <IconPlay />
        </IconButton>
        <IconButton
          label={theme === 'dark' ? t('toolbar.themeToLight') : t('toolbar.themeToDark')}
          onClick={toggleTheme}
        >
          {theme === 'dark' ? <IconSun /> : <IconMoon />}
        </IconButton>
        <IconButton label={t('toolbar.settings')} active={settingsOpen} onClick={onToggleSettings}>
          <IconGear />
        </IconButton>
      </div>
    </header>
  );
}
