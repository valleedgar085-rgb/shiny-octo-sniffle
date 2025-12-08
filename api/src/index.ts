import express from 'express';
import cors from 'cors';
import { router as progressionRouter } from './routes/progressions';
import { router as libraryRouter } from './routes/library';
import { startCollabServer } from './ws/collab';

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/progressions', progressionRouter);
app.use('/api/library', libraryRouter);

const PORT = Number(process.env.PORT || 3001);
const server = app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
});

startCollabServer(server);