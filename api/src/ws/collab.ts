import { Server } from 'http';
import { WebSocketServer, WebSocket } from 'ws';

type CollabMessage =
  | { type: 'join'; sessionId: string }
  | { type: 'update'; sessionId: string; payload: any }
  | { type: 'leave'; sessionId: string };

type Client = { ws: WebSocket; sessionId?: string };

export function startCollabServer(server: Server) {
  const wss = new WebSocketServer({ server, path: '/collab' });
  const clients = new Set<Client>();

  function broadcast(sessionId: string, data: any, except?: WebSocket) {
    for (const c of clients) {
      if (c.sessionId === sessionId && c.ws !== except && c.ws.readyState === WebSocket.OPEN) {
        c.ws.send(JSON.stringify(data));
      }
    }
  }

  wss.on('connection', (ws) => {
    const client: Client = { ws };
    clients.add(client);

    ws.on('message', (buf) => {
      try {
        const msg = JSON.parse(buf.toString()) as CollabMessage;
        if (msg.type === 'join') {
          client.sessionId = msg.sessionId;
          ws.send(JSON.stringify({ type: 'joined', sessionId: msg.sessionId }));
        } else if (msg.type === 'update' && client.sessionId) {
          broadcast(client.sessionId, { type: 'update', payload: msg.payload }, ws);
        } else if (msg.type === 'leave') {
          client.sessionId = undefined;
        }
      } catch {
        // ignore
      }
    });

    ws.on('close', () => clients.delete(client));
  });

  console.log('WebSocket collaboration server started at /collab');
}