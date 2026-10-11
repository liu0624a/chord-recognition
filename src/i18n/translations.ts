// UI strings for both languages. Default language is English; the app toggles
// to Simplified Chinese from Settings. Chord-type / group / notation-preset
// display names live here (English source in chordTypes.ts / notation.ts, with
// Chinese overrides below) so every label switches together.

import { ChordGroup, ChordTypeId, getChordType } from '../chords/chordTypes';
import { IntervalQualityId } from '../chords/interval';
import { NOTATION_PRESETS } from '../chords/notation';
import { KeyAccidental, ModeId, ROOT_LETTERS } from '../staff/keySignatures';

export type Language = 'en' | 'zh';

export const MESSAGES = {
  en: {
    'app.title': 'Chord Recognition',

    'toolbar.settings': 'Settings',
    'toolbar.themeToLight': 'Switch to light theme',
    'toolbar.themeToDark': 'Switch to dark theme',
    'toolbar.piano': 'Piano',
    'toolbar.guitar': 'Guitar',
    'toolbar.ukulele': 'Ukulele',
    'toolbar.playMode': 'Play mode',

    'settings.title': 'Settings',
    'settings.close': 'Close',
    'settings.language': 'Language',
    'settings.languageEnglish': 'English',
    'settings.languageChinese': '简体中文',
    'settings.theme': 'Theme',
    'settings.themeDark': 'Dark',
    'settings.themeLight': 'Light',
    'settings.themeColor': 'Theme color',
    'settings.themeColorReset': 'Reset to default',
    'settings.noteNames': 'Note names',
    'settings.noteNamesOff': 'Off',
    'settings.noteNamesSharp': 'Sharps (♯)',
    'settings.noteNamesFlat': 'Flats (♭)',
    'settings.noteNamesBoth': 'Both (♯/♭)',
    'settings.noteNamesCOnly': 'C only (C1, C2…)',
    'settings.fretboard': 'Fretboard',
    'settings.fretboardNone': 'None',
    'settings.fretboardGuitar': 'Guitar',
    'settings.fretboardUkulele': 'Ukulele',
    'settings.fretNoteDisplay': 'Fretboard note names',
    'settings.fretNoteSharp': 'Sharps (♯)',
    'settings.fretNoteFlat': 'Flats (♭)',
    'settings.fretNoteBoth': 'Both (♯/♭)',
    'settings.instrument': 'Instrument',
    'settings.keySignature': 'Key',
    'settings.keyState': 'Key State',
    'settings.keyStateActive': 'Active',
    'settings.keyStateNone': 'None',
    'settings.accidental': 'Accidental',
    'settings.accidentalSharp': '♯',
    'settings.accidentalFlat': '♭',
    'settings.accidentalNone': 'None',
    'settings.rootNote': 'Root Note',
    'settings.mode': 'Mode',
    'settings.currentKey': 'Current key',
    'settings.currentKeyNone': 'None (no tonal analysis)',
    'settings.degreeDisplay': 'Chord Degree Display',
    'settings.degreeDisplay.roman': 'Roman Numerals',
    'settings.degreeDisplay.romanQuality': 'Roman Numerals + Quality',
    'settings.degreeDisplay.arabicQuality': 'Arabic Numbers + Quality',
    'settings.degreeDisplay.nashville': 'Nashville Number System',
    'settings.degreeDisplay.accidentalRoman': 'Accidental Roman Numerals',
    'settings.degreeDisplay.functional': 'Functional Harmony (Abbreviations)',
    'settings.degreeDisplay.functionalFull': 'Functional Harmony (Full Names)',
    'settings.octaveSigns': 'Octave signs (8va / 8vb)',
    'settings.notationPreset': 'Preset style',
    'settings.notationCustom': 'Custom suffixes',
    'settings.notationReset': 'Restore defaults',
    'settings.recognition': 'Recognition',
    'settings.singleNoteRecognition': 'Single Note Recognition',
    'settings.twoNoteRecognition': 'Two-Note Recognition',
    'settings.chordRecognitionStatus': 'Chord Recognition Status',
    'settings.scaleHighlighting': 'Scale Highlighting',
    'settings.rangeIndicators': 'Instrument Range Indicators',

    'chord.note': 'Single note',
    'chord.interval': 'Two notes (not a chord)',
    'chord.confident': 'Recognized',
    'chord.ambiguous': 'Ambiguous',
    'chord.partial': 'Incomplete chord',
    'chord.unknown': 'Unrecognized',
    'chord.tones': 'Chord tones',
    'chord.alternatives': 'Could also be',
    'chord.playChord': 'Play chord',
    'chord.stopPreview': 'Stop',
    'chord.playMode': 'Playback style',
    'chord.playBlock': 'Block',
    'chord.playArpeggio': 'Arpeggio',
    'chord.playPluck': 'Pluck',
    'chord.playStrum': 'Strum',
    'chord.selectedNotes': 'Selected notes',
    'chord.speculation': 'Speculation',
    'interval.octave': 'Octave',
    'interval.octaves': '{n} Octaves',

    'midi.unsupported': 'Web MIDI is not supported in this browser (try Chrome or Edge).',
    'midi.enable': 'Enable MIDI',
    'midi.requesting': 'Requesting MIDI access…',
    'midi.accessError': 'Could not access MIDI devices',
    'midi.noDevices': 'No MIDI input device detected. Connect a MIDI keyboard and retry.',
    'midi.inputDevice': 'Input device',
    'midi.connected': 'Connected',
    'midi.rescan': 'Rescan',

    'pedal.sustain': 'Sustain',
    'pedal.sostenuto': 'Sostenuto',
    'pedal.soft': 'Soft',

    'piano.label': 'Piano keyboard',
    'fretboard.guitarLabel': 'Guitar fretboard',
    'fretboard.ukuleleLabel': 'Ukulele fretboard',
  },
  zh: {
    'app.title': '和弦识别',

    'toolbar.settings': '设置',
    'toolbar.themeToLight': '切换到浅色主题',
    'toolbar.themeToDark': '切换到深色主题',
    'toolbar.piano': '钢琴',
    'toolbar.guitar': '吉他',
    'toolbar.ukulele': '尤克里里',
    'toolbar.playMode': '弹奏模式',

    'settings.title': '设置',
    'settings.close': '关闭',
    'settings.language': '语言',
    'settings.languageEnglish': 'English',
    'settings.languageChinese': '简体中文',
    'settings.theme': '主题',
    'settings.themeDark': '深色',
    'settings.themeLight': '浅色',
    'settings.themeColor': '主题颜色',
    'settings.themeColorReset': '恢复默认',
    'settings.noteNames': '音名显示',
    'settings.noteNamesOff': '关闭',
    'settings.noteNamesSharp': '升号（♯）',
    'settings.noteNamesFlat': '降号（♭）',
    'settings.noteNamesBoth': '同时显示（♯/♭）',
    'settings.noteNamesCOnly': '仅显示 C（C1、C2…）',
    'settings.fretboard': '指板',
    'settings.fretboardNone': '无',
    'settings.fretboardGuitar': '吉他',
    'settings.fretboardUkulele': '尤克里里',
    'settings.fretNoteDisplay': '指板音名显示',
    'settings.fretNoteSharp': '升号（♯）',
    'settings.fretNoteFlat': '降号（♭）',
    'settings.fretNoteBoth': '同时显示（♯/♭）',
    'settings.instrument': '音色',
    'settings.keySignature': '调式',
    'settings.keyState': '调性状态',
    'settings.keyStateActive': '启用',
    'settings.keyStateNone': '无',
    'settings.accidental': '升降号',
    'settings.accidentalSharp': '♯',
    'settings.accidentalFlat': '♭',
    'settings.accidentalNone': '无',
    'settings.rootNote': '根音',
    'settings.mode': '调式',
    'settings.currentKey': '当前调式',
    'settings.currentKeyNone': '无（不进行调性分析）',
    'settings.degreeDisplay': '和弦级数显示方式',
    'settings.degreeDisplay.roman': '罗马数字',
    'settings.degreeDisplay.romanQuality': '罗马数字 + 品质标记',
    'settings.degreeDisplay.arabicQuality': '阿拉伯数字 + 品质标记',
    'settings.degreeDisplay.nashville': '纳什维尔数字系统',
    'settings.degreeDisplay.accidentalRoman': '带升降号的罗马数字',
    'settings.degreeDisplay.functional': '功能和声标记（缩写）',
    'settings.degreeDisplay.functionalFull': '功能和声标记（全称）',
    'settings.octaveSigns': '八度符号（8va / 8vb）',
    'settings.notationPreset': '预设标记风格',
    'settings.notationCustom': '单独自定义标记',
    'settings.notationReset': '恢复默认设置',
    'settings.recognition': '识别',
    'settings.singleNoteRecognition': '单音识别',
    'settings.twoNoteRecognition': '双音识别',
    'settings.chordRecognitionStatus': '和弦识别状态',
    'settings.scaleHighlighting': '调式音阶高亮',
    'settings.rangeIndicators': '乐器音域指示条',

    'chord.note': '单音',
    'chord.interval': '两个音符（不足以构成和弦）',
    'chord.confident': '已识别',
    'chord.ambiguous': '存在多种可能',
    'chord.partial': '不完整和弦（推测）',
    'chord.unknown': '无法识别为已知和弦',
    'chord.tones': '组成音',
    'chord.alternatives': '也可能是',
    'chord.playChord': '播放和弦',
    'chord.stopPreview': '停止',
    'chord.playMode': '播放方式',
    'chord.playBlock': '柱式',
    'chord.playArpeggio': '琶音',
    'chord.playPluck': '齐拨',
    'chord.playStrum': '扫弦',
    'chord.selectedNotes': '选中音符',
    'chord.speculation': '推测',
    'interval.octave': '八度',
    'interval.octaves': '{n} 个八度',

    'midi.unsupported': '当前浏览器不支持 Web MIDI（建议使用 Chrome 或 Edge）。',
    'midi.enable': '启用 MIDI',
    'midi.requesting': '正在请求 MIDI 权限…',
    'midi.accessError': '无法访问 MIDI 设备',
    'midi.noDevices': '未检测到 MIDI 输入设备，请连接 MIDI 键盘后重试。',
    'midi.inputDevice': '输入设备',
    'midi.connected': '已连接',
    'midi.rescan': '重新扫描',

    'pedal.sustain': '延音踏板',
    'pedal.sostenuto': '选择性延音踏板',
    'pedal.soft': '柔音踏板',

    'piano.label': '钢琴键盘',
    'fretboard.guitarLabel': '吉他指板',
    'fretboard.ukuleleLabel': '尤克里里指板',
  },
} as const;

