'use server';

import { createServerSupabaseClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

export async function signInWithEmail(formData: FormData) {
  const validation = z.object({
    email: z.string().email(),
    password: z.string().min(1),
  }).safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });

  if (!validation.success) {
    return { error: 'Ingresá un email válido y tu contraseña.' };
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: validation.data.email,
    password: validation.data.password,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/', 'layout');
  return { success: true, user: data.user };
}

export async function signUpWithEmail(formData: FormData) {
  const validation = z.object({
    email: z.string().email(),
    password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres.'),
  }).safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });

  if (!validation.success) {
    return { error: validation.error.issues[0]?.message ?? 'Revisá los datos ingresados.' };
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.signUp({
    email: validation.data.email,
    password: validation.data.password,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/', 'layout');
  return { success: true, user: data.user, confirmationRequired: !data.session };
}

export async function signOutUser() {
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.signOut();
  if (error) return { error: error.message };
  revalidatePath('/', 'layout');
  return { success: true };
}

export async function getCurrentUser() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
}
