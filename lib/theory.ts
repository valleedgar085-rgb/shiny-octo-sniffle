import { RootNote, CHORD_FORMULAS, ChordType, getChordNotes, transpose, getNoteIndex, getScale } from './chords';
import { 
  generateRichVoicing, 
  VoicingContext, 
  VoicingStyle,
  midiToPlaybackNotes,
  calculateVoiceLeadingCost as calcVLCost
} from './voicing';

export type Inversion = 'root' | 'first' | 'second' | 'third';
export type SuggestedChord = { root: RootNote; type: ChordType; reason: string };
export { VoicingStyle, VoicingContext } from './voicing';

const DIATONIC_TRIADS_MAJ: Record<number, ChordType> = {
  0: 'maj', // I
  2: 'min', // ii
  4: 'min', // iii
  5: 'maj', // IV
  7: 'maj', // V
  9: 'min', // vi
  11: 'dim' // vii°
};

export function getInversions(root: RootNote, type: ChordType): Record<Inversion, string[]> {
  const notes = getChordNotes(root, type);
  if (notes.length < 3) return { root: notes, first: notes, second: notes, third: notes } as any;
  const rootInv = notes;
  const firstInv = [notes[1], notes[2], notes[0]];
  const secondInv = [notes[2], notes[0], notes[1]];
  const thirdInv = (notes as any)[3] ? [(notes as any)[3], notes[0], notes[1], notes[2]] : secondInv;
  return { root: rootInv, first: firstInv, second: secondInv, third: thirdInv } as Record<Inversion, string[]>;
}

export function voiceLeadingCost(prevChordNotes: string[], nextChordNotes: string[]): number {
  const prevIdx = prevChordNotes.map(getNoteIndex);
  const nextIdx = nextChordNotes.map(getNoteIndex);
  let total = 0;
  for (const n of nextIdx) {
    let best = Infinity;
    for (const p of prevIdx) {
      const diff = Math.min((n - p + 12) % 12, (p - n + 12) % 12);
      best = Math.max(0, Math.min(best, diff));
    }
    total += best;
  }
  return total;
}

export function suggestNextChords(contextKey: RootNote, progression: { root: RootNote; type: ChordType }[]): SuggestedChord[] {
  const suggestions: SuggestedChord[] = [];
  const last = progression[progression.length - 1];

  const scale = getScale(contextKey, 'maj');
  for (const degree of [0,2,4,5,7,9,11]) {
    const root = transpose(getNoteIndex(contextKey), degree);
    const type = DIATONIC_TRIADS_MAJ[degree];
    suggestions.push({ root, type, reason: 'Diatonic' });
  }

  const targets: RootNote[] = [transpose(getNoteIndex(contextKey), 2), transpose(getNoteIndex(contextKey), 4), transpose(getNoteIndex(contextKey), 5), transpose(getNoteIndex(contextKey), 7), transpose(getNoteIndex(contextKey), 9)];
  for (const t of targets) {
    const VofT = transpose(getNoteIndex(t), -5);
    suggestions.push({ root: VofT, type: '7', reason: `Secondary dominant resolving to ${t}` });
  }

  const ivMinor = transpose(getNoteIndex(contextKey), 5);
  suggestions.push({ root: ivMinor, type: 'min', reason: 'Borrowed iv (minor) from parallel minor' });
  const bVII = transpose(getNoteIndex(contextKey), 10);
  suggestions.push({ root: bVII, type: 'maj', reason: 'Borrowed bVII from modal interchange' });

  if (last) {
    suggestions.sort((a, b) => {
      const aCost = voiceLeadingCost(getChordNotes(last.root, last.type), getChordNotes(a.root, a.type));
      const bCost = voiceLeadingCost(getChordNotes(last.root, last.type), getChordNotes(b.root, b.type));
      return aCost - bCost;
    });
  }

  const seen = new Set<string>();
  return suggestions.filter(s => {
    const k = `${s.root}:${s.type}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  }).slice(0, 12);
}

/**
 * Generate voicing for a chord with optional context for smooth voice leading
 */
export function getChordVoicing(
  root: RootNote,
  type: ChordType,
  options: {
    style?: VoicingStyle;
    previousVoicing?: number[];
    octaveRange?: { min: number; max: number };
  } = {}
): { midi: number[]; notes: string[] } {
  const context: VoicingContext = {
    style: options.style || 'close',
    previousVoicing: options.previousVoicing,
    octaveRange: options.octaveRange,
    prioritizeSmoothing: !!options.previousVoicing,
  };
  
  const midiNotes = generateRichVoicing(root, type, context);
  const playbackNotes = midiToPlaybackNotes(midiNotes);
  
  return { midi: midiNotes, notes: playbackNotes };
}

/**
 * Generate voicings for an entire progression with smooth voice leading
 */
export function getProgressionVoicings(
  progression: { root: RootNote; type: ChordType }[],
  options: {
    style?: VoicingStyle;
    octaveRange?: { min: number; max: number };
  } = {}
): Array<{ midi: number[]; notes: string[] }> {
  const voicings: Array<{ midi: number[]; notes: string[] }> = [];
  let previousVoicing: number[] | undefined;
  
  for (const chord of progression) {
    const voicing = getChordVoicing(chord.root, chord.type, {
      style: options.style,
      previousVoicing,
      octaveRange: options.octaveRange,
    });
    
    voicings.push(voicing);
    previousVoicing = voicing.midi;
  }
  
  return voicings;
}