export type MessageKey = keyof (typeof MESSAGES)['en'];

/** Look up a message with optional `{param}` interpolation. */
export function translate(
  lang: Language,
  key: MessageKey,
  params?: Record<string, string | number>,
): string {
  let text: string = MESSAGES[lang][key] ?? MESSAGES.en[key] ?? key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      text = text.split(`{${k}}`).join(String(v));
    }
  }
  return text;
}

/** Chinese display names for chord types; English lives in chordTypes.ts. */
const CHORD_TYPE_NAMES_ZH: Record<ChordTypeId, string> = {
  major: '大三和弦',
  minor: '小三和弦',
  diminished: '减三和弦',
  augmented: '增三和弦',
  sus2: '挂二和弦',
  sus4: '挂四和弦',
  dom7: '属七和弦',
  maj7: '大七和弦',
  m7: '小七和弦',
  dim7: '减七和弦',
  halfDim7: '半减七和弦',
  mMaj7: '小大七和弦',
  aug7: '增七和弦',
  six: '六和弦',
  m6: '小六和弦',
  add9: '加九和弦',
  add11: '加十一和弦',
  dom9: '九和弦',
  maj9: '大九和弦',
  m9: '小九和弦',
  dom11: '十一和弦',
  maj11: '大十一和弦',
  m11: '小十一和弦',
  dom13: '十三和弦',
  maj13: '大十三和弦',
  m13: '小十三和弦',
  dom7b5: '属七降五和弦',
  dom7b9: '属七降九和弦',
  dom7sharp9: '属七升九和弦',
  sixNine: '六九和弦',
  m6Nine: '小六九和弦',
  madd9: '小加九和弦',
  madd11: '小加十一和弦',
  addSharp11: '加升十一和弦',
  addFlat9: '加降九和弦',
  sevenSus2: '七挂二和弦',
  sevenSus4: '七挂四和弦',
  nineSus4: '九挂四和弦',
  thirteenSus4: '十三挂四和弦',
  augMaj7: '增大大七和弦',
  maj7Flat5: '大七降五和弦',
  dom7sharp11: '属七升十一和弦',
  dom7flat13: '属七降十三和弦',
  dom7flat9sharp11: '属七降九升十一和弦',
  dom7sharp9flat13: '属七升九降十三和弦',
  sevenAlt: '变化属七和弦',
  maj9sharp11: '大九升十一和弦',
  maj13sharp11: '大十三升十一和弦',
  mMaj9: '小大九和弦',
  mMaj11: '小大十一和弦',
  mMaj13: '小大十三和弦',
};

