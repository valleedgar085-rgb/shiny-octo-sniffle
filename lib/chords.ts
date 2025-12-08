export const ROOTS = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"] as const;
export type RootNote = typeof ROOTS[number];

export const CHORD_FORMULAS: Record<string, number[]> = {
  maj: [0, 4, 7],
  min: [0, 3, 7],
  "7": [0, 4, 7, 10],
  maj7: [0, 4, 7, 11],
  min7: [0, 3, 7, 10],
  dim: [0, 3, 6],
  aug: [0, 4, 8]
};

export type ChordType = keyof typeof CHORD_FORMULAS;

export interface Chord {
  root: RootNote;
  type: ChordType;
}

export function getNoteIndex(note: RootNote): number {
  return ROOTS.indexOf(note);
}

export function transpose(noteIndex: number, semitones: number): RootNote {
  return ROOTS[(noteIndex + semitones + 12) % 12] as RootNote;
}

export function getChordNotes(root: RootNote, type: ChordType): RootNote[] {
  const intervals = CHORD_FORMULAS[type];
  const rootIdx = getNoteIndex(root);
  return intervals.map(semi => transpose(rootIdx, semi));
}

export function isDiatonicChordInKey(chord: Chord, key: RootNote, scaleType: "maj" | "min" = "maj"): boolean {
  const scale = getScale(key, scaleType);
  return getChordNotes(chord.root, chord.type).every(n => scale.includes(n));
}

export function getScale(key: RootNote, type: "maj" | "min" = "maj"): RootNote[] {
  const majorPattern = [2,2,1,2,2,2,1];
  const minorPattern = [2,1,2,2,1,2,2];
  const pattern = type === "maj" ? majorPattern : minorPattern;
  let idx = getNoteIndex(key);
  const scale: RootNote[] = [key];
  for (const step of pattern) {
    idx = (idx + step) % 12;
    scale.push(ROOTS[idx]);
  }
  return scale.slice(0, 7);
}
