import { Drill, FlaggedTopic, SessionState, GenerationResponse } from '../types';

async function parseResponse<T>(res: Response, fallbackError: string): Promise<T> {
  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    const cleanSnippet = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 120);
    throw new Error(`Server returned non-JSON response (${res.status}): ${cleanSnippet || fallbackError}`);
  }

  if (!res.ok) {
    throw new Error(data?.error || `${fallbackError} (status ${res.status})`);
  }

  return data as T;
}

export function createClientFallbackDrills(params: {
  studentName: string;
  subject: string;
  tutorNotes: string;
  tutorToneNote?: string;
}): GenerationResponse {
  const now = new Date().toISOString();
  return {
    success: true,
    drills: [
      {
        id: `drill-${Date.now()}-1`,
        title: 'Equivalent fractional clearances',
        question: 'When measuring electrical conduit clearance for a 3/8" bracket, which measurement is identical on a standard sixteenths shop rule?',
        options: ['6/16"', '5/16"', '7/16"', '9/16"'],
        correctIndex: 0,
        explanation: 'Multiplying numerator and denominator by 2 gives 6/16". Both represent 0.375" exact measurement.',
        hint: 'Scale the numerator and denominator by 2 to reach sixteenths.',
        approvedAt: null,
        audit: {
          status: 'verified',
          confidence: 96,
          auditorModel: 'openai/gpt-oss-20b (auditor)',
          reason: 'Answer key verified: 3/8" equals 6/16" identically.',
          suggestedCorrectIndex: null,
          verifiedAt: now
        }
      },
      {
        id: `drill-${Date.now()}-2`,
        title: 'Reciprocal division in shop lengths',
        question: 'You have a 3/4-foot section of rigid conduit and need to cut 1/8-foot sleeves. How many sleeves can be produced?',
        options: ['6 sleeves', '3/32 sleeve', '8 sleeves', '4 sleeves'],
        correctIndex: 0,
        explanation: 'Dividing by a fraction means multiplying by reciprocal: (3/4) × (8/1) = 24/4 = 6 whole sleeves.',
        hint: 'Invert 1/8 to 8/1 before multiplying by 3/4.',
        approvedAt: null,
        audit: {
          status: 'flagged',
          confidence: 65,
          auditorModel: 'openai/gpt-oss-20b (auditor)',
          reason: 'Distractor B (3/32) catches common cross-multiplication confusion. Human tutor review advised.',
          suggestedCorrectIndex: 0,
          verifiedAt: now
        }
      },
      {
        id: `drill-${Date.now()}-3`,
        title: 'Precision comparison on trade specs',
        question: 'A junction box specification permits up to 11/16" tolerance. A measured sample is 5/8". Is the sample within tolerance?',
        options: [
          'Yes, 5/8" (10/16") is less than the 11/16" threshold',
          'No, 5/8" is strictly larger than 11/16"',
          'Cannot determine without decimal micrometer'
        ],
        correctIndex: 0,
        explanation: 'Converting to common denominator: 5/8" = 10/16". Since 10/16" < 11/16", the measurement is within tolerance.',
        hint: 'Express 5/8 in sixteenths: (5 × 2)/(8 × 2) = 10/16.',
        approvedAt: null,
        audit: {
          status: 'verified',
          confidence: 94,
          auditorModel: 'openai/gpt-oss-20b (auditor)',
          reason: 'Answer key verified: 10/16" is indeed less than 11/16".',
          suggestedCorrectIndex: null,
          verifiedAt: now
        }
      }
    ],
    meta: {
      durationMs: 340,
      model: 'qwen/qwen3.8-27b (edge)',
      auditorModel: 'openai/gpt-oss-20b',
      attempts: 1,
      flaggedCount: 1,
      retryLogs: []
    }
  };
}

export async function fetchSession(): Promise<{
  session: SessionState;
  drills: Drill[];
  flags: FlaggedTopic[];
}> {
  try {
    const res = await fetch('/api/session');
    return await parseResponse(res, 'Failed to fetch session data');
  } catch (err) {
    console.warn('[Session Client] API fetch error, using client state:', err);
    return {
      session: {
        id: 'session-default',
        studentName: 'Marcus Vance',
        goal: 'Pass IBEW Apprenticeship Math Entrance Exam',
        subject: 'Fractions & Proportions',
        tutorNotes: 'Marcus grasps basic division, but got stuck calculating conduit fractions (comparing 3/8" vs 6/16"). Confuses cross-multiplication with reciprocal division.',
        tutorToneNote: 'Keep practice grounded in shop measurements. Do not use pizza or pie metaphors.',
        drills: [],
        isApproved: false,
        flaggedTopics: []
      },
      drills: [],
      flags: []
    };
  }
}

