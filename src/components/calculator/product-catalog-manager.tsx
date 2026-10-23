'use client';

import React, { useState } from 'react';
import Decimal from 'decimal.js';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Product } from '@/domain/schemas/product.schema';
import { BusinessProfile, ModuleType } from '@/domain/schemas/profile.schema';
import { SupplyItem } from '@/domain/schemas/costs.schema';
import { formatCurrencyARS, formatRelativeDate } from '@/lib/formatters/currency';
import { calculateSupplyItemCost } from '@/domain/calculator/supplies';
import {
  calculatePrintedSheets,
  calculatePrintingUnitCost,
} from '@/domain/calculator/printing';
import {
  BAKING_UNITS,
  getCompatibleUsageUnits,
  getUnitConversionFactor,
} from '@/domain/calculator/units';
import { calculatePriceIncludingCommission } from '@/domain/calculator/pricing';
import { InflationAlertBadge } from './inflation-alert-badge';

interface ProductCatalogManagerProps {
  products: Product[];
  profile?: BusinessProfile | null;
  onProductsChange: (products: Product[]) => void;
}

export function ProductCatalogManager({
  products,
  profile,
  onProductsChange,
}: ProductCatalogManagerProps) {
  const [selectedProductId, setSelectedProductId] = useState<string>(products[0]?.id || '1');
  const [newProductName, setNewProductName] = useState('');
  const [productNameError, setProductNameError] = useState<string | null>(null);
  const [newItemType, setNewItemType] = useState<Product['tipo']>(
    profile?.tipo === 'servicio' ? 'servicio' : 'producto'
  );

  const activeProduct = products.find((p) => p.id === selectedProductId) || products[0];
  const activeModules: ModuleType[] = profile?.modulos_activos ?? ['insumos', 'mano_de_obra', 'impresion'];
  const moduleEnabled = (module: ModuleType) => activeModules.includes(module);
  const isMixedBusiness = profile?.tipo === 'mixto';
  const isServiceCatalog = profile?.tipo === 'servicio';
  const newItemLabel = newItemType === 'servicio' ? 'servicio' : 'producto';

  const updateSupply = (supplyId: string, patch: Partial<SupplyItem>) => {
    if (!activeProduct) return;

    const updatedProduct: Product = {
      ...activeProduct,
      insumos: activeProduct.insumos.map((item) =>
        item.id === supplyId
          ? {
              ...item,
              ...patch,
              ...(patch.precio_compra !== undefined && patch.precio_compra > 0
                ? { status: 'confirmado' as const }
                : {}),
              fecha_actualizacion: patch.precio_compra !== undefined
                ? new Date().toISOString()
                : item.fecha_actualizacion,
            }
          : item
      ),
      fecha_actualizacion: new Date().toISOString(),
    };
    onProductsChange(products.map((p) => (p.id === activeProduct.id ? updatedProduct : p)));
  };

  const updateActiveProduct = (patch: Partial<Product>) => {
    if (!activeProduct) return;
    const updatedProduct = {
      ...activeProduct,
      ...patch,
      fecha_actualizacion: new Date().toISOString(),
    };
    onProductsChange(products.map((product) =>
      product.id === activeProduct.id ? updatedProduct : product
    ));
  };

  const handleAddProduct = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nombre = newProductName.trim();
    if (!nombre) {
      setProductNameError(`Escribí el nombre del ${isServiceCatalog ? 'servicio' : 'producto'} para agregarlo.`);
      return;
    }

    const newId = crypto.randomUUID();
    const newProduct: Product = {
      id: newId,
      nombre,
      tipo: isMixedBusiness ? newItemType : isServiceCatalog ? 'servicio' : 'producto',
      unidades_lote_base: 1,
      insumos: [],
      packaging: [],
      consumo_energia: [],
      consumo_gas: [],
      tiempo_produccion_horas: 0,
      costo_hora_mano_obra: 0,
      estrategia_precio: 'margen',
      porcentaje_objetivo: 35,
      costos_fijos_unitarios: 0,
      impuestos_comisiones_porcentaje: 0,
      fecha_creacion: new Date().toISOString(),
      fecha_actualizacion: new Date().toISOString(),
    };

      onProductsChange([...products, newProduct]);
    setSelectedProductId(newId);
    setNewProductName('');
    setProductNameError(null);
  };

  const calcularDesgloseCostos = (prod: Product) => {
    let sumInsumos = new Decimal(0);
    if (moduleEnabled('insumos')) {
      for (const item of prod.insumos) {
        sumInsumos = sumInsumos.plus(
          calculateSupplyItemCost(
            item.precio_compra,
            item.cantidad_compra,
            item.cantidad_usada,
            item.factor_conversion,
            item.merma_porcentaje
          )
        );
      }
    }
    const sumPackaging = moduleEnabled('packaging')
      ? prod.packaging.reduce(
          (sum, item) => sum.plus(new Decimal(item.costo_unitario).times(item.cantidad)),
          new Decimal(0)
        )
      : new Decimal(0);
    const sumEnergia = moduleEnabled('energia')
      ? prod.consumo_energia.reduce(
          (sum, usage) => sum.plus(
            new Decimal(usage.potencia_w).dividedBy(1000)
              .times(usage.horas_uso)
              .times(usage.tarifa_kwh)
          ),
          new Decimal(0)
        )
      : new Decimal(0);
    const sumGas = moduleEnabled('gas')
      ? prod.consumo_gas.reduce(
          (sum, usage) => sum.plus(
            new Decimal(usage.consumo_m3_h)
              .times(usage.horas_uso)
              .times(usage.tarifa_m3)
          ),
          new Decimal(0)
        )
      : new Decimal(0);
    const includesLabor = moduleEnabled('mano_de_obra') || moduleEnabled('servicios');
    const sumMo = includesLabor
      ? new Decimal(prod.tiempo_produccion_horas).times(prod.costo_hora_mano_obra)
      : new Decimal(0);
    const unidades = new Decimal(prod.unidades_lote_base || 1);
    const impresionUnitario = moduleEnabled('impresion')
      ? calculatePrintingUnitCost(prod.impresion)
      : new Decimal(0);
    const costoFijoUnitario = moduleEnabled('costos_fijos')
      ? new Decimal(prod.costos_fijos_unitarios)
      : new Decimal(0);
    const costoPorUnidad = (lote: Decimal) => lote.dividedBy(unidades);
    const ingredientesUnitarios = costoPorUnidad(sumInsumos);
    const energiaUnitaria = costoPorUnidad(sumEnergia);
    const gasUnitario = costoPorUnidad(sumGas);
    const manoDeObraUnitaria = costoPorUnidad(sumMo);

    return {
      ingredientes: ingredientesUnitarios,
      impresion: impresionUnitario,
      packaging: sumPackaging,
      energia: energiaUnitaria,
      gas: gasUnitario,
      manoDeObra: manoDeObraUnitaria,
      costosFijos: costoFijoUnitario,
      total: ingredientesUnitarios
        .plus(impresionUnitario)
        .plus(sumPackaging)
        .plus(energiaUnitaria)
        .plus(gasUnitario)
        .plus(manoDeObraUnitaria)
        .plus(costoFijoUnitario),
    };
  };

  const modulesNotIncludedInPrice = activeModules.filter((module) =>
    (module === 'insumos' && (
      activeProduct?.insumos.length === 0 ||
      activeProduct?.insumos.some((item) => item.precio_compra <= 0 || item.status === 'estimado')
    )) ||
    (module === 'impresion' && (
      !activeProduct?.impresion || activeProduct.impresion.costo_por_hoja <= 0
    )) ||
    (module === 'packaging' && (
      activeProduct?.packaging.length === 0 ||
      activeProduct?.packaging.some((item) => item.costo_unitario <= 0 || item.status === 'estimado')
    )) ||
    (module === 'energia' && (
      activeProduct?.consumo_energia.length === 0 ||
      activeProduct?.consumo_energia.some((item) =>
        item.potencia_w <= 0 || item.horas_uso <= 0 || item.tarifa_kwh <= 0
      )
    )) ||
    (module === 'gas' && (
      activeProduct?.consumo_gas.length === 0 ||
      activeProduct?.consumo_gas.some((item) =>
        item.consumo_m3_h <= 0 || item.horas_uso <= 0 || item.tarifa_m3 <= 0
      )
    )) ||
    ((module === 'mano_de_obra' || module === 'servicios') &&
      (!activeProduct?.tiempo_produccion_horas || !activeProduct?.costo_hora_mano_obra))
  );

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {products.map((prod) => {
            const hasOutdatedSupplies = moduleEnabled('insumos') && prod.insumos.some((i) => {
              if (!i.fecha_actualizacion) return true;
              const diffDays = Math.floor(
                (new Date().getTime() - new Date(i.fecha_actualizacion).getTime()) /
                  (1000 * 60 * 60 * 24)
              );
              return diffDays > 30;
            });

            return (
              <button
                key={prod.id}
                type="button"
                onClick={() => setSelectedProductId(prod.id!)}
                aria-pressed={prod.id === activeProduct?.id}
                title={prod.nombre}
                className={`min-h-[44px] px-4 py-2 text-sm font-semibold rounded-xl border transition-all flex items-center gap-2 ${
                  prod.id === activeProduct?.id
                    ? 'bg-primary text-white border-primary shadow-sm'
                    : 'bg-white text-ink/80 border-ink/15 hover:bg-canvas'
                }`}
              >
                <span className="max-w-[14rem] truncate">{prod.nombre}</span>
                {hasOutdatedSupplies && (
                  <span className="w-2 h-2 rounded-full bg-danger animate-pulse" title="Insumos desactualizados" />
                )}
              </button>
            );
          })}
        </div>

        <form
          onSubmit={handleAddProduct}
          className="grid gap-3 rounded-2xl border border-primary/15 bg-white/80 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end"
        >
          <div>
            <Label htmlFor="new-product-name" required>
              Nombre del {isServiceCatalog ? 'servicio' : 'producto o servicio'}
            </Label>
            <Input
              id="new-product-name"
              value={newProductName}
              onChange={(event) => {
                setNewProductName(event.target.value);
                if (event.target.value.trim()) setProductNameError(null);
              }}
              placeholder={isServiceCatalog ? 'Ej.: Asesoría inicial' : 'Ej.: Torta de chocolate 20 cm'}
              aria-describedby={productNameError ? 'new-product-error' : 'new-product-hint'}
              error={Boolean(productNameError)}
            />
            {productNameError ? (
              <p id="new-product-error" role="alert" className="mt-1 text-xs text-danger">
                {productNameError}
              </p>
            ) : (
              <p id="new-product-hint" className="mt-1 text-xs text-ink/60">
                Agregalo y completá sus costos.
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-end gap-2">
            {isMixedBusiness && (
              <label className="space-y-1.5 text-sm font-medium text-ink">
                <span>Tipo</span>
                <select
                  value={newItemType}
                  onChange={(event) => setNewItemType(event.target.value as Product['tipo'])}
                  className="min-h-11 rounded-xl border border-ink/15 bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <option value="producto">Producto</option>
                  <option value="servicio">Servicio</option>
                </select>
              </label>
            )}
            <Button type="submit" variant="primary">
              + Agregar {isServiceCatalog ? 'servicio' : isMixedBusiness ? newItemLabel : 'producto'}
            </Button>
          </div>
        </form>
      </div>

      {activeProduct && (
        <Card key={activeProduct.id} className="border-ink/15">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <Input
                  aria-label="Nombre del producto o servicio"
                  defaultValue={activeProduct.nombre}
                  onBlur={(event) => {
                    const nombre = event.currentTarget.value.trim();
                    if (nombre && nombre !== activeProduct.nombre) updateActiveProduct({ nombre });
                    if (!nombre) event.currentTarget.value = activeProduct.nombre;
                  }}
                  className="mb-1 border-transparent px-0 text-lg font-bold shadow-none focus-visible:border-ink/20"
                />
                <Input
                  aria-label={activeProduct.tipo === 'servicio' ? 'Descripción del servicio' : 'Presentación o tamaño del producto'}
                  placeholder={activeProduct.tipo === 'servicio' ? 'Descripción del servicio' : 'Presentación: por ejemplo, torta de 20 cm'}
                  defaultValue={activeProduct.descripcion ?? ''}
                  onBlur={(event) => {
                    const descripcion = event.currentTarget.value.trim();
                    if (descripcion !== (activeProduct.descripcion ?? '')) {
                      updateActiveProduct({ descripcion });
                    }
                  }}
                  className="mb-2 max-w-md text-xs"
                />
                <CardDescription>
                  {activeProduct.tipo === 'servicio' ? 'Base de cálculo' : 'Rendimiento actual'}: {activeProduct.unidades_lote_base} {activeProduct.tipo === 'servicio' ? 'unidad(es) de servicio' : 'unidad(es) por tanda'}
                  {moduleEnabled('mano_de_obra') || moduleEnabled('servicios')
                    ? ` · Mano de obra: ${activeProduct.tiempo_produccion_horas}h a ${formatCurrencyARS(activeProduct.costo_hora_mano_obra)}/h`
                    : ''}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <select
                  aria-label="Estrategia de precio"
                  value={activeProduct.estrategia_precio}
                  onChange={(event) => updateActiveProduct({
                    estrategia_precio: event.target.value as Product['estrategia_precio'],
                  })}
                  className="min-h-[40px] rounded-xl border border-ink/15 bg-white px-3 text-xs font-semibold text-ink"
                >
                  <option value="margen">Margen</option>
                  <option value="markup">Markup</option>
                </select>
                <Badge variant="support">
                  {activeProduct.estrategia_precio === 'margen' ? 'Margen' : 'Markup'}: {activeProduct.porcentaje_objetivo}%
                </Badge>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
              {moduleEnabled('insumos') && <div className="space-y-3">
                <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-ink text-sm sm:text-base">Ingredientes de la receta</h4>
                  <p className="text-xs font-normal text-ink/65">
                    Cargá el precio del envase y cuánto usás en esta tanda.
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const nuevoInsumo: SupplyItem = {
                      id: crypto.randomUUID(),
                      nombre: 'Nuevo ingrediente',
                      cantidad_compra: 1,
                      unidad_compra: 'kg',
                      precio_compra: 0,
                      cantidad_usada: 1,
                      unidad_uso: 'g',
                      factor_conversion: 1000,
                      merma_porcentaje: 0,
                      fecha_actualizacion: new Date().toISOString(),
                      status: 'estimado',
                    };
                    const updatedProduct = {
                      ...activeProduct,
                      insumos: [...activeProduct.insumos, nuevoInsumo],
                      fecha_actualizacion: new Date().toISOString(),
                    };
                    onProductsChange(products.map((p) => (p.id === activeProduct.id ? updatedProduct : p)));
                  }}
                  className="text-xs"
                >
                  + Agregar Insumo
                </Button>
              </div>

              {activeProduct.insumos.length === 0 && (
                <p className="rounded-xl bg-canvas/70 px-4 py-3 text-sm text-ink/70">
                  Todavía no hay ingredientes. Agregá el primero para empezar a calcular el costo de esta receta.
                </p>
              )}

              <div className="space-y-3">
                {activeProduct.insumos.map((item) => {
                  const itemCost = calculateSupplyItemCost(
                    item.precio_compra,
                    item.cantidad_compra,
                    item.cantidad_usada,
                    item.factor_conversion,
                    item.merma_porcentaje
                  );

                  return (
                    <div
                      key={item.id ?? item.nombre}
                      className="rounded-xl border border-ink/10 bg-white p-4 space-y-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <h5 className="font-semibold text-ink">{item.nombre}</h5>
                          {item.status === 'estimado' && <Badge variant="accent">Estimado</Badge>}
                        </div>
                        <div className="flex items-center gap-3">
                          <InflationAlertBadge
                            fechaActualizacionIso={item.fecha_actualizacion}
                            nombreInsumo={item.nombre}
                            onUpdateRequested={() => {
                              const input = document.getElementById(`supply-price-${item.id}`);
                              input?.focus();
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => updateActiveProduct({
                              insumos: activeProduct.insumos.filter((entry) => entry.id !== item.id),
                            })}
                            className="min-h-[44px] px-2 text-xs font-medium text-danger underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                            aria-label={`Eliminar ingrediente ${item.nombre}`}
                          >
                            Eliminar
                          </button>
                        </div>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <div>
                          <Label htmlFor={`supply-name-${item.id}`}>Ingrediente</Label>
                          <Input
                            id={`supply-name-${item.id}`}
                            defaultValue={item.nombre}
                            onBlur={(event) => {
                              const nombre = event.currentTarget.value.trim();
                              if (nombre && nombre !== item.nombre) updateSupply(item.id!, { nombre });
                              if (!nombre) event.currentTarget.value = item.nombre;
                            }}
                          />
                        </div>
                        <div>
                          <Label htmlFor={`supply-price-${item.id}`}>Precio del envase ($)</Label>
                          <Input
                            id={`supply-price-${item.id}`}
                            type="number"
                            min="0"
                            step="0.01"
                            defaultValue={item.precio_compra}
                            onBlur={(event) => updateSupply(item.id!, {
                              precio_compra: Math.max(0, Number(event.currentTarget.value) || 0),
                            })}
                          />
                        </div>
                        <div>
                          <Label htmlFor={`supply-purchase-amount-${item.id}`}>Cantidad del envase</Label>
                          <div className="flex gap-2">
                            <Input
                              id={`supply-purchase-amount-${item.id}`}
                              type="number"
                              min="1"
                              step="1"
                              defaultValue={item.cantidad_compra}
                              onBlur={(event) => updateSupply(item.id!, {
                                cantidad_compra: Math.max(0.001, Number(event.currentTarget.value) || 0.001),
                              })}
                              className="min-w-0"
                            />
                            <select
                              aria-label={`Unidad del envase de ${item.nombre}`}
                              value={item.unidad_compra}
                              onChange={(event) => {
                                const unidad_compra = event.target.value;
                                const compatibleUnits = getCompatibleUsageUnits(unidad_compra);
                                const unidad_uso = compatibleUnits.includes(item.unidad_uso)
                                  ? item.unidad_uso
                                  : compatibleUnits[0];
                                updateSupply(item.id!, {
                                  unidad_compra,
                                  unidad_uso,
                                  factor_conversion: getUnitConversionFactor(unidad_compra, unidad_uso) ?? 1,
                                });
                              }}
                              className="min-h-[44px] rounded-xl border border-ink/15 bg-white px-2 text-sm text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                            >
                              {!BAKING_UNITS.includes(item.unidad_compra as typeof BAKING_UNITS[number]) && (
                                <option value={item.unidad_compra}>{item.unidad_compra}</option>
                              )}
                              {BAKING_UNITS.map((unit) => <option key={unit} value={unit}>{unit}</option>)}
                            </select>
                          </div>
                        </div>
                        <div>
                          <Label htmlFor={`supply-used-amount-${item.id}`}>Cantidad usada en la tanda</Label>
                          <div className="flex gap-2">
                            <Input
                              id={`supply-used-amount-${item.id}`}
                              type="number"
                              min="0.001"
                              step="any"
                              defaultValue={item.cantidad_usada}
                              onBlur={(event) => updateSupply(item.id!, {
                                cantidad_usada: Math.max(0.001, Number(event.currentTarget.value) || 0.001),
                              })}
                              className="min-w-0"
                            />
                            <select
                              aria-label={`Unidad usada de ${item.nombre}`}
                              value={item.unidad_uso}
                              onChange={(event) => {
                                const unidad_uso = event.target.value;
                                updateSupply(item.id!, {
                                  unidad_uso,
                                  factor_conversion: getUnitConversionFactor(item.unidad_compra, unidad_uso) ?? 1,
                                });
                              }}
                              className="min-h-[44px] rounded-xl border border-ink/15 bg-white px-2 text-sm text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                            >
                              {!getCompatibleUsageUnits(item.unidad_compra).includes(item.unidad_uso) && (
                                <option value={item.unidad_uso}>{item.unidad_uso}</option>
                              )}
                              {getCompatibleUsageUnits(item.unidad_compra).map((unit) => (
                                <option key={unit} value={unit}>{unit}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                        <div>
                          <Label htmlFor={`supply-waste-${item.id}`}>Merma (%)</Label>
                          <Input
                            id={`supply-waste-${item.id}`}
                            type="number"
                            min="0"
                            max="99.9"
                            step="0.1"
                            defaultValue={item.merma_porcentaje}
                            onBlur={(event) => updateSupply(item.id!, {
                              merma_porcentaje: Math.min(99.9, Math.max(0, Number(event.currentTarget.value) || 0)),
                            })}
                          />
                        </div>
                        <div className="flex items-end justify-between rounded-xl bg-canvas/70 px-3 py-2 sm:col-span-2">
                          <span className="text-sm text-ink/70">Costo usado en esta receta</span>
                          <strong className="tabular-nums text-primary">{formatCurrencyARS(itemCost.toNumber())}</strong>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              </div>}

              {moduleEnabled('impresion') && (
                <section className="space-y-3 rounded-xl border border-ink/10 bg-white/80 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h4 className="text-sm font-semibold text-ink">Impresión por hoja</h4>
                      <p className="mt-1 max-w-prose text-xs text-ink/65">
                        Incluí en el costo por hoja el material, la tinta, la energía y el uso de la máquina.
                        No vuelvas a cargar esos mismos costos en insumos.
                      </p>
                    </div>
                    {activeProduct.impresion && (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => updateActiveProduct({ impresion: null })}
                      >
                        Quitar impresión
                      </Button>
                    )}
                  </div>
                  {activeProduct.impresion ? (
                    <>
                      <div className="grid gap-3 sm:grid-cols-3">
                        <div>
                          <Label htmlFor={`print-sheet-name-${activeProduct.id}`}>Hoja o material</Label>
                          <Input
                            id={`print-sheet-name-${activeProduct.id}`}
                            defaultValue={activeProduct.impresion.nombre_hoja}
                            placeholder="A4 autoadhesiva"
                            onBlur={(event) => updateActiveProduct({
                              impresion: {
                                ...activeProduct.impresion!,
                                nombre_hoja: event.currentTarget.value.trim() || activeProduct.impresion!.nombre_hoja,
                              },
                            })}
                          />
                        </div>
                        <div>
                          <Label htmlFor={`print-sheet-cost-${activeProduct.id}`}>Costo total por hoja ($)</Label>
                          <Input
                            id={`print-sheet-cost-${activeProduct.id}`}
                            type="number"
                            min="0"
                            step="0.01"
                            defaultValue={activeProduct.impresion.costo_por_hoja}
                            onBlur={(event) => updateActiveProduct({
                              impresion: {
                                ...activeProduct.impresion!,
                                costo_por_hoja: Math.max(0, Number(event.currentTarget.value) || 0),
                              },
                            })}
                          />
                        </div>
                        <div>
                          <Label htmlFor={`print-sheet-yield-${activeProduct.id}`}>Piezas vendibles por hoja</Label>
                          <Input
                            id={`print-sheet-yield-${activeProduct.id}`}
                            type="number"
                            min="1"
                            step="1"
                            defaultValue={activeProduct.impresion.unidades_por_hoja}
                            onBlur={(event) => updateActiveProduct({
                              impresion: {
                                ...activeProduct.impresion!,
                                unidades_por_hoja: Math.max(1, Math.round(Number(event.currentTarget.value) || 1)),
                              },
                            })}
                          />
                        </div>
                      </div>
                      <p className="text-xs text-ink/65">
                        Cada pieza vendible incorpora{' '}
                        <strong className="tabular-nums">
                          {formatCurrencyARS(calculatePrintingUnitCost(activeProduct.impresion).toNumber())}
                        </strong>{' '}
                        de impresión. Para esta tanda se estiman{' '}
                        <strong className="tabular-nums">
                          {calculatePrintedSheets(
                            activeProduct.unidades_lote_base,
                            activeProduct.impresion.unidades_por_hoja
                          ).toString()}
                        </strong>{' '}
                        hoja(s) de {activeProduct.impresion.nombre_hoja}. El sistema redondea hacia arriba para no subestimar el costo.
                      </p>
                    </>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => updateActiveProduct({
                        impresion: {
                          nombre_hoja: 'Hoja impresa',
                          costo_por_hoja: 0,
                          unidades_por_hoja: 1,
                        },
                      })}
                    >
                      + Agregar costo de impresión
                    </Button>
                  )}
                </section>
              )}

              <div className="max-w-xs">
                <Label htmlFor={`batch-yield-${activeProduct.id}`}>Unidades que rinde esta tanda</Label>
                <Input
                  id={`batch-yield-${activeProduct.id}`}
                  type="number"
                  min="0.001"
                  step="any"
                  defaultValue={activeProduct.unidades_lote_base}
                  onBlur={(event) => updateActiveProduct({
                    unidades_lote_base: Math.max(0.001, Number(event.currentTarget.value) || 0.001),
                  })}
                />
                <p className="mt-1 text-xs text-ink/60">
                  Ejemplo: si una receta rinde 12 porciones, escribí 12.
                </p>
              </div>

            {(moduleEnabled('mano_de_obra') || moduleEnabled('servicios') ||
              moduleEnabled('packaging') || moduleEnabled('energia') || moduleEnabled('gas') ||
              moduleEnabled('costos_fijos') || moduleEnabled('impuestos_comisiones')) && (
              <div className="grid gap-4 sm:grid-cols-2">
                {(moduleEnabled('mano_de_obra') || moduleEnabled('servicios')) && (
                  <div className="rounded-xl border border-ink/10 bg-white/80 p-4 space-y-3">
                    <h4 className="text-sm font-semibold text-ink">
                      {activeProduct.tipo === 'servicio' ? 'Tiempo del servicio' : 'Mano de obra'}
                    </h4>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label htmlFor={`labor-hours-${activeProduct.id}`}>Horas por tanda</Label>
                        <Input
                          id={`labor-hours-${activeProduct.id}`}
                          type="number"
                          min="0"
                          step="0.1"
                          defaultValue={activeProduct.tiempo_produccion_horas}
                          onBlur={(event) => updateActiveProduct({
                            tiempo_produccion_horas: Math.max(0, Number(event.currentTarget.value) || 0),
                          })}
                        />
                      </div>
                      <div>
                        <Label htmlFor={`labor-rate-${activeProduct.id}`}>Valor de hora ($)</Label>
                        <Input
                          id={`labor-rate-${activeProduct.id}`}
                          type="number"
                          min="0"
                          step="0.01"
                          defaultValue={activeProduct.costo_hora_mano_obra}
                          onBlur={(event) => updateActiveProduct({
                            costo_hora_mano_obra: Math.max(0, Number(event.currentTarget.value) || 0),
                          })}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {moduleEnabled('packaging') && (
                  <div className="rounded-xl border border-ink/10 bg-white/80 p-4 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-sm font-semibold text-ink">Packaging</h4>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateActiveProduct({
                          packaging: [...activeProduct.packaging, { nombre: 'Envase', costo_unitario: 0, cantidad: 1, status: 'estimado' }],
                        })}
                      >
                        + Agregar
                      </Button>
                    </div>
                    {activeProduct.packaging.map((item, index) => (
                      <div key={`${activeProduct.id}-packaging-${index}`} className="grid grid-cols-3 gap-2">
                        <Input
                          aria-label="Nombre del packaging"
                          defaultValue={item.nombre}
                          onBlur={(event) => updateActiveProduct({
                            packaging: activeProduct.packaging.map((entry, entryIndex) =>
                              entryIndex === index ? { ...entry, nombre: event.currentTarget.value } : entry
                            ),
                          })}
                          className="h-9 text-xs"
                        />
                        <Input
                          aria-label="Costo unitario del packaging"
                          type="number"
                          min="0"
                          defaultValue={item.costo_unitario}
                          onBlur={(event) => updateActiveProduct({
                            packaging: activeProduct.packaging.map((entry, entryIndex) =>
                              entryIndex === index ? { ...entry, costo_unitario: Math.max(0, Number(event.currentTarget.value) || 0) } : entry
                            ),
                          })}
                          className="h-9 text-xs"
                        />
                        <Input
                          aria-label="Cantidad de packaging"
                          type="number"
                          min="0.01"
                          step="0.01"
                          defaultValue={item.cantidad}
                          onBlur={(event) => updateActiveProduct({
                            packaging: activeProduct.packaging.map((entry, entryIndex) =>
                              entryIndex === index ? { ...entry, cantidad: Math.max(0.01, Number(event.currentTarget.value) || 1) } : entry
                            ),
                          })}
                          className="h-9 text-xs"
                        />
                      </div>
                    ))}
                    <p className="text-[11px] text-ink/60">Nombre · precio unitario · unidades por producto</p>
                  </div>
                )}

                {moduleEnabled('energia') && (
                  <div className="rounded-xl border border-ink/10 bg-white/80 p-4 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-sm font-semibold text-ink">Energía eléctrica</h4>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateActiveProduct({
                          consumo_energia: [...activeProduct.consumo_energia, { potencia_w: 0, horas_uso: 0, tarifa_kwh: 0 }],
                        })}
                      >
                        + Equipo
                      </Button>
                    </div>
                    {activeProduct.consumo_energia.map((usage, index) => (
                      <div key={`${activeProduct.id}-energy-${index}`} className="grid grid-cols-3 gap-2">
                        {([
                          ['Potencia W', 'potencia_w', usage.potencia_w],
                          ['Horas', 'horas_uso', usage.horas_uso],
                          ['Tarifa kWh', 'tarifa_kwh', usage.tarifa_kwh],
                        ] as const).map(([label, field, value]) => (
                          <Input
                            key={field}
                            aria-label={label}
                            type="number"
                            min="0"
                            step="0.1"
                            defaultValue={value}
                            onBlur={(event) => updateActiveProduct({
                              consumo_energia: activeProduct.consumo_energia.map((entry, entryIndex) =>
                                entryIndex === index ? { ...entry, [field]: Math.max(0, Number(event.currentTarget.value) || 0) } : entry
                              ),
                            })}
                            className="h-9 text-xs"
                          />
                        ))}
                      </div>
                    ))}
                    <p className="text-[11px] text-ink/60">Potencia · horas por tanda · tarifa por kWh</p>
                  </div>
                )}

                {moduleEnabled('gas') && (
                  <div className="rounded-xl border border-ink/10 bg-white/80 p-4 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-sm font-semibold text-ink">Gas</h4>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateActiveProduct({
                          consumo_gas: [...activeProduct.consumo_gas, { consumo_m3_h: 0, horas_uso: 0, tarifa_m3: 0 }],
                        })}
                      >
                        + Equipo
                      </Button>
                    </div>
                    {activeProduct.consumo_gas.map((usage, index) => (
                      <div key={`${activeProduct.id}-gas-${index}`} className="grid grid-cols-3 gap-2">
                        {([
                          ['Consumo m³/h', 'consumo_m3_h', usage.consumo_m3_h],
                          ['Horas', 'horas_uso', usage.horas_uso],
                          ['Tarifa m³', 'tarifa_m3', usage.tarifa_m3],
                        ] as const).map(([label, field, value]) => (
                          <Input
                            key={field}
                            aria-label={label}
                            type="number"
                            min="0"
                            step="0.1"
                            defaultValue={value}
                            onBlur={(event) => updateActiveProduct({
                              consumo_gas: activeProduct.consumo_gas.map((entry, entryIndex) =>
                                entryIndex === index ? { ...entry, [field]: Math.max(0, Number(event.currentTarget.value) || 0) } : entry
                              ),
                            })}
                            className="h-9 text-xs"
                          />
                        ))}
                      </div>
                    ))}
                    <p className="text-[11px] text-ink/60">Consumo horario · horas por tanda · tarifa por m³</p>
                  </div>
                )}

                {(moduleEnabled('costos_fijos') || moduleEnabled('impuestos_comisiones')) && (
                  <div className="rounded-xl border border-ink/10 bg-white/80 p-4 space-y-3">
                    <h4 className="text-sm font-semibold text-ink">Otros costos del negocio</h4>
                    {moduleEnabled('costos_fijos') && (
                      <div>
                        <Label htmlFor={`fixed-cost-${activeProduct.id}`}>Costo fijo prorrateado por unidad ($)</Label>
                        <Input
                          id={`fixed-cost-${activeProduct.id}`}
                          type="number"
                          min="0"
                          step="0.01"
                          defaultValue={activeProduct.costos_fijos_unitarios}
                          onBlur={(event) => updateActiveProduct({
                            costos_fijos_unitarios: Math.max(0, Number(event.currentTarget.value) || 0),
                          })}
                        />
                      </div>
                    )}
                    {moduleEnabled('impuestos_comisiones') && (
                      <div>
                        <Label htmlFor={`commission-${activeProduct.id}`}>Impuestos y comisiones sobre venta (%)</Label>
                        <Input
                          id={`commission-${activeProduct.id}`}
                          type="number"
                          min="0"
                          max="99.9"
                          step="0.1"
                          defaultValue={activeProduct.impuestos_comisiones_porcentaje}
                          onBlur={(event) => updateActiveProduct({
                            impuestos_comisiones_porcentaje: Math.min(99.9, Math.max(0, Number(event.currentTarget.value) || 0)),
                          })}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Resumen Unitario y Precio Sugerido */}
            {(() => {
              const desglose = calcularDesgloseCostos(activeProduct);
              const costoUnitario = desglose.total;
              const comision = moduleEnabled('impuestos_comisiones')
                ? activeProduct.impuestos_comisiones_porcentaje
                : 0;
              const objetivoInvalido = activeProduct.estrategia_precio === 'margen' &&
                activeProduct.porcentaje_objetivo + comision >= 100;
              const precioSugerido = objetivoInvalido ? null : calculatePriceIncludingCommission(
                  costoUnitario,
                  activeProduct.porcentaje_objetivo,
                  comision,
                  activeProduct.estrategia_precio
                );
                const lineasCostos = [
                  { label: 'Ingredientes', module: 'insumos' as const, amount: desglose.ingredientes },
                  { label: 'Impresión', module: 'impresion' as const, amount: desglose.impresion },
                  { label: 'Packaging', module: 'packaging' as const, amount: desglose.packaging },
                  { label: 'Electricidad', module: 'energia' as const, amount: desglose.energia },
                  { label: 'Gas', module: 'gas' as const, amount: desglose.gas },
                  { label: activeProduct.tipo === 'servicio' ? 'Tiempo del servicio' : 'Mano de obra', module: 'mano_de_obra' as const, amount: desglose.manoDeObra },
                  { label: 'Costos fijos', module: 'costos_fijos' as const, amount: desglose.costosFijos },
                ].filter((line) =>
                  line.module === 'mano_de_obra'
                    ? moduleEnabled('mano_de_obra') || moduleEnabled('servicios')
                    : moduleEnabled(line.module)
                );

                return (
                  <div className="grid gap-5 rounded-2xl border border-primary/15 bg-canvas p-5 lg:grid-cols-[minmax(0,1fr)_minmax(16rem,0.8fr)]">
                    <div className="space-y-3">
                      <div>
                        <span className="text-xs font-semibold uppercase tracking-wider text-ink/65">
                          Costo de una unidad
                        </span>
                        <p className="text-3xl font-extrabold text-ink tabular-nums">
                          {formatCurrencyARS(costoUnitario.toNumber())}
                        </p>
                        <p className="text-xs text-ink/65">
                          Cada costo de tanda se divide por las {activeProduct.unidades_lote_base} unidades que rinde.
                        </p>
                      </div>
                      <dl className="grid gap-x-4 gap-y-2 border-t border-ink/10 pt-3 sm:grid-cols-2">
                        {lineasCostos.map((line) => (
                          <div key={line.label} className="flex justify-between gap-2 text-sm">
                            <dt className="text-ink/70">{line.label}</dt>
                            <dd className="font-medium tabular-nums text-ink">
                              {formatCurrencyARS(line.amount.toNumber())}
                            </dd>
                          </div>
                        ))}
                      </dl>
                    </div>

                    <div className="rounded-xl border-2 border-primary/30 bg-white p-4 text-center sm:text-right">
                      <label
                        htmlFor={`target-percent-${activeProduct.id}`}
                        className="text-xs uppercase tracking-wider text-primary font-bold block"
                    >
                      Objetivo de {activeProduct.estrategia_precio === 'margen' ? 'margen' : 'markup'} (%)
                    </label>
                    <Input
                      id={`target-percent-${activeProduct.id}`}
                      type="number"
                      min="0"
                      max="99.9"
                      step="0.1"
                      defaultValue={activeProduct.porcentaje_objetivo}
                      onBlur={(event) => updateActiveProduct({
                        porcentaje_objetivo: Math.min(99.9, Math.max(0, Number(event.currentTarget.value) || 0)),
                      })}
                      className="mb-2 h-9 text-center sm:text-right"
                    />
                    <span className="text-xs uppercase tracking-wider text-ink/60 font-semibold block">
                      {modulesNotIncludedInPrice.length > 0 ? 'Precio provisional' : 'Precio sugerido'}
                    </span>
                    {precioSugerido ? (
                      <span className="text-2xl sm:text-3xl font-extrabold text-primary tabular-nums">
                        {formatCurrencyARS(precioSugerido.toNumber())}
                      </span>
                    ) : (
                      <span role="alert" className="text-xs text-danger">
                        Margen y comisión no pueden sumar 100% o más.
                      </span>
                    )}
                    {comision > 0 && (
                      <p className="mt-1 text-xs text-ink/65">
                        Incluye {comision}% de impuestos/comisiones sobre la venta.
                      </p>
                    )}
                  </div>
                  {modulesNotIncludedInPrice.length > 0 && (
                    <p className="text-xs text-danger">
                      El precio es parcial: completá los módulos activos {modulesNotIncludedInPrice.join(', ')} para incluirlos en el cálculo.
                    </p>
                  )}
                </div>
              );
            })()}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
