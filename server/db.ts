import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, 'data');
const STORE_FILE = path.join(DATA_DIR, 'store.json');

import { DrillAuditMeta } from './schemas';

export interface DBDrill {
  id: string;
  sessionId: string;
  title: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  hint: string;
  approvedAt: string | null;
  createdAt: string;
  audit?: DrillAuditMeta;
}

export interface DBFlaggedTopic {
  id: string;
  sessionId: string;
  drillId: string;
  question: string;
  studentNote: string;
  timestamp: string;
}

export interface DBDrillAttempt {
  id: string;
  drillId: string;
  learnerId?: string;
  selectedIndex: number;
  isCorrect: boolean;
  timeSpentSeconds: number;
  createdAt: string;
}

export interface DBSession {
  id: string;
  studentName: string;
  subject: string;
  tutorNotes: string;
  tutorToneNote: string;
  isApproved: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DBStore {
  sessions: Record<string, DBSession>;
  drills: Record<string, DBDrill>;
  flags: Record<string, DBFlaggedTopic>;
  attempts?: Record<string, DBDrillAttempt>;
}

const defaultStore: DBStore = {
  sessions: {
    'session-default': {
      id: 'session-default',
      studentName: 'Marcus Vance',
      subject: 'Fractions & Proportions',
      tutorNotes: 'Marcus grasps basic division, but got stuck calculating conduit fractions (comparing 3/8" vs 6/16"). Confuses cross-multiplication with reciprocal division.',
      tutorToneNote: 'Keep practice grounded in shop measurements. Do not use pizza or pie metaphors.',
      isApproved: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  },
  drills: {
    'drill-1': {
      id: 'drill-1',
      sessionId: 'session-default',
      title: 'Equivalent fractions on the job',
      question: 'A conduit bracket specifies 3/8" clearance. Which measurement is physically equivalent?',
      options: ['6/16"', '4/10"', '9/16"', '3/16"'],
      correctIndex: 0,
      explanation: 'Multiplying numerator and denominator by 2 gives 6/16". Both represent the exact same measurement.',
      hint: 'Multiply numerator and denominator by 2 to compare against sixteenths.',
      approvedAt: new Date().toISOString(),
      createdAt: new Date().toISOString()
    },
    'drill-2': {
      id: 'drill-2',
      sessionId: 'session-default',
      title: 'Dividing fractional lengths',
      question: 'You need to cut a 3/4-foot conduit into 1/8-foot segments. How many segments do you get?',
      options: ['4 segments', '6 segments', '8 segments', '3 segments'],
      correctIndex: 1,
      explanation: '3/4 divided by 1/8 equals 3/4 × 8/1 = 24/4 = 6 segments.',
      hint: 'Dividing by a fraction means multiplying by its reciprocal (invert 1/8 to 8/1).',
      approvedAt: new Date().toISOString(),
      createdAt: new Date().toISOString()
    },
    'drill-3': {
      id: 'drill-3',
      sessionId: 'session-default',
      title: 'Dimension comparison',
      question: 'When comparing 5/8" and 11/16", which dimension is larger?',
      options: ['5/8" is larger', '11/16" is larger', 'Both are equal'],
      correctIndex: 1,
      explanation: '5/8 converted to sixteenths is 10/16". Since 11/16 > 10/16, 11/16" is larger.',
      hint: 'Convert 5/8 to a common denominator of 16.',
      approvedAt: new Date().toISOString(),
      createdAt: new Date().toISOString()
    }
  },
  flags: {}
};

class Database {
  private store: DBStore;

  constructor() {
    this.store = this.load();
  }

  private load(): DBStore {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (fs.existsSync(STORE_FILE)) {
        const raw = fs.readFileSync(STORE_FILE, 'utf-8');
        return JSON.parse(raw);
      }
    } catch (err) {
      console.error('[DB] Failed to load store from disk, using defaults:', err);
    }
    return JSON.parse(JSON.stringify(defaultStore));
  }

  private save(): void {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(STORE_FILE, JSON.stringify(this.store, null, 2), 'utf-8');
    } catch (err) {
      console.error('[DB] Failed to persist store to disk:', err);
    }
  }

  getSession(id: string = 'session-default'): DBSession {
    if (!this.store.sessions[id]) {
      this.store.sessions[id] = {
        id,
        studentName: 'Marcus Vance',
        subject: 'Fractions & Proportions',
        tutorNotes: '',
        tutorToneNote: '',
        isApproved: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      this.save();
    }
    return this.store.sessions[id];
  }

  updateSession(id: string, updates: Partial<DBSession>): DBSession {
    const session = this.getSession(id);
    const updated = {
      ...session,
      ...updates,
      updatedAt: new Date().toISOString()
    };
    this.store.sessions[id] = updated;
    this.save();
    return updated;
  }

  getDrills(sessionId: string = 'session-default'): DBDrill[] {
    return Object.values(this.store.drills).filter(d => d.sessionId === sessionId);
  }

  getApprovedDrills(sessionId: string = 'session-default'): DBDrill[] {
    return this.getDrills(sessionId).filter(d => d.approvedAt !== null);
  }

  setDrillsForSession(sessionId: string, newDrills: Omit<DBDrill, 'sessionId' | 'createdAt'>[]): DBDrill[] {
    // Delete existing drills for session
    for (const [key, drill] of Object.entries(this.store.drills)) {
      if (drill.sessionId === sessionId) {
        delete this.store.drills[key];
      }
    }

    const created: DBDrill[] = [];
    const now = new Date().toISOString();

    for (const d of newDrills) {
      const entry: DBDrill = {
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

  updateDrill(id: string, updates: Partial<DBDrill>): DBDrill | null {
    if (!this.store.drills[id]) return null;
    this.store.drills[id] = {
      ...this.store.drills[id],
      ...updates
    };
    this.save();
    return this.store.drills[id];
  }

  approveAllDrills(sessionId: string = 'session-default'): DBDrill[] {
    const now = new Date().toISOString();
    const drills = this.getDrills(sessionId);
    for (const d of drills) {
      d.approvedAt = now;
      this.store.drills[d.id] = d;
    }
    this.updateSession(sessionId, { isApproved: true });
    this.save();
    return drills;
  }

  addFlag(sessionId: string, drillId: string, question: string, studentNote: string): DBFlaggedTopic {
    const id = `flag-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const flag: DBFlaggedTopic = {
      id,
      sessionId,
      drillId,
      question,
      studentNote,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    this.store.flags[id] = flag;
    this.save();
    return flag;
  }

  getFlags(sessionId: string = 'session-default'): DBFlaggedTopic[] {
    return Object.values(this.store.flags).filter(f => f.sessionId === sessionId);
  }

  recordAttempt(attempt: {
    drillId: string;
    learnerId?: string;
    selectedIndex: number;
    isCorrect: boolean;
    timeSpentSeconds?: number;
  }): DBDrillAttempt {
    const id = `attempt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const entry: DBDrillAttempt = {
      id,
      drillId: attempt.drillId,
      learnerId: attempt.learnerId,
      selectedIndex: attempt.selectedIndex,
      isCorrect: attempt.isCorrect,
      timeSpentSeconds: attempt.timeSpentSeconds || 0,
      createdAt: new Date().toISOString()
    };
    if (!this.store.attempts) {
      this.store.attempts = {};
    }
    this.store.attempts[id] = entry;
    this.save();
    return entry;
  }

  getAttempts(drillId?: string): DBDrillAttempt[] {
    if (!this.store.attempts) return [];
    const all = Object.values(this.store.attempts);
    return drillId ? all.filter(a => a.drillId === drillId) : all;
  }
}

export const db = new Database();
