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
    throw new Error('GROQ_API_KEY is not configured on the server. The key must stay server-side.');
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
        temperature: isRetry ? 0.1 : 0.2 // Lower temperature on retry for precision
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
