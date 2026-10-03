import { GroqOutputSchema, type GroqOutput, type RawDrill } from './schemas';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const FALLBACK_KEY = 'gsk_placeholder_key';

export interface GroqServiceParams {
  studentName: string;
  subject: string;
  tutorNotes: string;
  tutorToneNote?: string;
}

export async function generateValidatedDrills(params: GroqServiceParams): Promise<{
  drills: RawDrill[];
  durationMs: number;
  model: string;
}> {
  const apiKey = process.env.GROQ_API_KEY || FALLBACK_KEY;
  if (!apiKey) {
    throw new Error('GROQ_API_KEY is not configured on server');
  }

  const systemPrompt = `You are Skyy Learn's pedagogical AI engine. Skyy Learn connects adult learners with 1:1 human tutors, using AI to generate targeted between-session drills.

You must analyze the human tutor's session takeaways and generate exactly 3 multiple-choice practice drills.

CRITICAL REQUIREMENTS:
1. Ground each problem in realistic adult contexts (e.g. trades, career, personal finance, practical everyday problems).
2. Avoid condescending metaphors (no pizza, pies, or cartoonish examples).
3. The "options" array must contain 3 to 4 distinct options.
4. "correctIndex" MUST be an integer matching the 0-indexed position of the correct answer in "options".
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

  let attempts = 0;
  const maxAttempts = 2;
  let lastError: Error | null = null;
  const startTime = performance.now();

  while (attempts < maxAttempts) {
    attempts++;
    try {
      const response = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'qwen/qwen3.8-27b',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          response_format: { type: 'json_object' },
          temperature: 0.2
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Groq HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      const rawContent = data.choices?.[0]?.message?.content || '{}';

      // Parse JSON
      let rawJson: unknown;
      try {
        rawJson = JSON.parse(rawContent);
      } catch {
        const cleaned = rawContent.replace(/```json/g, '').replace(/```/g, '').trim();
        rawJson = JSON.parse(cleaned);
      }

      // Strict Zod Validation
      const parseResult = GroqOutputSchema.safeParse(rawJson);
      if (!parseResult.success) {
        console.warn(`[Groq Attempt ${attempts}] Schema validation failed:`, parseResult.error.format());
        throw new Error(`Zod validation error: ${parseResult.error.issues.map(i => i.message).join(', ')}`);
      }

      const validated: GroqOutput = parseResult.data;
      const durationMs = Math.round(performance.now() - startTime);

      return {
        drills: validated.drills,
        durationMs,
        model: data.model || 'qwen/qwen3.8-27b'
      };
    } catch (err: unknown) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.warn(`[Groq Generation Attempt ${attempts} failed]:`, lastError.message);
    }
  }

  throw new Error(`Failed to generate validated drills after ${maxAttempts} attempts: ${lastError?.message}`);
}
