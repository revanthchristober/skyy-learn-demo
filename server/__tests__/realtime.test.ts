import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';
import { WebSocket } from 'ws';
import { initRealtime, setRealtimeInstance, broadcastRealtime } from '../realtime';

describe('Real-time WebSocket Push Synchronization', () => {
  let server: http.Server;
  let port: number;
  let realtime: ReturnType<typeof initRealtime>;

  beforeAll(async () => {
    server = http.createServer();
    realtime = initRealtime(server);
    setRealtimeInstance(realtime);

    await new Promise<void>((resolve) => {
      server.listen(0, () => {
        const addr = server.address();
        if (typeof addr === 'object' && addr) {
          port = addr.port;
        }
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  it('connects and receives welcome handshake with client count', async () => {
    const ws = new WebSocket(`ws://localhost:${port}/ws`);

    const welcomeMsg = await new Promise<any>((resolve) => {
      ws.on('message', (raw) => {
        resolve(JSON.parse(raw.toString()));
      });
    });

    expect(welcomeMsg.type).toBe('CONNECTED');
    expect(welcomeMsg.payload).toHaveProperty('clientId');
    expect(welcomeMsg.payload.activeConnections).toBeGreaterThanOrEqual(1);

    ws.close();
    await new Promise((r) => setTimeout(r, 50));
  });

  it('broadcasts DRILLS_APPROVED event to connected clients', async () => {
    const ws = new WebSocket(`ws://localhost:${port}/ws`);

    // Wait for initial welcome handshake
    await new Promise<void>((resolve) => {
      ws.once('message', () => resolve());
    });

    const broadcastPromise = new Promise<any>((resolve) => {
      ws.once('message', (raw) => {
        resolve(JSON.parse(raw.toString()));
      });
    });

    const mockDrills = [
      {
        id: 'drill-rt-1',
        title: 'Shop Measurement Drill',
        question: 'What is 3/8" converted to 16ths?',
        options: ['6/16"', '4/16"', '8/16"', '3/16"'],
        correctIndex: 0,
        explanation: '3/8 multiplied by 2/2 equals 6/16.',
        hint: 'Multiply top and bottom by 2.',
        approvedAt: new Date().toISOString()
      }
    ];

    broadcastRealtime({
      type: 'DRILLS_APPROVED',
      payload: {
        sessionId: 'session-demo',
        drills: mockDrills,
        approvedAt: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    });

    const received = await broadcastPromise;
    expect(received.type).toBe('DRILLS_APPROVED');
    expect(received.payload.drills).toHaveLength(1);
    expect(received.payload.drills[0].id).toBe('drill-rt-1');

    ws.close();
    await new Promise((r) => setTimeout(r, 50));
  });

  it('broadcasts QUESTION_FLAGGED event to connected clients', async () => {
    const ws = new WebSocket(`ws://localhost:${port}/ws`);

    await new Promise<void>((resolve) => {
      ws.once('message', () => resolve());
    });

    const flagPromise = new Promise<any>((resolve) => {
      ws.once('message', (raw) => {
        resolve(JSON.parse(raw.toString()));
      });
    });

    const mockFlag = {
      drillId: 'drill-rt-1',
      question: 'What is 3/8" converted to 16ths?',
      studentNote: 'Confused about reducing fractions backwards',
      timestamp: new Date().toISOString()
    };

    broadcastRealtime({
      type: 'QUESTION_FLAGGED',
      payload: {
        sessionId: 'session-demo',
        flag: mockFlag
      },
      timestamp: new Date().toISOString()
    });

    const received = await flagPromise;
    expect(received.type).toBe('QUESTION_FLAGGED');
    expect(received.payload.flag.studentNote).toBe('Confused about reducing fractions backwards');

    ws.close();
    await new Promise((r) => setTimeout(r, 50));
  });
});
