const BASE = 'http://localhost:3001/api/library';

export type LibraryItem = {
  id?: string;
  userId?: string;
  name: string;
  createdAt?: string;
  chords: { root: string; type: string; duration: number }[];
};

export async function cloudList(): Promise<LibraryItem[]> {
  const res = await fetch(BASE);
  return res.json();
}
export async function cloudCreate(item: LibraryItem): Promise<LibraryItem> {
  const res = await fetch(BASE, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(item) });
  return res.json();
}
export async function cloudDelete(id: string): Promise<{ ok: boolean }> {
  const res = await fetch(`${BASE}/${id}`, { method: 'DELETE' });
  return res.json();
}