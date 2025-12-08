import { RootNote, ChordType, CHORD_FORMULAS, getNoteIndex, ROOTS } from './chords';

export type VoicingStyle = 'close' | 'open' | 'drop2' | 'drop3';
export type VoicingContext = {
  previousVoicing?: number[];
  octaveRange?: { min: number; max: number };
  style?: VoicingStyle;
  prioritizeSmoothing?: boolean;
};

/**
 * Convert a note name to a MIDI note number with octave
 */
export function noteToMidi(note: RootNote, octave: number): number {
  return getNoteIndex(note) + (octave + 1) * 12;
}

/**
 * Convert a MIDI note number to a note name with octave
 */
export function midiToNote(midi: number): { note: RootNote; octave: number } {
  const pitchClass = midi % 12;
  const octave = Math.floor(midi / 12) - 1;
  return { note: ROOTS[pitchClass], octave };
}

/**
 * Calculate the distance between two MIDI notes (in semitones)
 */
export function voiceDistance(note1: number, note2: number): number {
  return Math.abs(note2 - note1);
}

/**
 * Calculate the total voice leading cost between two voicings
 * Lower cost means smoother voice leading
 */
export function calculateVoiceLeadingCost(prev: number[], next: number[]): number {
  if (prev.length === 0) return 0;
  
  // For each voice in the next chord, find the closest voice in the previous chord
  let totalCost = 0;
  const usedVoices = new Set<number>();
  
  for (const nextVoice of next) {
    let minDist = Infinity;
    let bestIdx = -1;
    
    for (let i = 0; i < prev.length; i++) {
      if (usedVoices.has(i)) continue;
      const dist = voiceDistance(prev[i], nextVoice);
      if (dist < minDist) {
        minDist = dist;
        bestIdx = i;
      }
    }
    
    if (bestIdx !== -1) {
      usedVoices.add(bestIdx);
      totalCost += minDist;
    }
  }
  
  return totalCost;
}

/**
 * Generate a close voicing (all notes within an octave)
 */
export function generateCloseVoicing(
  root: RootNote,
  type: ChordType,
  baseOctave: number = 4
): number[] {
  const intervals = CHORD_FORMULAS[type];
  const rootMidi = noteToMidi(root, baseOctave);
  return intervals.map(semitones => rootMidi + semitones);
}

/**
 * Generate an open voicing (spread beyond an octave)
 */
export function generateOpenVoicing(
  root: RootNote,
  type: ChordType,
  baseOctave: number = 4
): number[] {
  const intervals = CHORD_FORMULAS[type];
  const rootMidi = noteToMidi(root, baseOctave);
  
  // For open voicing, spread middle voices up by an octave
  return intervals.map((semitones, idx) => {
    if (idx > 0 && idx < intervals.length - 1) {
      return rootMidi + semitones + 12; // Middle voices up an octave
    }
    return rootMidi + semitones;
  });
}

/**
 * Generate a drop-2 voicing (second voice from top dropped an octave)
 */
export function generateDrop2Voicing(
  root: RootNote,
  type: ChordType,
  baseOctave: number = 4
): number[] {
  const close = generateCloseVoicing(root, type, baseOctave);
  if (close.length < 3) return close;
  
  // Drop the second-highest voice by an octave
  const sorted = [...close].sort((a, b) => b - a);
  const drop2 = [...close];
  const secondHighest = sorted[1];
  const idx = drop2.indexOf(secondHighest);
  if (idx !== -1) {
    drop2[idx] = secondHighest - 12;
  }
  
  return drop2.sort((a, b) => a - b);
}

/**
 * Generate a drop-3 voicing (third voice from top dropped an octave)
 */
export function generateDrop3Voicing(
  root: RootNote,
  type: ChordType,
  baseOctave: number = 4
): number[] {
  const close = generateCloseVoicing(root, type, baseOctave);
  if (close.length < 4) return close;
  
  // Drop the third-highest voice by an octave
  const sorted = [...close].sort((a, b) => b - a);
  const drop3 = [...close];
  const thirdHighest = sorted[2];
  const idx = drop3.indexOf(thirdHighest);
  if (idx !== -1) {
    drop3[idx] = thirdHighest - 12;
  }
  
  return drop3.sort((a, b) => a - b);
}

