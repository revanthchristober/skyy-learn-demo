import { describe, it, expect, vi } from 'vitest';
import { RawDrillSchema, GroqOutputSchema, formatZodFeedback } from '../schemas';
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
