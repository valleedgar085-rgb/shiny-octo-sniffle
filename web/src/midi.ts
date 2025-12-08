import { Settings } from './store/settings';
import { RootNote, ChordType, getChordNotes } from '../../lib/chords';

const NOTE_TO_MIDI: Record<string, number> = {
  'C': 60, 'C#': 61, 'D': 62, 'D#': 63, 'E': 64, 'F': 65, 'F#': 66,
  'G': 67, 'G#': 68, 'A': 69, 'A#': 70, 'B': 71
};
const INSTRUMENT_PROGRAM: Record<Settings['instrument'], number> = { piano: 0, guitar: 24, strings: 48 };

type ProgressionChord = { root: RootNote; type: ChordType; duration: number };

function vlq(n: number): number[] {
  const bytes: number[] = [];
  let buffer = n & 0x7F;
  while ((n >>= 7)) { buffer <<= 8; buffer |= ((n & 0x7F) | 0x80); }
  // eslint-disable-next-line no-constant-condition
  while (true) { bytes.push(buffer & 0xFF); if (buffer & 0x80) buffer >>= 8; else break; }
  return bytes;
}
function be16(n: number): number[] { return [(n >> 8) & 0xFF, n & 0xFF]; }
function be24(n: number): number[] { return [(n >> 16) & 0xFF, (n >> 8) & 0xFF, n & 0xFF]; }
function be32(n: number): number[] { return [(n >> 24) & 0xFF, (n >> 16) & 0xFF, (n >> 8) & 0xFF, n & 0xFF]; }

export function exportProgressionToMIDI(name: string, chords: ProgressionChord[], settings: Settings, ppq = 480) {
  const { bpm, velocity, instrument } = settings;
  const microPerQuarter = Math.round(60000000 / bpm);
  const program = INSTRUMENT_PROGRAM[instrument] ?? 0;

  const header = [
    ...Array.from(new TextEncoder().encode('MThd')),
    ...be32(6),
    ...be16(1),
    ...be16(2),
    ...be16(ppq),
  ];

  const tr0: number[] = [];
  tr0.push(...vlq(0), 0xFF, 0x58, 0x04, 4, 2, 24, 8);
  tr0.push(...vlq(0), 0xFF, 0x51, 0x03, ...be24(microPerQuarter));
  tr0.push(...vlq(0), 0xFF, 0x2F, 0x00);
  const track0 = [ ...Array.from(new TextEncoder().encode('MTrk')), ...be32(tr0.length), ...tr0 ];

  const tr1: number[] = [];
  const channel = 0;
  tr1.push(...vlq(0), 0xC0 | channel, program);

  let absTicks = 0;
  for (const chord of chords) {
    const notes = getChordNotes(chord.root, chord.type)
      .map(n => NOTE_TO_MIDI[n])
      .filter((p): p is number => typeof p === 'number');

    tr1.push(...vlq(absTicks), 0x90 | channel, notes[0], Math.max(1, Math.min(127, velocity)));
    for (let i = 1; i < notes.length; i++) tr1.push(...vlq(0), 0x90 | channel, notes[i], Math.max(1, Math.min(127, velocity)));

    const durationTicks = Math.max(ppq / 4, chord.duration * ppq);
    absTicks += durationTicks;

    tr1.push(...vlq(durationTicks), 0x80 | channel, notes[0], 0x40);
    for (let i = 1; i < notes.length; i++) tr1.push(...vlq(0), 0x80 | channel, notes[i], 0x40);
  }
  tr1.push(...vlq(0), 0xFF, 0x2F, 0x00);
  const track1 = [ ...Array.from(new TextEncoder().encode('MTrk')), ...be32(tr1.length), ...tr1 ];

  const bytes = [...header, ...track0, ...track1];
  const blob = new Blob([new Uint8Array(bytes)], { type: 'audio/midi' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `${name.replace(/\s+/g, '_')}.mid`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}