/**
 * Apply inversion to a voicing by moving the lowest note up by octaves
 */
export function applyInversion(voicing: number[], inversion: number): number[] {
  if (inversion === 0 || voicing.length === 0) return voicing;
  
  const result = [...voicing];
  for (let i = 0; i < Math.min(inversion, voicing.length); i++) {
    const lowest = Math.min(...result);
    const idx = result.indexOf(lowest);
    result[idx] = lowest + 12;
  }
  
  return result.sort((a, b) => a - b);
}

/**
 * Constrain voicing to a specific octave range
 */
export function constrainToRange(
  voicing: number[],
  min: number,
  max: number
): number[] {
  return voicing.map(note => {
    let adjusted = note;
    while (adjusted < min) adjusted += 12;
    while (adjusted > max) adjusted -= 12;
    return adjusted;
  }).sort((a, b) => a - b);
}

/**
 * Find the best voicing that minimizes voice leading from previous chord
 */
export function findSmoothVoicing(
  root: RootNote,
  type: ChordType,
  context: VoicingContext
): number[] {
  const baseOctave = context.octaveRange?.min ? 
    Math.floor(context.octaveRange.min / 12) - 1 : 4;
  
  // Generate base voicing based on style
  let baseVoicing: number[];
  switch (context.style) {
    case 'open':
      baseVoicing = generateOpenVoicing(root, type, baseOctave);
      break;
    case 'drop2':
      baseVoicing = generateDrop2Voicing(root, type, baseOctave);
      break;
    case 'drop3':
      baseVoicing = generateDrop3Voicing(root, type, baseOctave);
      break;
    case 'close':
    default:
      baseVoicing = generateCloseVoicing(root, type, baseOctave);
      break;
  }
  
  // If no previous voicing, return base voicing
  if (!context.previousVoicing || !context.prioritizeSmoothing) {
    if (context.octaveRange) {
      return constrainToRange(baseVoicing, context.octaveRange.min, context.octaveRange.max);
    }
    return baseVoicing;
  }
  
  // Try different octave transpositions and inversions to minimize voice leading
  const candidates: { voicing: number[]; cost: number }[] = [];
  
  // Try base voicing and transpositions
  for (let octaveShift = -2; octaveShift <= 2; octaveShift++) {
    const transposed = baseVoicing.map(n => n + octaveShift * 12);
    
    // Try different inversions
    for (let inv = 0; inv < Math.min(4, baseVoicing.length); inv++) {
      const candidate = applyInversion(transposed, inv);
      
      // Check if within range
      if (context.octaveRange) {
        const inRange = candidate.every(
          n => n >= context.octaveRange!.min && n <= context.octaveRange!.max
        );
        if (!inRange) continue;
      }
      
      const cost = calculateVoiceLeadingCost(context.previousVoicing, candidate);
      candidates.push({ voicing: candidate, cost });
    }
  }
  
  // Return the voicing with the lowest cost
  if (candidates.length === 0) return baseVoicing;
  
  candidates.sort((a, b) => a.cost - b.cost);
  return candidates[0].voicing;
}

/**
 * Generate a rich voicing for a chord with full context
 */
export function generateRichVoicing(
  root: RootNote,
  type: ChordType,
  context: VoicingContext = {}
): number[] {
  return findSmoothVoicing(root, type, {
    style: context.style || 'close',
    octaveRange: context.octaveRange || { min: 48, max: 84 }, // C3 to C6
    previousVoicing: context.previousVoicing,
    prioritizeSmoothing: context.prioritizeSmoothing !== false,
  });
}

/**
 * Convert MIDI notes back to note names with octaves for playback
 */
export function midiToPlaybackNotes(midiNotes: number[]): string[] {
  return midiNotes.map(midi => {
    const { note, octave } = midiToNote(midi);
    return `${note}${octave}`;
  });
}
