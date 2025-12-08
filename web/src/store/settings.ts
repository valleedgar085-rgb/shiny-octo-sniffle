import { VoicingStyle } from '../../../lib/theory';

export type Instrument = 'piano' | 'guitar' | 'strings';
export type Settings = { 
  bpm: number; 
  velocity: number; 
  instrument: Instrument;
  voicingStyle: VoicingStyle;
  useRichVoicing: boolean;
};

const KEY = 'chord-platform-web-settings';
const DEFAULTS: Settings = { 
  bpm: 100, 
  velocity: 90, 
  instrument: 'piano',
  voicingStyle: 'close',
  useRichVoicing: true,
};

export function getSettings(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULTS;
    const val = JSON.parse(raw);
    return { ...DEFAULTS, ...val };
  } catch {
    return DEFAULTS;
  }
}

export function saveSettings(s: Settings) {
  localStorage.setItem(KEY, JSON.stringify(s));
}