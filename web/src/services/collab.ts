export class CollabClient {
  private ws: WebSocket | null = null;
  private sessionId: string = '';
  private onUpdate: (payload: any) => void;

  constructor(onUpdate: (payload: any) => void) {
    this.onUpdate = onUpdate;
  }

  connect(baseUrl: string, sessionId: string) {
    this.sessionId = sessionId;
    this.ws = new WebSocket(baseUrl.replace('http', 'ws') + '/collab');
    this.ws.onopen = () => this.ws?.send(JSON.stringify({ type: 'join', sessionId }));
    this.ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        if (msg.type === 'update') this.onUpdate(msg.payload);
      } catch {}
    };
    this.ws.onclose = () => { this.ws = null; };
  }

  sendUpdate(payload: any) {
    this.ws?.send(JSON.stringify({ type: 'update', sessionId: this.sessionId, payload }));
  }

  disconnect() {
    this.ws?.send(JSON.stringify({ type: 'leave', sessionId: this.sessionId }));
    this.ws?.close();
  }
}