import { describe, it, expect, vi } from 'vitest';
import {
  RawDrillSchema,
  GroqOutputSchema,
  formatZodFeedback,
  GenerateRequestSchema,
  UpdateDrillSchema,
  FlagRequestSchema,
  RecordAttemptSchema,
  DrillVerificationItemSchema,
  BatchVerificationOutputSchema,
  DrillAuditMetaSchema
} from '../schemas';
import { generateValidatedDrills } from '../groq';
import Groq from 'groq-sdk';

describe('Zod Schema Validation & Boundaries', () => {
  const validDrill = {
    id: 'drill-test-1',
    title: 'Markup Calculation',
    question: 'A contractor purchases materials for $400 and needs to apply a 25% markup. What is the quote?',
    options: ['$450', '$500', '$525', '$550'],
    correctIndex: 1,
    explanation: '25% of $400 is $100. Adding $100 markup to $400 gives $500.',
    hint: 'Calculate 25% of 400 first, then add to base cost.'
  };

  it('validates a compliant drill successfully', () => {
    const result = RawDrillSchema.safeParse(validDrill);
    expect(result.success).toBe(true);
  });

  describe('correctIndex Bounds Checks', () => {
    it('rejects correctIndex equal to options.length (common 1-based indexing LLM error)', () => {
      // 4 options: valid indices are 0, 1, 2, 3. 4 is out of bounds!
      const invalid = {
        ...validDrill,
        options: ['A', 'B', 'C', 'D'],
        correctIndex: 4
      };
      const result = RawDrillSchema.safeParse(invalid);
      expect(result.success).toBe(false);
      if (!result.success) {
        const issue = result.error.issues.find(i => i.path.includes('correctIndex'));
        expect(issue).toBeDefined();
        expect(issue?.message).toContain('out of bounds');
        expect(issue?.message).toContain('1-based indexing');
      }
    });

    it('rejects correctIndex substantially greater than options.length', () => {
      const invalid = {
        ...validDrill,
        options: ['A', 'B', 'C'],
        correctIndex: 9
      };
      const result = RawDrillSchema.safeParse(invalid);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('out of bounds');
      }
    });

    it('rejects negative correctIndex', () => {
      const invalid = {
        ...validDrill,
        correctIndex: -1
      };
      const result = RawDrillSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('rejects floating-point non-integer correctIndex', () => {
      const invalid = {
        ...validDrill,
        correctIndex: 1.5
      };
      const result = RawDrillSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('allows 0 as correctIndex for the first option', () => {
      const valid = {
        ...validDrill,
        correctIndex: 0
      };
      const result = RawDrillSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('allows (options.length - 1) as correctIndex for the last option', () => {
      const valid = {
        ...validDrill,
        options: ['A', 'B', 'C'],
        correctIndex: 2
      };
      const result = RawDrillSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });
  });

  describe('Duplicate & Empty Options Checks', () => {
    it('rejects duplicate choices in options array', () => {
      const invalid = {
        ...validDrill,
        options: ['$500', '$450', '$500', '$550'],
        correctIndex: 0
      };
      const result = RawDrillSchema.safeParse(invalid);
      expect(result.success).toBe(false);
      if (!result.success) {
        const issue = result.error.issues.find(i => i.path.includes('options'));
        expect(issue).toBeDefined();
        expect(issue?.message).toContain('duplicate choices');
      }
    });

    it('rejects duplicate choices with case or whitespace variance', () => {
      const invalid = {
        ...validDrill,
        options: ['Option A', 'option a', 'Option B', 'Option C'],
        correctIndex: 2
      };
      const result = RawDrillSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('rejects empty or whitespace-only choices', () => {
      const invalid = {
        ...validDrill,
        options: ['   ', 'Option B', 'Option C'],
        correctIndex: 1
      };
      const result = RawDrillSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('rejects when options array has fewer than 2 choices', () => {
      const invalid = {
        ...validDrill,
        options: ['Solo option'],
        correctIndex: 0
      };
      const result = RawDrillSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('GroqOutputSchema Multi-Drill Integrity', () => {
    it('rejects duplicate questions in the same batch', () => {
      const output = {
        drills: [
          { ...validDrill, id: 'drill-1' },
          { ...validDrill, id: 'drill-2' } // duplicate question!
        ]
      };
      const result = GroqOutputSchema.safeParse(output);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Duplicate drill question detected');
      }
    });

    it('rejects duplicate drill IDs', () => {
      const output = {
        drills: [
          { ...validDrill, id: 'drill-same', question: 'Question 1?' },
          { ...validDrill, id: 'drill-same', question: 'Question 2?' }
        ]
      };
      const result = GroqOutputSchema.safeParse(output);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Duplicate drill ID found');
      }
    });
  });

  describe('formatZodFeedback', () => {
    it('produces formatted, numbered, actionable messages for the LLM', () => {
      const invalid = {
        ...validDrill,
        options: ['A', 'B'],
        correctIndex: 2 // out of bounds
      };
      const parsed = RawDrillSchema.safeParse(invalid);
      expect(parsed.success).toBe(false);
      if (!parsed.success) {
        const feedback = formatZodFeedback(parsed.error);
        expect(feedback).toContain('1. [Field: "correctIndex"]:');
        expect(feedback).toContain('out of bounds');
      }
    });
  });

  describe('RawDrillSchema Min/Max String & Array Boundaries', () => {
    it('accepts title with exactly 2 characters and rejects 1 character', () => {
      expect(RawDrillSchema.safeParse({ ...validDrill, title: 'AB' }).success).toBe(true);
      expect(RawDrillSchema.safeParse({ ...validDrill, title: 'A' }).success).toBe(false);
    });

    it('accepts title with 100 characters and rejects 101 characters', () => {
      expect(RawDrillSchema.safeParse({ ...validDrill, title: 'A'.repeat(100) }).success).toBe(true);
      expect(RawDrillSchema.safeParse({ ...validDrill, title: 'A'.repeat(101) }).success).toBe(false);
    });

    it('enforces question minimum length of 5 characters', () => {
      expect(RawDrillSchema.safeParse({ ...validDrill, question: '12345' }).success).toBe(true);
      expect(RawDrillSchema.safeParse({ ...validDrill, question: '1234' }).success).toBe(false);
    });

    it('enforces explanation minimum length of 5 characters', () => {
      expect(RawDrillSchema.safeParse({ ...validDrill, explanation: '12345' }).success).toBe(true);
      expect(RawDrillSchema.safeParse({ ...validDrill, explanation: '1234' }).success).toBe(false);
    });

    it('enforces hint minimum length of 3 characters', () => {
      expect(RawDrillSchema.safeParse({ ...validDrill, hint: '123' }).success).toBe(true);
      expect(RawDrillSchema.safeParse({ ...validDrill, hint: '12' }).success).toBe(false);
    });

    it('allows options count between 2 and 6 inclusive', () => {
      // 2 options
      expect(RawDrillSchema.safeParse({ ...validDrill, options: ['A', 'B'], correctIndex: 0 }).success).toBe(true);
      // 6 options
      expect(RawDrillSchema.safeParse({ ...validDrill, options: ['A', 'B', 'C', 'D', 'E', 'F'], correctIndex: 5 }).success).toBe(true);
      // 7 options (exceeds max 6)
      expect(RawDrillSchema.safeParse({ ...validDrill, options: ['A', 'B', 'C', 'D', 'E', 'F', 'G'], correctIndex: 0 }).success).toBe(false);
    });
  });

  describe('GenerateRequestSchema Validation', () => {
    it('validates a compliant tutor generation request with defaults', () => {
      const valid = {
        studentName: 'Marcus Vance',
        subject: 'Fractions',
        tutorNotes: 'Marcus gets confused comparing 3/8 and 6/16.'
      };
      const result = GenerateRequestSchema.safeParse(valid);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.tutorToneNote).toBe('Keep grounded in practical adult contexts');
      }
    });

    it('rejects empty studentName or subject', () => {
      expect(GenerateRequestSchema.safeParse({
        studentName: '',
        subject: 'Fractions',
        tutorNotes: 'Marcus gets confused.'
      }).success).toBe(false);

      expect(GenerateRequestSchema.safeParse({
        studentName: 'Marcus',
        subject: '',
        tutorNotes: 'Marcus gets confused.'
      }).success).toBe(false);
    });

    it('rejects tutor notes shorter than 5 characters', () => {
      expect(GenerateRequestSchema.safeParse({
        studentName: 'Marcus',
        subject: 'Fractions',
        tutorNotes: 'Help'
      }).success).toBe(false);
    });

    it('preserves custom tutorToneNote when supplied', () => {
      const result = GenerateRequestSchema.safeParse({
        studentName: 'Elena',
        subject: 'Finance',
        tutorNotes: 'Elena struggled with compound APR.',
        tutorToneNote: 'Strictly use automotive dealer financing context.'
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.tutorToneNote).toBe('Strictly use automotive dealer financing context.');
      }
    });
  });

  describe('UpdateDrillSchema Validation', () => {
    it('accepts partial updates to question, explanation, or correctIndex', () => {
      expect(UpdateDrillSchema.safeParse({ question: 'Updated question wording?' }).success).toBe(true);
      expect(UpdateDrillSchema.safeParse({ explanation: 'Updated explanation detail.' }).success).toBe(true);
      expect(UpdateDrillSchema.safeParse({ correctIndex: 2 }).success).toBe(true);
      expect(UpdateDrillSchema.safeParse({ hint: 'Check the denominator first' }).success).toBe(true);
    });

    it('rejects negative or floating point correctIndex in updates', () => {
      expect(UpdateDrillSchema.safeParse({ correctIndex: -1 }).success).toBe(false);
      expect(UpdateDrillSchema.safeParse({ correctIndex: 1.5 }).success).toBe(false);
    });

    it('rejects update text shorter than 3 characters', () => {
      expect(UpdateDrillSchema.safeParse({ question: 'No' }).success).toBe(false);
      expect(UpdateDrillSchema.safeParse({ explanation: 'No' }).success).toBe(false);
      expect(UpdateDrillSchema.safeParse({ hint: 'No' }).success).toBe(false);
    });

    it('validates embedded audit metadata updates', () => {
      const validAuditUpdate = {
        audit: {
          status: 'verified' as const,
          confidence: 95,
          auditorModel: 'openai/gpt-oss-20b',
          reason: 'Tutor approved answer key correction.',
          suggestedCorrectIndex: null,
          verifiedAt: new Date().toISOString()
        }
      };
      expect(UpdateDrillSchema.safeParse(validAuditUpdate).success).toBe(true);

      const invalidAuditUpdate = {
        audit: {
          status: 'unknown',
          confidence: 120, // out of range
          auditorModel: 'model',
          reason: 'reason',
          verifiedAt: new Date().toISOString()
        }
      };
      expect(UpdateDrillSchema.safeParse(invalidAuditUpdate).success).toBe(false);
    });
  });

  describe('FlagRequestSchema Validation', () => {
    it('validates a complete learner flag request', () => {
      const valid = {
        drillId: 'drill-101',
        question: 'What is 3/8 converted to 16ths?',
        studentNote: 'Why did we multiply by 2/2?'
      };
      expect(FlagRequestSchema.safeParse(valid).success).toBe(true);
    });

    it('rejects flag request with empty strings or missing fields', () => {
      expect(FlagRequestSchema.safeParse({ drillId: '', question: 'Q?', studentNote: 'Note' }).success).toBe(false);
      expect(FlagRequestSchema.safeParse({ drillId: 'd-1', question: '', studentNote: 'Note' }).success).toBe(false);
      expect(FlagRequestSchema.safeParse({ drillId: 'd-1', question: 'Q?', studentNote: '' }).success).toBe(false);
    });
  });

  describe('RecordAttemptSchema Validation', () => {
    it('validates a learner practice attempt payload', () => {
      const valid = {
        drillId: 'drill-101',
        selectedIndex: 1,
        isCorrect: true,
        timeSpentSeconds: 15
      };
      expect(RecordAttemptSchema.safeParse(valid).success).toBe(true);
    });

    it('rejects negative selectedIndex or negative timeSpentSeconds', () => {
      expect(RecordAttemptSchema.safeParse({
        drillId: 'd-1',
        selectedIndex: -1,
        isCorrect: false
      }).success).toBe(false);

      expect(RecordAttemptSchema.safeParse({
        drillId: 'd-1',
        selectedIndex: 0,
        isCorrect: false,
        timeSpentSeconds: -5
      }).success).toBe(false);
    });

    it('validates optional learner UUID when present', () => {
      const validWithUuid = {
        drillId: 'drill-1',
        learnerId: '123e4567-e89b-12d3-a456-426614174000',
        selectedIndex: 0,
        isCorrect: true
      };
      expect(RecordAttemptSchema.safeParse(validWithUuid).success).toBe(true);

      const invalidWithBadUuid = {
        drillId: 'drill-1',
        learnerId: 'not-a-uuid',
        selectedIndex: 0,
        isCorrect: true
      };
      expect(RecordAttemptSchema.safeParse(invalidWithBadUuid).success).toBe(false);
    });
  });

  describe('DrillVerificationItemSchema & BatchVerificationOutputSchema Validation', () => {
    it('validates compliant verification items and batches', () => {
      const batch = {
        verifications: [
          {
            drillId: 'drill-1',
            verdict: 'verified' as const,
            confidence: 90,
            reason: 'Answer key is accurate and mathematically sound.',
            suggestedCorrectIndex: null
          },
          {
            drillId: 'drill-2',
            verdict: 'flagged' as const,
            confidence: 40,
            reason: 'Option 1 appears to be the correct mathematical answer, not Option 0.',
            suggestedCorrectIndex: 1
          }
        ]
      };
      expect(BatchVerificationOutputSchema.safeParse(batch).success).toBe(true);
    });

    it('rejects invalid verdict or out-of-bounds confidence', () => {
      expect(DrillVerificationItemSchema.safeParse({
        drillId: 'd-1',
        verdict: 'approved', // must be 'verified' | 'flagged'
        confidence: 80,
        reason: 'Reason explanation.'
      }).success).toBe(false);

      expect(DrillVerificationItemSchema.safeParse({
        drillId: 'd-1',
        verdict: 'verified',
        confidence: 105, // > 100
        reason: 'Reason explanation.'
      }).success).toBe(false);
    });

    it('rejects empty batch of verifications', () => {
      expect(BatchVerificationOutputSchema.safeParse({ verifications: [] }).success).toBe(false);
    });
  });
});

describe('Validate-Feedback-Retry LLM Loop', () => {
  const dummyParams = {
    studentName: 'Marcus Vance',
    subject: 'Electrical Apprenticeship Math',
    tutorNotes: 'Marcus gets confused converting 3/8 inch fractions to decimals.'
  };

  it('succeeds on Attempt 1 when LLM outputs valid drills immediately', async () => {
    const validJson = JSON.stringify({
      drills: [
        {
          id: 'drill-1',
          title: '3/8 Conduit Conversion',
          question: 'What is 3/8 inch expressed as a decimal?',
          options: ['0.250"', '0.375"', '0.500"', '0.625"'],
          correctIndex: 1,
          explanation: '3 divided by 8 is exactly 0.375.',
          hint: 'Divide numerator 3 by denominator 8.'
        }
      ]
    });

    const mockCreate = vi.fn().mockResolvedValue({
      choices: [{ message: { content: validJson } }],
      model: 'qwen/qwen3.8-27b'
    });

    const mockGroq = {
      chat: {
        completions: {
          create: mockCreate
        }
      }
    } as unknown as Groq;

    const result = await generateValidatedDrills(dummyParams, mockGroq);

    expect(result.attempts).toBe(1);
    expect(result.retryLogs.length).toBe(0);
    expect(result.drills.length).toBe(1);
    expect(result.drills[0].correctIndex).toBe(1);
    expect(mockCreate).toHaveBeenCalledTimes(1);
  });

  it('detects out-of-bounds correctIndex on Attempt 1, feeds error back, and self-corrects on Attempt 2', async () => {
    // Attempt 1: 1-indexed bug (correctIndex = 4 with 4 items: indices 0..3)
    const badJsonAttempt1 = JSON.stringify({
      drills: [
        {
          id: 'drill-1',
          title: 'Conduit Sizing',
          question: 'Which conduit diameter is required?',
          options: ['1/2"', '3/4"', '1"', '1-1/4"'],
          correctIndex: 4, // BUG: out of bounds!
          explanation: 'Option 4 is required.',
          hint: 'Check table.'
        }
      ]
    });

    // Attempt 2: corrected to 0-indexed (correctIndex = 3)
    const goodJsonAttempt2 = JSON.stringify({
      drills: [
        {
          id: 'drill-1',
          title: 'Conduit Sizing',
          question: 'Which conduit diameter is required?',
          options: ['1/2"', '3/4"', '1"', '1-1/4"'],
          correctIndex: 3, // Corrected!
          explanation: '1-1/4" meets the 40% fill capacity.',
          hint: 'Review 40% fill limits.'
        }
      ]
    });

    const mockCreate = vi.fn()
      .mockResolvedValueOnce({
        choices: [{ message: { content: badJsonAttempt1 } }],
        model: 'qwen/qwen3.8-27b'
      })
      .mockResolvedValueOnce({
        choices: [{ message: { content: goodJsonAttempt2 } }],
        model: 'qwen/qwen3.8-27b'
      });

    const mockGroq = {
      chat: {
        completions: {
          create: mockCreate
        }
      }
    } as unknown as Groq;

    const result = await generateValidatedDrills(dummyParams, mockGroq);

    expect(result.attempts).toBe(2);
    expect(result.retryLogs.length).toBe(1);
    expect(result.retryLogs[0].reason).toBe('zod_validation_failed');
    expect(result.retryLogs[0].errors[0]).toContain('out of bounds');

    // Verify Attempt 2 conversation included feedback about the error
    const secondCallArgs = mockCreate.mock.calls[1][0];
    const messages = secondCallArgs.messages;
    expect(messages.length).toBe(4); // system, user, assistant (bad response), user (feedback)
    expect(messages[2].content).toBe(badJsonAttempt1);
    expect(messages[3].content).toContain('out of bounds');
    expect(messages[3].content).toContain('correctIndex');

    expect(result.drills[0].correctIndex).toBe(3);
  });

  it('recovers from malformed JSON on Attempt 1 and completes on Attempt 2', async () => {
    const malformedJson = '{ "drills": [ { "id": "drill-1", "title": "Incomplete... '; // Syntax error
    const goodJson = JSON.stringify({
      drills: [
        {
          id: 'drill-1',
          title: 'Wire Gauge',
          question: 'What wire gauge is needed for a 20A branch circuit?',
          options: ['14 AWG', '12 AWG', '10 AWG'],
          correctIndex: 1,
          explanation: '12 AWG copper is required for 20-amp overcurrent protection.',
          hint: '14 AWG is limited to 15A.'
        }
      ]
    });

    const mockCreate = vi.fn()
      .mockResolvedValueOnce({
        choices: [{ message: { content: malformedJson } }],
        model: 'qwen/qwen3.8-27b'
      })
      .mockResolvedValueOnce({
        choices: [{ message: { content: goodJson } }],
        model: 'qwen/qwen3.8-27b'
      });

    const mockGroq = {
      chat: {
        completions: {
          create: mockCreate
        }
      }
    } as unknown as Groq;

    const result = await generateValidatedDrills(dummyParams, mockGroq);

    expect(result.attempts).toBe(2);
    expect(result.retryLogs[0].reason).toBe('json_syntax_error');
    expect(result.drills[0].title).toBe('Wire Gauge');
  });

  it('throws descriptive error if validation consistently fails after 3 attempts', async () => {
    const persistentlyBadJson = JSON.stringify({
      drills: [
        {
          id: 'drill-1',
          title: 'Fails',
          question: 'Question?',
          options: ['Same', 'Same'], // Duplicate choices
          correctIndex: 0,
          explanation: 'Why',
          hint: 'Hint'
        }
      ]
    });

    const mockCreate = vi.fn().mockResolvedValue({
      choices: [{ message: { content: persistentlyBadJson } }],
      model: 'qwen/qwen3.8-27b'
    });

    const mockGroq = {
      chat: {
        completions: {
          create: mockCreate
        }
      }
    } as unknown as Groq;

    await expect(generateValidatedDrills(dummyParams, mockGroq)).rejects.toThrow(
      /Validation failed after 3 attempts/
    );

    expect(mockCreate).toHaveBeenCalledTimes(3);
  });
});
