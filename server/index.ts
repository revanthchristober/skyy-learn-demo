import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { cors } from 'hono/cors';
import { secureHeaders } from 'hono/secure-headers';
import dotenv from 'dotenv';
import { postgresDb as db } from './postgresDb';
import { supabaseServer } from './supabase';
import { generateValidatedDrills } from './groq';
import { auditDrillsWithCheaperLLM } from './verifier';
import { GenerateRequestSchema, UpdateDrillSchema, FlagRequestSchema, RecordAttemptSchema } from './schemas';

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
    database: 'Supabase PostgreSQL 17 (Cloud)',
    host: 'db.bturhosivfvyvanztkjb.supabase.co',
    authProvider: 'Supabase GoTrue (JWT)',
    tables: ['profiles', 'sessions', 'session_notes', 'drills', 'drill_attempts', 'flagged_topics'],
    llmProvider: 'Groq Cloud (LPU)',
    generatorModel: 'qwen/qwen3.8-27b',
    auditorModel: 'openai/gpt-oss-20b',
    keyIsolation: 'Server-side process.env (0 key exposure to browser)'
  });
});

// Get active session
app.get('/api/session', async (c) => {
  const session = await db.getSession();
  const drills = await db.getDrills();
  const flags = await db.getFlags();

  return c.json({
    session,
    drills,
    flags
  });
});

// Generate drills (Tutor Action: Calls server-side Groq LPU + Auditor pass)
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

    // Update session metadata in live PostgreSQL
    await db.updateSession('00000000-0000-0000-0000-000000000001', {
      studentName,
      subject,
      tutorNotes,
      tutorToneNote,
      isApproved: false
    });

    // 1. Call server-side Groq with Zod validation (Primary Generation: Qwen 3.8 27B)
    const genResult = await generateValidatedDrills({
      studentName,
      subject,
      tutorNotes,
      tutorToneNote
    });

    // 2. Call second, cheaper LLM for independent correctness pass (Auditor: GPT-OSS 20B)
    const auditResult = await auditDrillsWithCheaperLLM(genResult.drills);

    // 3. Save to live Supabase Postgres with approved_at: null (Locked state) and attach audit metadata
    const createdDrills = await db.setDrillsForSession(
      '00000000-0000-0000-0000-000000000001',
      genResult.drills.map(d => ({
        id: d.id,
        title: d.title,
        question: d.question,
        options: d.options,
        correctIndex: d.correctIndex,
        explanation: d.explanation,
        hint: d.hint,
        approvedAt: null,
        audit: auditResult.audits.get(d.id)
      }))
    );

    const flaggedCount = createdDrills.filter(d => d.audit?.status === 'flagged').length;

    return c.json({
      success: true,
      drills: createdDrills,
      meta: {
        durationMs: genResult.durationMs + auditResult.durationMs,
        genDurationMs: genResult.durationMs,
        auditDurationMs: auditResult.durationMs,
        model: genResult.model,
        auditorModel: auditResult.auditorModel,
        attempts: genResult.attempts,
        retryLogs: genResult.retryLogs,
        flaggedCount
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

// Tutor edits a drill (can also update correctIndex)
app.patch('/api/drills/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const parsed = UpdateDrillSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ success: false, error: parsed.error.issues }, 400);
  }

  const updated = await db.updateDrill(id, parsed.data);
  if (!updated) {
    return c.json({ success: false, error: 'Drill not found' }, 404);
  }

  return c.json({ success: true, drill: updated });
});

// Tutor accepts the auditor's suggested answer key correction
app.post('/api/drills/:id/accept-suggestion', async (c) => {
  const id = c.req.param('id');
  const drills = await db.getDrills();
  const drill = drills.find(d => d.id === id);
  if (!drill) {
    return c.json({ success: false, error: 'Drill not found' }, 404);
  }

  if (drill.audit?.suggestedCorrectIndex !== undefined && drill.audit?.suggestedCorrectIndex !== null) {
    const updated = await db.updateDrill(id, {
      correctIndex: drill.audit.suggestedCorrectIndex,
      audit: {
        ...drill.audit,
        status: 'verified',
        confidence: 95,
        reason: `Tutor accepted auditor correction: set option ${drill.audit.suggestedCorrectIndex} ("${drill.options[drill.audit.suggestedCorrectIndex]}") as correct answer.`
      }
    });
    return c.json({ success: true, drill: updated });
  }

  return c.json({ success: false, error: 'No suggested index available' }, 400);
});

// Tutor dismisses an auditor flag (manual tutor override)
app.post('/api/drills/:id/dismiss-flag', async (c) => {
  const id = c.req.param('id');
  const drills = await db.getDrills();
  const drill = drills.find(d => d.id === id);
  if (!drill) {
    return c.json({ success: false, error: 'Drill not found' }, 404);
  }

  const updated = await db.updateDrill(id, {
    audit: drill.audit ? {
      ...drill.audit,
      status: 'verified',
      confidence: 100,
      reason: 'Flag manually reviewed and confirmed correct by human tutor.'
    } : undefined
  });

  return c.json({ success: true, drill: updated });
});

// Tutor Approves All Drills (The Core Guardrail)
app.post('/api/drills/approve-all', async (c) => {
  const drills = await db.approveAllDrills('00000000-0000-0000-0000-000000000001');
  return c.json({
    success: true,
    message: 'All drills verified and approved by tutor in PostgreSQL',
    drills
  });
});

// Learner Endpoint (GATED BY SERVER: Only approved drills returned!)
app.get('/api/learner/drills', async (c) => {
  const session = await db.getSession('00000000-0000-0000-0000-000000000001');
  if (!session.isApproved) {
    return c.json({
      ready: false,
      message: 'Practice drills are currently awaiting tutor verification and approval.',
      drills: []
    }, 403);
  }

  const drills = await db.getDrills('00000000-0000-0000-0000-000000000001');
  return c.json({
    ready: true,
    studentName: session.studentName,
    subject: session.subject,
    drills: drills.filter(d => d.approvedAt !== null)
  });
});

// Learner Flags a Question for Next Session
app.post('/api/learner/flag', async (c) => {
  const body = await c.req.json();
  const parsed = FlagRequestSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ success: false, error: parsed.error.issues }, 400);
  }

  const flag = await db.addFlag(
    '00000000-0000-0000-0000-000000000001',
    parsed.data.drillId,
    parsed.data.question,
    parsed.data.studentNote
  );

  return c.json({
    success: true,
    message: 'Flag queued in PostgreSQL for next 1:1 session agenda',
    flag
  });
});

