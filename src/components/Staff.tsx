// Standard staff notation (hand-rolled inline SVG — no notation library).
// Always renders a fixed grand staff (treble + bass) so the area never changes
// size or position, with ledger lines, accidentals, clef glyphs, pedal marks,
// and octave signs. Notes are spelled in chord context by the caller.
//
// Notes that would fall far off the staff are written one octave closer and
// marked with an octave sign (8va above / 8vb below). This only changes how the
// note is *drawn* — its pitch, key highlight and chord recognition are unchanged.
//
// Simultaneously sounding notes stack on a single vertical line (a chord), each
// at its own height, instead of fanning out horizontally. Notes a second apart
// (or written at the same position) stagger their noteheads left/right so the
// heads never overlap.

import { useMemo } from 'react';
import { CANONICAL_SPELLING, pitchClass, PitchSpelling, spellingToPitchClassNameGlyphs } from '../chords/notes';
import { accidentalRank, octaveSignForNote, octaveSignsFor, placeNote, spreadPositions } from '../staff/staffModel';
import type { OctaveSign, PlacedNote } from '../staff/staffModel';
import { keySignatureSymbols } from '../staff/keySignatures';
import type { KeySignatureSymbol } from '../staff/keySignatures';

// SVG geometry (pixels). `LINE` is the vertical distance between staff lines.
const LINE = 8;
const NOTE_RX = 5.5;
const NOTE_RY = 3.6;
/** Inner whole-note oval: smaller than the outer and tilted; it is cut out of
    the outer oval (even-odd fill) so the interior stays blank. */
const NOTEHEAD_INNER_RX = 3.9;
const NOTEHEAD_INNER_RY = 3.3;
const NOTEHEAD_TILT = 65;
/** 平行交错间距Horizontal stagger step for overlapping noteheads (half a notehead + a gap). */
const NOTEHEAD_OFFSET = NOTE_RX -0.5;
/** Uniform zoom applied to the whole staff (lines, clef, and notes together). */
const ZOOM = 2;

// Fixed vertical layout: treble staff above, bass staff below, with enough
// headroom for ledger lines, octave signs, and pedal marks.
/** Horizontal position of the note column, at the right side of the staff. */
const NOTE_X = 190;
/** Right edge of the staff lines — the note-name gutter sits beyond this. */
const STAFF_LINE_END = 230;
/** Horizontal gap from the note column to a note-name label; the label also
    follows the note's stagger offset, so it tracks its own notehead. */
const NOTE_NAME_GAP = 70;
/** Minimum vertical gap between note-name labels, so they never overlap. Equal
    to one staff line (a third), so only seconds/unisons — the intervals that
    actually overlap — are spread; standard stacked-thirds chords keep their
    labels level with their noteheads. */
const NOTE_NAME_MIN_GAP = 0;
// Whole-staff downward offset: four note-intervals. Each note advances 0.5
// 五线谱界面大小staff-line units (line → space), so four notes = 2 line units = 2 × LINE px.
const STAFF_SHIFT = 0 * LINE;
const TREBLE_BOTTOM = 120 + STAFF_SHIFT;
const BASS_BOTTOM = 200 + STAFF_SHIFT;
const HEIGHT = 260 + STAFF_SHIFT;

// Key signature layout: accidentals start just right of the clef and step right.
const KEY_SIG_X = 34;
const KEY_SIG_STEP = 11;

/** The treble clef is drawn one staff line below its G reference line. */
const TREBLE_CLEF_DROP = LINE;

