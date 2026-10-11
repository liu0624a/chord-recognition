// Sampled-instrument engine (Web Audio). Real per-note samples (FluidR3 GM
// soundfont, MIT licensed) are loaded from `public/samples/`, pitch-shifted via
// `playbackRate`, and gated by the app's single sounding-note set. The
// sustain/sostenuto pedal *state* lives in the app (`audio/pedal.ts`), which
// computes the exact set of sounding notes and pushes it here via `syncSounding`.
// That one set drives both the audio voices and the UI (staff, chord, recognition).
//
// Chord *previews* (the "Play selected chord" button) use a separate voice group
// (`previewVoices`) that `syncSounding` never touches, so a preview neither
// changes nor is changed by the user's held/selected notes.

import { nearestSample, samplePlaybackRate } from './sampler';
import { SAMPLE_SETS } from './sampleManifest';

export type Instrument = 'piano' | 'guitar' | 'ukulele';

export interface SynthEngine {
  /** Change the timbre. Affects sound only — never pitch/recognition/notation. */
  setInstrument(instrument: Instrument): void;
  /** Start sounding a note (no-op if that pitch is already active). */
  noteOn(midi: number, velocity?: number): void;
  /** Keep exactly these notes sounding; stop any active voice not in the set. */
  syncSounding(notes: Iterable<number>): void;
  /** Start a chord-preview note `delaySeconds` from now, independent of user notes. */
  previewNoteOn(midi: number, velocity: number, delaySeconds: number): void;
  /** Stop every chord-preview voice; user notes are left untouched. */
  previewStop(): void;
  /** Soft pedal (CC67): lower the master volume while down. */
  setSoft(down: boolean): void;
  /** Silence everything immediately. */
  allNotesOff(): void;
  resume(): void;
  dispose(): void;
}

/** Number of voices across all notes before older voices are stolen. */
const MAX_VOICES = 32;
/** Release ramp when a note stops sounding — short enough to "stop on release",
 *  long enough to avoid an audible click. */
const RELEASE = 0.05;

interface Voice {
  source: AudioBufferSourceNode;
  gain: GainNode;
}

