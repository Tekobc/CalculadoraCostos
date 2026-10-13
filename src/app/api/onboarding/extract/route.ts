import { NextRequest, NextResponse } from 'next/server';
import { LLMExtractionRequestSchema } from '@/lib/llm/schemas';
import { extractProfileWithLLM } from '@/lib/llm/client';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Iniciá sesión para analizar tu emprendimiento.' }, { status: 401 });
    }

    const body = await req.json();
    const validation = LLMExtractionRequestSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Parámetros inválidos',
          detalles: validation.error.format(),
        },
        { status: 400 }
      );
    }

    const result = await extractProfileWithLLM(validation.data);

    return NextResponse.json({
      success: true,
      perfil_propuesto: result.data,
      fuente: result.source,
      proveedor: result.provider,
      advertencia: result.error,
    });
  } catch (error) {
    console.error('Error en onboarding/extract:', error);
    return NextResponse.json(
      {
        error: 'Error interno del servidor',
        mensaje: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    );
  }
}
