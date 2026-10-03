import { Drill, FlaggedTopic, SessionState, GenerationResponse } from '../types';

export async function fetchSession(): Promise<{
  session: SessionState;
  drills: Drill[];
  flags: FlaggedTopic[];
}> {
  const res = await fetch('/api/session');
  if (!res.ok) throw new Error('Failed to fetch session data');
  return res.json();
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

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to generate drills');
  }

  return data;
}

export async function updateDrillAPI(id: string, updates: Partial<Drill>): Promise<Drill> {
  const res = await fetch(`/api/drills/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates)
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to update drill');
  }

  return data.drill;
}

export async function approveAllDrillsAPI(): Promise<Drill[]> {
  const res = await fetch('/api/drills/approve-all', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to approve drills');
  }

  return data.drills;
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
    const data = await res.json();
    return { ready: false, message: data.message, drills: [] };
  }
  if (!res.ok) throw new Error('Failed to fetch learner drills');
  return res.json();
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

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to flag question');
  }

  return data.flag;
}

export async function fetchAgendaAPI(): Promise<{
  session: SessionState;
  totalDrills: number;
  flags: FlaggedTopic[];
}> {
  const res = await fetch('/api/agenda');
  if (!res.ok) throw new Error('Failed to fetch agenda data');
  return res.json();
}