// Learner Records Practice Attempt (persisted to public.drill_attempts)
app.post('/api/learner/attempt', async (c) => {
  const body = await c.req.json();
  const parsed = RecordAttemptSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ success: false, error: parsed.error.issues }, 400);
  }

  const attempt = await db.recordAttempt({
    drillId: parsed.data.drillId,
    learnerId: parsed.data.learnerId || null,
    selectedIndex: parsed.data.selectedIndex,
    isCorrect: parsed.data.isCorrect,
    timeSpentSeconds: parsed.data.timeSpentSeconds
  });

  return c.json({
    success: true,
    message: 'Attempt logged to PostgreSQL',
    attempt
  });
});

// Get attempts for a drill or session
app.get('/api/learner/attempts', async (c) => {
  const drillId = c.req.query('drillId');
  const attempts = await db.getAttempts(drillId);
  return c.json({ success: true, attempts });
});

// Next Session Agenda Aggregation
app.get('/api/agenda', async (c) => {
  const session = await db.getSession('00000000-0000-0000-0000-000000000001');
  const drills = await db.getDrills('00000000-0000-0000-0000-000000000001');
  const flags = await db.getFlags('00000000-0000-0000-0000-000000000001');

  return c.json({
    session,
    totalDrills: drills.length,
    flags
  });
});

// Supabase Auth: Sign Up
app.post('/api/auth/signup', async (c) => {
  try {
    const { email, password, fullName, role } = await c.req.json();
    if (!email || !password) {
      return c.json({ success: false, error: 'Email and password required' }, 400);
    }

    const { data, error } = await supabaseServer.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName || email.split('@')[0],
          role: role || 'learner'
        }
      }
    });

    if (error) return c.json({ success: false, error: error.message }, 400);
    return c.json({ success: true, user: data.user, session: data.session });
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Supabase Auth: Sign In
app.post('/api/auth/signin', async (c) => {
  try {
    const { email, password } = await c.req.json();
    const { data, error } = await supabaseServer.auth.signInWithPassword({
      email,
      password
    });

    if (error) return c.json({ success: false, error: error.message }, 400);
    return c.json({ success: true, user: data.user, session: data.session });
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Supabase Auth: Current User Verification
app.get('/api/auth/me', async (c) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader) {
    return c.json({ authenticated: false, user: null }, 401);
  }

  const token = authHeader.replace(/^Bearer\s+/i, '');
  const { data: { user }, error } = await supabaseServer.auth.getUser(token);

  if (error || !user) {
    return c.json({ authenticated: false, error: error?.message }, 401);
  }

  return c.json({ authenticated: true, user });
});

const PORT = 3001;
console.log(`[Skyy Learn Server] Starting on port ${PORT}...`);

serve({
  fetch: app.fetch,
  port: PORT
}, (info) => {
  console.log(`[Skyy Learn Server] Running on http://localhost:${info.port}`);
});
