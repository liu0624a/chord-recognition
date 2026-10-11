// Persisted app settings (language / theme / note labels / visible instrument
// panels / key / degree display). The theme defaults to the OS preference on
// first run; once the user toggles it, their choice is persisted and wins.

import { useCallback, useEffect, useState } from 'react';
import { Instrument } from '../audio/synth';
import { FretNoteDisplay, NoteNameMode } from '../chords/notes';
import { DegreeDisplay } from '../chords/degree';
import { Language } from '../i18n/translations';
import { KeyAccidental, ModeId } from '../staff/keySignatures';
import { normalizeHex } from '../theme/color';

const STORAGE_KEY = 'chord-app-settings-v1';

export type Theme = 'dark' | 'light';
/** Whether tonal analysis (key signature + degrees) is active or disabled. */
export type KeyState = 'active' | 'none';

export interface AppSettings {
  language: Language;
  theme: Theme;
  noteNameMode: NoteNameMode;
  /** Visible instrument panels, top to bottom (a subset of piano/guitar/ukulele). */
  panels: Instrument[];
  /** How fretboard note names are labeled (sharps / flats / both). */
  fretNoteDisplay: FretNoteDisplay;
  /** Play mode: instruments sound on press instead of toggling selections. */
  playMode: boolean;
  /** Key State: 'active' applies the key; 'none' disables tonal analysis. */
  keyState: KeyState;
  /** The tonic's accidental: sharp (♯) / flat (♭) / natural (none). */
  keyAccidental: KeyAccidental;
  /** Root note letter index 0..6 (C..B). */
  keyRoot: number;
  /** Selected mode (Ionian … Locrian). */
  keyMode: ModeId;
  /** Chord-degree display format (roman numerals by default). */
  degreeDisplay: DegreeDisplay;
  /** Whether the staff may show 8va/8vb octave signs. */
  octaveSignsEnabled: boolean;
  /** Custom accent color as `#rrggbb`, or null to use the theme's default. */
  themeColor: string | null;
  /** Whether single-note recognition results are displayed. */
  singleNoteRecognition: boolean;
  /** Whether two-note (interval/octave) recognition results are displayed. */
  twoNoteRecognition: boolean;
  /** Whether the chord-recognition status label is displayed. */
  chordRecognitionStatus: boolean;
  /** Whether scale highlighting (in-scale/out-of-scale/tonic) is shown on the piano. */
  scaleHighlighting: boolean;
  /** Whether instrument range indicator bars are shown below the piano. */
  rangeIndicators: boolean;
}

function isNoteNameMode(v: unknown): v is NoteNameMode {
  return v === 'off' || v === 'sharp' || v === 'flat' || v === 'both' || v === 'cOnly';
}

function isFretNoteDisplay(v: unknown): v is FretNoteDisplay {
  return v === 'sharp' || v === 'flat' || v === 'both';
}

function isKeyAccidental(v: unknown): v is KeyAccidental {
  return v === 'sharp' || v === 'flat' || v === 'none';
}

function isModeId(v: unknown): v is ModeId {
  return (
    v === 'ionian' ||
    v === 'dorian' ||
    v === 'phrygian' ||
    v === 'lydian' ||
    v === 'mixolydian' ||
    v === 'aeolian' ||
    v === 'locrian'
  );
}

function isDegreeDisplay(v: unknown): v is DegreeDisplay {
  return (
    v === 'roman' ||
    v === 'romanQuality' ||
    v === 'arabicQuality' ||
    v === 'nashville' ||
    v === 'accidentalRoman' ||
    v === 'functional' ||
    v === 'functionalFull'
  );
}

function isInstrument(v: unknown): v is Instrument {
  return v === 'piano' || v === 'guitar' || v === 'ukulele';
}

/** Dedupe + filter a stored panel list, preserving order (may be empty — all
 *  panels may be hidden). */
function normalizePanels(raw: unknown): Instrument[] {
  if (!Array.isArray(raw)) return [];
  const out: Instrument[] = [];
  const seen = new Set<Instrument>();
  for (const v of raw) {
    if (isInstrument(v) && !seen.has(v)) {
      seen.add(v);
      out.push(v);
    }
  }
  return out;
}

/** Letter index 0..6 of a tonic name's first character (C..B), or null. */
function tonicLetter(tonic: string): number | null {
  const idx = 'CDEFGAB'.indexOf(tonic.charAt(0).toUpperCase());
  return idx >= 0 ? idx : null;
}

