// Settings panel: language, note labels, key (state / accidental / root / mode),
// chord-degree display, chord-notation preferences, recognition toggles, and the
// theme accent color. Instrument timbre, instrument panels, and the theme itself
// are set from the toolbar, not here. All labels are translated.

import { useEffect, useState } from 'react';
import { CHORD_TYPES, ChordGroup } from '../chords/chordTypes';
import { DegreeDisplay, formatDiatonicTemplate } from '../chords/degree';
import { FretNoteDisplay, NoteNameMode } from '../chords/notes';
import { NOTATION_PRESETS } from '../chords/notation';
import { keyDisplayName, MessageKey, modeDisplayName } from '../i18n/translations';
import { KeyAccidental, ModeId, MODE_ORDER, ROOT_LETTERS } from '../staff/keySignatures';
import { useSettings } from '../state/SettingsContext';
import { DEFAULT_ACCENT, hexToRgb, normalizeHex, rgbToHex } from '../theme/color';

const GROUPS: ChordGroup[] = ['triad', 'seventh', 'extended', 'altered'];

const DEGREE_DISPLAYS: DegreeDisplay[] = [
  'roman',
  'romanQuality',
  'arabicQuality',
  'nashville',
  'accidentalRoman',
  'functionalFull',
  'functional',
];

/** A short illustrative example for each display mode, shown under the dropdown.
 *  Documentation only — the live degree output is generated from the active key. */
const DEGREE_EXAMPLES: Record<DegreeDisplay, string> = {
  roman: 'I – ii – V – vi',
  romanQuality: 'I – ii – V⁷ – vi',
  arabicQuality: '1 – 2m – 5⁷ – 6m',
  nashville: '1 – 4 – 5 – 6m',
  accidentalRoman: '♭VII – I',
  functionalFull: 'Tonic – Subdominant – Dominant',
  functional: 'T – S – D',
};

