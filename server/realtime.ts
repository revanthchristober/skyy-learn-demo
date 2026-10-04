import { WebSocketServer, WebSocket } from 'ws';

export type RealtimeEvent =
  | {
      type: 'DRILLS_APPROVED';
      payload: {
        sessionId: string;
        drills: any[];
        approvedAt: string;
      };
      timestamp: string;
    }
  | {
      type: 'QUESTION_FLAGGED';
      payload: {
        sessionId: string;
        flag: any;
      };
      timestamp: string;
    }
  | {
      type: 'CONNECTED';
      payload: {
        clientId: string;
        activeConnections: number;
      };
      timestamp: string;
    };

const clients = new Set<WebSocket>();

export function initRealtime(server: any) {
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws) => {
    const clientId = Math.random().toString(36).substring(2, 9);
    clients.add(ws);
    console.log(`[WebSocket] Client connected: ${clientId} (Total active: ${clients.size})`);

    // Welcome handshake
    ws.send(JSON.stringify({
      type: 'CONNECTED',
      payload: {
        clientId,
        activeConnections: clients.size
      },
      timestamp: new Date().toISOString()
    }));

    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'PING') {
          ws.send(JSON.stringify({ type: 'PONG', timestamp: new Date().toISOString() }));
        }
      } catch {
        // ignore malformed ping
      }
    });

    ws.on('close', () => {
      clients.delete(ws);
      console.log(`[WebSocket] Client disconnected: ${clientId} (Remaining: ${clients.size})`);
    });

    ws.on('error', (err) => {
      console.error(`[WebSocket Error] Client ${clientId}:`, err.message);
      clients.delete(ws);
    });
  });

  return {
    broadcast(event: RealtimeEvent) {
      const data = JSON.stringify(event);
      console.log(`[WebSocket Broadcast] Event: ${event.type} to ${clients.size} clients`);
      for (const client of clients) {
        if (client.readyState === WebSocket.OPEN) {
          try {
            client.send(data);
          } catch (err) {
            console.error('[WebSocket Send Error]:', err);
          }
        }
      }
    },
    getClientCount() {
      return clients.size;
    }
  };
}

let realtimeInstance: ReturnType<typeof initRealtime> | null = null;

export function setRealtimeInstance(instance: ReturnType<typeof initRealtime>) {
  realtimeInstance = instance;
}

export function broadcastRealtime(event: RealtimeEvent) {
  if (realtimeInstance) {
    realtimeInstance.broadcast(event);
  }
}