/** Accidental ('sharp' / 'flat' / 'none') of a tonic name's ♯/♭ suffix. */
function tonicAccidental(tonic: string): KeyAccidental {
  if (/[#♯]/.test(tonic)) return 'sharp';
  if (/[b♭]/.test(tonic)) return 'flat';
  return 'none';
}

/** The natural final (root letter) of a white-key church mode. */
const MODE_FINALS: Record<ModeId, number> = {
  ionian: 0,
  dorian: 1,
  phrygian: 2,
  lydian: 3,
  mixolydian: 4,
  aeolian: 5,
  locrian: 6,
};

function systemTheme(): Theme {
  if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: light)').matches) {
    return 'light';
  }
  return 'dark';
}

function load(): AppSettings {
  const fallback: AppSettings = {
    language: 'en',
    theme: systemTheme(),
    noteNameMode: 'off',
    panels: ['piano', 'guitar'],
    fretNoteDisplay: 'both',
    playMode: false,
    keyState: 'active',
    keyAccidental: 'none',
    keyRoot: 0,
    keyMode: 'ionian',
    degreeDisplay: 'roman',
    octaveSignsEnabled: true,
    themeColor: null,
    singleNoteRecognition: true,
    twoNoteRecognition: true,
    chordRecognitionStatus: false,
    scaleHighlighting: false,
    rangeIndicators: false,
  };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const p = JSON.parse(raw) as Partial<AppSettings> & {
      keyId?: string;
      showNoteNames?: boolean;
      // Legacy single-fretboard selector, migrated to `panels` below.
      fretboardType?: 'none' | 'guitar' | 'ukulele';
    };

    // Migrate the old single `keyId` ('major:C' / 'major:F#' / 'minor:Bb' /
    // 'mode:dorian') to the new root + accidental + mode model. The tonic's
    // accidental is preserved on the new `keyAccidental` field.
    let keyState = fallback.keyState;
    let keyRoot = fallback.keyRoot;
    let keyMode = fallback.keyMode;
    let keyAccidental = fallback.keyAccidental;
    if (typeof p.keyId === 'string') {
      const [family, name] = p.keyId.split(':');
      if (family === 'major' || family === 'minor') {
        const letter = tonicLetter(name ?? 'C');
        keyRoot = letter ?? 0;
        keyMode = family === 'major' ? 'ionian' : 'aeolian';
        keyAccidental = tonicAccidental(name ?? 'C');
      } else if (family === 'mode') {
        const mode = (name ?? 'ionian') as ModeId;
        if (isModeId(mode)) {
          keyMode = mode;
          keyRoot = MODE_FINALS[mode];
        }
      }
    } else {
      if (typeof p.keyState === 'string') keyState = p.keyState === 'none' ? 'none' : 'active';
      if (typeof p.keyRoot === 'number' && p.keyRoot >= 0 && p.keyRoot <= 6) keyRoot = p.keyRoot;
      if (isModeId(p.keyMode)) keyMode = p.keyMode;
      if (isKeyAccidental(p.keyAccidental)) keyAccidental = p.keyAccidental;
    }

    return {
      language: p.language === 'zh' ? 'zh' : 'en',
      theme: p.theme === 'light' || p.theme === 'dark' ? p.theme : fallback.theme,
      // Migrate the old "show note names" toggle to the new 4-way mode: showing
      // names defaults to sharps.
      noteNameMode: isNoteNameMode(p.noteNameMode)
        ? p.noteNameMode
        : p.showNoteNames === true
          ? 'sharp'
          : fallback.noteNameMode,
      // Migrate the old single `fretboardType` ('none' / 'guitar' / 'ukulele') to
      // the new ordered `panels` list (piano was always visible before).
      panels: Array.isArray(p.panels)
        ? normalizePanels(p.panels)
        : p.fretboardType === 'ukulele'
          ? ['piano', 'ukulele']
          : p.fretboardType === 'none'
            ? ['piano']
            : fallback.panels,
      fretNoteDisplay: isFretNoteDisplay(p.fretNoteDisplay) ? p.fretNoteDisplay : fallback.fretNoteDisplay,
      playMode: p.playMode === true,
      keyState,
      keyAccidental,
      keyRoot,
      keyMode,
      degreeDisplay: isDegreeDisplay(p.degreeDisplay) ? p.degreeDisplay : fallback.degreeDisplay,
      octaveSignsEnabled: p.octaveSignsEnabled !== false,
      themeColor: typeof p.themeColor === 'string' ? normalizeHex(p.themeColor) : null,
      singleNoteRecognition: p.singleNoteRecognition !== false,
      twoNoteRecognition: p.twoNoteRecognition !== false,
      chordRecognitionStatus: p.chordRecognitionStatus === true,
      scaleHighlighting: p.scaleHighlighting === true,
      rangeIndicators: p.rangeIndicators === true,
    };
  } catch {
    return fallback;
  }
}

