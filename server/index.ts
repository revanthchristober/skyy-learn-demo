import { serve } from '@hono/node-server';
import { app } from './app';
import { initRealtime, setRealtimeInstance } from './realtime';

const PORT = 3001;
console.log(`[Skyy Learn Server] Starting on port ${PORT}...`);

const server = serve({
  fetch: app.fetch,
  port: PORT
}, (info) => {
  console.log(`[Skyy Learn Server] Running on http://localhost:${info.port}`);
});

const realtime = initRealtime(server);
setRealtimeInstance(realtime);

export { app, server, realtime };
