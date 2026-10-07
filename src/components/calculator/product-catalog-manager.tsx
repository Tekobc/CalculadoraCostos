'use client';

import React, { useState } from 'react';
import Decimal from 'decimal.js';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Product } from '@/domain/schemas/product.schema';
import { SupplyItem } from '@/domain/schemas/costs.schema';
import { formatCurrencyARS, formatRelativeDate } from '@/lib/formatters/currency';
import { calculateSupplyItemCost } from '@/domain/calculator/supplies';
import { calculatePriceFromMargin } from '@/domain/calculator/pricing';
import { InflationAlertBadge } from './inflation-alert-badge';

interface ProductCatalogManagerProps {
  products: Product[];
  onProductsChange: (products: Product[]) => void;
}

export function ProductCatalogManager({
  products,
  onProductsChange,
}: ProductCatalogManagerProps) {
  const [selectedProductId, setSelectedProductId] = useState<string>(products[0]?.id || '1');
  const [editingSupplyId, setEditingSupplyId] = useState<string | null>(null);
  const [newPriceValue, setNewPriceValue] = useState<string>('');

  const activeProduct = products.find((p) => p.id === selectedProductId) || products[0];

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

  const handleAddProduct = () => {
    const newId = Math.random().toString(36).substring(2, 9);
    const newProduct: Product = {
      id: newId,
      nombre: 'Nuevo Producto / Receta',
      tipo: 'producto',
      unidades_lote_base: 10,
      insumos: [
        {
          id: Math.random().toString(),
          nombre: 'Insumo Base',
          cantidad_compra: 1,
          unidad_compra: 'kg',
          precio_compra: 2500,
          cantidad_usada: 250,
          unidad_uso: 'gr',
          factor_conversion: 1000,
          merma_porcentaje: 0,
          fecha_actualizacion: new Date().toISOString(),
          status: 'confirmado',
        },
      ],
      packaging: [],
      consumo_energia: [],
      consumo_gas: [],
      tiempo_produccion_horas: 1.5,
      costo_hora_mano_obra: 3000,
      estrategia_precio: 'margen',
      porcentaje_objetivo: 35,
      fecha_creacion: new Date().toISOString(),
      fecha_actualizacion: new Date().toISOString(),
    };

    onProductsChange([...products, newProduct]);
    setSelectedProductId(newId);
  };

  const calcularCostoUnitario = (prod: Product) => {
    let sumInsumos = new Decimal(0);
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
    const sumMo = new Decimal(prod.tiempo_produccion_horas).times(prod.costo_hora_mano_obra);
    const costoLote = sumInsumos.plus(sumMo);
    return costoLote.dividedBy(prod.unidades_lote_base || 1);
  };

  return (
    <div className="space-y-6">
      {/* Selector y listado de productos */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          {products.map((prod) => {
            const hasOutdatedSupplies = prod.insumos.some((i) => {
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
                <CardTitle>{activeProduct.nombre}</CardTitle>
                <CardDescription>
                  Lote base: {activeProduct.unidades_lote_base} unidades · Mano de obra: {activeProduct.tiempo_produccion_horas}h a {formatCurrencyARS(activeProduct.costo_hora_mano_obra)}/h
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="support">
                  Margen: {activeProduct.porcentaje_objetivo}%
                </Badge>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Tabla de insumos con control de inflación */}
            <div className="space-y-3">
              <h4 className="font-semibold text-ink text-sm sm:text-base flex items-center justify-between">
                <span>Insumos y Fecha de Última Actualización</span>
                <span className="text-xs font-normal text-ink/65">
                  Control contextual anti-inflación (Argentina)
                </span>
              </h4>

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
            </div>

            {/* Resumen Unitario y Precio Sugerido */}
            {(() => {
              const costoUnitario = calcularCostoUnitario(activeProduct);
              const precioSugerido = calculatePriceFromMargin(
                costoUnitario,
                activeProduct.porcentaje_objetivo || 30
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
                      Incluye insumos con merma y tiempo de mano de obra
                    </p>
                  </div>

                  <div className="text-center sm:text-right bg-white px-5 py-3 rounded-xl border-2 border-primary/30 shadow-sm">
                    <span className="text-xs uppercase tracking-wider text-primary font-bold block">
                      Precio de Venta Sugerido ({activeProduct.porcentaje_objetivo}% margen)
                    </span>
                    <span className="text-2xl sm:text-3xl font-extrabold text-primary tabular-nums">
                      {formatCurrencyARS(precioSugerido.toNumber())}
                    </span>
                  </div>
                </div>
              );
            })()}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
