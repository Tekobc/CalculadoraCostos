// src/app/api/recipes/ocr-parse/route.ts
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const image = formData.get('image');
    if (!(image instanceof File)) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }
    return NextResponse.json(
      { error: 'La importación por imagen todavía no está disponible.' },
      { status: 501 }
    );
  } catch (error) {
    console.error('OCR parse error', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
