export interface DrillAuditMeta {
  status: 'verified' | 'flagged';
  confidence: number;
  auditorModel: string;
  reason: string;
  suggestedCorrectIndex?: number | null;
  verifiedAt: string;
}

export interface Drill {
  id: string;
  title: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  hint: string;
  approvedAt: string | null;
  audit?: DrillAuditMeta;
}

export interface FlaggedTopic {
  drillId: string;
  question: string;
  studentNote: string;
  timestamp: string;
}

export interface SessionState {
  id: string;
  studentName: string;
  goal: string;
  subject: string;
  tutorNotes: string;
  tutorToneNote: string;
  drills: Drill[];
  isApproved: boolean;
  flaggedTopics: FlaggedTopic[];
}

export interface PresetScenario {
  studentName: string;
  goal: string;
  subject: string;
  tutorNotes: string;
  tutorToneNote: string;
  drills: Drill[];
}

export type TabKey = 'tutor' | 'review' | 'learner' | 'agenda';

export interface GenerationResponse {
  success: boolean;
  drills: Drill[];
  meta: {
    durationMs: number;
    model: string;
    auditorModel?: string;
    genDurationMs?: number;
    auditDurationMs?: number;
    attempts?: number;
    flaggedCount?: number;
    retryLogs?: Array<{
      attempt: number;
      reason: string;
      errors: string[];
    }>;
    promptTokens?: number;
    completionTokens?: number;
  };
}

