'use server';

import { createServerSupabaseClient } from '@/lib/supabase/server';
import { BusinessProfile, BusinessProfileSchema } from '@/domain/schemas/profile.schema';
import { Product, ProductSchema } from '@/domain/schemas/product.schema';
import { revalidatePath } from 'next/cache';

/**
 * Guarda o actualiza el perfil de negocio del usuario autenticado.
 */
export async function saveBusinessProfile(profile: BusinessProfile) {
  const validation = BusinessProfileSchema.safeParse(profile);
  if (!validation.success) {
    return { error: 'Perfil inválido', details: validation.error.format() };
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Debe iniciar sesión para guardar en la base de datos' };
  }

  const { data, error } = await supabase
    .from('business_profiles')
    .upsert({
      user_id: user.id,
      rubro: validation.data.rubro,
      tipo: validation.data.tipo,
      moneda: validation.data.moneda,
      provincia: validation.data.provincia,
      tiene_empleados: validation.data.tiene_empleados,
      lugar_trabajo: validation.data.lugar_trabajo,
      modulos_activos: validation.data.modulos_activos,
      equipos: validation.data.equipos,
      origen: validation.data.origen,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/', 'layout');
  return { success: true, profile: data };
}

/**
 * Obtiene el perfil del usuario autenticado.
 */
export async function getBusinessProfile(): Promise<BusinessProfile | null> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from('business_profiles')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (error || !data) return null;

  return data as BusinessProfile;
}

/**
 * Guarda o actualiza un producto en la base de datos multi-tenant.
 */
export async function saveProduct(product: Product) {
  const validation = ProductSchema.safeParse(product);
  if (!validation.success) {
    return { error: 'Producto inválido', details: validation.error.format() };
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Debe iniciar sesión para guardar productos' };
  }

  const { data, error } = await supabase
    .from('products')
    .upsert({
      id: validation.data.id || undefined,
      user_id: user.id,
      nombre: validation.data.nombre,
      descripcion: validation.data.descripcion,
      tipo: validation.data.tipo,
      categoria: validation.data.categoria,
      unidades_lote_base: validation.data.unidades_lote_base,
      insumos: validation.data.insumos,
      packaging: validation.data.packaging,
      consumo_energia: validation.data.consumo_energia,
      consumo_gas: validation.data.consumo_gas,
      tiempo_produccion_horas: validation.data.tiempo_produccion_horas,
      costo_hora_mano_obra: validation.data.costo_hora_mano_obra,
      estrategia_precio: validation.data.estrategia_precio,
      porcentaje_objetivo: validation.data.porcentaje_objetivo,
      precio_venta_sugerido: validation.data.precio_venta_sugerido,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/', 'layout');
  return { success: true, product: data };
}

/**
 * Obtiene la lista de productos del usuario autenticado.
 */
export async function getUserProducts(): Promise<Product[]> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false });

  if (error || !data) return [];

  return data as Product[];
}