export function chordTypeName(lang: Language, id: ChordTypeId): string {
  return lang === 'zh' ? CHORD_TYPE_NAMES_ZH[id] : getChordType(id).name;
}

/** Interval names for two-note recognition; English lives alongside the Chinese 度 form. */
const INTERVAL_NAMES: Record<IntervalQualityId, { en: string; zh: string }> = {
  minor2: { en: 'Minor 2nd', zh: '小二度' },
  major2: { en: 'Major 2nd', zh: '大二度' },
  aug2: { en: 'Augmented 2nd', zh: '增二度' },
  minor3: { en: 'Minor 3rd', zh: '小三度' },
  major3: { en: 'Major 3rd', zh: '大三度' },
  dim4: { en: 'Diminished 4th', zh: '减四度' },
  perfect4: { en: 'Perfect 4th', zh: '纯四度' },
  aug4: { en: 'Augmented 4th', zh: '增四度' },
  dim5: { en: 'Diminished 5th', zh: '减五度' },
  perfect5: { en: 'Perfect 5th', zh: '纯五度' },
  aug5: { en: 'Augmented 5th', zh: '增五度' },
  minor6: { en: 'Minor 6th', zh: '小六度' },
  major6: { en: 'Major 6th', zh: '大六度' },
  aug6: { en: 'Augmented 6th', zh: '增六度' },
  dim7: { en: 'Diminished 7th', zh: '减七度' },
  minor7: { en: 'Minor 7th', zh: '小七度' },
  major7: { en: 'Major 7th', zh: '大七度' },
  perfect8: { en: 'Octave', zh: '八度' },
};

