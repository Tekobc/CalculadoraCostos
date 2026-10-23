'use client';

import React, { useEffect, useRef, useState } from 'react';
import { OnboardingInteractive } from '@/components/onboarding/onboarding-interactive';
import { QuickUnitCostCalculator } from '@/components/calculator/quick-unit-cost';
import { PricingSimulator } from '@/components/calculator/pricing-simulator';
import { ProductCatalogManager } from '@/components/calculator/product-catalog-manager';
import { CostVariationSimulator } from '@/components/calculator/cost-variation-simulator';
import { OperationsManager } from '@/components/operations/operations-manager';
import { AuthModal } from '@/components/auth/auth-modal';
import { Badge } from '@/components/ui/badge';
import { BusinessProfile, BusinessProfileSchema, ModuleType } from '@/domain/schemas/profile.schema';
import { Product } from '@/domain/schemas/product.schema';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { getBusinessProfile, getUserProducts, saveBusinessProfile, saveProduct } from '@/lib/supabase/db-actions';

const INITIAL_PRODUCTS: Product[] = [
  {
    id: '00000000-0000-4000-8000-000000000001',
    nombre: 'Docena de Alfajores de Maicena',
    tipo: 'producto',
    unidades_lote_base: 12,
    insumos: [
      {
        id: '00000000-0000-4000-8000-000000000101',
        nombre: 'Almidón de maíz (Maicena)',
        cantidad_compra: 1,
        unidad_compra: 'kg',
        precio_compra: 2200,
        cantidad_usada: 300,
        unidad_uso: 'gr',
        factor_conversion: 1000,
        merma_porcentaje: 0,
        fecha_actualizacion: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 días (ok)
        status: 'confirmado',
      },
      {
        id: '00000000-0000-4000-8000-000000000102',
        nombre: 'Dulce de leche repostero',
        cantidad_compra: 1,
        unidad_compra: 'kg',
        precio_compra: 4500,
        cantidad_usada: 400,
        unidad_uso: 'gr',
        factor_conversion: 1000,
        merma_porcentaje: 2,
        fecha_actualizacion: new Date(Date.now() - 38 * 24 * 60 * 60 * 1000).toISOString(), // 38 días (warning)
        status: 'confirmado',
      },
      {
        id: '00000000-0000-4000-8000-000000000103',
        nombre: 'Manteca de primera calidad',
        cantidad_compra: 200,
        unidad_compra: 'gr',
        precio_compra: 2400,
        cantidad_usada: 200,
        unidad_uso: 'gr',
        factor_conversion: 1,
        merma_porcentaje: 0,
        fecha_actualizacion: new Date(Date.now() - 55 * 24 * 60 * 60 * 1000).toISOString(), // 55 días (alerta crítica)
        status: 'confirmado',
      },
    ],
    packaging: [],
    consumo_energia: [],
    consumo_gas: [],
    tiempo_produccion_horas: 1.5,
    costo_hora_mano_obra: 3500,
    costos_fijos_unitarios: 0,
    impuestos_comisiones_porcentaje: 0,
    estrategia_precio: 'margen',
    porcentaje_objetivo: 35,
    fecha_creacion: new Date().toISOString(),
    fecha_actualizacion: new Date().toISOString(),
  },
  {
    id: '00000000-0000-4000-8000-000000000002',
    nombre: 'Torta Brownie con Nuez (20cm)',
    tipo: 'producto',
    unidades_lote_base: 1,
    insumos: [
      {
        id: '00000000-0000-4000-8000-000000000104',
        nombre: 'Chocolate semiamargo',
        cantidad_compra: 1,
        unidad_compra: 'kg',
        precio_compra: 9800,
        cantidad_usada: 200,
        unidad_uso: 'gr',
        factor_conversion: 1000,
        merma_porcentaje: 0,
        fecha_actualizacion: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'confirmado',
      },
      {
        id: '00000000-0000-4000-8000-000000000105',
        nombre: 'Nueces mariposa',
        cantidad_compra: 500,
        unidad_compra: 'gr',
        precio_compra: 6200,
        cantidad_usada: 100,
        unidad_uso: 'gr',
        factor_conversion: 1,
        merma_porcentaje: 3,
        fecha_actualizacion: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(), // desactualizado
        status: 'confirmado',
      },
    ],
    packaging: [],
    consumo_energia: [],
    consumo_gas: [],
    tiempo_produccion_horas: 1,
    costo_hora_mano_obra: 3500,
    costos_fijos_unitarios: 0,
    impuestos_comisiones_porcentaje: 0,
    estrategia_precio: 'margen',
    porcentaje_objetivo: 40,
    fecha_creacion: new Date().toISOString(),
    fecha_actualizacion: new Date().toISOString(),
  },
];

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<'products' | 'simulator' | 'calculator' | 'pricing' | 'inventory' | 'production' | 'orders' | 'onboarding' | 'auth'>('products');
  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(isSupabaseConfigured());
  const [accountLoading, setAccountLoading] = useState(false);
  const [cloudError, setCloudError] = useState<string | null>(null);
  const [authNotice, setAuthNotice] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const productsRef = useRef(INITIAL_PRODUCTS);
  const productSaveQueue = useRef(new Map<string, Promise<void>>());

  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get('authError') !== 'confirmation') return;

    setAuthNotice('No se pudo confirmar el correo. El enlace puede haber vencido; solicitá uno nuevo o iniciá sesión.');
    url.searchParams.delete('authError');
    window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setAuthLoading(false);
      return;
    }

    const supabase = createClient();
    let active = true;

    void supabase.auth.getUser().then(({ data, error }) => {
      if (!active) return;
      if (error && error.name !== 'AuthSessionMissingError') {
        setCloudError(error.message);
      }
      setUserId(data.user?.id ?? null);
      setUserEmail(data.user?.email ?? null);
      setAuthLoading(false);
    }).catch((error: unknown) => {
      if (!active) return;
      setCloudError(error instanceof Error ? error.message : 'No se pudo comprobar la sesión.');
      setAuthLoading(false);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null);
      setUserEmail(session?.user?.email ?? null);
      setAuthLoading(false);
    });

    return () => {
      active = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!userId) {
      setProfile(null);
      productsRef.current = INITIAL_PRODUCTS;
      setProducts(INITIAL_PRODUCTS);
      setAccountLoading(false);
      return;
    }

    let active = true;
    setAccountLoading(true);
    setCloudError(null);

    void Promise.all([getBusinessProfile(), getUserProducts()])
      .then(([profileResult, productsResult]) => {
        if (!active) return;
        const loadErrors = [profileResult.error, productsResult.error]
          .filter((error): error is string => Boolean(error));
        if (loadErrors.length > 0) setCloudError([...new Set(loadErrors)].join(' '));
        setProfile(profileResult.profile);
        productsRef.current = productsResult.products;
        setProducts(productsResult.products);
        if (!profileResult.error) {
          setActiveTab(profileResult.profile ? 'products' : 'onboarding');
        }
      })
      .catch((error: unknown) => {
        if (!active) return;
        setCloudError(error instanceof Error ? error.message : 'No se pudieron cargar los datos de la cuenta.');
      })
      .finally(() => {
        if (active) setAccountLoading(false);
      });

    return () => {
      active = false;
    };
  }, [authLoading, userId]);

  const handleProfileCreated = async (newProfile: BusinessProfile) => {
    setSyncing(true);
    try {
      const result = await saveBusinessProfile(newProfile);
      if (result?.error) {
        throw new Error(result.error);
      }
      const validation = BusinessProfileSchema.safeParse(result.profile);
      if (!validation.success) {
        throw new Error('El perfil se guardó, pero no pudimos validar la respuesta de Supabase.');
      }
      setProfile(validation.data);
      setCloudError(null);
      setActiveTab('products');
    } finally {
      setSyncing(false);
    }
  };

  const handleProductsChange = (nextProducts: Product[]) => {
    const productsWithIds = nextProducts.map((product) =>
      product.id ? product : { ...product, id: crypto.randomUUID() }
    );
    const changed = productsWithIds.filter((nextProduct) => {
      const previousProduct = productsRef.current.find((product) => product.id === nextProduct.id);
      return !previousProduct || JSON.stringify(previousProduct) !== JSON.stringify(nextProduct);
    });

    productsRef.current = productsWithIds;
    setProducts(productsWithIds);
    if (!userId || changed.length === 0) return;

    setSyncing(true);
    const writes = changed.map((product) => {
      const key = product.id;
      if (!key) throw new Error('No se pudo sincronizar un producto sin identificador.');
      const previousWrite = productSaveQueue.current.get(key) ?? Promise.resolve();
      const write = previousWrite.catch(() => undefined).then(async () => {
        const result = await saveProduct(product);
        if (result.error) throw new Error(result.error);
      });
      productSaveQueue.current.set(key, write);
      void write.then(() => {
        setCloudError(null);
      }).catch((error: unknown) => {
        setCloudError(error instanceof Error ? `No se pudo sincronizar un producto: ${error.message}` : 'No se pudieron sincronizar los productos.');
      }).finally(() => {
        if (productSaveQueue.current.get(key) === write) {
          productSaveQueue.current.delete(key);
        }
        if (productSaveQueue.current.size === 0) setSyncing(false);
      });
      return write;
    });
    void Promise.allSettled(writes);
  };

  const handleApplySimulatedProduct = (updatedProduct: Product) => {
    handleProductsChange(products.map((product) => product.id === updatedProduct.id ? updatedProduct : product));
    setActiveTab('products');
  };

  const moduleEnabled = (module: ModuleType) => !profile || profile.modulos_activos.includes(module);
  const isServiceBusiness = profile?.tipo === 'servicio';
  const isMixedBusiness = profile?.tipo === 'mixto';
  const catalogLabel = isServiceBusiness
    ? 'Mis servicios'
    : isMixedBusiness
      ? 'Mis productos y servicios'
      : 'Mis productos y recetas';
  const quickCalculatorLabel = isServiceBusiness
    ? 'Calcular costo de servicio'
    : isMixedBusiness
      ? 'Cálculo rápido'
      : 'Calcular costo de producto';
  const navigationItems = [
    { id: 'products' as const, label: catalogLabel, icon: isServiceBusiness ? '🧰' : isMixedBusiness ? '🧩' : '🍰', visible: true },
    { id: 'simulator' as const, label: 'Variación de costos', icon: '⚡', visible: products.length > 0 && (moduleEnabled('insumos') || moduleEnabled('mano_de_obra') || moduleEnabled('servicios')) },
    { id: 'pricing' as const, label: 'Simular precios', icon: '📈', visible: moduleEnabled('insumos') || moduleEnabled('mano_de_obra') || moduleEnabled('servicios') },
    { id: 'calculator' as const, label: quickCalculatorLabel, icon: '🧮', visible: moduleEnabled('insumos') || moduleEnabled('mano_de_obra') || moduleEnabled('servicios') },
    { id: 'inventory' as const, label: 'Stock de insumos', icon: '📦', visible: !profile || moduleEnabled('insumos') },
    { id: 'production' as const, label: 'Plan de producción', icon: '🏭', visible: !profile || profile.tipo !== 'servicio' },
    { id: 'orders' as const, label: isServiceBusiness ? 'Trabajos y turnos' : 'Pedidos', icon: '🧾', visible: true },
    { id: 'onboarding' as const, label: profile ? 'Editar mi perfil' : 'Configurar emprendimiento', icon: '✨', visible: true },
    { id: 'auth' as const, label: userEmail ? 'Mi cuenta' : 'Guardar en la nube', icon: '☁️', visible: true },
  ].filter((item) => item.visible);

  // Contar insumos con advertencia de inflación en el catálogo
  const totalInsumosDesactualizados = (moduleEnabled('insumos') ? products : []).reduce((acc, p) => {
    const outdated = p.insumos.filter((i) => {
      if (!i.fecha_actualizacion) return true;
      const days = Math.floor(
        (new Date().getTime() - new Date(i.fecha_actualizacion).getTime()) / (1000 * 60 * 60 * 24)
      );
      return days > 30;
    }).length;
    return acc + outdated;
  }, 0);

  return (
    <main className="max-w-5xl mx-auto px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* Header amigable y cercano con tokens de diseño */}
      <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-6 border-b border-ink/10">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">🌱</span>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-ink">
              Calculadora de Costos
            </h1>
          </div>
          <p className="text-sm text-ink/75 max-w-prose">
            {profile
              ? `Un espacio preparado para ${profile.rubro.toLocaleLowerCase('es-AR')}: ordená tus costos y definí precios con claridad.`
              : 'Claridad real sobre tus costos y precios. Sin fórmulas confusas ni sorpresas a fin de mes.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {totalInsumosDesactualizados > 0 && (
            <Badge variant="danger" className="text-xs">
              ⚠️ {totalInsumosDesactualizados} insumos para revisar
            </Badge>
          )}

          {profile ? (
            <div className="flex items-center gap-2 bg-white/80 px-3.5 py-2 rounded-xl border border-ink/10 shadow-sm text-xs">
              <span className="font-semibold text-ink">{profile.rubro}</span>
              <Badge variant={syncing ? 'support' : 'accent'}>
                {syncing ? 'Sincronizando…' : 'Perfil activo'}
              </Badge>
            </div>
          ) : (
            <Badge variant="support">{userEmail ? 'Perfil pendiente' : 'Modo demostración'}</Badge>
          )}
        </div>
      </header>

      {/* Selector de pestañas */}
      <nav className="flex flex-wrap gap-2 border-b border-ink/10 pb-3" aria-label="Navegación principal">
        {navigationItems.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setActiveTab(item.id === 'onboarding' && !userId ? 'auth' : item.id)}
            aria-current={activeTab === item.id ? 'page' : undefined}
            className={`min-h-[44px] px-4 py-2 text-sm font-semibold rounded-xl transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
              activeTab === item.id
                ? 'bg-primary text-white shadow-sm'
                : 'bg-white/60 text-ink/70 hover:bg-white hover:text-ink border border-ink/10'
            }`}
          >
            <span aria-hidden="true">{item.icon}</span> {item.label}
          </button>
        ))}
      </nav>

      {/* Contenido dinámico */}
      <section className="space-y-6">
        {authNotice && (
          <p role="alert" className="rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
            {authNotice}
          </p>
        )}
        {cloudError && (
          <p role="alert" className="rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
            {cloudError}
          </p>
        )}
        {(authLoading || accountLoading) && (
          <p role="status" className="rounded-xl bg-white/70 px-4 py-5 text-sm text-ink/70">
            Cargando los datos de tu cuenta…
          </p>
        )}
        {!authLoading && !accountLoading && (
        <>
        {activeTab === 'products' && (
          <div className="space-y-6">
            {profile && profile.modulos_activos.length === 0 ? (
              <p className="rounded-xl border border-accent/30 bg-accent/10 px-4 py-3 text-sm text-ink">
                Activá al menos un módulo en tu perfil para gestionar costos.
              </p>
            ) : (
              <ProductCatalogManager
                products={products}
                profile={profile}
                onProductsChange={handleProductsChange}
              />
            )}
          </div>
        )}

        {activeTab === 'simulator' && (
          <div className="space-y-6">
            <CostVariationSimulator
              productos={products}
              onApplyIncreasesToProduct={handleApplySimulatedProduct}
            />
          </div>
        )}

        {activeTab === 'pricing' && (
          <div className="space-y-6">
            <PricingSimulator />
          </div>
        )}

        {activeTab === 'calculator' && (
          <div className="space-y-6">
            <QuickUnitCostCalculator
              profile={profile}
              isDemo={!userId}
              onSaveAsProduct={(newProd) => {
                handleProductsChange([newProd, ...products]);
                setActiveTab('products');
              }}
            />
          </div>
        )}

        <div className={activeTab === 'inventory' || activeTab === 'production' || activeTab === 'orders' ? '' : 'hidden'}>
          <OperationsManager
            products={products}
            userId={userId}
            accountReady={!authLoading && !accountLoading}
            businessType={profile?.tipo}
            tracksInventory={!profile || moduleEnabled('insumos')}
            view={activeTab === 'orders' || activeTab === 'production' ? activeTab : 'inventory'}
          />
        </div>

        {activeTab === 'onboarding' && (
          <div className="space-y-6">
            {userId ? (
              <OnboardingInteractive
                key={profile?.id ?? 'new-profile'}
                initialProfile={profile}
                onProfileCreated={handleProfileCreated}
              />
            ) : (
              <div className="rounded-2xl border border-ink/10 bg-white/80 p-6 space-y-3">
                <h2 className="text-lg font-bold text-ink">Primero, tu cuenta</h2>
                <p className="text-sm text-ink/70">
                  Creá una cuenta o iniciá sesión para guardar el perfil y tus costos de forma privada.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab('auth')}
                  className="min-h-[44px] rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white"
                >
                  Crear cuenta o ingresar
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'auth' && (
          <div className="space-y-6 py-4">
            <AuthModal
              currentUserEmail={userEmail}
              onAuthSuccess={() => {
                setActiveTab('products');
              }}
            />
          </div>
        )}
        </>
        )}
      </section>

      {/* Footer sobrio y accesible */}
      <footer className="pt-8 pb-4 text-center text-xs text-ink/50 border-t border-ink/10">
        Diseñado para emprendedores argentinos · Control de inflación en ARS · Motor determinístico de cálculo
      </footer>
    </main>
  );
}
