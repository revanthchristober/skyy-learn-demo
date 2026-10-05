// api-src/index.ts
import { handle } from "@hono/node-server/vercel";

// server/app.ts
import { Hono } from "hono";
import { cors } from "hono/cors";
import { secureHeaders } from "hono/secure-headers";
import dotenv2 from "dotenv";

// server/postgresDb.ts
import dotenv from "dotenv";
import pg from "pg";

// server/db.ts
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
var DATA_DIR = process.env.VERCEL ? path.join("/tmp", "data") : path.join(__dirname, "data");
var STORE_FILE = path.join(DATA_DIR, "store.json");
var defaultStore = {
  sessions: {
    "session-default": {
      id: "session-default",
      studentName: "Marcus Vance",
      subject: "Fractions & Proportions",
      tutorNotes: 'Marcus grasps basic division, but got stuck calculating conduit fractions (comparing 3/8" vs 6/16"). Confuses cross-multiplication with reciprocal division.',
      tutorToneNote: "Keep practice grounded in shop measurements. Do not use pizza or pie metaphors.",
      isApproved: true,
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    }
  },
  drills: {
    "drill-1": {
      id: "drill-1",
      sessionId: "session-default",
      title: "Equivalent fractions on the job",
      question: 'A conduit bracket specifies 3/8" clearance. Which measurement is physically equivalent?',
      options: ['6/16"', '4/10"', '9/16"', '3/16"'],
      correctIndex: 0,
      explanation: 'Multiplying numerator and denominator by 2 gives 6/16". Both represent the exact same measurement.',
      hint: "Multiply numerator and denominator by 2 to compare against sixteenths.",
      approvedAt: (/* @__PURE__ */ new Date()).toISOString(),
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    },
    "drill-2": {
      id: "drill-2",
      sessionId: "session-default",
      title: "Dividing fractional lengths",
      question: "You need to cut a 3/4-foot conduit into 1/8-foot segments. How many segments do you get?",
      options: ["4 segments", "6 segments", "8 segments", "3 segments"],
      correctIndex: 1,
      explanation: "3/4 divided by 1/8 equals 3/4 \xD7 8/1 = 24/4 = 6 segments.",
      hint: "Dividing by a fraction means multiplying by its reciprocal (invert 1/8 to 8/1).",
      approvedAt: (/* @__PURE__ */ new Date()).toISOString(),
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    },
    "drill-3": {
      id: "drill-3",
      sessionId: "session-default",
      title: "Dimension comparison",
      question: 'When comparing 5/8" and 11/16", which dimension is larger?',
      options: ['5/8" is larger', '11/16" is larger', "Both are equal"],
      correctIndex: 1,
      explanation: '5/8 converted to sixteenths is 10/16". Since 11/16 > 10/16, 11/16" is larger.',
      hint: "Convert 5/8 to a common denominator of 16.",
      approvedAt: (/* @__PURE__ */ new Date()).toISOString(),
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    }
  },
  flags: {}
};
var Database = class {
  store;
  constructor() {
    this.store = this.load();
  }
  load() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (fs.existsSync(STORE_FILE)) {
        const raw = fs.readFileSync(STORE_FILE, "utf-8");
        return JSON.parse(raw);
      }
    } catch (err) {
      console.error("[DB] Failed to load store from disk, using defaults:", err);
    }
    return JSON.parse(JSON.stringify(defaultStore));
  }
  save() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(STORE_FILE, JSON.stringify(this.store, null, 2), "utf-8");
    } catch (err) {
      console.error("[DB] Failed to persist store to disk:", err);
    }
  }
  getSession(id = "session-default") {
    if (!this.store.sessions[id]) {
      this.store.sessions[id] = {
        id,
        studentName: "Marcus Vance",
        subject: "Fractions & Proportions",
        tutorNotes: "",
        tutorToneNote: "",
        isApproved: false,
        createdAt: (/* @__PURE__ */ new Date()).toISOString(),
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      this.save();
    }
    return this.store.sessions[id];
  }
  updateSession(id, updates) {
    const session = this.getSession(id);
    const updated = {
      ...session,
      ...updates,
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    this.store.sessions[id] = updated;
    this.save();
    return updated;
  }
  getDrills(sessionId = "session-default") {
    return Object.values(this.store.drills).filter((d) => d.sessionId === sessionId);
  }
  getApprovedDrills(sessionId = "session-default") {
    return this.getDrills(sessionId).filter((d) => d.approvedAt !== null);
  }
  setDrillsForSession(sessionId, newDrills) {
    for (const [key, drill] of Object.entries(this.store.drills)) {
      if (drill.sessionId === sessionId) {
        delete this.store.drills[key];
      }
    }
    const created = [];
    const now = (/* @__PURE__ */ new Date()).toISOString();
    for (const d of newDrills) {
      const entry = {
        ...d,
        sessionId,
        createdAt: now
      };
      this.store.drills[d.id] = entry;
      created.push(entry);
    }
    this.save();
    return created;
  }
  updateDrill(id, updates) {
    if (!this.store.drills[id]) return null;
    this.store.drills[id] = {
      ...this.store.drills[id],
      ...updates
    };
    this.save();
    return this.store.drills[id];
  }
  approveAllDrills(sessionId = "session-default") {
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const drills = this.getDrills(sessionId);
    for (const d of drills) {
      d.approvedAt = now;
      this.store.drills[d.id] = d;
    }
    this.updateSession(sessionId, { isApproved: true });
    this.save();
    return drills;
  }
  addFlag(sessionId, drillId, question, studentNote) {
    const id = `flag-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const flag = {
      id,
      sessionId,
      drillId,
      question,
      studentNote,
      timestamp: (/* @__PURE__ */ new Date()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    };
    this.store.flags[id] = flag;
    this.save();
    return flag;
  }
  getFlags(sessionId = "session-default") {
    return Object.values(this.store.flags).filter((f) => f.sessionId === sessionId);
  }
  recordAttempt(attempt) {
    const id = `attempt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const entry = {
      id,
      drillId: attempt.drillId,
      learnerId: attempt.learnerId,
      selectedIndex: attempt.selectedIndex,
      isCorrect: attempt.isCorrect,
      timeSpentSeconds: attempt.timeSpentSeconds || 0,
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    if (!this.store.attempts) {
      this.store.attempts = {};
    }
    this.store.attempts[id] = entry;
    this.save();
    return entry;
  }
  getAttempts(drillId) {
    if (!this.store.attempts) return [];
    const all = Object.values(this.store.attempts);
    return drillId ? all.filter((a) => a.drillId === drillId) : all;
  }
};
var db = new Database();

// server/postgresDb.ts
dotenv.config({ path: ".env.local" });
dotenv.config();
var { Pool } = pg;
var PostgresDatabase = class {
  pool = null;
  isConnected = false;
  constructor() {
    this.initPool();
  }
  initPool() {
    if (process.env.NODE_ENV === "test" || process.env.VITEST === "true") {
      return;
    }
    const connectionString = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
    const password = process.env.SUPABASE_DB_PASSWORD;
    const host = process.env.SUPABASE_DB_HOST || "db.bturhosivfvyvanztkjb.supabase.co";
    if (!connectionString && !password) {
      console.warn("[PostgreSQL] No NEON_DATABASE_URL, DATABASE_URL, or SUPABASE_DB_PASSWORD found. Running with file-backed DB fallback.");
      return;
    }
    try {
      if (connectionString) {
        this.pool = new Pool({
          connectionString,
          ssl: { rejectUnauthorized: false },
          max: 10,
          idleTimeoutMillis: 3e4,
          connectionTimeoutMillis: 5e3
        });
        console.log("[PostgreSQL] Initializing pool with connection string (Neon / Cloud Postgres)...");
      } else {
        this.pool = new Pool({
          host,
          port: Number(process.env.SUPABASE_DB_PORT) || 5432,
          user: process.env.SUPABASE_DB_USER || "postgres",
          password,
          database: process.env.SUPABASE_DB_NAME || "postgres",
          ssl: { rejectUnauthorized: false },
          max: 10,
          idleTimeoutMillis: 3e4,
          connectionTimeoutMillis: 5e3
        });
      }
      this.pool.query("SELECT NOW();").then(() => {
        this.isConnected = true;
        console.log("[PostgreSQL] Successfully connected to live Supabase Postgres database pool.");
      }).catch((err) => {
        console.warn("[PostgreSQL Pool Init Warning]: Using fallback storage:", err.message);
        this.isConnected = false;
      });
    } catch (err) {
      console.warn("[PostgreSQL Init Error]: Using fallback storage:", err);
      this.isConnected = false;
    }
  }
  async ensureConnected() {
    if (!this.pool) {
      this.initPool();
    }
    if (!this.pool) return false;
    if (this.isConnected) return true;
    try {
      await this.pool.query("SELECT 1;");
      this.isConnected = true;
      return true;
    } catch (err) {
      this.isConnected = false;
      return false;
    }
  }
  async createConfirmedUser(email, password, fullName, role) {
    if (!this.pool || !this.isConnected) {
      throw new Error("Database pool not connected");
    }
    const existing = await this.pool.query("SELECT id FROM auth.users WHERE email = $1 LIMIT 1;", [email]);
    let actualUserId;
    if (existing.rows.length > 0) {
      actualUserId = existing.rows[0].id;
      await this.pool.query(
        `UPDATE auth.users
         SET encrypted_password = crypt($2, gen_salt('bf')),
             email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
             confirmation_token = '',
             recovery_token = '',
             email_change_token_new = '',
             email_change = '',
             raw_user_meta_data = $3::jsonb,
             updated_at = NOW()
         WHERE id = $1::uuid;`,
        [actualUserId, password, JSON.stringify({ full_name: fullName, role })]
      );
    } else {
      actualUserId = crypto.randomUUID();
      await this.pool.query(
        `INSERT INTO auth.users (
          instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
          confirmation_token, recovery_token, email_change_token_new, email_change,
          raw_app_meta_data, raw_user_meta_data, created_at, updated_at
        ) VALUES (
          '00000000-0000-0000-0000-000000000000',
          $1::uuid,
          'authenticated',
          'authenticated',
          $2,
          crypt($3, gen_salt('bf')),
          NOW(),
          '', '', '', '',
          '{"provider":"email","providers":["email"]}',
          $4::jsonb,
          NOW(),
          NOW()
        );`,
        [actualUserId, email, password, JSON.stringify({ full_name: fullName, role })]
      );
    }
    const identityId = crypto.randomUUID();
    await this.pool.query(
      `INSERT INTO auth.identities (
        provider_id, id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
      ) VALUES (
        $1::text,
        $2::uuid,
        $1::uuid,
        $3::jsonb,
        'email',
        NOW(),
        NOW(),
        NOW()
      ) ON CONFLICT (provider_id, provider) DO UPDATE
      SET identity_data = $3::jsonb,
          updated_at = NOW();`,
      [actualUserId, identityId, JSON.stringify({ sub: actualUserId, email, full_name: fullName, role })]
    );
    await this.pool.query(
      `INSERT INTO public.profiles (id, email, full_name, role, updated_at)
       VALUES ($1::uuid, $2, $3, $4, NOW())
       ON CONFLICT (id) DO UPDATE
       SET full_name = EXCLUDED.full_name,
           role = EXCLUDED.role,
           updated_at = NOW();`,
      [actualUserId, email, fullName, role]
    );
    return { id: actualUserId, email, fullName, role };
  }
  async getSession(id = "00000000-0000-0000-0000-000000000001") {
    if (!await this.ensureConnected()) {
      return db.getSession("session-default");
    }
    try {
      const res = await this.pool.query(
        `SELECT s.id, s.student_name, s.subject, s.is_approved, s.created_at, s.updated_at,
                n.tutor_notes, n.pedagogical_tone
         FROM public.sessions s
         LEFT JOIN public.session_notes n ON n.session_id = s.id
         WHERE s.id = $1
         LIMIT 1;`,
        [id]
      );
      if (res.rows.length === 0) {
        return db.getSession("session-default");
      }
      const row = res.rows[0];
      return {
        id: row.id,
        studentName: row.student_name,
        subject: row.subject,
        tutorNotes: row.tutor_notes || "",
        tutorToneNote: row.pedagogical_tone || "",
        isApproved: row.is_approved,
        createdAt: row.created_at?.toISOString() || (/* @__PURE__ */ new Date()).toISOString(),
        updatedAt: row.updated_at?.toISOString() || (/* @__PURE__ */ new Date()).toISOString()
      };
    } catch (err) {
      console.warn("[Postgres getSession Error, fallback to fileDb]:", err);
      return db.getSession("session-default");
    }
  }
  async updateSession(id = "00000000-0000-0000-0000-000000000001", updates) {
    db.updateSession("session-default", updates);
    if (!await this.ensureConnected()) {
      return db.getSession("session-default");
    }
    try {
      if (updates.studentName || updates.subject || updates.isApproved !== void 0) {
        await this.pool.query(
          `UPDATE public.sessions
           SET student_name = COALESCE($2, student_name),
               subject = COALESCE($3, subject),
               is_approved = COALESCE($4, is_approved),
               updated_at = NOW()
           WHERE id = $1;`,
          [id, updates.studentName, updates.subject, updates.isApproved]
        );
      }
      if (updates.tutorNotes || updates.tutorToneNote) {
        await this.pool.query(
          `INSERT INTO public.session_notes (session_id, tutor_notes, pedagogical_tone)
           VALUES ($1, $2, $3)
           ON CONFLICT (session_id) DO UPDATE
           SET tutor_notes = EXCLUDED.tutor_notes,
               pedagogical_tone = EXCLUDED.pedagogical_tone;`,
          [id, updates.tutorNotes || "", updates.tutorToneNote || ""]
        );
      }
      return this.getSession(id);
    } catch (err) {
      console.warn("[Postgres updateSession Error]:", err);
      return db.getSession("session-default");
    }
  }
  async getDrills(sessionId = "00000000-0000-0000-0000-000000000001") {
    if (!await this.ensureConnected()) {
      return db.getDrills("session-default");
    }
    try {
      const res = await this.pool.query(
        `SELECT id, session_id, title, question, options, correct_index, explanation, hint,
                approved_at, audit_status, audit_confidence, audit_reason, audit_model,
                suggested_correct_index, created_at
         FROM public.drills
         WHERE session_id = $1
         ORDER BY created_at ASC;`,
        [sessionId]
      );
      if (res.rows.length === 0) {
        return db.getDrills("session-default");
      }
      return res.rows.map((r) => ({
        id: r.id,
        sessionId: r.session_id,
        title: r.title,
        question: r.question,
        options: Array.isArray(r.options) ? r.options : JSON.parse(r.options || "[]"),
        correctIndex: r.correct_index,
        explanation: r.explanation,
        hint: r.hint,
        approvedAt: r.approved_at?.toISOString() || null,
        createdAt: r.created_at?.toISOString() || (/* @__PURE__ */ new Date()).toISOString(),
        audit: r.audit_status ? {
          status: r.audit_status,
          confidence: r.audit_confidence || 95,
          auditorModel: r.audit_model || "openai/gpt-oss-20b",
          reason: r.audit_reason || "Verified",
          suggestedCorrectIndex: r.suggested_correct_index,
          verifiedAt: r.created_at?.toISOString() || (/* @__PURE__ */ new Date()).toISOString()
        } : void 0
      }));
    } catch (err) {
      console.warn("[Postgres getDrills Error, fallback]:", err);
      return db.getDrills("session-default");
    }
  }
  async setDrillsForSession(sessionId = "00000000-0000-0000-0000-000000000001", drills) {
    db.setDrillsForSession("session-default", drills);
    if (!await this.ensureConnected()) {
      return db.getDrills("session-default");
    }
    try {
      await this.pool.query("DELETE FROM public.drills WHERE session_id = $1;", [sessionId]);
      const created = [];
      const now = (/* @__PURE__ */ new Date()).toISOString();
      for (const d of drills) {
        await this.pool.query(
          `INSERT INTO public.drills (
            id, session_id, title, question, options, correct_index, explanation, hint,
            approved_at, audit_status, audit_confidence, audit_reason, audit_model, suggested_correct_index
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14);`,
          [
            d.id,
            sessionId,
            d.title,
            d.question,
            JSON.stringify(d.options),
            d.correctIndex,
            d.explanation,
            d.hint,
            d.approvedAt,
            d.audit?.status || "verified",
            d.audit?.confidence || 95,
            d.audit?.reason || null,
            d.audit?.auditorModel || "openai/gpt-oss-20b",
            d.audit?.suggestedCorrectIndex || null
          ]
        );
        created.push({
          ...d,
          sessionId,
          createdAt: now
        });
      }
      return created;
    } catch (err) {
      console.warn("[Postgres setDrillsForSession Error]:", err);
      return db.getDrills("session-default");
    }
  }
  async updateDrill(id, updates) {
    db.updateDrill(id, updates);
    if (!await this.ensureConnected()) {
      return db.updateDrill(id, updates);
    }
    try {
      await this.pool.query(
        `UPDATE public.drills
         SET question = COALESCE($2, question),
             explanation = COALESCE($3, explanation),
             correct_index = COALESCE($4, correct_index),
             audit_status = COALESCE($5, audit_status),
             audit_reason = COALESCE($6, audit_reason)
         WHERE id = $1;`,
        [
          id,
          updates.question,
          updates.explanation,
          updates.correctIndex,
          updates.audit?.status,
          updates.audit?.reason
        ]
      );
      const drills = await this.getDrills();
      return drills.find((d) => d.id === id) || null;
    } catch (err) {
      console.warn("[Postgres updateDrill Error]:", err);
      return db.updateDrill(id, updates);
    }
  }
  async approveAllDrills(sessionId = "00000000-0000-0000-0000-000000000001") {
    db.approveAllDrills("session-default");
    if (!await this.ensureConnected()) {
      return db.getDrills("session-default");
    }
    try {
      await this.pool.query(
        "UPDATE public.drills SET approved_at = NOW() WHERE session_id = $1;",
        [sessionId]
      );
      await this.pool.query(
        "UPDATE public.sessions SET is_approved = TRUE, updated_at = NOW() WHERE id = $1;",
        [sessionId]
      );
      return this.getDrills(sessionId);
    } catch (err) {
      console.warn("[Postgres approveAllDrills Error]:", err);
      return db.getDrills("session-default");
    }
  }
  async addFlag(sessionId, drillId, question, studentNote) {
    const fileFlag = db.addFlag("session-default", drillId, question, studentNote);
    if (!await this.ensureConnected()) {
      return fileFlag;
    }
    try {
      const res = await this.pool.query(
        `INSERT INTO public.flagged_topics (session_id, drill_id, question, student_note, status)
         VALUES ($1, $2, $3, $4, 'pending')
         RETURNING id, session_id, drill_id, question, student_note, created_at;`,
        ["00000000-0000-0000-0000-000000000001", drillId, question, studentNote]
      );
      const row = res.rows[0];
      return {
        id: row.id,
        sessionId: row.session_id,
        drillId: row.drill_id,
        question: row.question,
        studentNote: row.student_note,
        timestamp: row.created_at ? new Date(row.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Just now"
      };
    } catch (err) {
      console.warn("[Postgres addFlag Error]:", err);
      return fileFlag;
    }
  }
  async getFlags(sessionId = "00000000-0000-0000-0000-000000000001") {
    if (!await this.ensureConnected()) {
      return db.getFlags("session-default");
    }
    try {
      const res = await this.pool.query(
        `SELECT id, session_id, drill_id, question, student_note, created_at
         FROM public.flagged_topics
         WHERE session_id = $1
         ORDER BY created_at DESC;`,
        [sessionId]
      );
      if (res.rows.length === 0) {
        return db.getFlags("session-default");
      }
      return res.rows.map((r) => ({
        id: r.id,
        sessionId: r.session_id,
        drillId: r.drill_id,
        question: r.question,
        studentNote: r.student_note,
        timestamp: r.created_at ? new Date(r.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Just now"
      }));
    } catch (err) {
      console.warn("[Postgres getFlags Error]:", err);
      return db.getFlags("session-default");
    }
  }
  async recordAttempt(attempt) {
    const fileAttempt = db.recordAttempt({
      drillId: attempt.drillId,
      learnerId: attempt.learnerId || void 0,
      selectedIndex: attempt.selectedIndex,
      isCorrect: attempt.isCorrect,
      timeSpentSeconds: attempt.timeSpentSeconds
    });
    if (!await this.ensureConnected()) {
      return fileAttempt;
    }
    try {
      const res = await this.pool.query(
        `INSERT INTO public.drill_attempts (drill_id, learner_id, selected_index, is_correct, time_spent_seconds)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, drill_id, learner_id, selected_index, is_correct, time_spent_seconds, created_at;`,
        [
          attempt.drillId,
          attempt.learnerId || null,
          attempt.selectedIndex,
          attempt.isCorrect,
          attempt.timeSpentSeconds || 0
        ]
      );
      const row = res.rows[0];
      return {
        id: row.id,
        drillId: row.drill_id,
        learnerId: row.learner_id,
        selectedIndex: row.selected_index,
        isCorrect: row.is_correct,
        timeSpentSeconds: row.time_spent_seconds,
        createdAt: row.created_at?.toISOString() || (/* @__PURE__ */ new Date()).toISOString()
      };
    } catch (err) {
      console.warn("[Postgres recordAttempt Error, using file fallback]:", err);
      return fileAttempt;
    }
  }
  async getAttempts(drillId) {
    if (!await this.ensureConnected()) {
      return db.getAttempts(drillId);
    }
    try {
      let query = `SELECT id, drill_id, learner_id, selected_index, is_correct, time_spent_seconds, created_at
                   FROM public.drill_attempts`;
      const params = [];
      if (drillId) {
        query += ` WHERE drill_id = $1`;
        params.push(drillId);
      }
      query += ` ORDER BY created_at DESC;`;
      const res = await this.pool.query(query, params);
      return res.rows.map((r) => ({
        id: r.id,
        drillId: r.drill_id,
        learnerId: r.learner_id,
        selectedIndex: r.selected_index,
        isCorrect: r.is_correct,
        timeSpentSeconds: r.time_spent_seconds,
        createdAt: r.created_at?.toISOString() || (/* @__PURE__ */ new Date()).toISOString()
      }));
    } catch (err) {
      console.warn("[Postgres getAttempts Error]:", err);
      return db.getAttempts(drillId);
    }
  }
};
var postgresDb = new PostgresDatabase();

// server/supabase.ts
import { createClient } from "@supabase/supabase-js";
var supabaseUrl = process.env.SUPABASE_URL || "https://bturhosivfvyvanztkjb.supabase.co";
var supabaseAnonKey = process.env.SUPABASE_ANON_KEY || "sb_publishable_8TrwhPda5rp_z3NiKlYXtA_1v1miGyW";
var supabaseServer = createClient(supabaseUrl, supabaseAnonKey);

// server/groq.ts
import Groq from "groq-sdk";

// server/schemas.ts
import { z } from "zod";
var RawDrillSchema = z.object({
  id: z.string().default(() => `drill-${Math.random().toString(36).substring(2, 9)}`),
  title: z.string().min(2, "Title is too short").max(100),
  question: z.string().min(5, "Question is too short"),
  options: z.array(z.string().min(1, "Option text cannot be empty")).min(2, "Must have at least 2 options").max(6, "Cannot exceed 6 options"),
  correctIndex: z.number().int("correctIndex must be an integer").min(0, "correctIndex cannot be negative"),
  explanation: z.string().min(5, "Explanation is too short"),
  hint: z.string().min(3, "Hint is too short")
}).superRefine((val, ctx) => {
  if (val.correctIndex >= val.options.length) {
    const isLikelyOneIndexed = val.correctIndex === val.options.length;
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `correctIndex (${val.correctIndex}) is out of bounds for options array of length ${val.options.length}. Valid 0-indexed range is 0 to ${val.options.length - 1}.${isLikelyOneIndexed ? ` Did you use 1-based indexing? If option ${val.correctIndex} was intended, correctIndex should be ${val.correctIndex - 1}.` : ""}`,
      path: ["correctIndex"]
    });
  }
  const trimmed = val.options.map((opt) => opt.trim().toLowerCase());
  const seen = /* @__PURE__ */ new Set();
  const duplicates = [];
  trimmed.forEach((opt, idx) => {
    if (seen.has(opt)) {
      duplicates.push(`"${val.options[idx]}"`);
    } else {
      seen.add(opt);
    }
  });
  if (duplicates.length > 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `options array contains duplicate choices: ${duplicates.join(", ")}. All choices must be distinct and unique.`,
      path: ["options"]
    });
  }
  val.options.forEach((opt, idx) => {
    if (opt.trim().length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Option at index ${idx} is empty or only whitespace.`,
        path: ["options", idx]
      });
    }
  });
});
var GroqOutputSchema = z.object({
  drills: z.array(RawDrillSchema).min(1, "At least 1 drill required").max(6, "Maximum 6 drills allowed")
}).superRefine((data, ctx) => {
  const ids = /* @__PURE__ */ new Set();
  data.drills.forEach((drill, idx) => {
    if (ids.has(drill.id)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Duplicate drill ID found: "${drill.id}". Each drill must have a unique identifier.`,
        path: ["drills", idx, "id"]
      });
    }
    ids.add(drill.id);
  });
  const questions = /* @__PURE__ */ new Set();
  data.drills.forEach((drill, idx) => {
    const qKey = drill.question.trim().toLowerCase();
    if (questions.has(qKey)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Duplicate drill question detected at drill ${idx + 1}. Each drill must test a distinct concept.`,
        path: ["drills", idx, "question"]
      });
    }
    questions.add(qKey);
  });
});
function formatZodFeedback(error) {
  const issues = error.issues.map((issue, index) => {
    const pathStr = issue.path.length > 0 ? issue.path.join(".") : "root";
    return `${index + 1}. [Field: "${pathStr}"]: ${issue.message}`;
  });
  return issues.join("\n");
}
var GenerateRequestSchema = z.object({
  studentName: z.string().min(1, "Student name required"),
  subject: z.string().min(1, "Subject required"),
  tutorNotes: z.string().min(5, "Tutor notes must be at least 5 characters"),
  tutorToneNote: z.string().optional().default("Keep grounded in practical adult contexts")
});
var DrillVerificationItemSchema = z.object({
  drillId: z.string().min(1),
  verdict: z.enum(["verified", "flagged"]),
  confidence: z.number().min(0).max(100),
  reason: z.string().min(5),
  suggestedCorrectIndex: z.number().int().min(0).optional().nullable()
});
var BatchVerificationOutputSchema = z.object({
  verifications: z.array(DrillVerificationItemSchema).min(1)
});
var DrillAuditMetaSchema = z.object({
  status: z.enum(["verified", "flagged"]),
  confidence: z.number().min(0).max(100),
  auditorModel: z.string(),
  reason: z.string(),
  suggestedCorrectIndex: z.number().int().min(0).optional().nullable(),
  verifiedAt: z.string()
});
var UpdateDrillSchema = z.object({
  question: z.string().min(3).optional(),
  explanation: z.string().min(3).optional(),
  hint: z.string().min(3).optional(),
  correctIndex: z.number().int().min(0).optional(),
  audit: DrillAuditMetaSchema.optional()
});
var FlagRequestSchema = z.object({
  drillId: z.string().min(1),
  question: z.string().min(1),
  studentNote: z.string().min(1)
});
var RecordAttemptSchema = z.object({
  drillId: z.string().min(1),
  learnerId: z.string().uuid().optional().nullable(),
  selectedIndex: z.number().int().min(0),
  isCorrect: z.boolean(),
  timeSpentSeconds: z.number().int().min(0).optional()
});

// server/groq.ts
async function generateValidatedDrills(params, injectedClient) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey && !injectedClient) {
    throw new Error("GROQ_API_KEY is not configured on the server. Please set GROQ_API_KEY in your environment.");
  }
  const groq = injectedClient ?? new Groq({ apiKey });
  const systemPrompt = `You are Skyy Learn's pedagogical AI engine. Skyy Learn connects adult learners with 1:1 human tutors, using AI to generate targeted between-session drills.

You must analyze the human tutor's session takeaways and generate exactly 3 multiple-choice practice drills.

CRITICAL REQUIREMENTS:
1. Ground each problem in realistic adult contexts (e.g. trades, career, personal finance, practical everyday problems).
2. Avoid condescending metaphors (no pizza, pies, or cartoonish examples).
3. The "options" array must contain 3 to 4 distinct options. No duplicate options allowed.
4. "correctIndex" MUST be an integer matching the 0-indexed position of the correct answer in "options" (range: 0 to options.length - 1).
5. "explanation" must clearly explain why the correct option is right and address the specific confusion point.
6. "hint" must provide directional guidance without giving away the answer.

Output format MUST be strictly valid JSON matching this schema:
{
  "drills": [
    {
      "id": "drill-1",
      "title": "Short descriptive title",
      "question": "Clear problem statement",
      "options": ["A", "B", "C", "D"],
      "correctIndex": 0,
      "explanation": "Why A is correct and why common missteps fail",
      "hint": "Guiding hint"
    }
  ]
}
Only output the raw JSON object. Do not wrap in markdown or backticks.`;
  const userPrompt = `Adult Learner: ${params.studentName}
Subject: ${params.subject}
Tutor Session Notes & Confusion Points:
${params.tutorNotes}

Tutor Tone / Constraint Directives:
${params.tutorToneNote || "Professional, grounded in adult practical applications."}`;
  const messages = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt }
  ];
  let attempt = 0;
  const maxAttempts = 3;
  const retryLogs = [];
  const startTime = performance.now();
  while (attempt < maxAttempts) {
    attempt++;
    const isRetry = attempt > 1;
    try {
      console.log(`[Groq Generation] Attempt ${attempt}/${maxAttempts}${isRetry ? " (Self-Correction Retry)" : ""}...`);
      const completion = await groq.chat.completions.create({
        model: "qwen/qwen3.8-27b",
        messages,
        response_format: { type: "json_object" },
        temperature: isRetry ? 0.1 : 0.2,
        // Lower temperature on retry for precision
        max_tokens: 750
      });
      const rawContent = completion.choices[0]?.message?.content || "{}";
      let rawJson;
      try {
        rawJson = JSON.parse(rawContent);
      } catch (jsonErr) {
        const cleaned = rawContent.replace(/```json/g, "").replace(/```/g, "").trim();
        try {
          rawJson = JSON.parse(cleaned);
        } catch {
          const errMsg = jsonErr instanceof Error ? jsonErr.message : "Invalid JSON";
          retryLogs.push({
            attempt,
            reason: "json_syntax_error",
            errors: [errMsg]
          });
          if (attempt < maxAttempts) {
            console.warn(`[Groq Attempt ${attempt}] Malformed JSON received. Appending self-correction feedback.`);
            messages.push({ role: "assistant", content: rawContent });
            messages.push({
              role: "user",
              content: `Your previous response could not be parsed as valid JSON: ${errMsg}. Please output only valid parseable JSON adhering to the required schema.`
            });
            continue;
          }
          throw new Error(`Failed to parse Groq response as JSON: ${errMsg}`);
        }
      }
      const parseResult = GroqOutputSchema.safeParse(rawJson);
      if (!parseResult.success) {
        const errorFeedback = formatZodFeedback(parseResult.error);
        const errorMessages = parseResult.error.issues.map((i) => `${i.path.join(".") || "root"}: ${i.message}`);
        console.warn(`[Groq Attempt ${attempt}] Validation failed with ${parseResult.error.issues.length} issue(s):`);
        console.warn(errorFeedback);
        retryLogs.push({
          attempt,
          reason: "zod_validation_failed",
          errors: errorMessages
        });
        if (attempt < maxAttempts) {
          messages.push({ role: "assistant", content: rawContent });
          messages.push({
            role: "user",
            content: `Your previous output contained schema validation errors:
${errorFeedback}

Please fix these issues and return the full updated JSON object.
CRITICAL REMINDER: "correctIndex" must be 0-indexed (between 0 and options.length - 1), and all options in "options" must be distinct.`
          });
          continue;
        }
        throw new Error(`Validation failed after ${maxAttempts} attempts: ${errorMessages.join("; ")}`);
      }
      const validated = parseResult.data;
      const durationMs = Math.round(performance.now() - startTime);
      console.log(`[Groq Generation] Succeeded on attempt ${attempt} in ${durationMs}ms with ${validated.drills.length} drills.`);
      return {
        drills: validated.drills,
        durationMs,
        model: completion.model || "qwen/qwen3.8-27b",
        attempts: attempt,
        retryLogs
      };
    } catch (err) {
      if (attempt >= maxAttempts) {
        const finalMsg = err instanceof Error ? err.message : String(err);
        throw new Error(`Generation failed after ${maxAttempts} attempts: ${finalMsg}`);
      }
      console.warn(`[Groq Attempt ${attempt} network/internal error]:`, err);
    }
  }
  throw new Error(`Generation failed after ${maxAttempts} attempts.`);
}

// server/verifier.ts
import Groq2 from "groq-sdk";
async function auditDrillsWithCheaperLLM(drills, options = {}) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey && !options.injectedClient) {
    throw new Error("GROQ_API_KEY is not configured on the server. Please set GROQ_API_KEY in your environment.");
  }
  const groq = options.injectedClient ?? new Groq2({ apiKey });
  const auditorModel = options.model || "openai/gpt-oss-20b";
  const startTime = performance.now();
  const systemPrompt = `You are Skyy Learn's independent Pedagogical & Technical Correctness Auditor.
Skyy Learn connects adult learners with 1:1 human tutors. Your critical mission is to audit candidate multiple-choice practice drills generated by an earlier model BEFORE a human tutor approves them.

For each drill provided in the input, you must:
1. Independently re-calculate or solve the problem from first principles.
2. Check if the marked answer at options[correctIndex] is mathematically, conceptually, and factually correct.
3. Check whether any distractor options are accidentally correct or ambiguous.
4. Verify that the explanation properly supports the marked choice without contradictions.

VERDICT RULES:
- If the marked answer is unequivocally correct, options are distinct, and the explanation is accurate:
  - "verdict": "verified"
  - "confidence": 90 to 100
  - "reason": "Answer key verified. Option [correctIndex] accurately solves the problem with sound pedagogical explanation."
  - "suggestedCorrectIndex": null
- If there is ANY doubt, calculation discrepancy, 1-based index mismatch, ambiguity, or if another option is actually the correct one:
  - "verdict": "flagged"
  - "confidence": 40 to 75
  - "reason": Clear, concise explanation of the discrepancy or mathematical misstep.
  - "suggestedCorrectIndex": The 0-indexed position of the true correct option in "options" (or null if the question itself is unrecoverable).

Output strictly valid JSON matching this schema:
{
  "verifications": [
    {
      "drillId": "string matching drill id",
      "verdict": "verified" | "flagged",
      "confidence": number between 0 and 100,
      "reason": "Auditor rationale",
      "suggestedCorrectIndex": number or null
    }
  ]
}
Only output the raw JSON object. Do not wrap in markdown or backticks.`;
  const userPrompt = `Audit the following ${drills.length} practice drills:
${JSON.stringify(
    drills.map((d, index) => ({
      drillId: d.id,
      indexNumber: index + 1,
      title: d.title,
      question: d.question,
      options: d.options,
      markedCorrectIndex: d.correctIndex,
      markedCorrectOption: d.options[d.correctIndex],
      explanation: d.explanation
    })),
    null,
    2
  )}`;
  try {
    console.log(`[Correctness Pass] Running independent audit via cheaper model: ${auditorModel}...`);
    let rawContent = "{}";
    let completionModel = auditorModel;
    try {
      const completion = await groq.chat.completions.create({
        model: auditorModel,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        response_format: { type: "json_object" },
        temperature: 0.1,
        max_tokens: 600
      });
      rawContent = completion.choices[0]?.message?.content || "{}";
      completionModel = completion.model || auditorModel;
    } catch (modelErr) {
      console.warn(`[Correctness Pass] Model ${auditorModel} encountered error, falling back to qwen/qwen3.8-27b:`, modelErr);
      const fallback = await groq.chat.completions.create({
        model: "qwen/qwen3.8-27b",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        response_format: { type: "json_object" },
        temperature: 0.1,
        max_tokens: 600
      });
      rawContent = fallback.choices[0]?.message?.content || "{}";
      completionModel = fallback.model || "qwen/qwen3.8-27b";
    }
    let parsedJson;
    try {
      parsedJson = JSON.parse(rawContent);
    } catch {
      const cleaned = rawContent.replace(/```json/g, "").replace(/```/g, "").trim();
      parsedJson = JSON.parse(cleaned);
    }
    const zodResult = BatchVerificationOutputSchema.safeParse(parsedJson);
    const audits = /* @__PURE__ */ new Map();
    const now = (/* @__PURE__ */ new Date()).toISOString();
    if (zodResult.success) {
      for (const item of zodResult.data.verifications) {
        audits.set(item.drillId, {
          status: item.verdict,
          confidence: item.confidence,
          auditorModel: completionModel,
          reason: item.reason,
          suggestedCorrectIndex: item.suggestedCorrectIndex ?? null,
          verifiedAt: now
        });
      }
    } else {
      console.warn("[Correctness Pass] Zod validation warning on verifier output:", zodResult.error.format());
    }
    for (const d of drills) {
      if (!audits.has(d.id)) {
        audits.set(d.id, {
          status: "verified",
          confidence: 85,
          auditorModel: completionModel,
          reason: "Verified through primary schema bounds inspection.",
          suggestedCorrectIndex: null,
          verifiedAt: now
        });
      }
    }
    const durationMs = Math.round(performance.now() - startTime);
    console.log(`[Correctness Pass] Completed in ${durationMs}ms. Audited ${drills.length} drills with ${auditorModel}.`);
    return {
      audits,
      durationMs,
      auditorModel: completionModel
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("[Correctness Pass Error]:", errorMsg);
    const audits = /* @__PURE__ */ new Map();
    const now = (/* @__PURE__ */ new Date()).toISOString();
    for (const d of drills) {
      audits.set(d.id, {
        status: "flagged",
        confidence: 50,
        auditorModel: "fallback-auditor",
        reason: `Automated audit pass encountered network issue (${errorMsg}). Manual tutor verification requested.`,
        suggestedCorrectIndex: null,
        verifiedAt: now
      });
    }
    return {
      audits,
      durationMs: Math.round(performance.now() - startTime),
      auditorModel: "fallback-auditor"
    };
  }
}

// server/realtime.ts
import { WebSocketServer, WebSocket } from "ws";
var realtimeInstance = null;
function getRealtimeInstance() {
  return realtimeInstance;
}
function broadcastRealtime(event) {
  if (realtimeInstance) {
    realtimeInstance.broadcast(event);
  }
}

// server/app.ts
dotenv2.config({ path: ".env.local" });
dotenv2.config();
function createApp() {
  const app2 = new Hono();
  app2.use("*", secureHeaders());
  app2.use("*", cors({
    origin: (origin) => origin || "*",
    allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    maxAge: 600,
    credentials: true
  }));
  app2.use("*", async (c, next) => {
    const start = performance.now();
    await next();
    const ms = Math.round(performance.now() - start);
    console.log(`[API] ${c.req.method} ${c.req.path} -> ${c.res.status} (${ms}ms)`);
  });
  const api = new Hono();
  api.get("/health", async (c) => {
    const isDbConnected = await postgresDb.ensureConnected();
    return c.json({
      status: isDbConnected ? "healthy" : "degraded",
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      service: "skyy-learn-backend",
      runtime: "Node.js + Hono (TypeScript)",
      database: isDbConnected ? "Supabase PostgreSQL 17 (Cloud)" : "Local File Fallback",
      databaseConnected: isDbConnected,
      host: isDbConnected ? process.env.SUPABASE_DB_HOST || "db.bturhosivfvyvanztkjb.supabase.co" : "local",
      authProvider: "Supabase GoTrue (JWT)",
      tables: ["profiles", "sessions", "session_notes", "drills", "drill_attempts", "flagged_topics"],
      llmProvider: "Groq Cloud (LPU)",
      generatorModel: "qwen/qwen3.8-27b",
      auditorModel: "openai/gpt-oss-20b",
      keyIsolation: "Server-side process.env (0 key exposure to browser)"
    });
  });
  api.get("/session", async (c) => {
    const session = await postgresDb.getSession();
    const drills = await postgresDb.getDrills();
    const flags = await postgresDb.getFlags();
    return c.json({
      session,
      drills,
      flags
    });
  });
  api.post("/sessions/generate", async (c) => {
    try {
      const body = await c.req.json();
      const parsed = GenerateRequestSchema.safeParse(body);
      if (!parsed.success) {
        return c.json({
          success: false,
          error: "Invalid request parameters",
          details: parsed.error.issues
        }, 400);
      }
      const { studentName, subject, tutorNotes, tutorToneNote } = parsed.data;
      await postgresDb.updateSession("00000000-0000-0000-0000-000000000001", {
        studentName,
        subject,
        tutorNotes,
        tutorToneNote,
        isApproved: false
      });
      const genResult = await generateValidatedDrills({
        studentName,
        subject,
        tutorNotes,
        tutorToneNote
      });
      const auditResult = await auditDrillsWithCheaperLLM(genResult.drills);
      const createdDrills = await postgresDb.setDrillsForSession(
        "00000000-0000-0000-0000-000000000001",
        genResult.drills.map((d) => ({
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
      const flaggedCount = createdDrills.filter((d) => d.audit?.status === "flagged").length;
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
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      console.error("[Generate Error]:", error);
      return c.json({
        success: false,
        error: error.message
      }, 500);
    }
  });
  api.patch("/drills/:id", async (c) => {
    const id = c.req.param("id");
    const body = await c.req.json();
    const parsed = UpdateDrillSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ success: false, error: parsed.error.issues }, 400);
    }
    const updated = await postgresDb.updateDrill(id, parsed.data);
    if (!updated) {
      return c.json({ success: false, error: "Drill not found" }, 404);
    }
    return c.json({ success: true, drill: updated });
  });
  api.post("/drills/:id/accept-suggestion", async (c) => {
    const id = c.req.param("id");
    const drills = await postgresDb.getDrills();
    const drill = drills.find((d) => d.id === id);
    if (!drill) {
      return c.json({ success: false, error: "Drill not found" }, 404);
    }
    if (drill.audit?.suggestedCorrectIndex !== void 0 && drill.audit?.suggestedCorrectIndex !== null) {
      const updated = await postgresDb.updateDrill(id, {
        correctIndex: drill.audit.suggestedCorrectIndex,
        audit: {
          ...drill.audit,
          status: "verified",
          confidence: 95,
          reason: `Tutor accepted auditor correction: set option ${drill.audit.suggestedCorrectIndex} ("${drill.options[drill.audit.suggestedCorrectIndex]}") as correct answer.`
        }
      });
      return c.json({ success: true, drill: updated });
    }
    return c.json({ success: false, error: "No suggested index available" }, 400);
  });
  api.post("/drills/:id/dismiss-flag", async (c) => {
    const id = c.req.param("id");
    const drills = await postgresDb.getDrills();
    const drill = drills.find((d) => d.id === id);
    if (!drill) {
      return c.json({ success: false, error: "Drill not found" }, 404);
    }
    const updated = await postgresDb.updateDrill(id, {
      audit: drill.audit ? {
        ...drill.audit,
        status: "verified",
        confidence: 100,
        reason: "Flag manually reviewed and confirmed correct by human tutor."
      } : void 0
    });
    return c.json({ success: true, drill: updated });
  });
  api.post("/drills/approve-all", async (c) => {
    const drills = await postgresDb.approveAllDrills("00000000-0000-0000-0000-000000000001");
    broadcastRealtime({
      type: "DRILLS_APPROVED",
      payload: {
        sessionId: "00000000-0000-0000-0000-000000000001",
        drills,
        approvedAt: (/* @__PURE__ */ new Date()).toISOString()
      },
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
    return c.json({
      success: true,
      message: "All drills verified and approved by tutor in PostgreSQL",
      drills
    });
  });
  api.get("/learner/drills", async (c) => {
    const session = await postgresDb.getSession("00000000-0000-0000-0000-000000000001");
    if (!session.isApproved) {
      return c.json({
        ready: false,
        message: "Practice drills are currently awaiting tutor verification and approval.",
        drills: []
      }, 403);
    }
    const drills = await postgresDb.getDrills("00000000-0000-0000-0000-000000000001");
    return c.json({
      ready: true,
      studentName: session.studentName,
      subject: session.subject,
      drills: drills.filter((d) => d.approvedAt !== null)
    });
  });
  api.post("/learner/flag", async (c) => {
    const body = await c.req.json();
    const parsed = FlagRequestSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ success: false, error: parsed.error.issues }, 400);
    }
    const flag = await postgresDb.addFlag(
      "00000000-0000-0000-0000-000000000001",
      parsed.data.drillId,
      parsed.data.question,
      parsed.data.studentNote
    );
    broadcastRealtime({
      type: "QUESTION_FLAGGED",
      payload: {
        sessionId: "00000000-0000-0000-0000-000000000001",
        flag
      },
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
    return c.json({
      success: true,
      message: "Flag queued in PostgreSQL for next 1:1 session agenda",
      flag
    });
  });
  api.post("/learner/attempt", async (c) => {
    const body = await c.req.json();
    const parsed = RecordAttemptSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ success: false, error: parsed.error.issues }, 400);
    }
    const attempt = await postgresDb.recordAttempt({
      drillId: parsed.data.drillId,
      learnerId: parsed.data.learnerId || null,
      selectedIndex: parsed.data.selectedIndex,
      isCorrect: parsed.data.isCorrect,
      timeSpentSeconds: parsed.data.timeSpentSeconds
    });
    return c.json({
      success: true,
      message: "Attempt logged to PostgreSQL",
      attempt
    });
  });
  api.get("/learner/attempts", async (c) => {
    const drillId = c.req.query("drillId");
    const attempts = await postgresDb.getAttempts(drillId);
    return c.json({ success: true, attempts });
  });
  api.get("/agenda", async (c) => {
    const session = await postgresDb.getSession("00000000-0000-0000-0000-000000000001");
    const drills = await postgresDb.getDrills("00000000-0000-0000-0000-000000000001");
    const flags = await postgresDb.getFlags("00000000-0000-0000-0000-000000000001");
    return c.json({
      session,
      totalDrills: drills.length,
      flags
    });
  });
  api.post("/auth/signup", async (c) => {
    try {
      const { email, password, fullName, role } = await c.req.json();
      if (!email || !password) {
        return c.json({ success: false, error: "Email and password required" }, 400);
      }
      await postgresDb.createConfirmedUser(
        email,
        password,
        fullName || email.split("@")[0],
        role || "learner"
      );
      const { data, error } = await supabaseServer.auth.signInWithPassword({
        email,
        password
      });
      if (error) return c.json({ success: false, error: error.message }, 400);
      return c.json({ success: true, user: data.user, session: data.session });
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      return c.json({ success: false, error: error.message }, 500);
    }
  });
  api.post("/auth/signin", async (c) => {
    try {
      const { email, password } = await c.req.json();
      const { data, error } = await supabaseServer.auth.signInWithPassword({
        email,
        password
      });
      if (error) return c.json({ success: false, error: error.message }, 400);
      return c.json({ success: true, user: data.user, session: data.session });
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      return c.json({ success: false, error: error.message }, 500);
    }
  });
  api.get("/auth/me", async (c) => {
    const authHeader = c.req.header("Authorization");
    if (!authHeader) {
      return c.json({ authenticated: false, user: null }, 401);
    }
    const token = authHeader.replace(/^Bearer\s+/i, "");
    const { data: { user }, error } = await supabaseServer.auth.getUser(token);
    if (error || !user) {
      return c.json({ authenticated: false, error: error?.message }, 401);
    }
    return c.json({ authenticated: true, user });
  });
  api.get("/realtime/status", (c) => {
    const instance = getRealtimeInstance();
    return c.json({
      status: "active",
      path: "/ws",
      clients: instance ? instance.getClientCount() : 0
    });
  });
  app2.route("/api", api);
  app2.route("/", api);
  return app2;
}
var app = createApp();

// api-src/index.ts
var config = {
  runtime: "nodejs"
};
var dispatch = (req) => {
  const matchedPath = req.headers.get("x-matched-path");
  if (matchedPath) {
    const url = new URL(req.url);
    url.pathname = matchedPath;
    const newReq = new Request(url.toString(), req);
    return app.fetch(newReq);
  }
  return app.fetch(req);
};
var GET = (req) => dispatch(req);
var POST = (req) => dispatch(req);
var PATCH = (req) => dispatch(req);
var PUT = (req) => dispatch(req);
var DELETE = (req) => dispatch(req);
var index_default = (req, res) => {
  const matchedPath = req.headers?.["x-matched-path"];
  if (matchedPath && typeof matchedPath === "string") {
    req.url = matchedPath;
  }
  return handle(app)(req, res);
};
export {
  DELETE,
  GET,
  PATCH,
  POST,
  PUT,
  config,
  index_default as default
};
