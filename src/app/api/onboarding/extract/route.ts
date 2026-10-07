import { NextRequest, NextResponse } from 'next/server';
import { LLMExtractionRequestSchema } from '@/lib/llm/schemas';
import { extractProfileWithLLM } from '@/lib/llm/client';

export async function POST(req: NextRequest) {
  try {
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
  } catch (error: any) {
    return NextResponse.json(
      {
        error: 'Error interno del servidor',
        mensaje: error?.message || 'Error desconocido',
      },
      { status: 500 }
    );
  }
}
