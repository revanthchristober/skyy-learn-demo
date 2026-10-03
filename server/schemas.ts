import { z } from 'zod';

export const RawDrillSchema = z.object({
  id: z.string().default(() => `drill-${Math.random().toString(36).substring(2, 9)}`),
  title: z.string().min(2, "Title is too short").max(100),
  question: z.string().min(5, "Question is too short"),
  options: z.array(z.string().min(1)).min(2, "Must have at least 2 options").max(6),
  correctIndex: z.number().int().min(0),
  explanation: z.string().min(5, "Explanation is too short"),
  hint: z.string().min(3, "Hint is too short")
}).refine(data => data.correctIndex < data.options.length, {
  message: "correctIndex must point to a valid option",
  path: ["correctIndex"]
});

export const GroqOutputSchema = z.object({
  drills: z.array(RawDrillSchema).min(1, "At least 1 drill required").max(6)
}).refine(data => {
  const ids = data.drills.map(d => d.id);
  return new Set(ids).size === ids.length;
}, {
  message: "Drill IDs must be unique",
  path: ["drills"]
});

export const GenerateRequestSchema = z.object({
  studentName: z.string().min(1, "Student name required"),
  subject: z.string().min(1, "Subject required"),
  tutorNotes: z.string().min(5, "Tutor notes must be at least 5 characters"),
  tutorToneNote: z.string().optional().default("Keep grounded in practical adult contexts")
});

export const UpdateDrillSchema = z.object({
  question: z.string().min(3).optional(),
  explanation: z.string().min(3).optional(),
  hint: z.string().min(3).optional()
});

export const FlagRequestSchema = z.object({
  drillId: z.string().min(1),
  question: z.string().min(1),
  studentNote: z.string().min(1)
});

export type RawDrill = z.infer<typeof RawDrillSchema>;
export type GroqOutput = z.infer<typeof GroqOutputSchema>;
export type GenerateRequest = z.infer<typeof GenerateRequestSchema>;