// Standard clef outlines (Bravura / SMuFL, SIL Open Font License). In font
// units one staff space = 250 units; the glyph origin (0, 0) sits on the clef's
// reference line — the treble G line (2nd line from the bottom) and the bass F
// line (4th line from the bottom). Scaling by LINE/250 binds the clef to the
// actual staff-line spacing, so it resizes with the staff rather than a fixed
// pixel size.
const CLEF_UNITS_PER_SPACE = 250;
const CLEF_PATHS: Record<'treble' | 'bass', string> = {
  treble:
    'M 470 -943 C 503 -943 530 -916 530 -861 C 530 -792 497 -728 419 -650 C 403 -634 379 -611 356 -591 C 349 -585 345 -586 343 -599 C 339 -625 337 -659 337 -691 Z M 430 -103 C 428 -115 429 -118 441 -117 C 522 -110 589 -42 589 46 C 589 109 551 160 495 188 C 483 194 481 194 479 182 Z M 361 -262 C 364 -243 364 -244 346 -238 C 258 -208 201 -129 201 -44 C 201 46 248 110 316 133 C 324 136 336 139 343 139 C 351 139 355 134 355 128 C 355 121 347 118 340 115 C 298 97 268 54 268 8 C 268 -49 307 -92 368 -109 C 384 -113 386 -112 388 -101 L 438 197 C 440 208 439 208 424 211 C 408 214 388 216 368 216 C 193 216 80 119 80 -20 C 80 -79 90 -158 173 -252 C 233 -319 279 -356 326 -394 C 336 -402 338 -401 340 -390 Z M 376 -415 C 374 -427 376 -428 382 -434 C 398 -449 419 -470 438 -491 C 522 -583 572 -702 572 -815 C 572 -902 548 -988 507 -1048 C 492 -1070 466 -1098 455 -1098 C 441 -1098 410 -1072 390 -1050 C 316 -968 292 -843 292 -739 C 292 -681 299 -616 306 -575 C 308 -563 309 -561 297 -551 C 233 -498 164 -437 112 -373 C 43 -287 0 -194 0 -87 C 0 87 119 252 364 252 C 387 252 413 250 433 246 C 444 244 446 243 448 255 C 460 322 475 409 475 456 C 475 604 375 622 316 622 C 262 622 236 606 236 593 C 236 586 245 583 268 576 C 299 567 335 540 335 482 C 335 427 300 380 239 380 C 172 380 132 433 132 495 C 132 560 171 658 322 658 C 389 658 519 628 519 458 C 519 401 501 306 490 244 C 488 232 489 233 503 227 C 604 187 671 102 671 -11 C 671 -139 577 -252 430 -252 C 404 -252 404 -252 401 -270 Z',
  bass:
    'M 252 -262 C 78 -262 0 -135 0 -39 C 0 41 42 110 123 110 C 186 110 229 66 229 4 C 229 -60 182 -100 133 -100 C 106 -100 96 -93 83 -93 C 70 -93 67 -101 67 -111 C 67 -151 127 -224 229 -224 C 335 -224 381 -120 381 37 C 381 140 359 260 297 356 C 237 449 134 534 10 605 C 1 610 -5 615 -5 623 C -5 629 -1 635 8 635 C 13 635 19 633 25 630 C 158 565 286 489 392 375 C 479 281 531 159 531 28 C 531 -63 398 -262 252 -262 Z M 630 71 C 599 71 576 94 576 125 C 576 156 599 179 630 179 C 661 179 684 156 684 125 Z M 629 -180 C 598 -180 574 -156 574 -125 C 574 -94 598 -70 629 -70 C 660 -70 684 -94 684 -125 Z',
};

/** Unicode glyph for an accidental, or '' for a natural. */
const ACCIDENTAL_GLYPH: Record<string, string> = {
  '-2': '𝄫',
  '-1': '♭',
  '0': '',
  '1': '♯',
  '2': '𝄪',
};

interface PlacedWithOctave extends PlacedNote {
  octave?: OctaveSign;
}

interface Props {
  notes: number[];
  /** Structured spelling for each note (chord context), or canonical if omitted. */
  spell?: (midi: number) => PitchSpelling;
  sustainDown: boolean;
  sostenutoDown: boolean;
  /** Selected key's signature (count of sharps / flats) for the staff. */
  sharps: number;
  flats: number;
  /** Localized display name for the selected key/mode (e.g. "F♯ Major"). */
  keyLabel: string;
  /** Whether 8va/8vb octave signs may be shown (chord-aware) at all. */
  octaveSignsEnabled: boolean;
  /** Localized label for the octave-signs toggle. */
  octaveSignsLabel: string;
  /** Called when the octave-signs toggle is changed. */
  onOctaveSignsChange: (enabled: boolean) => void;
}

function spellOf(spell: ((midi: number) => PitchSpelling) | undefined, midi: number): PitchSpelling {
  return spell ? spell(midi) : CANONICAL_SPELLING[pitchClass(midi)];
}

/** y coordinate of a staff position, given the y of the bottom line (position 0). */
function yOf(bottomY: number, position: number): number {
  return bottomY - position * LINE;
}

// Noteheads are ~2*NOTE_RY tall, so two heads overlap vertically when their
// positions differ by less than a full staff line — i.e. a second (0.5) or a
// unison (0). Anything a third or more apart clears the head and stays centered.
const NOTEHEAD_OVERLAP = 0.96;

