// App-wide settings context: language, theme, note labels, fretboard type,
// instrument (timbre), and notation preferences. The single structural addition
// that avoids threading `t` / theme / toggles through every component.

import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { Instrument } from '../audio/synth';
import { ChordGroup, ChordTypeId } from '../chords/chordTypes';
import { DegreeDisplay } from '../chords/degree';
import { FretNoteDisplay, NoteNameMode } from '../chords/notes';
import { SuffixMap } from '../chords/notation';
import {
  chordGroupName,
  chordTypeName,
  Language,
  MessageKey,
  notationPresetName,
  translate,
} from '../i18n/translations';
import { KeyAccidental, ModeId } from '../staff/keySignatures';
import { applyAccent } from '../theme/color';
import { AppSettings, KeyState, Theme, useAppSettings } from './useAppSettings';
import { useNotationSettings } from './useNotationSettings';

export interface SettingsContextValue extends AppSettings {
  setLanguage(language: Language): void;
  setTheme(theme: Theme): void;
  toggleTheme(): void;
  setNoteNameMode(mode: NoteNameMode): void;
  setPanels(panels: Instrument[]): void;
  setFretNoteDisplay(display: FretNoteDisplay): void;
  setPlayMode(playMode: boolean): void;
  setKeyState(state: KeyState): void;
  setKeyAccidental(accidental: KeyAccidental): void;
  setKeyRoot(root: number): void;
  setKeyMode(mode: ModeId): void;
  setDegreeDisplay(display: DegreeDisplay): void;
  setOctaveSignsEnabled(enabled: boolean): void;
  setThemeColor(themeColor: string | null): void;
  setSingleNoteRecognition(enabled: boolean): void;
  setTwoNoteRecognition(enabled: boolean): void;
  setChordRecognitionStatus(enabled: boolean): void;
  setScaleHighlighting(enabled: boolean): void;
  setRangeIndicators(enabled: boolean): void;
  instrument: Instrument;
  setInstrument(instrument: Instrument): void;
  suffixes: SuffixMap;
  presetId: string;
  applyPreset(id: string): void;
  setSuffix(id: ChordTypeId, suffix: string): void;
  resetNotation(): void;
  t(key: MessageKey, params?: Record<string, string | number>): string;
  typeName(id: ChordTypeId): string;
  groupName(group: ChordGroup): string;
  presetLabel(id: string): string;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const app = useAppSettings();
  const notation = useNotationSettings();
  const [instrument, setInstrument] = useState<Instrument>('piano');

  useEffect(() => {
    document.documentElement.dataset.theme = app.theme;
  }, [app.theme]);

  useEffect(() => {
    applyAccent(app.themeColor, app.theme);
  }, [app.themeColor, app.theme]);

  useEffect(() => {
    document.documentElement.lang = app.language === 'zh' ? 'zh-CN' : 'en';
  }, [app.language]);

  const value = useMemo<SettingsContextValue>(
    () => ({
      ...app,
      instrument,
      setInstrument,
      suffixes: notation.suffixes,
      presetId: notation.presetId,
      applyPreset: notation.applyPreset,
      setSuffix: notation.setSuffix,
      resetNotation: notation.reset,
      t: (key, params) => translate(app.language, key, params),
      typeName: (id) => chordTypeName(app.language, id),
      groupName: (group) => chordGroupName(app.language, group),
      presetLabel: (id) => notationPresetName(app.language, id),
    }),
    [app, instrument, notation],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within a SettingsProvider');
  return ctx;
}
