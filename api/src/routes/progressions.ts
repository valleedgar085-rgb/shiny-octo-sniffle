import { Router } from 'express';
import { v4 as uuid } from 'uuid';

export const router = Router();

type ProgressionChord = { root: string; type: string; duration: number };
type Progression = {
  id: string;
  name: string;
  public: boolean;
  chords: ProgressionChord[];
  createdAt: string;
};

const store: Progression[] = [];

router.post('/', (req, res) => {
  const body = req.body as Omit<Progression, 'id' | 'createdAt'>;
  if (!body?.name || !Array.isArray(body?.chords)) {
    return res.status(400).json({ error: 'Invalid body' });
  }
  const prog: Progression = {
    id: uuid(),
    name: body.name,
    public: Boolean(body.public),
    chords: body.chords,
    createdAt: new Date().toISOString(),
  };
  store.push(prog);
  res.json({ id: prog.id });
});

router.get('/public', (_req, res) => {
  const publicOnes = store.filter(p => p.public);
  res.json(publicOnes);
});

export { };