/**
 * Horizontal stagger for a chord column. Notes a second apart (or written at the
 * same position) would overlap, so they are pushed to opposite sides of the
 * shared stem — the lower note left, the higher right — with longer clusters
 * alternating left/right and same-position notes spread to distinct slots. Notes
 * a third or more apart stay centered (offset 0). Returns an offset per input
 * position, in the same order.
 */
function noteheadOffsets(positions: number[]): number[] {
  const n = positions.length;
  const offsets = new Array<number>(n).fill(0);
  if (n === 0) return offsets;

  const order = positions
    .map((_, i) => i)
    .sort((a, b) => positions[a] - positions[b] || a - b);
  const cols = new Array<number>(n).fill(0);

  for (let k = 0; k < order.length; k++) {
    const i = order[k];
    const pos = positions[i];

    // Columns already taken (or too close to take) by earlier notes this head
    // overlaps vertically. A head occupies one column and overlaps a neighbour
    // within ±1 column of it, so block c-1..c+1.
    const blocked = new Set<number>();
    for (let j = 0; j < k; j++) {
      if (pos - positions[order[j]] < NOTEHEAD_OVERLAP) {
        const c = cols[order[j]];
        blocked.add(c - 1);
        blocked.add(c);
        blocked.add(c + 1);
      }
    }

    if (blocked.size === 0) {
      // Starts a cluster only when the next note overlaps it; otherwise isolated.
      const hasNext = k + 1 < order.length && positions[order[k + 1]] - pos < NOTEHEAD_OVERLAP;
      cols[i] = hasNext ? -1 : 0;
    } else {
      // Nearest free column, alternating outward from the centre for a compact,
      // standard-looking stagger (lower note on the left of a second).
      let chosen = 0;
      if (blocked.has(0)) {
        for (let d = 1; d <= n; d++) {
          if (!blocked.has(-d)) {
            chosen = -d;
            break;
          }
          if (!blocked.has(d)) {
            chosen = d;
            break;
          }
        }
      }
      cols[i] = chosen;
    }
  }

  for (const i of order) offsets[i] = cols[i] * NOTEHEAD_OFFSET;
  return offsets;
}

/**
 * Place a note on a clef, applying an octave sign when the chord-level decision
 * asks for one. The written position is shifted one octave toward the staff
 * (keeping the same spelling), while the reported `midi` stays the original —
 * so the octave sign never changes the sounding pitch.
 */
function placeWithOctave(
  note: { midi: number; spelling: PitchSpelling },
  clef: 'treble' | 'bass',
  sign: OctaveSign | null,
): PlacedWithOctave {
  const target = sign
    ? { midi: note.midi + (sign === '8va' ? -12 : 12), spelling: note.spelling }
    : note;
  const placed = placeNote(target, clef);
  return { ...placed, midi: note.midi, octave: sign ?? undefined };
}

/** SVG path for one full ellipse (two 180° arcs) centred at (cx, cy), with the
    given radii and clockwise tilt in degrees. Used to build the whole-note head. */
function ellipsePath(cx: number, cy: number, rx: number, ry: number, tiltDeg: number): string {
  const rad = (tiltDeg * Math.PI) / 180;
  const dx = rx * Math.cos(rad);
  const dy = rx * Math.sin(rad);
  const x1 = cx + dx;
  const y1 = cy + dy;
  const x2 = cx - dx;
  const y2 = cy - dy;
  return `M ${x1} ${y1} A ${rx} ${ry} ${tiltDeg} 1 0 ${x2} ${y2} A ${rx} ${ry} ${tiltDeg} 1 0 ${x1} ${y1} Z`;
}

/** Whole-note head: an outer oval plus a smaller tilted inner oval, combined into
    one even-odd path so the ring between them fills solid and the inner oval
    stays blank (a true hole, not painted over). */
function wholeNotePath(x: number, y: number): string {
  return (
    ellipsePath(x, y, NOTE_RX, NOTE_RY, 0) +
    ' ' +
    ellipsePath(x, y, NOTEHEAD_INNER_RX, NOTEHEAD_INNER_RY, NOTEHEAD_TILT)
  );
}

