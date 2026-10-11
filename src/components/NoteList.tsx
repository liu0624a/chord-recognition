import { canonicalNoteName } from '../chords/notes';

interface Props {
  notes: number[];
  /** Context-aware spelling for the current chord, when one is recognized. */
  spell?: (midi: number) => string;
}

export function NoteList({ notes, spell }: Props) {
  if (notes.length === 0) return null;
  return (
    <div className="notelist">
      {notes.map((m) => (
        <span key={m} className="notelist__chip">
          {spell ? spell(m) : canonicalNoteName(m)}
        </span>
      ))}
    </div>
  );
}