export function SettingsPanel({ onClose }: { onClose: () => void }) {
  const {
    t,
    language,
    setLanguage,
    theme,
    noteNameMode,
    setNoteNameMode,
    fretNoteDisplay,
    setFretNoteDisplay,
    keyState,
    setKeyState,
    keyAccidental,
    setKeyAccidental,
    keyRoot,
    setKeyRoot,
    keyMode,
    setKeyMode,
    degreeDisplay,
    setDegreeDisplay,
    themeColor,
    setThemeColor,
    singleNoteRecognition,
    setSingleNoteRecognition,
    twoNoteRecognition,
    setTwoNoteRecognition,
    chordRecognitionStatus,
    setChordRecognitionStatus,
    scaleHighlighting,
    setScaleHighlighting,
    rangeIndicators,
    setRangeIndicators,
    suffixes,
    presetId,
    applyPreset,
    setSuffix,
    resetNotation,
    typeName,
    groupName,
    presetLabel,
  } = useSettings();

  // The 7 diatonic triads of the current key, in the selected display format.
  const template =
    keyState === 'active'
      ? formatDiatonicTemplate({ root: keyRoot, mode: keyMode, accidental: keyAccidental }, degreeDisplay)
      : [];

  // The accent color currently shown in the UI: the custom color when set,
  // otherwise the active theme's built-in accent.
  const effectiveHex = themeColor ?? DEFAULT_ACCENT[theme];
  const rgb = hexToRgb(effectiveHex) ?? { r: 0, g: 0, b: 0 };
  const [hexText, setHexText] = useState(effectiveHex);
  useEffect(() => {
    setHexText(effectiveHex);
  }, [effectiveHex]);

  const onChannel = (channel: 'r' | 'g' | 'b', raw: string) => {
    const n = Number.parseInt(raw, 10);
    if (Number.isNaN(n)) return;
    const next = { ...rgb, [channel]: Math.max(0, Math.min(255, n)) };
    setThemeColor(rgbToHex(next.r, next.g, next.b));
  };

  return (
    <div className="settings">
      <div className="settings__header">
        <h2>{t('settings.title')}</h2>
        <button className="btn btn--ghost" onClick={onClose}>
          {t('settings.close')}
        </button>
      </div>

      <div className="settings__section">
        <div className="settings__grid">
          <div className="settings__field">
            <label>{t('settings.language')}</label>
            <select value={language} onChange={(e) => setLanguage(e.target.value as 'en' | 'zh')}>
              <option value="en">{t('settings.languageEnglish')}</option>
              <option value="zh">{t('settings.languageChinese')}</option>
            </select>
          </div>

          <div className="settings__field">
            <label>{t('settings.fretNoteDisplay')}</label>
            <select
              value={fretNoteDisplay}
              onChange={(e) => setFretNoteDisplay(e.target.value as FretNoteDisplay)}
            >
              <option value="sharp">{t('settings.fretNoteSharp')}</option>
              <option value="flat">{t('settings.fretNoteFlat')}</option>
              <option value="both">{t('settings.fretNoteBoth')}</option>
            </select>
          </div>

          <div className="settings__field">
            <label>{t('settings.noteNames')}</label>
            <select
              value={noteNameMode}
              onChange={(e) => setNoteNameMode(e.target.value as NoteNameMode)}
            >
              <option value="off">{t('settings.noteNamesOff')}</option>
              <option value="sharp">{t('settings.noteNamesSharp')}</option>
              <option value="flat">{t('settings.noteNamesFlat')}</option>
              <option value="both">{t('settings.noteNamesBoth')}</option>
              <option value="cOnly">{t('settings.noteNamesCOnly')}</option>
            </select>
          </div>

        </div>
      </div>

      <div className="settings__section">
        <h3>{t('settings.themeColor')}</h3>
        <div className="theme-color">
          <input
            type="color"
            className="theme-color__swatch"
            value={effectiveHex}
            onChange={(e) => setThemeColor(normalizeHex(e.target.value))}
            aria-label={t('settings.themeColor')}
          />
          <div className="theme-color__fields">
            <div className="theme-color__rgb">
              <label htmlFor="theme-color-r">R</label>
              <input
                id="theme-color-r"
                type="number"
                min={0}
                max={255}
                value={rgb.r}
                onChange={(e) => onChannel('r', e.target.value)}
              />
              <label htmlFor="theme-color-g">G</label>
              <input
                id="theme-color-g"
                type="number"
                min={0}
                max={255}
                value={rgb.g}
                onChange={(e) => onChannel('g', e.target.value)}
              />
              <label htmlFor="theme-color-b">B</label>
              <input
                id="theme-color-b"
                type="number"
                min={0}
                max={255}
                value={rgb.b}
                onChange={(e) => onChannel('b', e.target.value)}
              />
            </div>
            <div className="theme-color__hex">
              <label htmlFor="theme-color-hex">HEX</label>
              <input
                id="theme-color-hex"
                type="text"
                value={hexText}
                spellCheck={false}
                onChange={(e) => {
                  const raw = e.target.value;
                  setHexText(raw);
                  const n = normalizeHex(raw);
                  if (n) setThemeColor(n);
                }}
                onBlur={() => setHexText(effectiveHex)}
              />
            </div>
          </div>
          <button type="button" className="btn btn--ghost" onClick={() => setThemeColor(null)}>
            {t('settings.themeColorReset')}
          </button>
        </div>
      </div>

      <div className="settings__section">
        <h3>{t('settings.keySignature')}</h3>
        <div className="key-controls">
          <div className="key-control">
            <label>{t('settings.keyState')}</label>
            <button
              type="button"
              className={`key-state${keyState === 'active' ? ' key-state--active' : ''}`}
              aria-pressed={keyState === 'active'}
              onClick={() => setKeyState(keyState === 'active' ? 'none' : 'active')}
            >
              {t(keyState === 'active' ? 'settings.keyStateActive' : 'settings.keyStateNone')}
            </button>
          </div>

          <div className="key-control">
            <label>{t('settings.accidental')}</label>
            <select
              value={keyAccidental}
              onChange={(e) => setKeyAccidental(e.target.value as KeyAccidental)}
            >
              <option value="sharp">{t('settings.accidentalSharp')}</option>
              <option value="flat">{t('settings.accidentalFlat')}</option>
              <option value="none">{t('settings.accidentalNone')}</option>
            </select>
          </div>

          <div className="key-control">
            <label>{t('settings.rootNote')}</label>
            <select value={keyRoot} onChange={(e) => setKeyRoot(Number(e.target.value))}>
              {ROOT_LETTERS.map((letter, i) => (
                <option key={letter} value={i}>
                  {letter}
                </option>
              ))}
            </select>
          </div>

          <div className="key-control">
            <label>{t('settings.mode')}</label>
            <select value={keyMode} onChange={(e) => setKeyMode(e.target.value as ModeId)}>
              {MODE_ORDER.map((m) => (
                <option key={m} value={m}>
                  {modeDisplayName(language, m)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="key-summary">
          {keyState === 'active'
            ? `${t('settings.currentKey')}: ${keyDisplayName(language, keyRoot, keyMode, keyAccidental)} · ${template.join(' – ')}`
            : t('settings.currentKeyNone')}
        </div>
      </div>

      <div className="settings__section">
        <h3>{t('settings.degreeDisplay')}</h3>
        <div className="settings__field">
          <select
            value={degreeDisplay}
            onChange={(e) => setDegreeDisplay(e.target.value as DegreeDisplay)}
          >
            {DEGREE_DISPLAYS.map((d) => (
              <option key={d} value={d}>
                {t(`settings.degreeDisplay.${d}` as MessageKey)}
              </option>
            ))}
          </select>
          <div className="settings__degree-example">{DEGREE_EXAMPLES[degreeDisplay]}</div>
        </div>
      </div>

      <div className="settings__section">
        <h3>{t('settings.recognition')}</h3>
        <label className="settings__toggle">
          <input
            type="checkbox"
            checked={singleNoteRecognition}
            onChange={(e) => setSingleNoteRecognition(e.target.checked)}
          />
          {t('settings.singleNoteRecognition')}
        </label>
        <label className="settings__toggle">
          <input
            type="checkbox"
            checked={twoNoteRecognition}
            onChange={(e) => setTwoNoteRecognition(e.target.checked)}
          />
          {t('settings.twoNoteRecognition')}
        </label>
        <label className="settings__toggle">
          <input
            type="checkbox"
            checked={chordRecognitionStatus}
            onChange={(e) => setChordRecognitionStatus(e.target.checked)}
          />
          {t('settings.chordRecognitionStatus')}
        </label>
        <label className="settings__toggle">
          <input
            type="checkbox"
            checked={scaleHighlighting}
            onChange={(e) => setScaleHighlighting(e.target.checked)}
          />
          {t('settings.scaleHighlighting')}
        </label>
        <label className="settings__toggle">
          <input
            type="checkbox"
            checked={rangeIndicators}
            onChange={(e) => setRangeIndicators(e.target.checked)}
          />
          {t('settings.rangeIndicators')}
        </label>
      </div>

      <div className="settings__section">
        <h3>{t('settings.notationPreset')}</h3>
        <div className="settings__presets">
          {NOTATION_PRESETS.map((p) => (
            <button
              key={p.id}
              className={`preset${p.id === presetId ? ' preset--active' : ''}`}
              onClick={() => applyPreset(p.id)}
            >
              {presetLabel(p.id)}
            </button>
          ))}
        </div>
      </div>

      <div className="settings__section">
        <h3>{t('settings.notationCustom')}</h3>
        {GROUPS.map((group) => (
          <div key={group} className="settings__group">
            <h4>{groupName(group)}</h4>
            {CHORD_TYPES.filter((t) => t.group === group).map((t) => {
              const current = suffixes[t.id];
              return (
                <div key={t.id} className="settings__row">
                  <span className="settings__type">{typeName(t.id)}</span>
                  <span className="settings__preview">C{current}</span>
                  <select
                    className="settings__select"
                    value={current}
                    onChange={(e) => setSuffix(t.id, e.target.value)}
                  >
                    {t.symbols.map((s) => (
                      <option key={s} value={s}>
                        C{s}
                      </option>
                    ))}
                  </select>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <button className="btn" onClick={resetNotation}>
        {t('settings.notationReset')}
      </button>
    </div>
  );
}
