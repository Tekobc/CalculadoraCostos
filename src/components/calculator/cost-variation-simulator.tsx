'use client';

import React, { useState } from 'react';
import Decimal from 'decimal.js';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Product } from '@/domain/schemas/product.schema';
import { formatCurrencyARS } from '@/lib/formatters/currency';
import { calculateSupplyItemCost } from '@/domain/calculator/supplies';
import { calculatePriceFromMargin, calculatePriceFromMarkup } from '@/domain/calculator/pricing';
import { simulateProductCostIncrease } from '@/domain/calculator/inflation';

interface CostVariationSimulatorProps {
  productos: Product[];
  onApplyIncreasesToProduct?: (productoActualizado: Product) => void;
}

export function CostVariationSimulator({
  productos,
  onApplyIncreasesToProduct,
}: CostVariationSimulatorProps) {
  const [porcentajeInsumos, setPorcentajeInsumos] = useState<string>('15');
  const [porcentajeTarifas, setPorcentajeTarifas] = useState<string>('20');
  const [productoSeleccionadoId, setProductoSeleccionadoId] = useState<string>(
    productos[0]?.id || '1'
  );

  const prodActual = productos.find((p) => p.id === productoSeleccionadoId) || productos[0];

  if (!prodActual) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-sm text-ink/70">
          No hay productos disponibles para simular aumentos. Creá un producto primero.
        </CardContent>
      </Card>
    );
  }

  const pctInsumosNum = parseFloat(porcentajeInsumos) || 0;
  const pctTarifasNum = parseFloat(porcentajeTarifas) || 0;

  // Cálculo original
  const calcularCostoTotal = (prod: Product) => {
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
    return sumInsumos.plus(sumMo);
  };

  const costoOriginalTotal = calcularCostoTotal(prodActual);
  const costoOriginalUnitario = costoOriginalTotal.dividedBy(prodActual.unidades_lote_base || 1);

  // Simulación
  const prodSimulado = simulateProductCostIncrease(prodActual, pctInsumosNum, pctTarifasNum);
  const costoSimuladoTotal = calcularCostoTotal(prodSimulado);
  const costoSimuladoUnitario = costoSimuladoTotal.dividedBy(prodSimulado.unidades_lote_base || 1);
  const diferenciaUnitaria = costoSimuladoUnitario.minus(costoOriginalUnitario);

  // Precio de venta sugerido recalculado para mantener el mismo margen
  const margenDeseado = prodActual.porcentaje_objetivo || 30;
  let nuevoPrecioSugerido: Decimal | null = null;
  try {
    nuevoPrecioSugerido =
      prodActual.estrategia_precio === 'markup'
        ? calculatePriceFromMarkup(costoSimuladoUnitario, margenDeseado)
        : calculatePriceFromMargin(costoSimuladoUnitario, margenDeseado);
  } catch {
    // ignore
  }

  return (
    <Card className="border-ink/15">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <CardTitle>Simulador de Impacto Inflacionario y Tarifas</CardTitle>
            <CardDescription>
              Anticipá cómo una suba en tus materias primas o en la factura de luz/gas altera tu costo unitario y qué precio deberías cobrar para no perder margen.
            </CardDescription>
          </div>
          <Badge variant="accent">Impacto en tiempo real</Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-canvas/70 p-4 rounded-xl border border-ink/10">
          <div>
            <Label htmlFor="select-prod">Producto a evaluar</Label>
            <select
              id="select-prod"
              value={productoSeleccionadoId}
              onChange={(e) => setProductoSeleccionadoId(e.target.value)}
              className="w-full min-h-[44px] rounded-xl border border-ink/15 bg-white px-3.5 py-2.5 text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              {productos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre} ({p.unidades_lote_base} u.)
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label htmlFor="pct-insumos">Suba estimada en Insumos (%)</Label>
            <div className="flex items-center gap-2">
              <Input
                id="pct-insumos"
                type="number"
                min="0"
                step="5"
                value={porcentajeInsumos}
                onChange={(e) => setPorcentajeInsumos(e.target.value)}
              />
              <span className="text-sm font-semibold text-ink/70">%</span>
            </div>
          </div>

          <div>
            <Label htmlFor="pct-tarifas">Suba estimada en Tarifas (%)</Label>
            <div className="flex items-center gap-2">
              <Input
                id="pct-tarifas"
                type="number"
                min="0"
                step="5"
                value={porcentajeTarifas}
                onChange={(e) => setPorcentajeTarifas(e.target.value)}
              />
              <span className="text-sm font-semibold text-ink/70">%</span>
            </div>
          </div>
        </div>

        {/* Comparativa Visual de Impacto */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-xl border border-ink/10 space-y-1">
            <span className="text-xs uppercase tracking-wider text-ink/60 font-semibold block">
              Costo Unitario Actual
            </span>
            <span className="text-2xl font-bold text-ink tabular-nums">
              {formatCurrencyARS(costoOriginalUnitario.toNumber())}
            </span>
            <p className="text-xs text-ink/60">Base de costos registrada</p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-danger/30 space-y-1">
            <span className="text-xs uppercase tracking-wider text-danger font-semibold block">
              Nuevo Costo con Aumento
            </span>
            <span className="text-2xl font-bold text-danger tabular-nums">
              {formatCurrencyARS(costoSimuladoUnitario.toNumber())}
            </span>
            <p className="text-xs text-danger/80 font-medium">
              +{formatCurrencyARS(diferenciaUnitaria.toNumber())} por cada unidad (+{pctInsumosNum}%)
            </p>
          </div>

          <div className="bg-primary/5 p-4 rounded-xl border-2 border-primary/30 space-y-1">
            <span className="text-xs uppercase tracking-wider text-primary font-bold block">
              Precio Sugerido para Mantener {margenDeseado}% {prodActual.estrategia_precio}
            </span>
            <span className="text-2xl font-extrabold text-primary tabular-nums">
              {nuevoPrecioSugerido ? formatCurrencyARS(nuevoPrecioSugerido.toNumber()) : '$ 0,00'}
            </span>
            <p className="text-xs text-ink/70">Mantiene tu ganancia neta intacta</p>
          </div>
        </div>

        {onApplyIncreasesToProduct && (
          <div className="flex justify-end pt-2">
            <Button
              variant="outline"
              size="md"
              onClick={() => onApplyIncreasesToProduct(prodSimulado)}
            >
              Aplicar este ajuste a los costos del producto
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
