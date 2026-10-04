import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

import pg from 'pg';
import { db as fileDb, type DBDrill, type DBSession, type DBFlaggedTopic } from './db';
import { DrillAuditMeta } from './schemas';

const { Pool } = pg;

export class PostgresDatabase {
  private pool: pg.Pool | null = null;
  private isConnected = false;

  constructor() {
    this.initPool();
  }

  private initPool() {
    const password = process.env.SUPABASE_DB_PASSWORD;
    const host = process.env.SUPABASE_DB_HOST || 'db.bturhosivfvyvanztkjb.supabase.co';

    if (!password) {
      console.warn('[PostgreSQL] No SUPABASE_DB_PASSWORD found. Running with file-backed DB fallback.');
      return;
    }

    try {
      this.pool = new Pool({
        host,
        port: Number(process.env.SUPABASE_DB_PORT) || 5432,
        user: process.env.SUPABASE_DB_USER || 'postgres',
        password,
        database: process.env.SUPABASE_DB_NAME || 'postgres',
        ssl: { rejectUnauthorized: false },
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000
      });

      // Quick test
      this.pool.query('SELECT NOW();')
        .then(() => {
          this.isConnected = true;
          console.log('[PostgreSQL] Successfully connected to live Supabase Postgres database pool.');
        })
        .catch(err => {
          console.warn('[PostgreSQL Pool Init Warning]: Using fallback storage:', err.message);
          this.isConnected = false;
        });
    } catch (err) {
      console.warn('[PostgreSQL Init Error]: Using fallback storage:', err);
      this.isConnected = false;
    }
  }

