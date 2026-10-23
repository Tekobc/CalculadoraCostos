'use client';

import React, { useState, useRef } from 'react';
import Decimal from 'decimal.js';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrencyARS } from '@/lib/formatters/currency';
import { calculateSupplyItemCost } from '@/domain/calculator/supplies';
import { calculatePrintingCost } from '@/domain/calculator/printing';
import { SupplyItem } from '@/domain/schemas/costs.schema';
import { Product } from '@/domain/schemas/product.schema';
import { BusinessProfile } from '@/domain/schemas/profile.schema';

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

type OCRResponse = {
  supplies: {
    nombre: string;
    precioCompra: number;
    cantidadCompra: number;
    unidadCompra: string;
    cantidadUsada: number;
    unidadUso: string;
    factorConversion?: number;
    merma?: number;
  }[];
};

function isOCRResponse(value: unknown): value is OCRResponse {
  return (
    typeof value === 'object' &&
    value !== null &&
    'supplies' in value &&
    Array.isArray(value.supplies) &&
    value.supplies.every(
      (supply) =>
        typeof supply === 'object' &&
        supply !== null &&
        'nombre' in supply &&
        typeof supply.nombre === 'string' &&
        'precioCompra' in supply &&
        typeof supply.precioCompra === 'number' &&
        'cantidadCompra' in supply &&
        typeof supply.cantidadCompra === 'number' &&
        'unidadCompra' in supply &&
        typeof supply.unidadCompra === 'string' &&
        'cantidadUsada' in supply &&
        typeof supply.cantidadUsada === 'number' &&
        'unidadUso' in supply &&
        typeof supply.unidadUso === 'string'
    )
  );
}

interface QuickUnitCostCalculatorProps {
  onSaveAsProduct?: (newProduct: Product) => void;
  profile?: BusinessProfile | null;
  isDemo?: boolean;
}

