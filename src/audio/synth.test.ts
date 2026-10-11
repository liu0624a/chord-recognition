// Focused test for the sampled-instrument engine's Web Audio wiring, using
// minimal mocks so the "note pressed before its samples finish decoding" path is
// covered. The pure sample-selection logic is tested separately in sampler.test.ts.

import { afterEach, describe, expect, it, vi } from 'vitest';
import { createSynthEngine } from './synth';

type MockFn = ReturnType<typeof vi.fn>;

interface MockParam {
  value: number;
  setValueAtTime: MockFn;
  setTargetAtTime: MockFn;
  cancelScheduledValues: MockFn;
}

function param(): MockParam {
  return {
    value: 0,
    setValueAtTime: vi.fn(),
    setTargetAtTime: vi.fn(),
    cancelScheduledValues: vi.fn(),
  };
}

interface StartedNote {
  playbackRate: number;
}

/** Notes that actually reached `source.start()` — the proof that sound was produced. */
const started: StartedNote[] = [];

function installMocks(): void {
  started.length = 0;

  class FakeSource {
    buffer: unknown = null;
    playbackRate = param();
    connect = vi.fn();
    disconnect = vi.fn();
    start = vi.fn();
    stop = vi.fn();
  }

  class FakeAudioContext {
    destination = {};
    currentTime = 0;
    state: AudioContextState = 'running';
    createGain(): { gain: MockParam; connect: MockFn; disconnect: MockFn } {
      return { gain: param(), connect: vi.fn(), disconnect: vi.fn() };
    }
    createDynamicsCompressor(): {
      threshold: MockParam;
      ratio: MockParam;
      connect: MockFn;
      disconnect: MockFn;
    } {
      return { threshold: param(), ratio: param(), connect: vi.fn(), disconnect: vi.fn() };
    }
    createBufferSource(): FakeSource {
      const source = new FakeSource();
      source.start.mockImplementation(() => {
        started.push({ playbackRate: source.playbackRate.value });
      });
      return source;
    }
    resume(): Promise<void> {
      this.state = 'running';
      return Promise.resolve();
    }
    close(): Promise<void> {
      return Promise.resolve();
    }
  }

  class FakeOfflineAudioContext {
    async decodeAudioData(_buffer: ArrayBuffer): Promise<AudioBuffer> {
      return {} as AudioBuffer;
    }
  }

  vi.stubGlobal('window', {
    AudioContext: FakeAudioContext,
    OfflineAudioContext: FakeOfflineAudioContext,
  });
  vi.stubGlobal(
    'fetch',
    async (): Promise<{ ok: boolean; arrayBuffer: () => Promise<ArrayBuffer> }> => ({
      ok: true,
      arrayBuffer: async () => new ArrayBuffer(8),
    }),
  );
}

describe('createSynthEngine', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('starts a note pressed while its samples are still decoding', async () => {
    installMocks();
    const engine = createSynthEngine();
    engine.setInstrument('piano'); // begins the async sample load
    engine.noteOn(60, 100); // samples not ready yet — must be queued, not dropped

    await vi.waitFor(() => expect(started).toHaveLength(1));
    expect(started[0].playbackRate).toBeCloseTo(1); // C4 sample played at native pitch
    engine.dispose();
  });
});