/** A single notehead (+ accidental + ledger lines) at the shared note column. */
function NoteGlyph({
  note,
  x,
  side,
  bottomY,
}: {
  note: PlacedNote;
  x: number;
  /** Which side of the notehead the accidental sits on (follows the stagger). */
  side: 'left' | 'right';
  bottomY: number;
}) {
  const y = yOf(bottomY, note.position);
  const accidental = ACCIDENTAL_GLYPH[String(note.spelling.accidental)];
  // The accidental tracks the note's horizontal offset: a note staggered left
  // keeps its accidental on the left, one staggered right carries it on the
  // right. That way an accidental never collides with a neighbouring notehead.
  const accidentalX = side === 'right' ? x + 16 : x - 16;
  return (
    <g>
      {note.ledgerLines.map((q) => (
        <line
          key={`ledger-${q}`}
          x1={x - NOTE_RX - 3.5}
          x2={x + NOTE_RX + 3.5}
          y1={yOf(bottomY, q)}
          y2={yOf(bottomY, q)}
          className="staff__line"
        />
      ))}
      {accidental && (
        <text x={accidentalX} y={y + 4} className="staff__accidental" textAnchor="middle">
          {accidental}
        </text>
      )}
      {/* Whole-note head: an outer oval with a smaller, tilted inner oval cut
          out of it — the ring between them is solid, the interior stays blank. */}
      <path
        d={wholeNotePath(x, y)}
        fillRule="evenodd"
        className="staff__notehead staff__notehead--whole"
      />
    </g>
  );
}

/** A dashed line + "8va"/"8vb" label spanning the octave-shifted note column. */
function OctaveSign({ sign, x, lineY }: { sign: OctaveSign; x: number; lineY: number }) {
  const labelY = sign === '8va' ? lineY - 5 : lineY + 14;
  return (
    <g className="staff__octave">
      <line
        x1={x - NOTE_RX - 3.5}
        x2={x + NOTE_RX + 3.5}
        y1={lineY}
        y2={lineY}
        className="staff__octave-line"
      />
      <text x={x - NOTE_RX - 7} y={labelY} textAnchor="end" className="staff__octave-label">
        {sign}
      </text>
    </g>
  );
}

/** Standard clef glyph, origin (0, 0) anchored to the clef's reference line. */
function ClefGlyph({ clef, bottomY }: { clef: 'treble' | 'bass'; bottomY: number }) {
  const referencePosition = clef === 'treble' ? 2 : 3;
  const originY =
    yOf(bottomY, referencePosition) + (clef === 'treble' ? TREBLE_CLEF_DROP : 0);
  const scale = LINE / CLEF_UNITS_PER_SPACE;
  return (
    <path d={CLEF_PATHS[clef]} transform={`translate(0 ${originY}) scale(${scale})`} className="staff__clef" />
  );
}

/** Five staff lines plus a clef, the key signature, and the notes placed on it. */
function StaffSystem({
  clef,
  placed,
  keySignature,
  bottomY,
  noteName,
}: {
  clef: 'treble' | 'bass';
  placed: PlacedWithOctave[];
  keySignature: KeySignatureSymbol[];
  bottomY: number;
  /** Note-name label (♯/♭ glyphs) for a spelled note. */
  noteName: (spelling: PitchSpelling) => string;
}) {
  const high = placed.filter((n) => n.octave === '8va');
  const low = placed.filter((n) => n.octave === '8vb');
  const highLineY =
    high.length > 0 ? Math.min(...high.map((n) => yOf(bottomY, n.position))) - 16 : 0;
  const lowLineY =
    low.length > 0 ? Math.max(...low.map((n) => yOf(bottomY, n.position))) + 16 : 0;

  const offsets = noteheadOffsets(placed.map((n) => n.position));

  // Note-name labels keep their note's vertical position, but when two notes are
  // a second apart their labels would overlap — spread the whole column so every
  // consecutive label stays at least NOTE_NAME_MIN_GAP apart. When several notes
  // share the same position (a unison), order their labels top-to-bottom by
  // accidental: sharp → natural → flat.
  const nameOrder = placed
    .map((_, i) => i)
    .sort((a, b) => {
      const dy = yOf(bottomY, placed[a].position) - yOf(bottomY, placed[b].position);
      if (dy !== 0) return dy;
      const dr = accidentalRank(placed[a].spelling.accidental) - accidentalRank(placed[b].spelling.accidental);
      if (dr !== 0) return dr;
      return placed[a].midi - placed[b].midi;
    });
  const nameYs = spreadPositions(
    nameOrder.map((i) => yOf(bottomY, placed[i].position)),
    NOTE_NAME_MIN_GAP,
  );
  const nameY = new Array<number>(placed.length);
  nameOrder.forEach((idx, k) => {
    nameY[idx] = nameYs[k];
  });

  return (
    <g>
      {[0, 1, 2, 3, 4].map((q) => (
        <line
          key={q}
          x1={0}
          x2={STAFF_LINE_END}
          y1={yOf(bottomY, q)}
          y2={yOf(bottomY, q)}
          className="staff__line"
        />
      ))}
      <ClefGlyph clef={clef} bottomY={bottomY} />
      {keySignature.map((sym, i) => (
        <text
          key={`keysig-${i}`}
          x={KEY_SIG_X + i * KEY_SIG_STEP}
          y={yOf(bottomY, sym.position) + 4}
          className="staff__keysig"
          textAnchor="middle"
        >
          {sym.glyph}
        </text>
      ))}
      {placed.map((n, idx) => {
        const offset = offsets[idx];
        const side = offset > 0 ? 'right' : 'left';
        return (
          <NoteGlyph key={n.midi} note={n} x={NOTE_X + offset} side={side} bottomY={bottomY} />
        );
      })}
      {placed.map((n, idx) => (
        <text
          key={`name-${n.midi}`}
          x={NOTE_X + offsets[idx] + NOTE_NAME_GAP}
          y={nameY[idx] + 4}
          className="staff__notename"
          textAnchor="start"
        >
          {noteName(n.spelling)}
        </text>
      ))}
      {high.length > 0 && <OctaveSign sign="8va" x={NOTE_X} lineY={highLineY} />}
      {low.length > 0 && <OctaveSign sign="8vb" x={NOTE_X} lineY={lowLineY} />}
    </g>
  );
}

