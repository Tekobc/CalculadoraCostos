'use client';

import React, { useState } from 'react';
import Decimal from 'decimal.js';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrencyARS } from '@/lib/formatters/currency';
import { calculateSupplyItemCost } from '@/domain/calculator/supplies';
import { SupplyItem } from '@/domain/schemas/costs.schema';

interface QuickSupply {
  id: string;
  nombre: string;
  cantidadCompra: string;
  unidadCompra: string;
  precioCompra: string;
  cantidadUsada: string;
  unidadUso: string;
  factorConversion: string;
  merma: string;
  status: 'confirmado' | 'estimado';
}

export function QuickUnitCostCalculator() {
  const [unidadesLote, setUnidadesLote] = useState<string>('12');
  const [manoDeObraHoras, setManoDeObraHoras] = useState<string>('2');
  const [costoHoraMo, setCostoHoraMo] = useState<string>('3000');

  const [supplies, setSupplies] = useState<QuickSupply[]>([
    {
      id: '1',
      nombre: 'Harina 0000',
      cantidadCompra: '1',
      unidadCompra: 'kg',
      precioCompra: '1200',
      cantidadUsada: '500',
      unidadUso: 'gr',
      factorConversion: '1000',
      merma: '0',
      status: 'confirmado',
    },
    {
      id: '2',
      nombre: 'Manteca',
      cantidadCompra: '200',
      unidadCompra: 'gr',
      precioCompra: '2400',
      cantidadUsada: '200',
      unidadUso: 'gr',
      factorConversion: '1',
      merma: '5',
      status: 'estimado',
    },
  ]);

  const addSupply = () => {
    setSupplies([
      ...supplies,
      {
        id: Math.random().toString(),
        nombre: 'Nuevo Insumo',
        cantidadCompra: '1',
        unidadCompra: 'unidad',
        precioCompra: '1000',
        cantidadUsada: '1',
        unidadUso: 'unidad',
        factorConversion: '1',
        merma: '0',
        status: 'confirmado',
      },
    ]);
  };

  const removeSupply = (id: string) => {
    setSupplies(supplies.filter((s) => s.id !== id));
  };

  const updateSupply = (id: string, field: keyof QuickSupply, value: string) => {
    setSupplies(
      supplies.map((s) => {
        if (s.id === id) {
          return { ...s, [field]: value };
        }
        return s;
      })
    );
  };

  // Cálculos determinísticos
  let totalInsumos = new Decimal(0);
  const itemsCalculated = supplies.map((s) => {
    let cost = new Decimal(0);
    try {
      const pCompra = parseFloat(s.precioCompra) || 0;
      const cCompra = parseFloat(s.cantidadCompra) || 1;
      const cUso = parseFloat(s.cantidadUsada) || 0;
      const factor = parseFloat(s.factorConversion) || 1;
      const merma = parseFloat(s.merma) || 0;

      if (pCompra >= 0 && cCompra > 0 && cUso > 0 && factor > 0) {
        cost = calculateSupplyItemCost(pCompra, cCompra, cUso, factor, merma);
        totalInsumos = totalInsumos.plus(cost);
      }
    } catch {
      // ignore
    }
    return { ...s, cost };
  });

  const unidades = Math.max(1, parseFloat(unidadesLote) || 1);
  const horasMo = parseFloat(manoDeObraHoras) || 0;
  const tarifaMo = parseFloat(costoHoraMo) || 0;
  const totalMo = new Decimal(horasMo).times(tarifaMo);

  const costoTotalLote = totalInsumos.plus(totalMo);
  const costoUnitario = costoTotalLote.dividedBy(unidades);

  return (
    <Card className="border-ink/15">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <CardTitle>Calculadora de Insumos y Costo Unitario</CardTitle>
            <CardDescription>
              Cargá tus ingredientes o materias primas y calculá con precisión el costo por unidad de tu receta o lote.
            </CardDescription>
          </div>
          <Badge variant="support">Lote de {unidades} u.</Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Parámetros de lote */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-canvas/60 p-4 rounded-xl border border-ink/5">
          <div>
            <Label htmlFor="unidades-lote">Unidades por tanda / lote</Label>
            <Input
              id="unidades-lote"
              type="number"
              min="1"
              value={unidadesLote}
              onChange={(e) => setUnidadesLote(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="mo-horas">Tiempo dedicado (horas)</Label>
            <Input
              id="mo-horas"
              type="number"
              min="0"
              step="0.5"
              value={manoDeObraHoras}
              onChange={(e) => setManoDeObraHoras(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="mo-tarifa">Valor de tu hora ($ ARS)</Label>
            <Input
              id="mo-tarifa"
              type="number"
              min="0"
              step="500"
              value={costoHoraMo}
              onChange={(e) => setCostoHoraMo(e.target.value)}
            />
          </div>
        </div>

        {/* Tabla de insumos */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-ink text-sm sm:text-base">Insumos y Materias Primas</h4>
            <Button size="sm" variant="outline" onClick={addSupply}>
              + Agregar insumo
            </Button>
          </div>

          <div className="space-y-2">
            {itemsCalculated.map((item) => (
              <div
                key={item.id}
                className="p-3 bg-white rounded-xl border border-ink/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-sm"
              >
                <div className="w-full md:w-1/4">
                  <Input
                    value={item.nombre}
                    onChange={(e) => updateSupply(item.id, 'nombre', e.target.value)}
                    placeholder="Insumo"
                    className="font-medium"
                  />
                  {item.status === 'estimado' && (
                    <span className="text-[10px] text-accent font-semibold block mt-1 uppercase tracking-wider">
                      ★ Sugerido / estimado
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full md:w-3/5 text-xs">
                  <div>
                    <label className="text-ink/60 block">Precio compra ($)</label>
                    <Input
                      type="number"
                      value={item.precioCompra}
                      onChange={(e) => updateSupply(item.id, 'precioCompra', e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>

                  <div>
                    <label className="text-ink/60 block">Cant. compra ({item.unidadCompra})</label>
                    <Input
                      type="number"
                      value={item.cantidadCompra}
                      onChange={(e) => updateSupply(item.id, 'cantidadCompra', e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>

                  <div>
                    <label className="text-ink/60 block">Usado ({item.unidadUso})</label>
                    <Input
                      type="number"
                      value={item.cantidadUsada}
                      onChange={(e) => updateSupply(item.id, 'cantidadUsada', e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>

                  <div>
                    <label className="text-ink/60 block">Merma (%)</label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={item.merma}
                      onChange={(e) => updateSupply(item.id, 'merma', e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between md:justify-end gap-3 w-full md:w-auto">
                  <div className="text-right">
                    <span className="text-xs text-ink/60 block">Subtotal:</span>
                    <span className="font-bold text-ink tabular-nums">
                      {formatCurrencyARS(item.cost.toNumber())}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeSupply(item.id)}
                    className="text-danger hover:text-rose-700 text-xs px-2 py-1 rounded"
                    aria-label={`Eliminar ${item.nombre}`}
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Resumen Final */}
        <div className="bg-canvas rounded-2xl p-5 border border-ink/10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1 text-center sm:text-left">
            <p className="text-xs text-ink/70">
              Insumos: <strong className="tabular-nums">{formatCurrencyARS(totalInsumos.toNumber())}</strong> + Mano de obra: <strong className="tabular-nums">{formatCurrencyARS(totalMo.toNumber())}</strong>
            </p>
            <p className="text-xs text-ink/60">
              Total tanda ({unidades} unidades): <span className="tabular-nums font-semibold">{formatCurrencyARS(costoTotalLote.toNumber())}</span>
            </p>
          </div>

          <div className="text-center sm:text-right bg-white px-5 py-3 rounded-xl border border-ink/10 shadow-sm">
            <span className="text-xs uppercase tracking-wider text-ink/60 font-semibold block">
              Costo unitario real
            </span>
            <span className="text-2xl sm:text-3xl font-extrabold text-primary tabular-nums">
              {formatCurrencyARS(costoUnitario.toNumber())}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
