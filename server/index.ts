import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { cors } from 'hono/cors';
import { secureHeaders } from 'hono/secure-headers';
import dotenv from 'dotenv';
import { db } from './db';
import { generateValidatedDrills } from './groq';
import { GenerateRequestSchema, UpdateDrillSchema, FlagRequestSchema } from './schemas';

// Load environment variables strictly into server process.env
dotenv.config({ path: '.env.local' });
dotenv.config();

const app = new Hono();

// Security Headers & CORS (from Context7 Hono best practices)
app.use('*', secureHeaders());
app.use('/api/*', cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  maxAge: 600,
  credentials: true
}));

// Global Request Logger
app.use('*', async (c, next) => {
  const start = performance.now();
  await next();
  const ms = Math.round(performance.now() - start);
  console.log(`[API] ${c.req.method} ${c.req.path} -> ${c.res.status} (${ms}ms)`);
});

// Health check
app.get('/api/health', (c) => {
  return c.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'skyy-learn-backend',
    runtime: 'Node.js + Hono (TypeScript)',
    llmProvider: 'Groq Cloud (LPU)',
    model: 'qwen/qwen3.8-27b',
    keyIsolation: 'Server-side process.env (0 key exposure to browser)'
  });
});

// Get active session
app.get('/api/session', (c) => {
  const session = db.getSession();
  const drills = db.getDrills();
  const flags = db.getFlags();

  return c.json({
    session,
    drills,
    flags
  });
});

// Generate drills (Tutor Action: Calls server-side Groq LPU)
app.post('/api/sessions/generate', async (c) => {
  try {
    const body = await c.req.json();
    const parsed = GenerateRequestSchema.safeParse(body);

    if (!parsed.success) {
      return c.json({
        success: false,
        error: 'Invalid request parameters',
        details: parsed.error.issues
      }, 400);
    }

    const { studentName, subject, tutorNotes, tutorToneNote } = parsed.data;

    // Update session metadata
    db.updateSession('session-default', {
      studentName,
      subject,
      tutorNotes,
      tutorToneNote,
      isApproved: false
    });

    // Call server-side Groq with Zod validation
    const result = await generateValidatedDrills({
      studentName,
      subject,
      tutorNotes,
      tutorToneNote
    });

    // Save to persistent DB with approvedAt: null (Locked state)
    const createdDrills = db.setDrillsForSession(
      'session-default',
      result.drills.map(d => ({
        id: d.id,
        title: d.title,
        question: d.question,
        options: d.options,
        correctIndex: d.correctIndex,
        explanation: d.explanation,
        hint: d.hint,
        approvedAt: null
      }))
    );

    return c.json({
      success: true,
      drills: createdDrills,
      meta: {
        durationMs: result.durationMs,
        model: result.model
      }
    });
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    console.error('[Generate Error]:', error);
    return c.json({
      success: false,
      error: error.message
    }, 500);
  }
});

// Tutor edits a drill
app.patch('/api/drills/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const parsed = UpdateDrillSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ success: false, error: parsed.error.issues }, 400);
  }

  const updated = db.updateDrill(id, parsed.data);
  if (!updated) {
    return c.json({ success: false, error: 'Drill not found' }, 404);
  }

  return c.json({ success: true, drill: updated });
});

// Tutor Approves All Drills (The Core Guardrail)
app.post('/api/drills/approve-all', (c) => {
  const drills = db.approveAllDrills('session-default');
  return c.json({
    success: true,
    message: 'All drills verified and approved by tutor',
    drills
  });
});

// Learner Endpoint (GATED BY SERVER: Only approved drills returned!)
app.get('/api/learner/drills', (c) => {
  const session = db.getSession('session-default');
  if (!session.isApproved) {
    return c.json({
      ready: false,
      message: 'Practice drills are currently awaiting tutor verification and approval.',
      drills: []
    }, 403);
  }

  const approvedDrills = db.getApprovedDrills('session-default');
  return c.json({
    ready: true,
    studentName: session.studentName,
    subject: session.subject,
    drills: approvedDrills
  });
});

// Learner Flags a Question for Next Session
app.post('/api/learner/flag', async (c) => {
  const body = await c.req.json();
  const parsed = FlagRequestSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ success: false, error: parsed.error.issues }, 400);
  }

  const flag = db.addFlag(
    'session-default',
    parsed.data.drillId,
    parsed.data.question,
    parsed.data.studentNote
  );

  return c.json({
    success: true,
    message: 'Flag queued for next 1:1 session agenda',
    flag
  });
});

// Next Session Agenda Aggregation
app.get('/api/agenda', (c) => {
  const session = db.getSession('session-default');
  const drills = db.getDrills('session-default');
  const flags = db.getFlags('session-default');

  return c.json({
    session,
    totalDrills: drills.length,
    flags
  });
});

const PORT = 3001;
console.log(`[Skyy Learn Server] Starting on port ${PORT}...`);

serve({
  fetch: app.fetch,
  port: PORT
}, (info) => {
  console.log(`[Skyy Learn Server] Running on http://localhost:${info.port}`);
});
