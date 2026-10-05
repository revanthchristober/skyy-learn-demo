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

export async function fetchSession(): Promise<{
  session: SessionState;
  drills: Drill[];
  flags: FlaggedTopic[];
}> {
  const res = await fetch('/api/session');
  return parseResponse(res, 'Failed to fetch session data');
}

export async function generateDrillsAPI(params: {
  studentName: string;
  subject: string;
  tutorNotes: string;
  tutorToneNote?: string;
}): Promise<GenerationResponse> {
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
}

export async function updateDrillAPI(id: string, updates: Partial<Drill>): Promise<Drill> {
  const res = await fetch(`/api/drills/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates)
  });

  const data = await parseResponse<{ success: boolean; drill: Drill }>(res, 'Failed to update drill');
  return data.drill;
}

export async function approveAllDrillsAPI(): Promise<Drill[]> {
  const res = await fetch('/api/drills/approve-all', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });

  const data = await parseResponse<{ success: boolean; drills: Drill[] }>(res, 'Failed to approve drills');
  return data.drills;
}

export async function acceptSuggestionAPI(id: string): Promise<Drill> {
  const res = await fetch(`/api/drills/${id}/accept-suggestion`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });

  const data = await parseResponse<{ success: boolean; drill: Drill }>(res, 'Failed to accept suggestion');
  return data.drill;
}

export async function dismissFlagAPI(id: string): Promise<Drill> {
  const res = await fetch(`/api/drills/${id}/dismiss-flag`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });

  const data = await parseResponse<{ success: boolean; drill: Drill }>(res, 'Failed to dismiss flag');
  return data.drill;
}

export async function fetchLearnerDrillsAPI(): Promise<{
  ready: boolean;
  message?: string;
  studentName?: string;
  subject?: string;
  drills: Drill[];
}> {
  const res = await fetch('/api/learner/drills');
  if (res.status === 403) {
    const data = await parseResponse<{ message: string }>(res, 'Pending approval');
    return { ready: false, message: data.message, drills: [] };
  }
  return parseResponse(res, 'Failed to fetch learner drills');
}

export async function flagQuestionAPI(params: {
  drillId: string;
  question: string;
  studentNote: string;
}): Promise<FlaggedTopic> {
  const res = await fetch('/api/learner/flag', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
  });

  const data = await parseResponse<{ success: boolean; flag: FlaggedTopic }>(res, 'Failed to flag question');
  return data.flag;
}

export async function fetchAgendaAPI(): Promise<{
  session: SessionState;
  totalDrills: number;
  flags: FlaggedTopic[];
}> {
  const res = await fetch('/api/agenda');
  return parseResponse(res, 'Failed to fetch agenda data');
}

export async function recordAttemptAPI(params: {
  drillId: string;
  learnerId?: string | null;
  selectedIndex: number;
  isCorrect: boolean;
  timeSpentSeconds?: number;
}): Promise<{ success: boolean; attempt: any }> {
  const res = await fetch('/api/learner/attempt', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
  });

  return parseResponse(res, 'Failed to record attempt');
}
