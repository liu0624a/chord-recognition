import { useCallback, useEffect, useState } from 'react';
import { CHORD_TYPES, ChordTypeId } from '../chords/chordTypes';
import {
  defaultSuffixes,
  presetSuffixes,
  SuffixMap,
} from '../chords/notation';

const STORAGE_KEY = 'chord-notation-settings-v1';

interface StoredSettings {
  presetId: string;
  suffixes: SuffixMap;
}

function isValidSuffix(id: ChordTypeId, suffix: string): boolean {
  const type = CHORD_TYPES.find((c) => c.id === id);
  return !!type && type.symbols.includes(suffix);
}

/** Merge stored suffixes over the defaults, rejecting unknown/invalid values. */
function sanitize(suffixes: unknown): SuffixMap {
  const out = defaultSuffixes();
  if (suffixes && typeof suffixes === 'object') {
    for (const id of Object.keys(out) as ChordTypeId[]) {
      const value = (suffixes as Record<string, unknown>)[id];
      if (typeof value === 'string' && isValidSuffix(id, value)) {
        out[id] = value;
      }
    }
  }
  return out;
}

function load(): StoredSettings {
  const fallback: StoredSettings = { presetId: 'standard', suffixes: presetSuffixes('standard') };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<StoredSettings>;
    return {
      presetId: typeof parsed.presetId === 'string' ? parsed.presetId : 'standard',
      suffixes: sanitize(parsed.suffixes),
    };
  } catch {
    return fallback;
  }
}

export function useNotationSettings() {
  const [state, setState] = useState<StoredSettings>(() => load());

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Ignore storage failures (e.g. private mode); settings just won't persist.
    }
  }, [state]);

  const applyPreset = useCallback((presetId: string) => {
    setState({ presetId, suffixes: presetSuffixes(presetId) });
  }, []);

  const setSuffix = useCallback((id: ChordTypeId, suffix: string) => {
    setState((s) => ({ ...s, suffixes: { ...s.suffixes, [id]: suffix } }));
  }, []);

  const reset = useCallback(() => {
    setState({ presetId: 'standard', suffixes: presetSuffixes('standard') });
  }, []);

  return { suffixes: state.suffixes, presetId: state.presetId, applyPreset, setSuffix, reset };
}