export function QuickUnitCostCalculator({
  onSaveAsProduct,
  profile,
  isDemo = true,
}: QuickUnitCostCalculatorProps = {}) {
  const activeModules = profile?.modulos_activos;
  const useSupplies = !activeModules || activeModules.includes('insumos');
  const useLabor = !activeModules || activeModules.includes('mano_de_obra') || activeModules.includes('servicios');
  const isServiceBusiness = profile?.tipo === 'servicio';
  const isMixedBusiness = profile?.tipo === 'mixto';
  const itemLabel = isServiceBusiness ? 'servicio' : isMixedBusiness ? 'producto o servicio' : 'producto';
  const usePrinting = activeModules?.includes('impresion') ?? false;
  const [nombreProducto, setNombreProducto] = useState('');
  const [unidadesLote, setUnidadesLote] = useState<string>(isDemo ? '12' : '1');
  const [manoDeObraHoras, setManoDeObraHoras] = useState<string>(isDemo ? '2' : '0');
  const [costoHoraMo, setCostoHoraMo] = useState<string>(isDemo ? '3000' : '0');
  const [nombreHoja, setNombreHoja] = useState('Hoja impresa');
  const [costoHoja, setCostoHoja] = useState('0');
  const [piezasPorHoja, setPiezasPorHoja] = useState('1');
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [supplies, setSupplies] = useState<QuickSupply[]>(isDemo && useSupplies ? [
    {
      id: '00000000-0000-4000-8000-000000000201',
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
      id: '00000000-0000-4000-8000-000000000202',
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
  ] : []);

  const addSupply = () => {
    setSupplies([
      ...supplies,
      {
        id: crypto.randomUUID(),
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

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setImportError(null);
    setImporting(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      const response = await fetch('/api/recipes/ocr-parse', {
        method: 'POST',
        body: formData,
      });
      const result: unknown = await response.json();
      if (!response.ok) {
        const message =
          typeof result === 'object' &&
          result !== null &&
          'error' in result &&
          typeof result.error === 'string'
            ? result.error
            : 'No se pudo procesar la imagen.';
        throw new Error(message);
      }
      if (!isOCRResponse(result)) {
        throw new Error('La respuesta de importación no tiene un formato válido.');
      }
      if (result.supplies.length === 0) {
        throw new Error('No se encontraron insumos en la imagen.');
      }

      const importedSupplies = result.supplies.map((supply) => ({
        id: crypto.randomUUID(),
        nombre: supply.nombre,
        precioCompra: String(supply.precioCompra),
        cantidadCompra: String(supply.cantidadCompra),
        unidadCompra: supply.unidadCompra,
        cantidadUsada: String(supply.cantidadUsada),
        unidadUso: supply.unidadUso,
        factorConversion: String(supply.factorConversion ?? 1),
        merma: String(supply.merma ?? 0),
        status: 'estimado' as const,
      }));
      setSupplies((current) => [...current, ...importedSupplies]);
    } catch (error) {
      setImportError(error instanceof Error ? error.message : 'No se pudo procesar la imagen.');
    } finally {
      setImporting(false);
    }
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
        if (useSupplies) totalInsumos = totalInsumos.plus(cost);
      }
    } catch {
      // ignore
    }
    return { ...s, cost };
  });

  const unidades = Math.max(1, parseFloat(unidadesLote) || 1);
  const horasMo = parseFloat(manoDeObraHoras) || 0;
  const tarifaMo = parseFloat(costoHoraMo) || 0;
  const totalMo = useLabor ? new Decimal(horasMo).times(tarifaMo) : new Decimal(0);
  const printing = usePrinting
    ? {
        nombre_hoja: nombreHoja.trim() || 'Hoja impresa',
        costo_por_hoja: Math.max(0, parseFloat(costoHoja) || 0),
        unidades_por_hoja: Math.max(1, Math.round(parseFloat(piezasPorHoja) || 1)),
      }
    : null;
  const totalPrinting = calculatePrintingCost(printing, unidades);

  const costoTotalLote = totalInsumos.plus(totalMo).plus(totalPrinting);
  const costoUnitario = costoTotalLote.dividedBy(unidades);

  return (
    <Card className="border-ink/15">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <CardTitle>{isServiceBusiness ? 'Calculadora de costo de servicio' : 'Calculadora de costo rápido'}</CardTitle>
            <CardDescription>
              {isServiceBusiness
                ? 'Cargá el tiempo y los costos asociados para saber cuánto te cuesta brindar cada servicio.'
                : 'Sumá tus materias primas y el tiempo de trabajo para estimar el costo de cada unidad o tanda.'}
            </CardDescription>
          </div>
          <Badge variant="support">
            {isServiceBusiness ? `Servicios: ${unidades}` : `Lote de ${unidades} u.`}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {onSaveAsProduct && (
          <div className="max-w-xl">
            <Label htmlFor="quick-product-name" required>Nombre del {itemLabel}</Label>
            <Input
              id="quick-product-name"
              value={nombreProducto}
              onChange={(event) => setNombreProducto(event.target.value)}
              placeholder={isServiceBusiness ? 'Ej.: Asesoría inicial' : 'Ej.: Alfajores de maicena'}
              aria-describedby="quick-product-name-hint"
            />
            <p id="quick-product-name-hint" className="mt-1 text-xs text-ink/60">
              Se agregará a tu catálogo para que puedas completar o ajustar sus costos.
            </p>
          </div>
        )}

        {/* Parámetros de lote */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-canvas/60 p-4 rounded-xl border border-ink/5">
          <div>
            <Label htmlFor="unidades-lote">{isServiceBusiness ? 'Cantidad de servicios' : 'Unidades por tanda / lote'}</Label>
            <Input
              id="unidades-lote"
              type="number"
              min="1"
              value={unidadesLote}
              onChange={(e) => setUnidadesLote(e.target.value)}
            />
          </div>

          {useLabor && <>
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
          </>}
        </div>

        {/* Tabla de insumos */}
        {useSupplies && <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-ink text-sm sm:text-base">Insumos y Materias Primas</h4>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={addSupply} disabled={importing}>
                + Agregar insumo
              </Button>
              <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={importing}>
                {importing ? 'Procesando imagen...' : '📷 Importar por Foto/Imagen'}
              </Button>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                ref={fileInputRef}
                className="hidden"
                onChange={handleFileChange}
                disabled={importing}
                aria-label="Seleccionar imagen de insumos"
              />
            </div>
          </div>
          {importError && <p role="alert" className="text-xs text-danger">{importError}</p>}

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
        </div>}

        {usePrinting && (
          <section className="space-y-3 rounded-xl border border-ink/10 bg-white/80 p-4">
            <div>
              <h4 className="text-sm font-semibold text-ink">Impresión por hoja</h4>
              <p className="mt-1 max-w-prose text-xs text-ink/65">
                Incluí material, tinta, energía y uso de máquina en el costo total por hoja para evitar contarlos dos veces.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <Label htmlFor="quick-print-sheet">Hoja o material</Label>
                <Input id="quick-print-sheet" value={nombreHoja} onChange={(event) => setNombreHoja(event.target.value)} placeholder="A4 autoadhesiva" />
              </div>
              <div>
                <Label htmlFor="quick-print-cost">Costo total por hoja ($)</Label>
                <Input id="quick-print-cost" type="number" min="0" step="0.01" value={costoHoja} onChange={(event) => setCostoHoja(event.target.value)} />
              </div>
              <div>
                <Label htmlFor="quick-print-yield">Piezas vendibles por hoja</Label>
                <Input id="quick-print-yield" type="number" min="1" step="1" value={piezasPorHoja} onChange={(event) => setPiezasPorHoja(event.target.value)} />
              </div>
            </div>
          </section>
        )}

        {/* Resumen Final */}
        <div className="bg-canvas rounded-2xl p-5 border border-ink/10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1 text-center sm:text-left">
            <p className="text-xs text-ink/70">
              {useSupplies && <>Insumos: <strong className="tabular-nums">{formatCurrencyARS(totalInsumos.toNumber())}</strong></>}
              {useSupplies && useLabor && ' · '}
              {useLabor && <>{isServiceBusiness ? 'Tiempo de servicio' : 'Mano de obra'}: <strong className="tabular-nums">{formatCurrencyARS(totalMo.toNumber())}</strong></>}
              {(useSupplies || useLabor) && usePrinting && ' · '}
              {usePrinting && <>Impresión: <strong className="tabular-nums">{formatCurrencyARS(totalPrinting.toNumber())}</strong></>}
            </p>
            <p className="text-xs text-ink/60">
              Total {isServiceBusiness ? 'servicios' : 'tanda'} ({unidades} {isServiceBusiness ? 'servicios' : 'unidades'}): <span className="tabular-nums font-semibold">{formatCurrencyARS(costoTotalLote.toNumber())}</span>
            </p>
          </div>

          <div className="text-center sm:text-right bg-white px-5 py-3 rounded-xl border border-ink/10 shadow-sm space-y-1">
            <span className="text-xs uppercase tracking-wider text-ink/60 font-semibold block">
              Costo unitario real
            </span>
            <span className="text-2xl sm:text-3xl font-extrabold text-primary tabular-nums block">
              {formatCurrencyARS(costoUnitario.toNumber())}
            </span>
            {onSaveAsProduct && (
              <Button
                size="sm"
                variant="outline"
                disabled={!nombreProducto.trim()}
                onClick={() => {
                  const newProd: Product = {
                    id: crypto.randomUUID(),
                    nombre: nombreProducto.trim(),
                    tipo: profile?.tipo === 'servicio' ? 'servicio' : 'producto',
                    unidades_lote_base: unidades,
                    insumos: supplies.map((s) => ({
                      id: crypto.randomUUID(),
                      nombre: s.nombre,
                      cantidad_compra: parseFloat(s.cantidadCompra) || 1,
                      unidad_compra: s.unidadCompra,
                      precio_compra: parseFloat(s.precioCompra) || 0,
                      cantidad_usada: parseFloat(s.cantidadUsada) || 0,
                      unidad_uso: s.unidadUso,
                      factor_conversion: parseFloat(s.factorConversion) || 1,
                      merma_porcentaje: parseFloat(s.merma) || 0,
                      fecha_actualizacion: new Date().toISOString(),
                      status: s.status,
                    })),
                    packaging: [],
                    consumo_energia: [],
                    consumo_gas: [],
                    impresion: printing,
                    tiempo_produccion_horas: horasMo,
                    costo_hora_mano_obra: tarifaMo,
                    costos_fijos_unitarios: 0,
                    impuestos_comisiones_porcentaje: 0,
                    estrategia_precio: 'margen',
                    porcentaje_objetivo: 35,
                    fecha_creacion: new Date().toISOString(),
                    fecha_actualizacion: new Date().toISOString(),
                  };
                  onSaveAsProduct(newProd);
                }}
                className="mt-2 text-xs w-full"
              >
                💾 Guardar en {isServiceBusiness ? 'Mis servicios' : 'Mi catálogo'}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
