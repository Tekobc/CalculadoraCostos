import {
  LLMExtractionRequest,
  LLMProfileExtraction,
  LLMProfileExtractionSchema,
} from './schemas';
import { ONBOARDING_SYSTEM_PROMPT, buildExtractionUserPrompt } from './prompts';
import { generateDeterministicProfile } from './fallback';

export interface ExtractionResult {
  data: LLMProfileExtraction;
  source: 'llm_api' | 'fallback_heuristico';
  provider: 'gemini' | 'groq' | 'anthropic' | 'fallback';
  error?: string;
}

function getFallback(request: LLMExtractionRequest, error?: string): ExtractionResult {
  return {
    data: generateDeterministicProfile(request),
    source: 'fallback_heuristico',
    provider: 'fallback',
    error,
  };
}

function parseJson(text: string | undefined): LLMProfileExtraction | null {
  if (!text) return null;

  try {
    const parsed: unknown = JSON.parse(text);
    const result = LLMProfileExtractionSchema.safeParse(parsed);
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

export async function extractProfileWithLLM(
  request: LLMExtractionRequest
): Promise<ExtractionResult> {
  const userPrompt = buildExtractionUserPrompt(request);
  const timeout = AbortSignal.timeout(15000);

  try {
    if (process.env.GEMINI_API_KEY) {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: timeout,
          body: JSON.stringify({
            system_instruction: { parts: [{ text: ONBOARDING_SYSTEM_PROMPT }] },
            contents: [{ parts: [{ text: userPrompt }] }],
            generationConfig: {
              response_mime_type: 'application/json',
              temperature: 0.2,
              maxOutputTokens: 1400,
            },
          }),
        }
      );
      if (!response.ok) {
        return getFallback(request, `El análisis con Gemini no estuvo disponible (${response.status}).`);
      }

      const payload = await response.json();
      const data = parseJson(payload.candidates?.[0]?.content?.parts?.[0]?.text);
      return data
        ? { data, source: 'llm_api', provider: 'gemini' }
        : getFallback(request, 'Gemini devolvió una propuesta con formato inválido.');
    }

    if (process.env.GROQ_API_KEY) {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        },
        signal: timeout,
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          temperature: 0.2,
          max_tokens: 1400,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: ONBOARDING_SYSTEM_PROMPT },
            { role: 'user', content: userPrompt },
          ],
        }),
      });
      if (!response.ok) {
        return getFallback(request, `El análisis con Groq no estuvo disponible (${response.status}).`);
      }

      const payload = await response.json();
      const data = parseJson(payload.choices?.[0]?.message?.content);
      return data
        ? { data, source: 'llm_api', provider: 'groq' }
        : getFallback(request, 'Groq devolvió una propuesta con formato inválido.');
    }

    if (process.env.ANTHROPIC_API_KEY) {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        signal: timeout,
        body: JSON.stringify({
          model: 'claude-haiku-5-5',
          max_tokens: 1400,
          system: ONBOARDING_SYSTEM_PROMPT,
          messages: [{ role: 'user', content: userPrompt }],
        }),
      });
      if (!response.ok) {
        return getFallback(request, `El análisis con Anthropic no estuvo disponible (${response.status}).`);
      }

      const payload = await response.json();
      const rawText = payload.content?.[0]?.text as string | undefined;
      const text = rawText?.match(/\{[\s\S]*\}/)?.[0];
      const data = parseJson(text);
      return data
        ? { data, source: 'llm_api', provider: 'anthropic' }
        : getFallback(request, 'Anthropic devolvió una propuesta con formato inválido.');
    }

    return getFallback(request);
  } catch (error) {
    const message = error instanceof Error && error.name === 'TimeoutError'
      ? 'El análisis tardó demasiado y se usó el modo sin conexión.'
      : 'No se pudo conectar con el asistente y se usó el modo sin conexión.';
    console.error('Error en la extracción del perfil:', error);
    return getFallback(request, message);
  }
}
