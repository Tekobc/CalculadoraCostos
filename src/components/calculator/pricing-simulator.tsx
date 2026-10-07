'use client';

import React, { useState } from 'react';
import Decimal from 'decimal.js';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { formatCurrencyARS } from '@/lib/formatters/currency';
import {
  calculatePriceFromMarkup,
  calculatePriceFromMargin,
  calculateMarginPercentage,
  calculateMarkupPercentage,
  calculateBreakevenUnits,
} from '@/domain/calculator/pricing';

export function PricingSimulator() {
  const [costo, setCosto] = useState<string>('2500');
  const [markupPct, setMarkupPct] = useState<string>('50');
  const [marginPct, setMarginPct] = useState<string>('33.33');
  const [costosFijos, setCostosFijos] = useState<string>('120000');

  // Cálculos reactivos con Decimal.js
  const costoNum = parseFloat(costo) || 0;
  const markupNum = parseFloat(markupPct) || 0;
  const marginNum = parseFloat(marginPct) || 0;
  const fijosNum = parseFloat(costosFijos) || 0;

  let precioPorMarkup: Decimal | null = null;
  let precioPorMargen: Decimal | null = null;
  let puntoEqMarkup: Decimal | null = null;
  let puntoEqMargen: Decimal | null = null;
  let errorMarginMsg: string | null = null;

  try {
    if (costoNum > 0 && markupNum >= 0) {
      precioPorMarkup = calculatePriceFromMarkup(costoNum, markupNum);
      if (fijosNum > 0 && precioPorMarkup.greaterThan(costoNum)) {
        puntoEqMarkup = calculateBreakevenUnits(fijosNum, precioPorMarkup, costoNum);
      }
    }
  } catch (err: any) {
    // Silently ignore or show error
  }

  try {
    if (costoNum > 0 && marginNum >= 0) {
      if (marginNum >= 100) {
        errorMarginMsg = 'El margen debe ser menor a 100%';
      } else {
        precioPorMargen = calculatePriceFromMargin(costoNum, marginNum);
        if (fijosNum > 0 && precioPorMargen.greaterThan(costoNum)) {
          puntoEqMargen = calculateBreakevenUnits(fijosNum, precioPorMargen, costoNum);
        }
      }
    }
  } catch (err: any) {
    errorMarginMsg = err?.message || 'Error en margen';
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Simulador: Margen vs Markup</CardTitle>
            <Badge variant="accent">Motor determinístico</Badge>
          </div>
          <CardDescription>
            Compará de forma transparente cómo cambia tu precio final según el método que elijas y evitá perder dinero.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="costo-base">Costo unitario ($ ARS)</Label>
              <Input
                id="costo-base"
                type="number"
                min="0"
                step="50"
                value={costo}
                onChange={(e) => setCosto(e.target.value)}
                placeholder="Ej: 2500"
              />
              <p className="text-xs text-ink/60 mt-1">Costo real de producir 1 unidad.</p>
            </div>

            <div>
              <Label htmlFor="costos-fijos">Costos fijos mensuales ($ ARS)</Label>
              <Input
                id="costos-fijos"
                type="number"
                min="0"
                step="1000"
                value={costosFijos}
                onChange={(e) => setCostosFijos(e.target.value)}
                placeholder="Ej: 120000"
              />
              <p className="text-xs text-ink/60 mt-1">Alquiler, luz, monotributo, internet.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tarjetas comparativas lado a lado */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Opción A: Markup */}
        <div className="bg-white/80 rounded-2xl border border-ink/10 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-lg text-ink">Estrategia A: Markup (Recargo)</h3>
              <p className="text-xs text-ink/70">Sumás un % por encima de lo que te costó.</p>
            </div>
            <Badge variant="default">% sobre costo</Badge>
          </div>

          <div>
            <Label htmlFor="markup-input">Porcentaje de Markup (%)</Label>
            <div className="flex items-center gap-2">
              <Input
                id="markup-input"
                type="number"
                min="0"
                max="500"
                step="5"
                value={markupPct}
                onChange={(e) => setMarkupPct(e.target.value)}
              />
              <span className="text-sm font-semibold text-ink/70">%</span>
            </div>
          </div>

          <div className="bg-canvas rounded-xl p-4 border border-ink/5 space-y-2">
            <div className="flex justify-between items-baseline">
              <span className="text-sm text-ink/70">Precio sugerido:</span>
              <span className="text-2xl font-bold text-primary tabular-nums">
                {precioPorMarkup ? formatCurrencyARS(precioPorMarkup.toNumber()) : '$ 0,00'}
              </span>
            </div>

            <div className="flex justify-between text-xs text-ink/80 pt-1 border-t border-ink/10">
              <span>Ganancia por unidad:</span>
              <span className="font-semibold tabular-nums">
                {precioPorMarkup
                  ? formatCurrencyARS(precioPorMarkup.minus(costoNum).toNumber())
                  : '$ 0,00'}
              </span>
            </div>

            <div className="flex justify-between text-xs text-ink/80">
              <span>Margen real resultante:</span>
              <span className="font-semibold tabular-nums">
                {precioPorMarkup && precioPorMarkup.greaterThan(0)
                  ? `${calculateMarginPercentage(costoNum, precioPorMarkup).toFixed(1)}%`
                  : '0%'}
              </span>
            </div>

            {puntoEqMarkup && (
              <div className="flex justify-between text-xs text-primary font-medium pt-1 border-t border-ink/10">
                <span>Punto de equilibrio mensual:</span>
                <span className="tabular-nums">{Math.ceil(puntoEqMarkup.toNumber())} unidades</span>
              </div>
            )}
          </div>
        </div>

        {/* Opción B: Margen */}
        <div className="bg-white/80 rounded-2xl border-2 border-primary/20 p-5 shadow-sm space-y-4 relative">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-lg text-ink">Estrategia B: Margen de Ganancia</h3>
              <p className="text-xs text-ink/70">Porcentaje que te queda de cada venta total.</p>
            </div>
            <Badge variant="accent">Recomendado</Badge>
          </div>

          <div>
            <Label htmlFor="margin-input">Margen deseado sobre venta (%)</Label>
            <div className="flex items-center gap-2">
              <Input
                id="margin-input"
                type="number"
                min="0"
                max="99"
                step="1"
                value={marginPct}
                onChange={(e) => setMarginPct(e.target.value)}
                error={!!errorMarginMsg}
              />
              <span className="text-sm font-semibold text-ink/70">%</span>
            </div>
            {errorMarginMsg && <p className="text-xs text-danger mt-1">{errorMarginMsg}</p>}
          </div>

          <div className="bg-canvas rounded-xl p-4 border border-ink/5 space-y-2">
            <div className="flex justify-between items-baseline">
              <span className="text-sm text-ink/70">Precio sugerido:</span>
              <span className="text-2xl font-bold text-primary tabular-nums">
                {precioPorMargen ? formatCurrencyARS(precioPorMargen.toNumber()) : '$ 0,00'}
              </span>
            </div>

            <div className="flex justify-between text-xs text-ink/80 pt-1 border-t border-ink/10">
              <span>Ganancia por unidad:</span>
              <span className="font-semibold tabular-nums">
                {precioPorMargen
                  ? formatCurrencyARS(precioPorMargen.minus(costoNum).toNumber())
                  : '$ 0,00'}
              </span>
            </div>

            <div className="flex justify-between text-xs text-ink/80">
              <span>Markup equivalente:</span>
              <span className="font-semibold tabular-nums">
                {precioPorMargen && costoNum > 0
                  ? `${calculateMarkupPercentage(costoNum, precioPorMargen).toFixed(1)}%`
                  : '0%'}
              </span>
            </div>

            {puntoEqMargen && (
              <div className="flex justify-between text-xs text-primary font-medium pt-1 border-t border-ink/10">
                <span>Punto de equilibrio mensual:</span>
                <span className="tabular-nums">{Math.ceil(puntoEqMargen.toNumber())} unidades</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
