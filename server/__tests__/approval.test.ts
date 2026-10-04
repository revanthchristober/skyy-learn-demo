import { describe, it, expect, beforeEach } from 'vitest';
import { app } from '../app';
import { db } from '../db';

describe('The Approval Rule: Core Guardrail & Access Gating', () => {
  const sessionId = 'session-default';

  beforeEach(() => {
    // Reset session to unapproved state with unapproved drills
    db.updateSession(sessionId, {
      studentName: 'Marcus Vance',
      subject: 'Fractions & Proportions',
      isApproved: false
    });

    db.setDrillsForSession(sessionId, [
      {
        id: 'drill-unapproved-1',
        title: 'Conduit Sizing',
        question: 'Which fraction is equivalent to 3/8"?',
        options: ['6/16"', '4/10"', '9/16"', '3/16"'],
        correctIndex: 0,
        explanation: 'Multiplying numerator and denominator by 2 gives 6/16".',
        hint: 'Multiply top and bottom by 2.',
        approvedAt: null,
        audit: {
          status: 'verified',
          confidence: 90,
          auditorModel: 'openai/gpt-oss-20b',
          reason: 'Correct mathematical equivalence verified.',
          verifiedAt: new Date().toISOString()
        }
      },
      {
        id: 'drill-unapproved-2',
        title: 'Fraction Division',
        question: 'How many 1/8" pieces can be cut from 3/4"?',
        options: ['4 pieces', '6 pieces', '8 pieces', '3 pieces'],
        correctIndex: 1,
        explanation: '3/4 divided by 1/8 equals 3/4 * 8/1 = 6.',
        hint: 'Multiply by reciprocal 8/1.',
        approvedAt: null,
        audit: {
          status: 'flagged',
          confidence: 45,
          auditorModel: 'openai/gpt-oss-20b',
          reason: 'Check reciprocal calculation.',
          suggestedCorrectIndex: 1,
          verifiedAt: new Date().toISOString()
        }
      }
    ]);
  });

  it('strictly denies learner access (HTTP 403) when session is awaiting tutor approval', async () => {
    const res = await app.request('/api/learner/drills');
    expect(res.status).toBe(403);

    const body = await res.json();
    expect(body.ready).toBe(false);
    expect(body.message).toContain('Practice drills are currently awaiting tutor verification and approval');
    expect(body.drills).toEqual([]);
  });

  it('guarantees unapproved drills are never leaked to the learner endpoint', async () => {
    const sessionBefore = db.getSession(sessionId);
    expect(sessionBefore.isApproved).toBe(false);

    const res = await app.request('/api/learner/drills');
    const body = await res.json();
    expect(body.drills).toHaveLength(0);
  });
});

describe('The Approval Rule: Tutor Approval Lifecycle', () => {
  const sessionId = 'session-default';

  beforeEach(() => {
    db.updateSession(sessionId, { isApproved: false });
    db.setDrillsForSession(sessionId, [
      {
        id: 'drill-lifecycle-1',
        title: 'Drill 1',
        question: 'What is 1/2 in percentage?',
        options: ['25%', '50%', '75%', '100%'],
        correctIndex: 1,
        explanation: '1 divided by 2 equals 0.5 or 50%.',
        hint: 'Half of 100.',
        approvedAt: null
      }
    ]);
  });

  it('approves all drills and records ISO approvedAt timestamp', async () => {
    const res = await app.request('/api/drills/approve-all', {
      method: 'POST'
    });
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.drills).toHaveLength(1);
    expect(body.drills[0].approvedAt).toBeTruthy();

    // Verify session state updated in DB
    const session = db.getSession(sessionId);
    expect(session.isApproved).toBe(true);

    const drill = db.getDrills(sessionId)[0];
    expect(drill.approvedAt).not.toBeNull();
  });

  it('unlocks learner practice endpoint (HTTP 200) only after tutor approval', async () => {
    // 1. Before approval: HTTP 403
    const lockedRes = await app.request('/api/learner/drills');
    expect(lockedRes.status).toBe(403);

    // 2. Tutor approves
    await app.request('/api/drills/approve-all', { method: 'POST' });

    // 3. After approval: HTTP 200 with approved drills
    const unlockedRes = await app.request('/api/learner/drills');
    expect(unlockedRes.status).toBe(200);

    const body = await unlockedRes.json();
    expect(body.ready).toBe(true);
    expect(body.studentName).toBe('Marcus Vance');
    expect(body.drills).toHaveLength(1);
    expect(body.drills[0].id).toBe('drill-lifecycle-1');
    expect(body.drills[0].approvedAt).not.toBeNull();
  });
});