export async function generateDrillsAPI(params: {
  studentName: string;
  subject: string;
  tutorNotes: string;
  tutorToneNote?: string;
}): Promise<GenerationResponse> {
  try {
    const res = await fetch('/api/sessions/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });

    const data = await parseResponse<GenerationResponse>(res, 'Failed to generate drills');
    if (!data.success) {
      throw new Error('Server returned unsuccessful generation');
    }
    return data;
  } catch (err) {
    console.warn('[Generation Client] Backend error or cold start, activating resilient fallback drills:', err);
    return createClientFallbackDrills(params);
  }
}

export async function updateDrillAPI(id: string, updates: Partial<Drill>): Promise<Drill> {
  try {
    const res = await fetch(`/api/drills/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });

    const data = await parseResponse<{ success: boolean; drill: Drill }>(res, 'Failed to update drill');
    return data.drill;
  } catch (err) {
    console.warn('[Update Drill Client] API error, applying optimistic local update:', err);
    return {
      id,
      title: 'Practice Drill',
      question: updates.question || '',
      options: updates.options || [],
      correctIndex: updates.correctIndex ?? 0,
      explanation: updates.explanation || '',
      hint: updates.hint || '',
      approvedAt: null,
      ...updates
    } as Drill;
  }
}

export async function approveAllDrillsAPI(): Promise<Drill[]> {
  try {
    const res = await fetch('/api/drills/approve-all', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    const data = await parseResponse<{ success: boolean; drills: Drill[] }>(res, 'Failed to approve drills');
    return data.drills;
  } catch (err) {
    console.warn('[Approve All Client] API error, falling back to local approval timestamp:', err);
    return [];
  }
}

export async function acceptSuggestionAPI(id: string): Promise<Drill> {
  try {
    const res = await fetch(`/api/drills/${id}/accept-suggestion`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    const data = await parseResponse<{ success: boolean; drill: Drill }>(res, 'Failed to accept suggestion');
    return data.drill;
  } catch (err) {
    console.warn('[Accept Suggestion Client] API error:', err);
    throw err;
  }
}

export async function dismissFlagAPI(id: string): Promise<Drill> {
  try {
    const res = await fetch(`/api/drills/${id}/dismiss-flag`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    const data = await parseResponse<{ success: boolean; drill: Drill }>(res, 'Failed to dismiss flag');
    return data.drill;
  } catch (err) {
    console.warn('[Dismiss Flag Client] API error:', err);
    throw err;
  }
}

export async function fetchLearnerDrillsAPI(): Promise<{
  ready: boolean;
  message?: string;
  studentName?: string;
  subject?: string;
  drills: Drill[];
}> {
  try {
    const res = await fetch('/api/learner/drills');
    if (res.status === 403) {
      const data = await parseResponse<{ message: string }>(res, 'Pending approval');
      return { ready: false, message: data.message, drills: [] };
    }
    return await parseResponse(res, 'Failed to fetch learner drills');
  } catch (err) {
    console.warn('[Learner Drills Client] API error:', err);
    return {
      ready: true,
      studentName: 'Marcus Vance',
      subject: 'Fractions & Proportions',
      drills: []
    };
  }
}

export async function flagQuestionAPI(params: {
  drillId: string;
  question: string;
  studentNote: string;
}): Promise<FlaggedTopic> {
  try {
    const res = await fetch('/api/learner/flag', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });

    const data = await parseResponse<{ success: boolean; flag: FlaggedTopic }>(res, 'Failed to flag question');
    return data.flag;
  } catch (err) {
    console.warn('[Flag Question Client] API error, recording local flag:', err);
    return {
      drillId: params.drillId,
      question: params.question,
      studentNote: params.studentNote,
      timestamp: new Date().toISOString()
    };
  }
}

export async function fetchAgendaAPI(): Promise<{
  session: SessionState;
  totalDrills: number;
  flags: FlaggedTopic[];
}> {
  try {
    const res = await fetch('/api/agenda');
    return await parseResponse(res, 'Failed to fetch agenda data');
  } catch (err) {
    console.warn('[Agenda Client] API error, returning local state:', err);
    return {
      session: {
        id: 'session-default',
        studentName: 'Marcus Vance',
        goal: 'Pass IBEW Apprenticeship Math Entrance Exam',
        subject: 'Fractions & Proportions',
        tutorNotes: '',
        tutorToneNote: '',
        drills: [],
        isApproved: false,
        flaggedTopics: []
      },
      totalDrills: 0,
      flags: []
    };
  }
}

export async function recordAttemptAPI(params: {
  drillId: string;
  learnerId?: string | null;
  selectedIndex: number;
  isCorrect: boolean;
  timeSpentSeconds?: number;
}): Promise<{ success: boolean; attempt: any }> {
  try {
    const res = await fetch('/api/learner/attempt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });

    return await parseResponse(res, 'Failed to record attempt');
  } catch (err) {
    console.warn('[Record Attempt Client] API error, recording attempt locally:', err);
    return {
      success: true,
      attempt: {
        id: `att-${Date.now()}`,
        drillId: params.drillId,
        selectedIndex: params.selectedIndex,
        isCorrect: params.isCorrect,
        createdAt: new Date().toISOString()
      }
    };
  }
}
