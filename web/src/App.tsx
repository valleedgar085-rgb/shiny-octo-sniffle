import React, { useState, useMemo, useEffect } from 'react';
import { ROOTS, CHORD_FORMULAS, ChordType, getChordNotes, RootNote } from '../../lib/chords';
import { getInversions, suggestNextChords } from '../../lib/theory';
import { playProgression } from './audio';
import { saveProgression } from './services/api';
import { getSettings, saveSettings, Settings, Instrument } from './store/settings';
import { exportProgressionToMIDI } from './midi';
import { CollabClient } from './services/collab';
import { cloudCreate, cloudList, cloudDelete } from './services/cloud';

type ProgressionChord = { root: RootNote; type: ChordType; duration: number };

function App() {
  const [root, setRoot] = useState<RootNote>('C');
  const [type, setType] = useState<ChordType>('maj');
  const [chords, setChords] = useState<ProgressionChord[]>([]);
  const [name, setName] = useState<string>('My progression');
  const [settings, setSettings] = useState<Settings>(getSettings());
  const [sessionId, setSessionId] = useState<string>('');
  const [cloudItems, setCloudItems] = useState<any[]>([]);
  const collab = useMemo(() => new CollabClient((payload) => {
    if (payload?.chords) setChords(payload.chords);
  }), []);

  useEffect(() => { setSettings(getSettings()); }, []);
  useEffect(() => { (async () => setCloudItems(await cloudList()))(); }, []);

  const addChord = () => setChords(prev => [...prev, { root, type, duration: 1 }]);
  const updateDuration = (idx: number, delta: number) =>
    setChords(prev => prev.map((c, i) => i === idx ? { ...c, duration: Math.max(1, c.duration + delta) } : c));
  const applyInversion = (idx: number, inv: keyof ReturnType<typeof getInversions>) => {
    alert(`Applied ${inv} inversion (visual). Advanced voicing playback can be added later.`);
  };
  const removeChord = (idx: number) => setChords(prev => prev.filter((_, i) => i !== idx));
  const clear = () => setChords([]);

  const events = useMemo(
    () => chords.map(c => ({ notes: getChordNotes(c.root, c.type), duration: c.duration })),
    [chords]
  );

  const suggestions = useMemo(() => suggestNextChords('C', chords), [chords]);

  const handlePlay = async () => { await playProgression(events, settings); };
  const handleSave = async () => {
    try { const res = await saveProgression({ name, chords, public: true }); alert(`Saved: ${res?.id || 'ok'}`); }
    catch (e) { console.error(e); alert('Failed to save'); }
  };

  const onSettingsChange = (update: Partial<Settings>) => {
    const next = { ...settings, ...update };
    setSettings(next);
    saveSettings(next);
  };

  const handleExportMIDI = () => { exportProgressionToMIDI(name || 'progression', chords, settings); };

  const startCollab = () => {
    const sid = sessionId || Math.random().toString(36).slice(2, 8);
    setSessionId(sid);
    collab.connect('http://localhost:3001', sid);
    alert(`Collab session started: ${sid} — share this code with collaborators`);
  }; 
  const sendUpdate = () => collab.sendUpdate({ chords });

  const syncCloud = async () => {
    const created = await cloudCreate({ name, chords });
    alert(`Uploaded to cloud: ${created.id}`);
    setCloudItems(await cloudList());
  };
  const deleteCloud = async (id: string) => { await cloudDelete(id); setCloudItems(await cloudList()); };

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: 16 }}>
      <header style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <span>🎼</span><h1 style={{ margin: 0 }}>Chord Progression Builder</h1>
      </header>

      <section style={{ marginTop: 16 }}>
        <h3>Settings</h3>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <label>BPM
            <input type="number" value={settings.bpm} min={40} max={240}
              onChange={e => onSettingsChange({ bpm: Math.max(40, Math.min(240, Number(e.target.value) || 100)) })} />
          </label>
          <label>Velocity (0-127)
            <input type="number" value={settings.velocity} min={1} max={127}
              onChange={e => onSettingsChange({ velocity: Math.max(1, Math.min(127, Number(e.target.value) || 90)) })} />
          </label>
          <label>Instrument
            <select value={settings.instrument} onChange={e => onSettingsChange({ instrument: e.target.value as Instrument })}>
              <option value="piano">Piano</option>
              <option value="guitar">Guitar</option>
              <option value="strings">Strings</option>
            </select>
          </label>
        </div>
      </section>

      <section style={{ marginTop: 16 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <label>Root:
            <select value={root} onChange={e => setRoot(e.target.value as RootNote)}>
              {ROOTS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </label>
          <label>Type:
            <select value={type} onChange={e => setType(e.target.value as ChordType)}>
              {Object.keys(CHORD_FORMULAS).map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>
          <button onClick={addChord}>Add chord</button>
          <button onClick={handlePlay} disabled={!chords.length}>Play</button>
          <button onClick={clear} disabled={!chords.length}>Clear</button>
        </div>

        <div style={{ marginTop: 16 }}>
          <h3>Progression</h3>
          {chords.length === 0 && <p>No chords yet. Add some!</p>}
          <ol>
            {chords.map((c, i) => {
              const inversions = getInversions(c.root, c.type);
              return (
                <li key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span>{c.root}{c.type} — [{getChordNotes(c.root, c.type).join(', ')}]</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span>Beats:</span>
                    <button onClick={() => updateDuration(i, -1)}>-</button>
                    <span>{c.duration}</span>
                    <button onClick={() => updateDuration(i, +1)}>+</button>
                  </div>
                  <div>
                    <span>Inversions: </span>
                    {(['root','first','second','third'] as const).map(inv =>
                      <button key={inv} onClick={() => applyInversion(i, inv)}>{inv}</button>
                    )}
                  </div>
                  <button onClick={() => removeChord(i)}>Remove</button>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      <section style={{ marginTop: 16 }}>
        <h3>Suggestions</h3>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {suggestions.map((s, idx) => (
            <button key={`${s.root}-${s.type}-${idx}`} title={s.reason} onClick={() => setChords(prev => [...prev, { root: s.root, type: s.type, duration: 1 }])}>  
              {s.root}{s.type} ({s.reason})
            </button>
          ))}
        </div>
      </section>

      <section style={{ marginTop: 16 }}>
        <h3>Collaboration</h3>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input value={sessionId} onChange={e => setSessionId(e.target.value)} placeholder="Session code" />
          <button onClick={startCollab}>Start/Join</button>
          <button onClick={sendUpdate} disabled={!sessionId}>Send update to session</button>
        </div>
      </section>

      <section style={{ marginTop: 16 }}>
        <h3>Save/Export</h3>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Progression name" />
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <button onClick={handleSave} disabled={!chords.length}>Save progression</button>
          <button onClick={handleExportMIDI} disabled={!chords.length}>Export MIDI</button>
          <button onClick={syncCloud} disabled={!chords.length}>Upload to cloud</button>
        </div>
        <div style={{ marginTop: 12 }}>
          <h4>Cloud Library</h4>
          <ul>
            {cloudItems.map((it: any) => (
              <li key={it.id} style={{ display: 'flex', gap: 8 }}>
                <span>{it.name} — {new Date(it.createdAt).toLocaleString()}</span>
                <button onClick={() => deleteCloud(it.id)}>Delete</button>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}

export default App;
