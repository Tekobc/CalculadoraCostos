import { describe, it, expect } from 'vitest';
import {
  checkSupplyInflationStatus,
  simulateSupplyPriceIncrease,
  simulateProductCostIncrease,
} from '../inflation';
import { SupplyItem } from '../../schemas/costs.schema';
import { Product } from '../../schemas/product.schema';

describe('Inflation & Price Staleness Calculator', () => {
  it('returns ok for prices updated within 30 days', () => {
    const today = new Date().toISOString();
    const status = checkSupplyInflationStatus(today);
    expect(status.nivel).toBe('ok');
    expect(status.diasDesdeActualizacion).toBe(0);

    // 15 días atrás
    const d15 = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString();
    const status15 = checkSupplyInflationStatus(d15);
    expect(status15.nivel).toBe('ok');
    expect(status15.diasDesdeActualizacion).toBe(15);
  });

  it('triggers warning between 31 and 45 days', () => {
    const d35 = new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString();
    const status35 = checkSupplyInflationStatus(d35);
    expect(status35.nivel).toBe('warning');
    expect(status35.mensaje).toContain('35 días');
  });

  it('triggers critical alert when exceeding 45 days or missing date', () => {
    const d50 = new Date(Date.now() - 50 * 24 * 60 * 60 * 1000).toISOString();
    const status50 = checkSupplyInflationStatus(d50);
    expect(status50.nivel).toBe('critical');

    const statusMissing = checkSupplyInflationStatus(undefined);
    expect(statusMissing.nivel).toBe('critical');
  });

  it('simulates price increase with exact decimal precision', () => {
    const item: SupplyItem = {
      nombre: 'Harina 0000',
      cantidad_compra: 1,
      unidad_compra: 'kg',
      precio_compra: 1000,
      cantidad_usada: 500,
      unidad_uso: 'gr',
      factor_conversion: 1000,
      merma_porcentaje: 0,
      status: 'confirmado',
    };

    // Suba del 15% de inflación
    const updated = simulateSupplyPriceIncrease(item, 15);
    expect(updated.precio_compra).toBe(1150);

    // Suba del 33.33%
    const item2: SupplyItem = { ...item, precio_compra: 300 };
    const updated2 = simulateSupplyPriceIncrease(item2, 10);
    expect(updated2.precio_compra).toBe(330);
  });

  it('simulates product wide cost increase on supplies and energy', () => {
    const prod: Product = {
      nombre: 'Torta de Chocolate',
      tipo: 'producto',
      unidades_lote_base: 1,
      insumos: [
        {
          nombre: 'Chocolate',
          cantidad_compra: 1,
          unidad_compra: 'kg',
          precio_compra: 5000,
          cantidad_usada: 200,
          unidad_uso: 'gr',
          factor_conversion: 1000,
          merma_porcentaje: 0,
          status: 'confirmado',
        },
      ],
      packaging: [],
      consumo_energia: [
        {
          potencia_w: 1500,
          horas_uso: 1,
          tarifa_kwh: 100,
        },
      ],
      consumo_gas: [],
      tiempo_produccion_horas: 1,
      costo_hora_mano_obra: 2000,
      costos_fijos_unitarios: 0,
      impuestos_comisiones_porcentaje: 0,
      estrategia_precio: 'margen',
      porcentaje_objetivo: 30,
    };

    // Aumento general del 20% en insumos y 10% en energía
    const sim = simulateProductCostIncrease(prod, 20, 10);

    expect(sim.insumos[0].precio_compra).toBe(6000);
    expect(sim.consumo_energia[0].tarifa_kwh).toBe(110);
  });
});
