import * as Tone from 'tone';
import { Settings } from './store/settings';
import { VoicingStyle } from '../../lib/theory';

function velocityToGain(vel: number): number {
  const clamped = Math.max(1, Math.min(127, vel));
  return 0.1 + (clamped / 127) * 0.9;
}

type PlayEvent = { notes: string[]; duration: number };

export async function playProgression(events: PlayEvent[], settings: Settings) {
  await Tone.start();
  const synth = new Tone.PolySynth(Tone.Synth).toDestination();
  const gainNode = new Tone.Gain(velocityToGain(settings.velocity)).toDestination();
  synth.connect(gainNode);

  let time = 0;
  const msPerBeat = 60000 / settings.bpm;

  for (const ev of events) {
    const durSec = Math.max(0.2, (ev.duration * msPerBeat) / 1000);
    // Notes are already formatted with octaves (e.g., "C4", "E4", "G4")
    synth.triggerAttackRelease(ev.notes, durSec, Tone.now() + time);
    time += durSec;
  }
}

export async function playProgressionWithVoicing(
  events: Array<{ notes: string[]; duration: number }>,
  settings: Settings
) {
  await playProgression(events, settings);
}