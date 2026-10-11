// Web MIDI device management. Uses the Web MIDI types bundled with lib.dom
// (MIDIAccess / MIDIInput / MIDIMessageEvent), which are present in TS 5.7+.

export interface MidiDeviceInfo {
  id: string;
  name: string;
}

export function midiSupported(): boolean {
  return typeof navigator.requestMIDIAccess === 'function';
}

export class MidiController {
  private access: MIDIAccess | null = null;
  private input: MIDIInput | null = null;
  private messageHandler: ((data: Uint8Array | null) => void) | null = null;
  private stateHandler: (() => void) | null = null;

  async requestAccess(): Promise<void> {
    if (!midiSupported()) throw new Error('not-supported');
    this.access = await navigator.requestMIDIAccess();
    this.access.onstatechange = () => this.stateHandler?.();
  }

  get hasAccess(): boolean {
    return this.access != null;
  }

  listInputs(): MidiDeviceInfo[] {
    return this.getInputs().map((input) => ({ id: input.id, name: input.name || input.id }));
  }

  selectInput(id: string | null): void {
    this.detach();
    if (!id) return;
    const target = this.getInputs().find((input) => input.id === id);
    if (!target) return;
    this.input = target;
    target.onmidimessage = (ev) => this.messageHandler?.(ev.data);
  }

  private getInputs(): MIDIInput[] {
    const out: MIDIInput[] = [];
    this.access?.inputs.forEach((input) => out.push(input));
    return out;
  }

  onMessage(handler: (data: Uint8Array | null) => void): void {
    this.messageHandler = handler;
  }

  onStateChange(handler: () => void): void {
    this.stateHandler = handler;
  }

  private detach(): void {
    if (this.input) this.input.onmidimessage = null;
    this.input = null;
  }

  dispose(): void {
    this.detach();
    if (this.access) this.access.onstatechange = null;
    this.access = null;
    this.messageHandler = null;
    this.stateHandler = null;
  }
}

/** A semantic MIDI event. Controllers 64/66/67 map to sustain/sostenuto/soft. */
export type MidiEvent =
  | { type: 'on'; note: number; velocity: number }
  | { type: 'off'; note: number }
  | { type: 'control'; controller: number; value: number }
  | { type: 'allNotesOff' };

/** Parse a raw MIDI message into a semantic event, or null if not note/CC-related. */
export function parseMidiMessage(data: Uint8Array | null): MidiEvent | null {
  if (!data || data.length < 3) return null;
  const status = data[0] & 0xf0;
  const b1 = data[1];
  const b2 = data[2];

  if (status === 0x90 && b2 > 0) return { type: 'on', note: b1, velocity: b2 };
  if (status === 0x80 || (status === 0x90 && b2 === 0)) return { type: 'off', note: b1 };
  if (status === 0xb0) {
    // All Notes Off (123) / All Sound Off (120)
    if (b1 === 0x7b || b1 === 0x78) return { type: 'allNotesOff' };
    // Sustain (64), Sostenuto (66), Soft (67); other CCs are ignored.
    if (b1 === 64 || b1 === 66 || b1 === 67) return { type: 'control', controller: b1, value: b2 };
    return null;
  }
  return null;
}
