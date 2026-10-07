import { LLMExtractionRequest, LLMProfileExtraction, LLMProfileExtractionSchema } from './schemas';
import { ONBOARDING_SYSTEM_PROMPT, buildExtractionUserPrompt } from './prompts';
import { generateDeterministicProfile } from './fallback';

export interface ExtractionResult {
  data: LLMProfileExtraction;
  source: 'llm_api' | 'fallback_heuristico';
  provider?: 'gemini' | 'groq' | 'anthropic' | 'fallback';
  error?: string;
}

/**
 * Cliente multimodelo con soporte para proveedores con Free Tier generoso:
 * 1. Google Gemini Flash (GEMINI_API_KEY) -> Gratuito (Google AI Studio)
 * 2. Groq Llama 3 (GROQ_API_KEY) -> Gratuito y ultra rápido
 * 3. Anthropic Claude (ANTHROPIC_API_KEY) -> Pago
 * 4. Fallback Heurístico local -> 100% gratuito, offline y sin API keys
 */
export async function extractProfileWithLLM(request: LLMExtractionRequest): Promise<ExtractionResult> {
  const geminiKey = process.env.GEMINI_API_KEY;
  const groqKey = process.env.GROQ_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;

  // 1. Google Gemini (Free Tier en Google AI Studio)
  if (geminiKey) {
    try {
      const userPrompt = buildExtractionUserPrompt(request);
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`;

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: {
            parts: [{ text: ONBOARDING_SYSTEM_PROMPT }],
          },
          contents: [
            {
              parts: [{ text: userPrompt }],
            },
          ],
          generationConfig: {
            response_mime_type: 'application/json',
            temperature: 0.2,
          },
        }),
      });

      if (res.ok) {
        const payload = await res.json();
        const rawText = payload.candidates?.[0]?.content?.parts?.[0]?.text;
        if (rawText) {
          const parsed = JSON.parse(rawText);
          const validated = LLMProfileExtractionSchema.safeParse(parsed);
          if (validated.success) {
            return {
              data: validated.data,
              source: 'llm_api',
              provider: 'gemini',
            };
          }
        }
      }
      console.warn('Gemini falló o devolvió esquema inválido, evaluando alternativas...');
    } catch (err: any) {
      console.warn('Error llamando a Gemini:', err?.message);
    }
  }

  // 2. Groq (Free Tier con Llama-3.3-70b-versatile)
  if (groqKey) {
    try {
      const userPrompt = buildExtractionUserPrompt(request);
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${groqKey}`,
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          temperature: 0.2,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: ONBOARDING_SYSTEM_PROMPT },
            { role: 'user', content: userPrompt },
          ],
        }),
      });

      if (res.ok) {
        const payload = await res.json();
        const rawContent = payload.choices?.[0]?.message?.content;
        if (rawContent) {
          const parsed = JSON.parse(rawContent);
          const validated = LLMProfileExtractionSchema.safeParse(parsed);
          if (validated.success) {
            return {
              data: validated.data,
              source: 'llm_api',
              provider: 'groq',
            };
          }
        }
      }
      console.warn('Groq falló o devolvió esquema inválido...');
    } catch (err: any) {
      console.warn('Error llamando a Groq:', err?.message);
    }
  }

  // 3. Anthropic Claude (Opción de pago)
  if (anthropicKey) {
    try {
      const userPrompt = buildExtractionUserPrompt(request);
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': anthropicKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-3-5-haiku-20241022',
          max_tokens: 1000,
          system: ONBOARDING_SYSTEM_PROMPT,
          messages: [{ role: 'user', content: userPrompt }],
        }),
      });

      if (res.ok) {
        const payload = await res.json();
        const contentBlock = payload.content?.[0]?.text;
        if (contentBlock) {
          const jsonMatch = contentBlock.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            const validated = LLMProfileExtractionSchema.safeParse(parsed);
            if (validated.success) {
              return {
                data: validated.data,
                source: 'llm_api',
                provider: 'anthropic',
              };
            }
          }
        }
      }
    } catch (err: any) {
      console.warn('Error llamando a Anthropic:', err?.message);
    }
  }

  // 4. Fallback Heurístico (100% Gratis, local, instantáneo y sin API Key)
  return {
    data: generateDeterministicProfile(request),
    source: 'fallback_heuristico',
    provider: 'fallback',
  };
}