describe('The Approval Rule: Tutor Pre-Approval Review & Corrections', () => {
  const sessionId = 'session-default';

  beforeEach(() => {
    db.updateSession(sessionId, { isApproved: false });
    db.setDrillsForSession(sessionId, [
      {
        id: 'drill-review-1',
        title: 'Auditor Flagged Drill',
        question: 'What is 5/8 inch converted to 16ths?',
        options: ['8/16"', '10/16"', '12/16"', '14/16"'],
        correctIndex: 0, // Wrong on purpose to test tutor acceptance
        explanation: 'Initial flawed explanation.',
        hint: 'Multiply by 2/2.',
        approvedAt: null,
        audit: {
          status: 'flagged',
          confidence: 40,
          auditorModel: 'openai/gpt-oss-20b',
          reason: '5/8 * 2/2 = 10/16. Correct index should be 1.',
          suggestedCorrectIndex: 1,
          verifiedAt: new Date().toISOString()
        }
      }
    ]);
  });

  it('allows tutor to accept auditor suggested answer key correction', async () => {
    const res = await app.request('/api/drills/drill-review-1/accept-suggestion', {
      method: 'POST'
    });
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.drill.correctIndex).toBe(1); // Updated from 0 to 1
    expect(body.drill.audit.status).toBe('verified');
    expect(body.drill.audit.confidence).toBe(95);
    expect(body.drill.audit.reason).toContain('Tutor accepted auditor correction');
  });

  it('returns 400 if tutor tries to accept suggestion when none exists', async () => {
    // Update drill to have no suggested index
    db.updateDrill('drill-review-1', {
      audit: {
        status: 'verified',
        confidence: 90,
        auditorModel: 'openai/gpt-oss-20b',
        reason: 'Already verified',
        suggestedCorrectIndex: null,
        verifiedAt: new Date().toISOString()
      }
    });

    const res = await app.request('/api/drills/drill-review-1/accept-suggestion', {
      method: 'POST'
    });
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body.error).toContain('No suggested index available');
  });

  it('returns 404 when accepting suggestion for non-existent drill', async () => {
    const res = await app.request('/api/drills/drill-nonexistent/accept-suggestion', {
      method: 'POST'
    });
    expect(res.status).toBe(404);
  });

  it('allows tutor to dismiss an auditor flag with manual confirmation override', async () => {
    const res = await app.request('/api/drills/drill-review-1/dismiss-flag', {
      method: 'POST'
    });
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.drill.audit.status).toBe('verified');
    expect(body.drill.audit.confidence).toBe(100);
    expect(body.drill.audit.reason).toContain('confirmed correct by human tutor');
  });

  it('allows tutor to patch drill wording and correctIndex before approving', async () => {
    const res = await app.request('/api/drills/drill-review-1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question: 'Refined Question: Convert 5/8" to sixteenths accurately?',
        explanation: 'Multiply both 5 and 8 by 2 to yield 10/16".',
        correctIndex: 1
      })
    });
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.drill.question).toContain('Refined Question');
    expect(body.drill.correctIndex).toBe(1);
  });

  it('rejects invalid patch updates with HTTP 400', async () => {
    const res = await app.request('/api/drills/drill-review-1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        correctIndex: -1 // Invalid negative index
      })
    });
    expect(res.status).toBe(400);
  });
});

describe('The Approval Rule: Anti-Leak Re-generation Reset', () => {
  const sessionId = 'session-default';

  it('resets session to unapproved when new drills are generated', () => {
    // 1. Session is initially approved
    db.approveAllDrills(sessionId);
    expect(db.getSession(sessionId).isApproved).toBe(true);

    // 2. Setting new drills for session requires explicit tutor re-approval
    db.setDrillsForSession(sessionId, [
      {
        id: 'drill-new-batch-1',
        title: 'New Drill Batch',
        question: 'What is 3/16 + 5/16?',
        options: ['8/16"', '7/16"', '9/16"', '6/16"'],
        correctIndex: 0,
        explanation: '3/16 + 5/16 = 8/16.',
        hint: 'Add numerators.',
        approvedAt: null
      }
    ]);
    db.updateSession(sessionId, { isApproved: false });

    // 3. Session is now locked again
    expect(db.getSession(sessionId).isApproved).toBe(false);

    // 4. getApprovedDrills returns 0 items
    const approved = db.getApprovedDrills(sessionId);
    expect(approved).toHaveLength(0);
  });
});

describe('The Approval Rule: Database Isolation Logic', () => {
  const sessionId = 'session-default';

  it('getApprovedDrills filters out any drill where approvedAt is null', () => {
    db.setDrillsForSession(sessionId, [
      {
        id: 'd1',
        title: 'Approved One',
        question: 'Q1?',
        options: ['A', 'B'],
        correctIndex: 0,
        explanation: 'Exp',
        hint: 'Hnt',
        approvedAt: new Date().toISOString()
      },
      {
        id: 'd2',
        title: 'Unapproved Two',
        question: 'Q2?',
        options: ['A', 'B'],
        correctIndex: 1,
        explanation: 'Exp',
        hint: 'Hnt',
        approvedAt: null
      }
    ]);

    const approvedOnly = db.getApprovedDrills(sessionId);
    expect(approvedOnly).toHaveLength(1);
    expect(approvedOnly[0].id).toBe('d1');
  });

  it('approveAllDrills updates both all drills approvedAt and session isApproved flag', () => {
    db.updateSession(sessionId, { isApproved: false });
    db.setDrillsForSession(sessionId, [
      {
        id: 'd-test-1',
        title: 'T1',
        question: 'Q1?',
        options: ['A', 'B'],
        correctIndex: 0,
        explanation: 'Exp',
        hint: 'Hnt',
        approvedAt: null
      },
      {
        id: 'd-test-2',
        title: 'T2',
        question: 'Q2?',
        options: ['A', 'B'],
        correctIndex: 1,
        explanation: 'Exp',
        hint: 'Hnt',
        approvedAt: null
      }
    ]);

    const result = db.approveAllDrills(sessionId);
    expect(result).toHaveLength(2);
    expect(result.every(d => d.approvedAt !== null)).toBe(true);

    const session = db.getSession(sessionId);
    expect(session.isApproved).toBe(true);
  });
});
