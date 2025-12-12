import { UserPreferences, InterviewResponse } from "../types";

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000';


export const generateInterviewResponse = async (
  transcriptSnippet: string,
  preferences: UserPreferences,
  history: InterviewResponse[] = []
): Promise<string> => {
  const token = localStorage.getItem('buuzzer_token');
  if (!token) {
    console.error("Missing auth token");
    return "Error: Not authenticated. Please login again.";
  }

  try {
    const examplesText = preferences.examples && preferences.examples.length > 0
      ? `
      Examples of desired responses:
      ${preferences.examples.map((ex, i) => `
      Q: "${ex.question}"
      A: "${ex.answer}"
      `).join('\n')}
      `
      : "";

    const historyContext = history.length > 0
      ? `
      Previous Conversation Context (Use this for follow-up questions):
      ${history.slice(0, 5).reverse().map(h => `
      Interviewer: "${h.questionContext}"
      Candidate: "${h.answer}"
      `).join('\n')}
      `
      : "";

    const systemPrompt = `You are an expert interview coach assisting a candidate in real-time.

Candidate Resume Info:
${preferences.resumeText}

Job Description:
${preferences.jobDescription}

Instructions:
1. Use ${preferences.responseStyle || "Simple English"}.
2. Keep response under ${preferences.maxLines} lines.
3. Answer strictly as if you are the candidate.
4. Do not include meta-text like "Here is the answer". Just provide the answer text.

${examplesText}

${historyContext}`;

    const userPrompt = `Recent Transcription of Interviewer:
"${transcriptSnippet}"

Task:
Identify the core question in the transcription. If it is a follow-up (e.g. "elaborate", "why did you do that?"), use the Previous Conversation Context. Provide a direct, high-impact answer for the candidate to speak.`;

    const response = await fetch(`${API_BASE}/api/ai/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({
        provider: "deepseek",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Backend AI Error:", response.status, errorText);
      return `Error generating response (Status: ${response.status}).`;
    }

    const data = await response.json();
    return data.output || "Could not generate a response.";
  } catch (error: any) {
    console.error("DeepSeek Service Exception:", error);
    return `Error calling backend AI: ${error.message}`;
  }
};