export function useAppSettings() {
  const [settings, setSettings] = useState<AppSettings>(() => load());

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // Ignore storage failures (e.g. private mode); settings just won't persist.
    }
  }, [settings]);

  const setLanguage = useCallback((language: Language) => {
    setSettings((s) => ({ ...s, language }));
  }, []);

  const setTheme = useCallback((theme: Theme) => {
    setSettings((s) => ({ ...s, theme }));
  }, []);

  const toggleTheme = useCallback(() => {
    setSettings((s) => ({ ...s, theme: s.theme === 'dark' ? 'light' : 'dark' }));
  }, []);

  const setNoteNameMode = useCallback((noteNameMode: NoteNameMode) => {
    setSettings((s) => ({ ...s, noteNameMode }));
  }, []);

  const setPanels = useCallback((panels: Instrument[]) => {
    setSettings((s) => ({ ...s, panels }));
  }, []);

  const setFretNoteDisplay = useCallback((fretNoteDisplay: FretNoteDisplay) => {
    setSettings((s) => ({ ...s, fretNoteDisplay }));
  }, []);

  const setPlayMode = useCallback((playMode: boolean) => {
    setSettings((s) => ({ ...s, playMode }));
  }, []);

  const setKeyState = useCallback((keyState: KeyState) => {
    setSettings((s) => ({ ...s, keyState }));
  }, []);

  const setKeyAccidental = useCallback((keyAccidental: KeyAccidental) => {
    setSettings((s) => ({ ...s, keyAccidental }));
  }, []);

  const setKeyRoot = useCallback((keyRoot: number) => {
    setSettings((s) => ({ ...s, keyRoot }));
  }, []);

  const setKeyMode = useCallback((keyMode: ModeId) => {
    setSettings((s) => ({ ...s, keyMode }));
  }, []);

  const setDegreeDisplay = useCallback((degreeDisplay: DegreeDisplay) => {
    setSettings((s) => ({ ...s, degreeDisplay }));
  }, []);

  const setOctaveSignsEnabled = useCallback((octaveSignsEnabled: boolean) => {
    setSettings((s) => ({ ...s, octaveSignsEnabled }));
  }, []);

  const setThemeColor = useCallback((themeColor: string | null) => {
    setSettings((s) => ({ ...s, themeColor }));
  }, []);

  const setSingleNoteRecognition = useCallback((singleNoteRecognition: boolean) => {
    setSettings((s) => ({ ...s, singleNoteRecognition }));
  }, []);

  const setTwoNoteRecognition = useCallback((twoNoteRecognition: boolean) => {
    setSettings((s) => ({ ...s, twoNoteRecognition }));
  }, []);

  const setChordRecognitionStatus = useCallback((chordRecognitionStatus: boolean) => {
    setSettings((s) => ({ ...s, chordRecognitionStatus }));
  }, []);

  const setScaleHighlighting = useCallback((scaleHighlighting: boolean) => {
    setSettings((s) => ({ ...s, scaleHighlighting }));
  }, []);

  const setRangeIndicators = useCallback((rangeIndicators: boolean) => {
    setSettings((s) => ({ ...s, rangeIndicators }));
  }, []);

  return {
    ...settings,
    setLanguage,
    setTheme,
    toggleTheme,
    setNoteNameMode,
    setPanels,
    setFretNoteDisplay,
    setPlayMode,
    setKeyState,
    setKeyAccidental,
    setKeyRoot,
    setKeyMode,
    setDegreeDisplay,
    setOctaveSignsEnabled,
    setThemeColor,
    setSingleNoteRecognition,
    setTwoNoteRecognition,
    setChordRecognitionStatus,
    setScaleHighlighting,
    setRangeIndicators,
  };
}
