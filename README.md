# Chord Progression Platform (Monorepo)

Create professional chord progressions on web and mobile. Features include:
- Shared music theory (chords, scales, inversions, voice-leading suggestions)
- Web app (React + TypeScript + Tone.js) with settings, MIDI export
- Mobile app (Expo React Native + TypeScript) with sample-based playback, settings, MIDI export
- API (Node + Express + TypeScript) for saving progressions, cloud library
- Real-time collaboration via WebSockets
- Git LFS tracking for audio samples (*.wav)

Monorepo structure:
- /lib — shared TypeScript logic (chords, theory)
- /web — React web app
- /app — React Native (Expo) app
- /api — Node/Express API + WebSocket collaboration server

Quick start:
1) API
```
cd api
npm i
npm run dev
```
- HTTP: http://localhost:3001
- WebSockets: ws://localhost:3001/collab

2) Web
```
cd web
npm i
npm run dev
```
- Open Vite dev server URL (e.g., http://localhost:5173)

3) Mobile (Expo)
- Add note samples into `app/assets/samples/{piano|guitar|strings}/` for notes: C, Cs, D, Ds, E, F, Fs, G, Gs, A, As, B (short mono WAVs).
```
cd app
npm i
npm run start
```
- Open in Expo Go on device or emulator.

Authentication (optional):
- Add Firebase config in `app/src/services/auth.ts` to enable authenticated backend saves.

MIDI export:
- Web and App export Standard MIDI Files (Type 1) with tempo and program change, per-chord durations.

Collaboration:
- Start/join session with a short code; clients broadcast chord lists via WebSocket.
- For robust CRDT-based sync, integrate Yjs later.

Cloud library:
- Simple in-memory store in API; replace with MongoDB/Postgres for persistence.

License: MIT.
