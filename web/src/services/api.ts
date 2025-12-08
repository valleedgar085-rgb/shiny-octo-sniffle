const BASE = 'http://localhost:3001/api';

type SaveChord = { root: string; type: string; duration: number };
type SaveReq = { name: string; public: boolean; chords: SaveChord[] };

export async function saveProgression(body: SaveReq): Promise<{ id: string } | null> {
  const res = await fetch(`${BASE}/progressions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}