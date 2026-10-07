'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { signInWithEmail, signUpWithEmail, signOutUser } from '@/lib/supabase/auth-actions';

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
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const formData = new FormData(e.currentTarget);
    const action = isSignUp ? signUpWithEmail : signInWithEmail;
    const res = await action(formData);

    setLoading(false);
    if (res?.error) {
      setErrorMsg(res.error);
    } else {
      setSuccessMsg(isSignUp ? '¡Cuenta creada con éxito!' : 'Sesión iniciada correctamente');
      if (onAuthSuccess) onAuthSuccess();
    }
  };

  const handleSignOut = async () => {
    setLoading(true);
    await signOutUser();
    setLoading(false);
    if (onAuthSuccess) onAuthSuccess();
  };

  if (currentUserEmail) {
    return (
      <div className="flex items-center gap-3 bg-white/80 px-3.5 py-1.5 rounded-xl border border-ink/10 shadow-sm text-xs">
        <span className="text-ink font-medium">👤 {currentUserEmail}</span>
        <Button size="sm" variant="ghost" onClick={handleSignOut} disabled={loading} className="text-xs h-7 px-2">
          Cerrar sesión
        </Button>
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
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="email" required>Email</Label>
            <Input id="email" name="email" type="email" placeholder="vos@tuemprendimiento.com" required />
          </div>

          <div>
            <Label htmlFor="password" required>Contraseña</Label>
            <Input id="password" name="password" type="password" placeholder="••••••••" required />
          </div>

          {errorMsg && <p className="text-xs text-danger font-medium">{errorMsg}</p>}
          {successMsg && <p className="text-xs text-primary font-bold">{successMsg}</p>}

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
