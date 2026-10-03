const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const DEFAULT_KEY = 'gsk_placeholder_key';

export async function generateDrillsWithGroq({
  studentName,
  subject,
  tutorNotes,
  tutorToneNote,
  apiKey = import.meta.env.VITE_GROQ_API_KEY || DEFAULT_KEY
}) {
  const startTime = performance.now();

  const systemPrompt = `You are Skyy Learn's pedagogical AI engine. Skyy Learn provides 1-on-1 tutoring for adults with AI-assisted practice between sessions.
Your task is to analyze the human tutor's session notes and generate exactly 3 targeted multiple-choice drills for the adult learner.

Requirements:
1. Address the specific breakdown/confusion points highlighted by the tutor.
2. Ground all questions in realistic, respectful adult contexts (e.g. trades, career, personal finance).
3. Strictly adhere to the tutor's tone and pedagogical constraints.
4. Output MUST be valid JSON adhering to this exact schema:
{
  "drills": [
    {
      "id": "drill-1",
      "title": "Short title describing the concept",
      "question": "The question prompt",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctIndex": 0,
      "explanation": "Clear explanation of why this answer is correct and why the misconception fails",
      "hint": "Gentle nudge without revealing the exact answer"
    }
  ]
}

No markdown code fences, only valid JSON.`;

  const userPrompt = `Student Name: ${studentName}
Subject: ${subject}
Tutor Session Notes & Confusion Points:
${tutorNotes}

Tutor Tone / Constraint Directives:
${tutorToneNote || 'Respectful adult context, practical application'}`;

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
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData?.error?.message || `Groq API error (${response.status})`);
  }

  const data = await response.json();
  const durationMs = Math.round(performance.now() - startTime);
  const rawContent = data.choices?.[0]?.message?.content || '{}';
  
  let parsed;
  try {
    parsed = JSON.parse(rawContent);
  } catch (err) {
    // Clean potential markdown backticks if any
    const cleaned = rawContent.replace(/```json/g, '').replace(/```/g, '').trim();
    parsed = JSON.parse(cleaned);
  }

  if (!parsed.drills || !Array.isArray(parsed.drills) || parsed.drills.length === 0) {
    throw new Error('Groq returned JSON without valid drills array');
  }

  return {
    drills: parsed.drills,
    durationMs,
    model: data.model || 'qwen/qwen3.8-27b',
    usage: data.usage
  };
}