export function Staff({
  notes,
  spell,
  sustainDown,
  sostenutoDown,
  sharps,
  flats,
  keyLabel,
  octaveSignsEnabled,
  octaveSignsLabel,
  onOctaveSignsChange,
}: Props) {
  const noteName = (spelling: PitchSpelling) => spellingToPitchClassNameGlyphs(spelling);

  const { treble, bass, trebleKeySig, bassKeySig } = useMemo(() => {
    const decision = octaveSignsEnabled ? octaveSignsFor(notes) : { show8va: false, show8vb: false };
    const staffNotes = notes.map((m) => ({ midi: m, spelling: spellOf(spell, m) }));
    const treble = staffNotes
      .filter((n) => n.midi >= 60)
      .map((n) => placeWithOctave(n, 'treble', octaveSignForNote(n.midi, decision)))
      .sort((a, b) => a.midi - b.midi);
    const bass = staffNotes
      .filter((n) => n.midi < 60)
      .map((n) => placeWithOctave(n, 'bass', octaveSignForNote(n.midi, decision)))
      .sort((a, b) => a.midi - b.midi);
    const trebleKeySig = keySignatureSymbols('treble', sharps, flats);
    const bassKeySig = keySignatureSymbols('bass', sharps, flats);
    return { treble, bass, trebleKeySig, bassKeySig };
  }, [notes, spell, sharps, flats, octaveSignsEnabled]);

  // Notes stack on one column, so the staff no longer grows with the note count.
  // Width includes room for the note-name gutter: labels sit right of the staff
  // lines and follow each note's stagger offset, so the gutter is sized to the
  // furthest a staggered label can reach without clipping.
  const width = 304;

  return (
    <div className="staff">
      <svg
        viewBox={`0 0 ${width} ${HEIGHT}`}
        width={width * ZOOM}
        height={HEIGHT * ZOOM}
        role="img"
        aria-label="Staff notation"
        preserveAspectRatio="xMinYMin meet"
      >
        <text x={0} y={16 + STAFF_SHIFT} className="staff__key-label">
          {`Key: ${keyLabel}`}
        </text>
        <StaffSystem
          clef="treble"
          placed={treble}
          keySignature={trebleKeySig}
          bottomY={TREBLE_BOTTOM}
          noteName={noteName}
        />
        <StaffSystem
          clef="bass"
          placed={bass}
          keySignature={bassKeySig}
          bottomY={BASS_BOTTOM}
          noteName={noteName}
        />
        {(sustainDown || sostenutoDown) && (
          <text x={0} y={HEIGHT - 6} className="staff__pedal">
            {sustainDown ? 'Ped.' : ''}
            {sostenutoDown ? ' Sost.' : ''}
          </text>
        )}
      </svg>
      <label className="staff__octave-toggle">
        <input
          type="checkbox"
          checked={octaveSignsEnabled}
          onChange={(e) => onOctaveSignsChange(e.target.checked)}
        />
        {octaveSignsLabel}
      </label>
    </div>
  );
}
