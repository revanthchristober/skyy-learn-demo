import { describe, it, expect, vi } from 'vitest';
import {
  BatchVerificationOutputSchema,
  DrillVerificationItemSchema,
  type RawDrill
} from '../schemas';
import { auditDrillsWithCheaperLLM } from '../verifier';
import Groq from 'groq-sdk';

describe('Drill Verification Schema Integrity', () => {
  it('validates a verified audit item successfully', () => {
    const item = {
      drillId: 'drill-101',
      verdict: 'verified',
      confidence: 96,
      reason: 'Calculation independently verified from first principles.',
      suggestedCorrectIndex: null
    };
    const parsed = DrillVerificationItemSchema.safeParse(item);
    expect(parsed.success).toBe(true);
  });

  it('validates a flagged audit item with suggested index', () => {
    const item = {
      drillId: 'drill-102',
      verdict: 'flagged',
      confidence: 65,
      reason: 'Option B is mathematically correct instead of Option A.',
      suggestedCorrectIndex: 1
    };
    const parsed = DrillVerificationItemSchema.safeParse(item);
    expect(parsed.success).toBe(true);
  });

  it('rejects confidence out of bounds (> 100 or < 0)', () => {
    const over100 = {
      drillId: 'drill-103',
      verdict: 'verified',
      confidence: 120,
      reason: 'Super confident'
    };
    expect(DrillVerificationItemSchema.safeParse(over100).success).toBe(false);

    const negative = {
      drillId: 'drill-104',
      verdict: 'verified',
      confidence: -5,
      reason: 'Negative'
    };
    expect(DrillVerificationItemSchema.safeParse(negative).success).toBe(false);
  });

  it('rejects invalid verdict values', () => {
    const invalid = {
      drillId: 'drill-105',
      verdict: 'unsure', // not in enum ['verified', 'flagged']
      confidence: 50,
      reason: 'Not sure'
    };
    expect(DrillVerificationItemSchema.safeParse(invalid).success).toBe(false);
  });

  it('rejects empty verifications array', () => {
    expect(BatchVerificationOutputSchema.safeParse({ verifications: [] }).success).toBe(false);
  });
});

describe('Correctness Pass / Verification LLM Execution', () => {
  const sampleDrills: RawDrill[] = [
    {
      id: 'drill-1',
      title: 'Conduit Sizing',
      question: 'What is 3/8 inch in decimal form?',
      options: ['0.25', '0.375', '0.50'],
      correctIndex: 1,
      explanation: '3 divided by 8 is 0.375.',
      hint: 'Divide 3 by 8.'
    },
    {
      id: 'drill-2',
      title: 'Box Fill Calculation',
      question: 'How many #14 AWG conductors are permitted in a 4x1-1/2 inch square box (21.0 cu in)?',
      options: ['8', '9', '10', '12'],
      correctIndex: 0, // Flagged: 21.0 / 2.0 = 10.5 -> 10 wires (index 2), not 8!
      explanation: 'Each #14 is 2.0 cu in. 21.0 / 2.0 = 10 conductors allowed.',
      hint: 'Each 14 AWG conductor requires 2.0 cubic inches.'
    }
  ];

  it('audits and flags doubtful answer key with suggested correction', async () => {
    const verifierResponse = JSON.stringify({
      verifications: [
        {
          drillId: 'drill-1',
          verdict: 'verified',
          confidence: 98,
          reason: '3/8 is exactly 0.375. Answer key verified.',
          suggestedCorrectIndex: null
        },
        {
          drillId: 'drill-2',
          verdict: 'flagged',
          confidence: 70,
          reason: 'Answer key mismatch: 21.0 cu in / 2.0 cu in per wire = 10 conductors. Option index 2 ("10") is correct, but index 0 ("8") was marked.',
          suggestedCorrectIndex: 2
        }
      ]
    });

    const mockCreate = vi.fn().mockResolvedValue({
      choices: [{ message: { content: verifierResponse } }],
      model: 'openai/gpt-oss-20b'
    });

    const mockGroq = {
      chat: {
        completions: {
          create: mockCreate
        }
      }
    } as unknown as Groq;

    const result = await auditDrillsWithCheaperLLM(sampleDrills, {
      model: 'openai/gpt-oss-20b',
      injectedClient: mockGroq
    });

    expect(result.auditorModel).toBe('openai/gpt-oss-20b');
    expect(result.audits.size).toBe(2);

    const drill1Audit = result.audits.get('drill-1');
    expect(drill1Audit?.status).toBe('verified');
    expect(drill1Audit?.confidence).toBe(98);

    const drill2Audit = result.audits.get('drill-2');
    expect(drill2Audit?.status).toBe('flagged');
    expect(drill2Audit?.confidence).toBe(70);
    expect(drill2Audit?.suggestedCorrectIndex).toBe(2);
    expect(drill2Audit?.reason).toContain('Answer key mismatch');

    expect(mockCreate).toHaveBeenCalledTimes(1);
    const callArgs = mockCreate.mock.calls[0][0];
    expect(callArgs.model).toBe('openai/gpt-oss-20b');
    expect(callArgs.messages[0].content).toContain('Correctness Auditor');
  });

  it('gracefully flags drills for human review if LLM call fails completely', async () => {
    const mockCreate = vi.fn().mockRejectedValue(new Error('Rate limit exceeded or network down'));

    const mockGroq = {
      chat: {
        completions: {
          create: mockCreate
        }
      }
    } as unknown as Groq;

    const result = await auditDrillsWithCheaperLLM(sampleDrills, {
      model: 'openai/gpt-oss-20b',
      injectedClient: mockGroq
    });

    // Should not crash the server; returns flagged status so tutor knows to inspect
    expect(result.auditorModel).toBe('fallback-auditor');
    const drill1Audit = result.audits.get('drill-1');
    expect(drill1Audit?.status).toBe('flagged');
    expect(drill1Audit?.reason).toContain('Manual tutor verification requested');
  });
});
