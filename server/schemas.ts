import { z } from 'zod';

export const RawDrillSchema = z.object({
  id: z.string().default(() => `drill-${Math.random().toString(36).substring(2, 9)}`),
  title: z.string().min(2, "Title is too short").max(100),
  question: z.string().min(5, "Question is too short"),
  options: z.array(z.string().min(1, "Option text cannot be empty")).min(2, "Must have at least 2 options").max(6, "Cannot exceed 6 options"),
  correctIndex: z.number().int("correctIndex must be an integer").min(0, "correctIndex cannot be negative"),
  explanation: z.string().min(5, "Explanation is too short"),
  hint: z.string().min(3, "Hint is too short")
}).superRefine((val, ctx) => {
  // 1. Strict correctIndex bounds checking against options array
  if (val.correctIndex >= val.options.length) {
    const isLikelyOneIndexed = val.correctIndex === val.options.length;
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `correctIndex (${val.correctIndex}) is out of bounds for options array of length ${val.options.length}. Valid 0-indexed range is 0 to ${val.options.length - 1}.${
        isLikelyOneIndexed
          ? ` Did you use 1-based indexing? If option ${val.correctIndex} was intended, correctIndex should be ${val.correctIndex - 1}.`
          : ''
      }`,
      path: ["correctIndex"]
    });
  }

  // 2. Prevent duplicate options (e.g. LLM repeating options to fill 4 choices)
  const trimmed = val.options.map(opt => opt.trim().toLowerCase());
  const seen = new Set<string>();
  const duplicates: string[] = [];
  
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
      message: `options array contains duplicate choices: ${duplicates.join(', ')}. All choices must be distinct and unique.`,
      path: ["options"]
    });
  }

  // 3. Ensure options don't contain empty or whitespace-only choices
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

export const GroqOutputSchema = z.object({
  drills: z.array(RawDrillSchema).min(1, "At least 1 drill required").max(6, "Maximum 6 drills allowed")
}).superRefine((data, ctx) => {
  // Ensure drill IDs are unique
  const ids = new Set<string>();
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

  // Ensure drill questions are distinct
  const questions = new Set<string>();
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

/**
 * Format Zod validation errors into an actionable feedback prompt for the LLM retry loop.
 */
export function formatZodFeedback(error: z.ZodError): string {
  const issues = error.issues.map((issue, index) => {
    const pathStr = issue.path.length > 0 ? issue.path.join('.') : 'root';
    return `${index + 1}. [Field: "${pathStr}"]: ${issue.message}`;
  });
  return issues.join('\n');
}

export const GenerateRequestSchema = z.object({
  studentName: z.string().min(1, "Student name required"),
  subject: z.string().min(1, "Subject required"),
  tutorNotes: z.string().min(5, "Tutor notes must be at least 5 characters"),
  tutorToneNote: z.string().optional().default("Keep grounded in practical adult contexts")
});

// Verification / Auditor Schemas (LLM Correctness Pass)
export const DrillVerificationItemSchema = z.object({
  drillId: z.string().min(1),
  verdict: z.enum(['verified', 'flagged']),
  confidence: z.number().min(0).max(100),
  reason: z.string().min(5),
  suggestedCorrectIndex: z.number().int().min(0).optional().nullable()
});

export const BatchVerificationOutputSchema = z.object({
  verifications: z.array(DrillVerificationItemSchema).min(1)
});

export const DrillAuditMetaSchema = z.object({
  status: z.enum(['verified', 'flagged']),
  confidence: z.number().min(0).max(100),
  auditorModel: z.string(),
  reason: z.string(),
  suggestedCorrectIndex: z.number().int().min(0).optional().nullable(),
  verifiedAt: z.string()
});

export const UpdateDrillSchema = z.object({
  question: z.string().min(3).optional(),
  explanation: z.string().min(3).optional(),
  hint: z.string().min(3).optional(),
  correctIndex: z.number().int().min(0).optional(),
  audit: DrillAuditMetaSchema.optional()
});

export const FlagRequestSchema = z.object({
  drillId: z.string().min(1),
  question: z.string().min(1),
  studentNote: z.string().min(1)
});

export type RawDrill = z.infer<typeof RawDrillSchema>;
export type GroqOutput = z.infer<typeof GroqOutputSchema>;
export type GenerateRequest = z.infer<typeof GenerateRequestSchema>;
export type DrillVerificationItem = z.infer<typeof DrillVerificationItemSchema>;
export type BatchVerificationOutput = z.infer<typeof BatchVerificationOutputSchema>;
export type DrillAuditMeta = z.infer<typeof DrillAuditMetaSchema>;

