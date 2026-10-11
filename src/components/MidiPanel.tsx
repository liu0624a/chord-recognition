import { useCallback, useEffect, useRef, useState } from 'react';
import { MidiController, midiSupported, parseMidiMessage, MidiDeviceInfo } from '../midi/midiInput';
import { useSettings } from '../state/SettingsContext';

interface Props {
  onNoteOn: (midi: number, velocity: number) => void;
  onNoteOff: (midi: number) => void;
  onAllNotesOff: () => void;
  onControl: (controller: number, value: number) => void;
  /** Called within the "Enable MIDI" click so the audio context can resume. */
  onEnabled: () => void;
}

export function MidiPanel({ onNoteOn, onNoteOff, onAllNotesOff, onControl, onEnabled }: Props) {
  const { t } = useSettings();
  const controllerRef = useRef<MidiController | null>(null);
  const selectedIdRef = useRef<string | null>(null);
  const lastListKeyRef = useRef<string>('');
  const callbacksRef = useRef({ onNoteOn, onNoteOff, onAllNotesOff, onControl });
  callbacksRef.current = { onNoteOn, onNoteOff, onAllNotesOff, onControl };

  const [supported] = useState(() => midiSupported());
  const [enabled, setEnabled] = useState(false);
  const [devices, setDevices] = useState<MidiDeviceInfo[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'requesting' | 'ready' | 'error'>('idle');
  const [error, setError] = useState(false);

  const select = useCallback((id: string | null) => {
    selectedIdRef.current = id;
    setSelectedId(id);
    controllerRef.current?.selectInput(id);
  }, []);

  const refreshDevices = useCallback(() => {
    const controller = controllerRef.current;
    if (!controller || !controller.hasAccess) return;
    const list = controller.listInputs();
    const current = selectedIdRef.current;

    const listKey = list.map((d) => d.id).join(',');
    const stillValid = current != null && list.some((d) => d.id === current);
    // No change worth acting on: same list, and the selection is still present
    // (or there is nothing to select anyway).
    if (listKey === lastListKeyRef.current && (stillValid || list.length === 0)) return;

    lastListKeyRef.current = listKey;
    setDevices(list);
    if (stillValid) return;

    // The selected device is gone (or none was selected yet): clear held notes
    // and fall back to the first available device, if any.
    if (current != null) callbacksRef.current.onAllNotesOff();
    if (list.length > 0) select(list[0].id);
    else select(null);
  }, [select]);

  const enable = useCallback(async () => {
    onEnabled(); // create/resume the audio context within the click gesture
    const controller = new MidiController();
    controllerRef.current = controller;
    setStatus('requesting');
    setError(false);
    try {
      await controller.requestAccess();
      controller.onMessage((data) => {
        const ev = parseMidiMessage(data);
        if (!ev) return;
        const cb = callbacksRef.current;
        if (ev.type === 'on') cb.onNoteOn(ev.note, ev.velocity);
        else if (ev.type === 'off') cb.onNoteOff(ev.note);
        else if (ev.type === 'control') cb.onControl(ev.controller, ev.value);
        else cb.onAllNotesOff();
      });
      controller.onStateChange(refreshDevices);
      setEnabled(true);
      setStatus('ready');
      refreshDevices();
    } catch (err) {
      console.error('MIDI access failed:', err);
      controllerRef.current = null;
      setStatus('error');
      setError(true);
    }
  }, [onEnabled, refreshDevices]);

  // Re-scan when the tab regains focus (devices are often plugged in while away).
  useEffect(() => {
    if (!enabled) return;
    const onFocus = () => refreshDevices();
    const onVisibility = () => {
      if (!document.hidden) refreshDevices();
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [enabled, refreshDevices]);

  // Poll gently while no device is connected, as a fallback for browsers whose
  // `statechange` events don't fire reliably for hot-plugged devices.
  useEffect(() => {
    if (!enabled || devices.length > 0) return;
    const timer = setInterval(refreshDevices, 2000);
    return () => clearInterval(timer);
  }, [enabled, devices.length, refreshDevices]);

  useEffect(() => {
    return () => controllerRef.current?.dispose();
  }, []);

  if (!supported) {
    return <span className="midi__error">{t('midi.unsupported')}</span>;
  }

  if (!enabled) {
    return (
      <button className="btn btn--primary" onClick={enable} disabled={status === 'requesting'}>
        {status === 'requesting' ? t('midi.requesting') : t('midi.enable')}
      </button>
    );
  }

  return (
    <div className="midi">
      {error && <span className="midi__error">{t('midi.accessError')}</span>}
      {devices.length === 0 ? (
        <>
          <span className="midi__status">{t('midi.noDevices')}</span>
          <button className="btn btn--ghost" onClick={refreshDevices}>
            {t('midi.rescan')}
          </button>
        </>
      ) : (
        <>
          <label>
            {t('midi.inputDevice')}：
            <select value={selectedId ?? ''} onChange={(e) => select(e.target.value || null)}>
              {devices.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </label>
          <span className="midi__status">
            {t('midi.connected')}: {devices.find((d) => d.id === selectedId)?.name}
          </span>
        </>
      )}
    </div>
  );
}
