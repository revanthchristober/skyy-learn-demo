import Groq from 'groq-sdk';
import { GroqOutputSchema, formatZodFeedback, type GroqOutput, type RawDrill } from './schemas';

export interface GroqServiceParams {
  studentName: string;
  subject: string;
  tutorNotes: string;
  tutorToneNote?: string;
}

export interface RetryAttemptLog {
  attempt: number;
  reason: string;
  errors: string[];
}

export interface GenerationResult {
  drills: RawDrill[];
  durationMs: number;
  model: string;
  attempts: number;
  retryLogs: RetryAttemptLog[];
}

export async function generateValidatedDrills(
  params: GroqServiceParams,
  injectedClient?: Groq
): Promise<GenerationResult> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey && !injectedClient) {
    throw new Error('GROQ_API_KEY is not configured on the server. Please set GROQ_API_KEY in your environment.');
  }

  // Initialize official Groq client on the server (or use injectedClient for mocking)
  const groq = injectedClient ?? new Groq({ apiKey });

  const systemPrompt = `You are Skyy Learn's pedagogical AI engine. Skyy Learn connects adult learners with 1:1 human tutors, using AI to generate targeted between-session drills.

You must analyze the human tutor's session takeaways and generate exactly 3 multiple-choice practice drills.

CRITICAL REQUIREMENTS:
1. Ground each problem in realistic adult contexts (e.g. trades, career, personal finance, practical everyday problems).
2. Avoid condescending metaphors (no pizza, pies, or cartoonish examples).
3. The "options" array must contain 3 to 4 distinct options. No duplicate options allowed.
4. "correctIndex" MUST be an integer matching the 0-indexed position of the correct answer in "options" (range: 0 to options.length - 1).
5. "explanation" must clearly explain why the correct option is right and address the specific confusion point.
6. "hint" must provide directional guidance without giving away the answer.

Output format MUST be strictly valid JSON matching this schema:
{
  "drills": [
    {
      "id": "drill-1",
      "title": "Short descriptive title",
      "question": "Clear problem statement",
      "options": ["A", "B", "C", "D"],
      "correctIndex": 0,
      "explanation": "Why A is correct and why common missteps fail",
      "hint": "Guiding hint"
    }
  ]
}
Only output the raw JSON object. Do not wrap in markdown or backticks.`;

  const userPrompt = `Adult Learner: ${params.studentName}
Subject: ${params.subject}
Tutor Session Notes & Confusion Points:
${params.tutorNotes}

Tutor Tone / Constraint Directives:
${params.tutorToneNote || 'Professional, grounded in adult practical applications.'}`;

  const messages: Groq.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ];

  let attempt = 0;
  const maxAttempts = 3;
  const retryLogs: RetryAttemptLog[] = [];
  const startTime = performance.now();

  while (attempt < maxAttempts) {
    attempt++;
    const isRetry = attempt > 1;

    try {
      console.log(`[Groq Generation] Attempt ${attempt}/${maxAttempts}${isRetry ? ' (Self-Correction Retry)' : ''}...`);

      const completion = await groq.chat.completions.create({
        model: 'qwen/qwen3.8-27b',
        messages,
        response_format: { type: 'json_object' },
        temperature: isRetry ? 0.1 : 0.2, // Lower temperature on retry for precision
        max_tokens: 750
      });

      const rawContent = completion.choices[0]?.message?.content || '{}';

      // 1. JSON parse phase
      let rawJson: unknown;
      try {
        rawJson = JSON.parse(rawContent);
      } catch (jsonErr) {
        const cleaned = rawContent.replace(/```json/g, '').replace(/```/g, '').trim();
        try {
          rawJson = JSON.parse(cleaned);
        } catch {
          const errMsg = jsonErr instanceof Error ? jsonErr.message : 'Invalid JSON';
          retryLogs.push({
            attempt,
            reason: 'json_syntax_error',
            errors: [errMsg]
          });

          if (attempt < maxAttempts) {
            console.warn(`[Groq Attempt ${attempt}] Malformed JSON received. Appending self-correction feedback.`);
            messages.push({ role: 'assistant', content: rawContent });
            messages.push({
              role: 'user',
              content: `Your previous response could not be parsed as valid JSON: ${errMsg}. Please output only valid parseable JSON adhering to the required schema.`
            });
            continue;
          }
          throw new Error(`Failed to parse Groq response as JSON: ${errMsg}`);
        }
      }

      // 2. Strict Zod Schema Validation
      const parseResult = GroqOutputSchema.safeParse(rawJson);

      if (!parseResult.success) {
        const errorFeedback = formatZodFeedback(parseResult.error);
        const errorMessages = parseResult.error.issues.map(i => `${i.path.join('.') || 'root'}: ${i.message}`);

        console.warn(`[Groq Attempt ${attempt}] Validation failed with ${parseResult.error.issues.length} issue(s):`);
        console.warn(errorFeedback);

        retryLogs.push({
          attempt,
          reason: 'zod_validation_failed',
          errors: errorMessages
        });

        if (attempt < maxAttempts) {
          // Provide targeted feedback so LLM self-corrects specific fields
          messages.push({ role: 'assistant', content: rawContent });
          messages.push({
            role: 'user',
            content: `Your previous output contained schema validation errors:\n${errorFeedback}\n\nPlease fix these issues and return the full updated JSON object.\nCRITICAL REMINDER: "correctIndex" must be 0-indexed (between 0 and options.length - 1), and all options in "options" must be distinct.`
          });
          continue;
        }

        throw new Error(`Validation failed after ${maxAttempts} attempts: ${errorMessages.join('; ')}`);
      }

      // 3. Validation Succeeded!
      const validated: GroqOutput = parseResult.data;
      const durationMs = Math.round(performance.now() - startTime);

      console.log(`[Groq Generation] Succeeded on attempt ${attempt} in ${durationMs}ms with ${validated.drills.length} drills.`);

      return {
        drills: validated.drills,
        durationMs,
        model: completion.model || 'qwen/qwen3.8-27b',
        attempts: attempt,
        retryLogs
      };
    } catch (err: unknown) {
      if (attempt >= maxAttempts) {
        const finalMsg = err instanceof Error ? err.message : String(err);
        throw new Error(`Generation failed after ${maxAttempts} attempts: ${finalMsg}`);
      }
      // If error was unexpected network or SDK error, log and retry
      console.warn(`[Groq Attempt ${attempt} network/internal error]:`, err);
    }
  }

  throw new Error(`Generation failed after ${maxAttempts} attempts.`);
}

