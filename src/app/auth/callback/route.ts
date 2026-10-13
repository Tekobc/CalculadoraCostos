import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

function redirectWithoutCaching(url: URL) {
  const response = NextResponse.redirect(url);
  response.headers.set('Cache-Control', 'private, no-store, max-age=0');
  response.headers.set('Pragma', 'no-cache');
  return response;
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const redirectUrl = request.nextUrl.clone();
  redirectUrl.pathname = '/';
  redirectUrl.search = '';
  redirectUrl.hash = '';

  if (!code) {
    redirectUrl.searchParams.set('authError', 'confirmation');
    return redirectWithoutCaching(redirectUrl);
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error('No se pudo completar la confirmación de correo:', error.code);
    redirectUrl.searchParams.set('authError', 'confirmation');
  }

  return redirectWithoutCaching(redirectUrl);
}