/** Localized interval name, e.g. "Major 3rd" / "大三度". */
export function intervalName(lang: Language, quality: IntervalQualityId): string {
  const name = INTERVAL_NAMES[quality];
  return lang === 'zh' ? name.zh : name.en;
}

const CHORD_GROUP_NAMES_EN: Record<ChordGroup, string> = {
  triad: 'Triads',
  seventh: 'Seventh chords',
  extended: 'Extended chords',
  altered: 'Altered dominants',
};

const CHORD_GROUP_NAMES_ZH: Record<ChordGroup, string> = {
  triad: '三和弦',
  seventh: '七和弦',
  extended: '扩展和弦',
  altered: '变化属和弦',
};

export function chordGroupName(lang: Language, group: ChordGroup): string {
  return lang === 'zh' ? CHORD_GROUP_NAMES_ZH[group] : CHORD_GROUP_NAMES_EN[group];
}

const NOTATION_PRESET_NAMES_ZH: Record<string, string> = {
  standard: '标准',
  letter: '字母式',
  symbol: '符号式',
  jazz: '爵士记法',
};

export function notationPresetName(lang: Language, presetId: string): string {
  if (lang === 'zh') return NOTATION_PRESET_NAMES_ZH[presetId] ?? presetId;
  return NOTATION_PRESETS.find((p) => p.id === presetId)?.label ?? presetId;
}

const MODE_NAMES: Record<ModeId, { en: string; zh: string }> = {
  ionian: { en: 'Ionian / Major', zh: '伊奥尼亚 / 大调' },
  dorian: { en: 'Dorian', zh: '多利亚调式' },
  phrygian: { en: 'Phrygian', zh: '弗里几亚调式' },
  lydian: { en: 'Lydian', zh: '利底亚调式' },
  mixolydian: { en: 'Mixolydian', zh: '混合利底亚调式' },
  aeolian: { en: 'Aeolian / Minor', zh: '爱奥利亚 / 小调' },
  locrian: { en: 'Locrian', zh: '洛克里亚调式' },
};

/** Localized display name for a mode, e.g. "Ionian / Major" / "伊奥尼亚 / 大调". */
export function modeDisplayName(lang: Language, mode: ModeId): string {
  const name = MODE_NAMES[mode];
  return lang === 'zh' ? name.zh : name.en;
}

/** Localized display name for a key, e.g. "C Ionian / Major" / "F♯ Lydian" / "B♭ Dorian". */
export function keyDisplayName(
  lang: Language,
  root: number,
  mode: ModeId,
  accidental: KeyAccidental = 'none',
): string {
  const symbol = accidental === 'sharp' ? '♯' : accidental === 'flat' ? '♭' : '';
  return `${ROOT_LETTERS[root]}${symbol} ${modeDisplayName(lang, mode)}`;
}
