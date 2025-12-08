export type Instrument = 'piano' | 'guitar' | 'strings';
export type Settings = { bpm: number; velocity: number; instrument: Instrument };

const KEY = 'chord-platform-web-settings';
const DEFAULTS: Settings = { bpm: 100, velocity: 90, instrument: 'piano' };

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