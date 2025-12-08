import { Router } from 'express';
import { v4 as uuid } from 'uuid';

export const router = Router();

type ProgressionChord = { root: string; type: string; duration: number };
type LibraryItem = { id: string; userId?: string; name: string; chords: ProgressionChord[]; createdAt: string };

const cloud: Record<string, LibraryItem> = {};

router.post('/', (req, res) => {
  const body = req.body as Omit<LibraryItem, 'id' | 'createdAt'>;
  if (!body?.name || !Array.isArray(body?.chords)) return res.status(400).json({ error: 'Invalid body' });
  const item: LibraryItem = { id: uuid(), name: body.name, chords: body.chords, userId: body.userId, createdAt: new Date().toISOString() };
  cloud[item.id] = item;
  res.json(item);
});

router.get('/', (_req, res) => { res.json(Object.values(cloud)); });
router.get('/:id', (req, res) => { const item = cloud[req.params.id]; if (!item) return res.status(404).json({ error: 'Not found' }); res.json(item); });
router.delete('/:id', (req, res) => { const exists = Boolean(cloud[req.params.id]); delete cloud[req.params.id]; res.json({ ok: exists }); });

export { };