export function createSynthEngine(): SynthEngine {
  let ctx: AudioContext | null = null;
  let master: GainNode | null = null;
  let decoder: OfflineAudioContext | null = null;
  let instrument: Instrument = 'piano';
  let soft = false;
  /** User voices (held/selected), keyed by MIDI pitch. */
  const voices = new Map<number, Voice>();
  /** Chord-preview voices, keyed by MIDI pitch — never mixed with `voices`. */
  const previewVoices = new Map<number, Voice>();
  /** instrument -> (recorded sample midi -> decoded AudioBuffer). */
  const buffers = new Map<Instrument, Map<number, AudioBuffer>>();
  const loading = new Set<Instrument>();
  const warned = new Set<Instrument>();
  /** Notes pressed while their instrument's samples were still decoding: midi -> velocity. */
  const queued = new Map<number, number>();
  let disposed = false;

  function ensureContext(): AudioContext | null {
    if (disposed) return null;
    if (!ctx) {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      ctx = new Ctor();
      master = ctx.createGain();
      master.gain.value = soft ? 0.5 : 0.9;
      const compressor = ctx.createDynamicsCompressor();
      compressor.threshold.value = -18;
      compressor.ratio.value = 6;
      master.connect(compressor);
      compressor.connect(ctx.destination);
    }
    return ctx;
  }

  // Decoding uses a tiny OfflineAudioContext so samples can be fetched + decoded
  // *before* any user gesture, without creating the (autoplay-gated) playback
  // context or triggering a "not allowed to start" warning.
  function getDecoder(): OfflineAudioContext | null {
    if (disposed) return null;
    if (!decoder && typeof window.OfflineAudioContext !== 'undefined') {
      decoder = new window.OfflineAudioContext(1, 1, 44100);
    }
    return decoder;
  }

  function loadInstrument(inst: Instrument): void {
    if (disposed || buffers.has(inst) || loading.has(inst)) return;
    const decode = getDecoder();
    if (!decode) return;
    loading.add(inst);
    const set = SAMPLE_SETS[inst];
    const pending = set.samples.map(async (s) => {
      const res = await fetch(s.file);
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${s.file}`);
      const ab = await res.arrayBuffer();
      const decoded = await decode.decodeAudioData(ab);
      return [s.midi, decoded] as const;
    });
    Promise.all(pending)
      .then((entries) => {
        if (disposed) return;
        buffers.set(inst, new Map(entries));
        // Start any notes that were pressed while this instrument was still
        // decoding; a press dropped here would otherwise stay silent forever.
        const toStart = [...queued.entries()];
        queued.clear();
        for (const [midi, velocity] of toStart) startVoice(midi, velocity);
      })
      .catch((err) => {
        if (!warned.has(inst)) {
          warned.add(inst);
          console.warn(`Sample load failed for "${inst}":`, err);
        }
      })
      .finally(() => loading.delete(inst));
  }

  /** Build and schedule a voice starting at `when`. Null when the context or the
   *  specific sample is unavailable (the caller decides whether to retry). */
  function makeVoice(midi: number, velocity: number, when: number): Voice | null {
    const context = ensureContext();
    if (!context || !master) return null;

    const set = SAMPLE_SETS[instrument];
    const bank = buffers.get(instrument);
    if (!bank) return null;
    const sample = nearestSample(set.samples, midi, set.shift);
    const audio = bank.get(sample.midi);
    if (!audio) return null;

    const source = context.createBufferSource();
    source.buffer = audio;
    source.playbackRate.value = samplePlaybackRate(sample.midi, midi);

    const gain = context.createGain();
    const level = Math.pow(Math.max(0, Math.min(1, velocity / 127)), 1.5) * (soft ? 0.5 : 0.9);
    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.setTargetAtTime(level, when, 0.003); // fast attack

    source.connect(gain);
    gain.connect(master);
    source.start(when);

    return { source, gain };
  }

  function startVoice(midi: number, velocity: number): void {
    if (voices.has(midi)) return;
    if (!buffers.has(instrument)) {
      // Not decoded yet: remember the press and kick off the load. It starts as
      // soon as the samples finish decoding instead of being silently dropped.
      queued.set(midi, velocity);
      loadInstrument(instrument);
      return;
    }
    const voice = makeVoice(midi, velocity, ctx?.currentTime ?? 0);
    if (voice) {
      voices.set(midi, voice);
      stealVoices();
    }
  }

  /** Ramp a voice to silence and disconnect it. Never touches a voice map. */
  function stopVoiceAudio(voice: Voice): void {
    const t = ctx?.currentTime ?? 0;
    voice.gain.gain.cancelScheduledValues(t);
    voice.gain.gain.setTargetAtTime(0.0001, t, RELEASE / 3);
    try {
      voice.source.stop(t + RELEASE + 0.05);
    } catch {
      // Already stopped (sample ended on its own).
    }
    setTimeout(() => {
      try {
        voice.source.disconnect();
      } catch {
        // Already disconnected.
      }
      try {
        voice.gain.disconnect();
      } catch {
        // Already disconnected.
      }
    }, (RELEASE + 0.1) * 1000);
  }

  function stopVoice(midi: number, voice: Voice): void {
    stopVoiceAudio(voice);
    voices.delete(midi);
  }

  function stealVoices(): void {
    while (voices.size > MAX_VOICES) {
      const oldest = voices.keys().next().value;
      if (oldest == null) break;
      const voice = voices.get(oldest);
      if (voice) stopVoice(oldest, voice);
    }
  }

  return {
    setInstrument(next: Instrument): void {
      instrument = next;
      loadInstrument(next);
    },
    noteOn(midi: number, velocity = 100): void {
      const context = ensureContext();
      if (!context) return;
      if (context.state === 'suspended') void context.resume();
      // A re-press always starts a fresh attack, even while sustain is holding the
      // same pitch — the old held-over voice is stopped and a new one begins.
      const existing = voices.get(midi);
      if (existing) stopVoice(midi, existing);
      startVoice(midi, velocity);
    },
    syncSounding(notes: Iterable<number>): void {
      const sounding = new Set(notes);
      const toStop: Array<[number, Voice]> = [];
      for (const [midi, voice] of voices) {
        if (!sounding.has(midi)) toStop.push([midi, voice]);
      }
      for (const [midi, voice] of toStop) stopVoice(midi, voice);
      // Forget queued notes that are no longer wanted.
      for (const midi of queued.keys()) {
        if (!sounding.has(midi)) queued.delete(midi);
      }
    },
    previewNoteOn(midi: number, velocity: number, delaySeconds: number): void {
      const context = ensureContext();
      if (!context) return;
      if (context.state === 'suspended') void context.resume();
      // Re-sounding the same pitch replaces the previous preview voice instead of
      // stacking a second one on top of it.
      const existing = previewVoices.get(midi);
      if (existing) {
        stopVoiceAudio(existing);
        previewVoices.delete(midi);
      }
      if (!buffers.has(instrument)) {
        loadInstrument(instrument);
        return; // Samples still decoding — press Play again once they load.
      }
      const voice = makeVoice(midi, velocity, (ctx?.currentTime ?? 0) + delaySeconds);
      if (voice) previewVoices.set(midi, voice);
    },
    previewStop(): void {
      for (const voice of previewVoices.values()) stopVoiceAudio(voice);
      previewVoices.clear();
    },
    setSoft(down: boolean): void {
      soft = down;
      if (master) master.gain.setTargetAtTime(down ? 0.5 : 0.9, ctx?.currentTime ?? 0, 0.05);
    },
    allNotesOff(): void {
      queued.clear();
      const all = [...voices.entries()];
      for (const [midi, voice] of all) stopVoice(midi, voice);
      voices.clear();
      for (const voice of previewVoices.values()) stopVoiceAudio(voice);
      previewVoices.clear();
    },
    resume(): void {
      const context = ensureContext();
      if (context && context.state === 'suspended') void context.resume();
      loadInstrument(instrument);
    },
    dispose(): void {
      disposed = true;
      queued.clear();
      const all = [...voices.entries()];
      for (const [midi, voice] of all) stopVoice(midi, voice);
      voices.clear();
      for (const voice of previewVoices.values()) stopVoiceAudio(voice);
      previewVoices.clear();
      if (ctx) void ctx.close();
      ctx = null;
      master = null;
      decoder = null;
      buffers.clear();
    },
  };
}
