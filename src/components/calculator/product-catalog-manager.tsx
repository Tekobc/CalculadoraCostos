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
  const [editingSupplyId, setEditingSupplyId] = useState<string | null>(null);
  const [newPriceValue, setNewPriceValue] = useState<string>('');

  const activeProduct = products.find((p) => p.id === selectedProductId) || products[0];
  const activeModules: ModuleType[] = profile?.modulos_activos ?? ['insumos', 'mano_de_obra'];
  const moduleEnabled = (module: ModuleType) => activeModules.includes(module);

  const handleUpdateSupplyPrice = (supplyId: string, newPrice: number) => {
    if (!activeProduct) return;

    const updatedInsumos = activeProduct.insumos.map((i) => {
      if (i.id === supplyId) {
        return {
          ...i,
          precio_compra: newPrice,
          fecha_actualizacion: new Date().toISOString(),
        };
      }
      return i;
    });

    const updatedProduct = {
      ...activeProduct,
      insumos: updatedInsumos,
      fecha_actualizacion: new Date().toISOString(),
    };

    onProductsChange(products.map((p) => (p.id === activeProduct.id ? updatedProduct : p)));
    setEditingSupplyId(null);
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

  const handleAddProduct = () => {
    const newId = crypto.randomUUID();
    const newProduct: Product = {
      id: newId,
      nombre: profile?.tipo === 'servicio' ? 'Nuevo servicio' : 'Nuevo Producto / Receta',
      tipo: profile?.tipo === 'servicio' ? 'servicio' : 'producto',
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
  };

  const calcularCostoUnitario = (prod: Product) => {
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
    const costoLote = sumInsumos.plus(sumPackaging).plus(sumEnergia).plus(sumGas).plus(sumMo);
    const costoFijoUnitario = moduleEnabled('costos_fijos')
      ? new Decimal(prod.costos_fijos_unitarios)
      : new Decimal(0);
    return costoLote.dividedBy(prod.unidades_lote_base || 1).plus(costoFijoUnitario);
  };

  const modulesNotIncludedInPrice = activeModules.filter((module) =>
    (module === 'insumos' && activeProduct?.insumos.length === 0) ||
    (module === 'packaging' && activeProduct?.packaging.length === 0) ||
    (module === 'energia' && activeProduct?.consumo_energia.length === 0) ||
    (module === 'gas' && activeProduct?.consumo_gas.length === 0) ||
    ((module === 'mano_de_obra' || module === 'servicios') &&
      (!activeProduct?.tiempo_produccion_horas || !activeProduct?.costo_hora_mano_obra))
  );

  return (
    <div className="space-y-6">
      {/* Selector y listado de productos */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
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
                className={`min-h-[44px] px-4 py-2 text-sm font-semibold rounded-xl border transition-all flex items-center gap-2 ${
                  prod.id === activeProduct?.id
                    ? 'bg-primary text-white border-primary shadow-sm'
                    : 'bg-white text-ink/80 border-ink/15 hover:bg-canvas'
                }`}
              >
                <span>{prod.nombre}</span>
                {hasOutdatedSupplies && (
                  <span className="w-2 h-2 rounded-full bg-danger animate-pulse" title="Insumos desactualizados" />
                )}
              </button>
            );
          })}
        </div>

        <Button size="sm" variant="outline" onClick={handleAddProduct}>
          + Nueva Receta / Producto
        </Button>
      </div>

      {activeProduct && (
        <Card className="border-ink/15">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <Input
                  aria-label="Nombre del producto o servicio"
                  defaultValue={activeProduct.nombre}
                  onBlur={(event) => {
                    const nombre = event.currentTarget.value.trim();
                    if (nombre && nombre !== activeProduct.nombre) updateActiveProduct({ nombre });
                  }}
                  className="mb-1 border-transparent px-0 text-lg font-bold shadow-none focus-visible:border-ink/20"
                />
                <CardDescription>
                  Lote base: {activeProduct.unidades_lote_base} unidades
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
                  <h4 className="font-semibold text-ink text-sm sm:text-base">Insumos y Fecha de Última Actualización</h4>
                  <p className="text-xs font-normal text-ink/65">Control contextual anti-inflación (Argentina)</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const nuevoInsumo: SupplyItem = {
                      id: crypto.randomUUID(),
                      nombre: 'Nuevo Insumo',
                      cantidad_compra: 1,
                      unidad_compra: 'kg',
                      precio_compra: 0,
                      cantidad_usada: 100,
                      unidad_uso: 'gr',
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

              <div className="space-y-2.5">
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
                      key={item.id}
                      className="p-3.5 bg-white rounded-xl border border-ink/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs sm:text-sm"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-ink">{item.nombre}</span>
                          <span className="text-xs text-ink/60">
                            ({item.cantidad_usada} {item.unidad_uso} de {item.cantidad_compra} {item.unidad_compra})
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <InflationAlertBadge
                            fechaActualizacionIso={item.fecha_actualizacion}
                            nombreInsumo={item.nombre}
                            onUpdateRequested={() => {
                              setEditingSupplyId(item.id!);
                              setNewPriceValue(item.precio_compra.toString());
                            }}
                          />
                        </div>
                      </div>

                      {editingSupplyId === item.id ? (
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            value={newPriceValue}
                            onChange={(e) => setNewPriceValue(e.target.value)}
                            className="w-28 h-8 text-xs bg-canvas"
                            placeholder="Nuevo precio"
                            autoFocus
                          />
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => handleUpdateSupplyPrice(item.id!, parseFloat(newPriceValue) || item.precio_compra)}
                            className="h-8 text-xs px-2.5"
                          >
                            Guardar
                          </Button>
                          <button
                            type="button"
                            onClick={() => setEditingSupplyId(null)}
                            className="text-xs text-ink/60 hover:text-ink px-1"
                          >
                            Cancelar
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-4 text-right">
                          <div>
                            <span className="text-xs text-ink/60 block">Precio compra</span>
                            <span className="font-semibold tabular-nums">
                              {formatCurrencyARS(item.precio_compra)}
                            </span>
                          </div>
                          <div>
                            <span className="text-xs text-ink/60 block">Costo en receta</span>
                            <span className="font-bold text-primary tabular-nums">
                              {formatCurrencyARS(itemCost.toNumber())}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingSupplyId(item.id!);
                              setNewPriceValue(item.precio_compra.toString());
                            }}
                            className="text-xs text-ink/60 hover:text-primary underline ml-1"
                          >
                            Editar
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              </div>}

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
              const costoUnitario = calcularCostoUnitario(activeProduct);
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

              return (
                <div className="bg-canvas rounded-2xl p-5 border border-ink/10 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="space-y-1 text-center sm:text-left">
                    <span className="text-xs uppercase tracking-wider text-ink/60 font-semibold block">
                      Costo Unitario Consolidado
                    </span>
                    <span className="text-2xl font-extrabold text-ink tabular-nums">
                      {formatCurrencyARS(costoUnitario.toNumber())}
                    </span>
                    <p className="text-xs text-ink/65">
                      {activeModules.map((module) => ({
                        insumos: 'insumos',
                        mano_de_obra: 'mano de obra',
                        energia: 'energía',
                        gas: 'gas',
                        costos_fijos: 'costos fijos',
                        impuestos_comisiones: 'impuestos y comisiones',
                        packaging: 'packaging',
                        servicios: 'servicios',
                      }[module])).join(', ')}
                    </p>
                  </div>

                  <div className="text-center sm:text-right bg-white px-5 py-3 rounded-xl border-2 border-primary/30 shadow-sm">
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