  async getSession(id: string = '00000000-0000-0000-0000-000000000001'): Promise<DBSession> {
    if (!this.pool || !this.isConnected) {
      return fileDb.getSession('session-default');
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
        return fileDb.getSession('session-default');
      }

      const row = res.rows[0];
      return {
        id: row.id,
        studentName: row.student_name,
        subject: row.subject,
        tutorNotes: row.tutor_notes || '',
        tutorToneNote: row.pedagogical_tone || '',
        isApproved: row.is_approved,
        createdAt: row.created_at?.toISOString() || new Date().toISOString(),
        updatedAt: row.updated_at?.toISOString() || new Date().toISOString()
      };
    } catch (err) {
      console.warn('[Postgres getSession Error, fallback to fileDb]:', err);
      return fileDb.getSession('session-default');
    }
  }

  async updateSession(
    id: string = '00000000-0000-0000-0000-000000000001',
    updates: Partial<DBSession>
  ): Promise<DBSession> {
    // Always keep fileDb in sync
    fileDb.updateSession('session-default', updates);

    if (!this.pool || !this.isConnected) {
      return fileDb.getSession('session-default');
    }

    try {
      if (updates.studentName || updates.subject || updates.isApproved !== undefined) {
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
           ON CONFLICT (id) DO UPDATE
           SET tutor_notes = EXCLUDED.tutor_notes,
               pedagogical_tone = EXCLUDED.pedagogical_tone;`,
          [id, updates.tutorNotes || '', updates.tutorToneNote || '']
        );
      }

      return this.getSession(id);
    } catch (err) {
      console.warn('[Postgres updateSession Error]:', err);
      return fileDb.getSession('session-default');
    }
  }

  async getDrills(sessionId: string = '00000000-0000-0000-0000-000000000001'): Promise<DBDrill[]> {
    if (!this.pool || !this.isConnected) {
      return fileDb.getDrills('session-default');
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
        return fileDb.getDrills('session-default');
      }

      return res.rows.map(r => ({
        id: r.id,
        sessionId: r.session_id,
        title: r.title,
        question: r.question,
        options: Array.isArray(r.options) ? r.options : JSON.parse(r.options || '[]'),
        correctIndex: r.correct_index,
        explanation: r.explanation,
        hint: r.hint,
        approvedAt: r.approved_at?.toISOString() || null,
        createdAt: r.created_at?.toISOString() || new Date().toISOString(),
        audit: r.audit_status ? {
          status: r.audit_status,
          confidence: r.audit_confidence || 95,
          auditorModel: r.audit_model || 'openai/gpt-oss-20b',
          reason: r.audit_reason || 'Verified',
          suggestedCorrectIndex: r.suggested_correct_index,
          verifiedAt: r.created_at?.toISOString() || new Date().toISOString()
        } : undefined
      }));
    } catch (err) {
      console.warn('[Postgres getDrills Error, fallback]:', err);
      return fileDb.getDrills('session-default');
    }
  }

  async setDrillsForSession(
    sessionId: string = '00000000-0000-0000-0000-000000000001',
    drills: Omit<DBDrill, 'sessionId' | 'createdAt'>[]
  ): Promise<DBDrill[]> {
    fileDb.setDrillsForSession('session-default', drills);

    if (!this.pool || !this.isConnected) {
      return fileDb.getDrills('session-default');
    }

    try {
      // Clear old drills for this session
      await this.pool.query('DELETE FROM public.drills WHERE session_id = $1;', [sessionId]);

      const created: DBDrill[] = [];
      const now = new Date().toISOString();

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
            d.audit?.status || 'verified',
            d.audit?.confidence || 95,
            d.audit?.reason || null,
            d.audit?.auditorModel || 'openai/gpt-oss-20b',
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
      console.warn('[Postgres setDrillsForSession Error]:', err);
      return fileDb.getDrills('session-default');
    }
  }

  async updateDrill(id: string, updates: Partial<DBDrill>): Promise<DBDrill | null> {
    fileDb.updateDrill(id, updates);

    if (!this.pool || !this.isConnected) {
      return fileDb.updateDrill(id, updates);
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
      return drills.find(d => d.id === id) || null;
    } catch (err) {
      console.warn('[Postgres updateDrill Error]:', err);
      return fileDb.updateDrill(id, updates);
    }
  }

  async approveAllDrills(sessionId: string = '00000000-0000-0000-0000-000000000001'): Promise<DBDrill[]> {
    fileDb.approveAllDrills('session-default');

    if (!this.pool || !this.isConnected) {
      return fileDb.getDrills('session-default');
    }

    try {
      await this.pool.query(
        'UPDATE public.drills SET approved_at = NOW() WHERE session_id = $1;',
        [sessionId]
      );
      await this.pool.query(
        'UPDATE public.sessions SET is_approved = TRUE, updated_at = NOW() WHERE id = $1;',
        [sessionId]
      );

      return this.getDrills(sessionId);
    } catch (err) {
      console.warn('[Postgres approveAllDrills Error]:', err);
      return fileDb.getDrills('session-default');
    }
  }

  async addFlag(sessionId: string, drillId: string, question: string, studentNote: string): Promise<DBFlaggedTopic> {
    const fileFlag = fileDb.addFlag('session-default', drillId, question, studentNote);

    if (!this.pool || !this.isConnected) {
      return fileFlag;
    }

    try {
      const res = await this.pool.query(
        `INSERT INTO public.flagged_topics (session_id, drill_id, question, student_note, status)
         VALUES ($1, $2, $3, $4, 'pending')
         RETURNING id, session_id, drill_id, question, student_note, created_at;`,
        ['00000000-0000-0000-0000-000000000001', drillId, question, studentNote]
      );
      const row = res.rows[0];
      return {
        id: row.id,
        sessionId: row.session_id,
        drillId: row.drill_id,
        question: row.question,
        studentNote: row.student_note,
        timestamp: row.created_at ? new Date(row.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'
      };
    } catch (err) {
      console.warn('[Postgres addFlag Error]:', err);
      return fileFlag;
    }
  }

  async getFlags(sessionId: string = '00000000-0000-0000-0000-000000000001'): Promise<DBFlaggedTopic[]> {
    if (!this.pool || !this.isConnected) {
      return fileDb.getFlags('session-default');
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
        return fileDb.getFlags('session-default');
      }

      return res.rows.map(r => ({
        id: r.id,
        sessionId: r.session_id,
        drillId: r.drill_id,
        question: r.question,
        studentNote: r.student_note,
        timestamp: r.created_at ? new Date(r.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'
      }));
    } catch (err) {
      console.warn('[Postgres getFlags Error]:', err);
      return fileDb.getFlags('session-default');
    }
  }

  async recordAttempt(attempt: {
    drillId: string;
    learnerId?: string | null;
    selectedIndex: number;
    isCorrect: boolean;
    timeSpentSeconds?: number;
  }) {
    const fileAttempt = fileDb.recordAttempt({
      drillId: attempt.drillId,
      learnerId: attempt.learnerId || undefined,
      selectedIndex: attempt.selectedIndex,
      isCorrect: attempt.isCorrect,
      timeSpentSeconds: attempt.timeSpentSeconds
    });

    if (!this.pool || !this.isConnected) {
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
        createdAt: row.created_at?.toISOString() || new Date().toISOString()
      };
    } catch (err) {
      console.warn('[Postgres recordAttempt Error, using file fallback]:', err);
      return fileAttempt;
    }
  }

  async getAttempts(drillId?: string) {
    if (!this.pool || !this.isConnected) {
      return fileDb.getAttempts(drillId);
    }

    try {
      let query = `SELECT id, drill_id, learner_id, selected_index, is_correct, time_spent_seconds, created_at
                   FROM public.drill_attempts`;
      const params: any[] = [];
      if (drillId) {
        query += ` WHERE drill_id = $1`;
        params.push(drillId);
      }
      query += ` ORDER BY created_at DESC;`;

      const res = await this.pool.query(query, params);
      return res.rows.map(r => ({
        id: r.id,
        drillId: r.drill_id,
        learnerId: r.learner_id,
        selectedIndex: r.selected_index,
        isCorrect: r.is_correct,
        timeSpentSeconds: r.time_spent_seconds,
        createdAt: r.created_at?.toISOString() || new Date().toISOString()
      }));
    } catch (err) {
      console.warn('[Postgres getAttempts Error]:', err);
      return fileDb.getAttempts(drillId);
    }
  }
}

export const postgresDb = new PostgresDatabase();
