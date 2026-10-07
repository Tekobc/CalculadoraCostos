-- ==============================================================================
-- SCHEMA POSTGRESQL & ROW LEVEL SECURITY (RLS) PARA CALCULADORA DE COSTOS
-- Compatible con Supabase Auth (auth.uid()) y multi-tenant estricto.
-- ==============================================================================

-- 1. EXTENSIONES
create extension if not exists "uuid-ossp";

-- 2. TABLA: PROFILES (Perfil comercial y módulos activos)
create table if not exists public.business_profiles (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  rubro text not null,
  tipo text not null check (tipo in ('producto', 'servicio', 'mixto')),
  moneda text not null default 'ARS',
  provincia text not null,
  tiene_empleados boolean not null default false,
  lugar_trabajo text not null check (lugar_trabajo in ('casa', 'local_propio', 'local_alquilado', 'taller_compartido')),
  modulos_activos text[] not null default array['insumos', 'mano_de_obra'],
  equipos jsonb not null default '[]'::jsonb,
  origen text not null default 'cuestionario_fijo',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- RLS: business_profiles
alter table public.business_profiles enable row level security;

create policy "Users can read own business profile"
  on public.business_profiles for select
  using (auth.uid() = user_id);

create policy "Users can insert own business profile"
  on public.business_profiles for insert
  with check (auth.uid() = user_id);

create policy "Users can update own business profile"
  on public.business_profiles for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own business profile"
  on public.business_profiles for delete
  using (auth.uid() = user_id);

-- 3. TABLA: SUPPLIES (Catálogo global de insumos por usuario con control de inflación)
create table if not exists public.supplies (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  nombre text not null,
  cantidad_compra numeric not null check (cantidad_compra > 0),
  unidad_compra text not null,
  precio_compra numeric not null check (precio_compra >= 0),
  unidad_uso text not null,
  factor_conversion numeric not null default 1 check (factor_conversion > 0),
  merma_porcentaje numeric not null default 0 check (merma_porcentaje >= 0 and merma_porcentaje <= 100),
  fecha_actualizacion timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- RLS: supplies
alter table public.supplies enable row level security;

create policy "Users can read own supplies"
  on public.supplies for select
  using (auth.uid() = user_id);

create policy "Users can insert own supplies"
  on public.supplies for insert
  with check (auth.uid() = user_id);

create policy "Users can update own supplies"
  on public.supplies for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own supplies"
  on public.supplies for delete
  using (auth.uid() = user_id);

-- 4. TABLA: PRODUCTS (Ficha de producto y costos de lote)
create table if not exists public.products (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  nombre text not null,
  descripcion text,
  tipo text not null default 'producto' check (tipo in ('producto', 'servicio')),
  categoria text,
  unidades_lote_base numeric not null default 1 check (unidades_lote_base > 0),
  
  -- Componentes JSON estructurados validados por Zod
  insumos jsonb not null default '[]'::jsonb,
  packaging jsonb not null default '[]'::jsonb,
  consumo_energia jsonb not null default '[]'::jsonb,
  consumo_gas jsonb not null default '[]'::jsonb,
  
  -- Mano de obra
  tiempo_produccion_horas numeric not null default 0 check (tiempo_produccion_horas >= 0),
  costo_hora_mano_obra numeric not null default 0 check (costo_hora_mano_obra >= 0),
  
  -- Estrategia de pricing
  estrategia_precio text not null default 'margen' check (estrategia_precio in ('margen', 'markup')),
  porcentaje_objetivo numeric not null default 30 check (porcentaje_objetivo >= 0 and porcentaje_objetivo < 100),
  precio_venta_sugerido numeric,
  
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- RLS: products
alter table public.products enable row level security;

create policy "Users can read own products"
  on public.products for select
  using (auth.uid() = user_id);

create policy "Users can insert own products"
  on public.products for insert
  with check (auth.uid() = user_id);

create policy "Users can update own products"
  on public.products for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own products"
  on public.products for delete
  using (auth.uid() = user_id);

-- 5. ÍNDICES DE PERFORMANCE MULTI-TENANT
create index if not exists idx_business_profiles_user on public.business_profiles(user_id);
create index if not exists idx_supplies_user on public.supplies(user_id);
create index if not exists idx_supplies_actualizacion on public.supplies(user_id, fecha_actualizacion);
create index if not exists idx_products_user on public.products(user_id);
