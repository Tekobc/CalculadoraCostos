'use server';

import { createServerSupabaseClient } from '@/lib/supabase/server';
import { BusinessProfile, BusinessProfileSchema } from '@/domain/schemas/profile.schema';
import { Product, ProductSchema } from '@/domain/schemas/product.schema';
import {
  EMPTY_OPERATIONS_WORKSPACE,
  OperationsWorkspace,
  OperationsWorkspaceSchema,
} from '@/domain/schemas/operations.schema';
import { revalidatePath } from 'next/cache';
import { randomUUID } from 'crypto';

function describeDatabaseError(error: { code?: string; message: string }): string {
  if (error.code === 'PGRST205') {
    return 'Supabase no encuentra las tablas de la app. Ejecutá src/lib/supabase/schema.sql en el SQL Editor; si ya lo hiciste, verificá que public esté expuesto en la Data API y recargá su esquema.';
  }
  if (error.code === 'PGRST204') {
    return 'La base de datos no tiene una columna que esta versión necesita. Volvé a ejecutar src/lib/supabase/schema.sql en el SQL Editor.';
  }
  if (error.code === '42501') {
    return 'Supabase rechazó el acceso a los datos. Revisá que las políticas RLS y los permisos de src/lib/supabase/schema.sql estén aplicados.';
  }
  return error.message;
}

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
      descripcion_negocio: validation.data.descripcion_negocio ?? '',
      preguntas_seguimiento: validation.data.preguntas_seguimiento,
      respuestas_seguimiento: validation.data.respuestas_seguimiento,
      insumos_sugeridos: validation.data.insumos_sugeridos,
      resumen_analisis: validation.data.resumen_analisis,
      fuente_analisis: validation.data.fuente_analisis,
      proveedor_analisis: validation.data.proveedor_analisis,
      origen: validation.data.origen,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })
    .select()
    .single();

  if (error) {
    return { error: describeDatabaseError(error) };
  }

  revalidatePath('/', 'layout');
  return { success: true, profile: data };
}

/**
 * Obtiene el perfil del usuario autenticado.
 */
export async function getBusinessProfile(): Promise<{ profile: BusinessProfile | null; error?: string }> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { profile: null };

  const { data, error } = await supabase
    .from('business_profiles')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) return { profile: null, error: describeDatabaseError(error) };
  if (!data) return { profile: null };

  const validation = BusinessProfileSchema.safeParse(data);
  if (!validation.success) {
    return { profile: null, error: 'El perfil guardado no tiene un formato válido.' };
  }
  return { profile: validation.data };
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

  const productId = validation.data.id ?? randomUUID();
  const { data, error } = await supabase
    .from('products')
    .upsert({
      id: productId,
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
      costos_fijos_unitarios: validation.data.costos_fijos_unitarios,
      impuestos_comisiones_porcentaje: validation.data.impuestos_comisiones_porcentaje,
      estrategia_precio: validation.data.estrategia_precio,
      porcentaje_objetivo: validation.data.porcentaje_objetivo,
      precio_venta_sugerido: validation.data.precio_venta_sugerido,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' })
    .select()
    .single();

  if (error) {
    return { error: describeDatabaseError(error) };
  }

  revalidatePath('/', 'layout');
  const savedProduct = ProductSchema.safeParse({
    ...data,
    descripcion: data.descripcion ?? undefined,
    fecha_creacion: data.created_at,
    fecha_actualizacion: data.updated_at,
  });
  if (!savedProduct.success) {
    return { error: 'El producto se guardó, pero la respuesta de la base no es válida.' };
  }
  return { success: true, product: savedProduct.data };
}

/**
 * Obtiene la lista de productos del usuario autenticado.
 */
export async function getUserProducts(): Promise<{ products: Product[]; error?: string }> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { products: [] };

  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false });

  if (error) return { products: [], error: describeDatabaseError(error) };

  const products = data.map((row) => ProductSchema.safeParse({
    ...row,
    descripcion: row.descripcion ?? undefined,
    fecha_creacion: row.created_at,
    fecha_actualizacion: row.updated_at,
  }));
  const invalidProduct = products.find((product) => !product.success);
  if (invalidProduct && !invalidProduct.success) {
    return { products: [], error: 'Hay productos guardados con datos inválidos.' };
  }
  return { products: products.map((product) => product.success ? product.data : null).filter((product): product is Product => product !== null) };
}

export async function getOperationsWorkspace(): Promise<{
  workspace: OperationsWorkspace;
  error?: string;
}> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { workspace: EMPTY_OPERATIONS_WORKSPACE };

  const { data, error } = await supabase
    .from('operations_workspaces')
    .select('inventario, operaciones')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) return { workspace: EMPTY_OPERATIONS_WORKSPACE, error: describeDatabaseError(error) };
  if (!data) return { workspace: EMPTY_OPERATIONS_WORKSPACE };

  const validation = OperationsWorkspaceSchema.safeParse({
    inventario: data.inventario,
    operaciones: data.operaciones,
  });
  if (!validation.success) {
    return { workspace: EMPTY_OPERATIONS_WORKSPACE, error: 'El stock o las operaciones guardadas tienen datos inválidos.' };
  }

  return { workspace: validation.data };
}

export async function saveOperationsWorkspace(workspace: OperationsWorkspace) {
  const validation = OperationsWorkspaceSchema.safeParse(workspace);
  if (!validation.success) {
    return { error: 'El stock o las operaciones tienen datos inválidos.', details: validation.error.format() };
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: 'Debe iniciar sesión para guardar el stock y las operaciones' };

  const { error } = await supabase
    .from('operations_workspaces')
    .upsert({
      user_id: user.id,
      inventario: validation.data.inventario,
      operaciones: validation.data.operaciones,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });

  if (error) return { error: describeDatabaseError(error) };

  revalidatePath('/', 'layout');
  return { success: true };
}