function generateDeterministicDrills(params: GroqServiceParams): RawDrill[] {
  const isFinance = params.subject.toLowerCase().includes('finance') || params.subject.toLowerCase().includes('apr') || params.subject.toLowerCase().includes('interest');
  
  if (isFinance) {
    return [
      {
        id: `drill-${Math.random().toString(36).substring(2, 7)}`,
        title: 'Compound Interest vs Flat Rate',
        question: `A credit card offers an APR of 24% compounded monthly. If ${params.studentName} maintains an average balance of $1,000 across a full year without payments, how does the true interest cost compare to a simple 24% annual flat fee?`,
        options: [
          'It costs more because interest charges are added to the principal balance each month.',
          'It costs less because monthly division reduces the overall rate.',
          'It costs the exact same flat $240 at year end.',
          'Compounding only applies to cash advances, not card purchases.'
        ],
        correctIndex: 0,
        explanation: 'Compounding monthly means the 2% monthly rate (24% / 12) applies to an ever-increasing balance, yielding an Effective Annual Rate of approximately 26.82%, which is higher than a flat 24%.',
        hint: 'Consider what happens when previous interest itself begins earning interest next month.'
      },
      {
        id: `drill-${Math.random().toString(36).substring(2, 7)}`,
        title: 'Monthly Statement Periodic Rate',
        question: `On a monthly credit card statement with a 24% annual percentage rate (APR), what is the periodic monthly rate applied to the daily balance?`,
        options: [
          '2.0% per month (24% divided by 12)',
          '1.5% per month (24% divided by 16)',
          '24.0% per month applied every billing cycle',
          '0.2% per month (24% divided by 120)'
        ],
        correctIndex: 0,
        explanation: 'The annual percentage rate divided by the 12 calendar billing periods equals 2.0% periodic monthly interest.',
        hint: 'Divide the full annual percentage rate across twelve months.'
      },
      {
        id: `drill-${Math.random().toString(36).substring(2, 7)}`,
        title: 'Minimum Payment Allocation Trap',
        question: `Why does paying only the required 2% minimum payment on a high-APR credit card prolong debt repayment for years?`,
        options: [
          'Most of the minimum payment covers monthly interest, leaving very little to reduce the principal balance.',
          'Card issuers add penalties whenever minimum payments are received.',
          'Minimum payments are held in escrow rather than applied immediately.',
          'Compounding doubles the minimum payment fee every cycle.'
        ],
        correctIndex: 0,
        explanation: 'When finance charges take up the vast majority of the minimum payment, principal amortizes very slowly.',
        hint: 'Examine how much of the payment actually goes towards paying down the original loan.'
      }
    ];
  }

  // Default to Trade / Fractions scenario
  return [
    {
      id: `drill-${Math.random().toString(36).substring(2, 7)}`,
      title: 'Conduit Size Equivalence',
      question: `You are cutting a piece of EMT conduit and need to verify if a 6/16-inch section is the same length as a 3/8-inch section. Which statement correctly describes the relationship between these two measurements?`,
      options: [
        '6/16 is larger than 3/8 because 6 is greater than 3.',
        '6/16 is smaller than 3/8 because 16 is greater than 8.',
        '6/16 is exactly equal to 3/8.',
        '6/16 is double the size of 3/8.'
      ],
      correctIndex: 2,
      explanation: 'To compare fractions, find a common denominator. Multiplying both numerator and denominator of 3/8 by 2 gives 6/16. They represent the exact same physical length.',
      hint: 'Multiply top and bottom of 3/8 by 2 to compare directly against sixteenths.'
    },
    {
      id: `drill-${Math.random().toString(36).substring(2, 7)}`,
      title: 'Dividing Fractional Conduit Lengths',
      question: `An electrical run requires several 1/8-inch spacer shims cut from a 3/4-inch piece of conduit stock. How many full shims can be cut from this stock?`,
      options: [
        '4 shims',
        '6 shims',
        '8 shims',
        '3 shims'
      ],
      correctIndex: 1,
      explanation: 'Dividing 3/4 by 1/8 is calculated as 3/4 multiplied by the reciprocal 8/1, which equals 24/4 = 6 full shims.',
      hint: 'Dividing by a fraction is equivalent to multiplying by its reciprocal (flip 1/8 to 8/1).'
    },
    {
      id: `drill-${Math.random().toString(36).substring(2, 7)}`,
      title: 'Cross-Multiplication for Comparison',
      question: `You have two conduit brackets measuring 5/8 inch and 7/12 inch. Using cross-multiplication (5 * 12 vs 7 * 8), which bracket has the wider clearance?`,
      options: [
        '5/8 inch is wider because 60 is greater than 56.',
        '7/12 inch is wider because 56 is greater than 60.',
        'Both brackets have identical clearance.',
        '7/12 inch is wider because 12 is greater than 8.'
      ],
      correctIndex: 0,
      explanation: 'Cross-multiplying numerators by opposite denominators gives 5 * 12 = 60 and 7 * 8 = 56. Since 60 > 56, the 5/8 inch bracket is wider.',
      hint: 'Calculate 5 * 12 and 7 * 8. The larger product corresponds to the larger fraction.'
    }
  ];
}

