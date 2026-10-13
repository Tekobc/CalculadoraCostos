'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';

interface AuthModalProps {
  currentUserEmail?: string | null;
  onAuthSuccess?: () => void;
}

export function AuthModal({ currentUserEmail, onAuthSuccess }: AuthModalProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!isSupabaseConfigured()) {
      setErrorMsg('Falta configurar Supabase. Completá las variables indicadas en .env.example y reiniciá la app.');
      return;
    }
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const formData = new FormData(e.currentTarget);
      const email = String(formData.get('email') ?? '');
      const password = String(formData.get('password') ?? '');
      const supabase = createClient();
      const result = isSignUp
        ? await supabase.auth.signUp({
            email,
            password,
            options: {
              emailRedirectTo: `${window.location.origin}/auth/callback`,
            },
          })
        : await supabase.auth.signInWithPassword({ email, password });

      if (result.error) {
        setErrorMsg(result.error.message);
      } else if (isSignUp && !result.data.session) {
        setSuccessMsg('Cuenta creada. Confirmá el correo desde el mismo entorno donde estás usando la app; la sesión se iniciará al volver.');
        setIsSignUp(false);
      } else {
        setSuccessMsg(isSignUp ? '¡Cuenta creada con éxito!' : 'Sesión iniciada correctamente');
        if (onAuthSuccess) onAuthSuccess();
      }
    } catch {
      setErrorMsg('No pudimos comunicarnos con Supabase. Revisá la configuración y volvé a intentar.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const { error } = await createClient().auth.signOut();
      if (error) {
        setErrorMsg(error.message);
      } else if (onAuthSuccess) {
        onAuthSuccess();
      }
    } catch {
      setErrorMsg('No pudimos cerrar la sesión. Volvé a intentar.');
    } finally {
      setLoading(false);
    }
  };

  if (currentUserEmail) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-3 bg-white/80 px-3.5 py-1.5 rounded-xl border border-ink/10 shadow-sm text-xs">
          <span className="text-ink font-medium">👤 {currentUserEmail}</span>
          <Button size="sm" variant="ghost" onClick={handleSignOut} disabled={loading} className="text-xs h-7 px-2">
            {loading ? 'Cerrando...' : 'Cerrar sesión'}
          </Button>
        </div>
        {errorMsg && <p role="alert" className="text-xs text-danger font-medium">{errorMsg}</p>}
      </div>
    );
  }

  return (
    <Card className="max-w-md mx-auto border-ink/15 shadow-md">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{isSignUp ? 'Crear cuenta' : 'Iniciar sesión'}</CardTitle>
          <Badge variant="accent">Nube segura</Badge>
        </div>
        <CardDescription>
          {isSignUp
            ? 'Registrate para guardar tus recetas y acceder desde cualquier dispositivo.'
            : 'Ingresá para sincronizar tus costos y productos.'}
        </CardDescription>
      </CardHeader>

      <CardContent>
        {!isSupabaseConfigured() && (
          <p className="mb-4 rounded-lg bg-accent/10 px-3 py-2 text-xs text-ink">
            Para activar cuentas y sincronización, configurá Supabase con las variables de <code>.env.example</code>.
          </p>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="email" required>Email</Label>
            <Input id="email" name="email" type="email" placeholder="vos@tuemprendimiento.com" required />
          </div>

          <div>
            <Label htmlFor="password" required>Contraseña</Label>
            <Input id="password" name="password" type="password" minLength={isSignUp ? 8 : 1} placeholder="••••••••" required />
          </div>

          {successMsg && <p className="text-xs text-primary font-bold">{successMsg}</p>}
          {errorMsg && <p role="alert" className="text-xs text-danger font-medium">{errorMsg}</p>}

          <div className="pt-2 flex flex-col gap-2">
            <Button type="submit" size="md" variant="primary" disabled={loading} className="w-full">
              {loading ? 'Procesando...' : isSignUp ? 'Registrarme' : 'Ingresar'}
            </Button>

            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className="text-xs text-ink/70 hover:text-primary underline text-center pt-1"
            >
              {isSignUp ? '¿Ya tenés cuenta? Iniciá sesión acá' : '¿No tenés cuenta? Registrate gratis'}
            </button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
