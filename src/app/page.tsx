'use client';

import React, { useState } from 'react';
import { OnboardingInteractive } from '@/components/onboarding/onboarding-interactive';
import { QuickUnitCostCalculator } from '@/components/calculator/quick-unit-cost';
import { PricingSimulator } from '@/components/calculator/pricing-simulator';
import { ProductCatalogManager } from '@/components/calculator/product-catalog-manager';
import { CostVariationSimulator } from '@/components/calculator/cost-variation-simulator';
import { AuthModal } from '@/components/auth/auth-modal';
import { Badge } from '@/components/ui/badge';
import { BusinessProfile } from '@/domain/schemas/profile.schema';
import { Product } from '@/domain/schemas/product.schema';

const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'prod-1',
    nombre: 'Docena de Alfajores de Maicena',
    tipo: 'producto',
    unidades_lote_base: 12,
    insumos: [
      {
        id: 'ins-1',
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
        id: 'ins-2',
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
        id: 'ins-3',
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
    estrategia_precio: 'margen',
    porcentaje_objetivo: 35,
    fecha_creacion: new Date().toISOString(),
    fecha_actualizacion: new Date().toISOString(),
  },
  {
    id: 'prod-2',
    nombre: 'Torta Brownie con Nuez (20cm)',
    tipo: 'producto',
    unidades_lote_base: 1,
    insumos: [
      {
        id: 'ins-4',
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
        id: 'ins-5',
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
    estrategia_precio: 'margen',
    porcentaje_objetivo: 40,
    fecha_creacion: new Date().toISOString(),
    fecha_actualizacion: new Date().toISOString(),
  },
];

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<'products' | 'simulator' | 'calculator' | 'pricing' | 'onboarding' | 'auth'>('products');
  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  const handleProfileCreated = (newProfile: BusinessProfile) => {
    setProfile(newProfile);
    setActiveTab('products');
  };

  const handleApplySimulatedProduct = (updatedProduct: Product) => {
    setProducts(products.map((p) => (p.id === updatedProduct.id ? updatedProduct : p)));
    setActiveTab('products');
  };

  // Contar insumos con advertencia de inflación en el catálogo
  const totalInsumosDesactualizados = products.reduce((acc, p) => {
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
            Claridad real sobre tus costos y precios. Sin fórmulas confusas ni sorpresas a fin de mes.
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
              <Badge variant="accent">Perfil activo</Badge>
            </div>
          ) : (
            <Badge variant="support">Modo emprendedor</Badge>
          )}
        </div>
      </header>

      {/* Selector de pestañas */}
      <nav className="flex flex-wrap gap-2 border-b border-ink/10 pb-3" aria-label="Navegación principal">
        <button
          onClick={() => setActiveTab('products')}
          className={`min-h-[44px] px-4 py-2 text-sm font-semibold rounded-xl transition-all ${
            activeTab === 'products'
              ? 'bg-primary text-white shadow-sm'
              : 'bg-white/60 text-ink/70 hover:bg-white hover:text-ink border border-ink/10'
          }`}
        >
          🍰 Mis Productos y Recetas
        </button>

        <button
          onClick={() => setActiveTab('simulator')}
          className={`min-h-[44px] px-4 py-2 text-sm font-semibold rounded-xl transition-all ${
            activeTab === 'simulator'
              ? 'bg-primary text-white shadow-sm'
              : 'bg-white/60 text-ink/70 hover:bg-white hover:text-ink border border-ink/10'
          }`}
        >
          ⚡ Alertas y Variación de Costos
        </button>

        <button
          onClick={() => setActiveTab('pricing')}
          className={`min-h-[44px] px-4 py-2 text-sm font-semibold rounded-xl transition-all ${
            activeTab === 'pricing'
              ? 'bg-primary text-white shadow-sm'
              : 'bg-white/60 text-ink/70 hover:bg-white hover:text-ink border border-ink/10'
          }`}
        >
          📈 Margen vs Markup
        </button>

        <button
          onClick={() => setActiveTab('calculator')}
          className={`min-h-[44px] px-4 py-2 text-sm font-semibold rounded-xl transition-all ${
            activeTab === 'calculator'
              ? 'bg-primary text-white shadow-sm'
              : 'bg-white/60 text-ink/70 hover:bg-white hover:text-ink border border-ink/10'
          }`}
        >
          🥣 Calculadora de Tanda Rápida
        </button>

        <button
          onClick={() => setActiveTab('onboarding')}
          className={`min-h-[44px] px-4 py-2 text-sm font-semibold rounded-xl transition-all ${
            activeTab === 'onboarding'
              ? 'bg-primary text-white shadow-sm'
              : 'bg-white/60 text-ink/70 hover:bg-white hover:text-ink border border-ink/10'
          }`}
        >
          ✨ Configuración y Onboarding
        </button>

        <button
          onClick={() => setActiveTab('auth')}
          className={`min-h-[44px] px-4 py-2 text-sm font-semibold rounded-xl transition-all ${
            activeTab === 'auth'
              ? 'bg-primary text-white shadow-sm'
              : 'bg-white/60 text-ink/70 hover:bg-white hover:text-ink border border-ink/10'
          }`}
        >
          ☁️ {userEmail ? 'Mi Cuenta Nube' : 'Guardar en la Nube'}
        </button>
      </nav>

      {/* Contenido dinámico */}
      <section className="space-y-6">
        {activeTab === 'products' && (
          <div className="space-y-6">
            <ProductCatalogManager products={products} onProductsChange={setProducts} />
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
            <QuickUnitCostCalculator />
          </div>
        )}

        {activeTab === 'onboarding' && (
          <div className="space-y-6">
            <OnboardingInteractive onProfileCreated={handleProfileCreated} />
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
      </section>

      {/* Footer sobrio y accesible */}
      <footer className="pt-8 pb-4 text-center text-xs text-ink/50 border-t border-ink/10">
        Diseñado para emprendedores argentinos · Control de inflación en ARS · Motor determinístico de cálculo
      </footer>
    </main>
  );
}
