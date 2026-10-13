import { describe, expect, it } from 'vitest';
import { ProductSchema } from '@/domain/schemas/product.schema';
import { InventoryItem, ProductionEntry } from '@/domain/schemas/operations.schema';
import {
  estimateProduct,
  getOperationShortages,
  getSupplyRequirements,
} from '../production-planning';

const product = ProductSchema.parse({
  id: '00000000-0000-4000-8000-000000000001',
  nombre: 'Budín',
  unidades_lote_base: 10,
  insumos: [{
    nombre: 'Harina',
    cantidad_compra: 1,
    unidad_compra: 'kg',
    precio_compra: 2000,
    cantidad_usada: 500,
    unidad_uso: 'gr',
    factor_conversion: 1000,
    merma_porcentaje: 10,
  }],
  packaging: [{ nombre: 'Bolsa', costo_unitario: 20, cantidad: 1 }],
  tiempo_produccion_horas: 1,
  costo_hora_mano_obra: 1000,
  costos_fijos_unitarios: 5,
  estrategia_precio: 'margen',
  porcentaje_objetivo: 20,
  precio_venta_sugerido: 300,
});

describe('production planning estimates', () => {
  it('estimates unit and total costs, revenue and profit using the central stock price', () => {
    const inventory: InventoryItem[] = [{
      id: '00000000-0000-4000-8000-000000000002',
      nombre: ' harina ',
      unidad: 'kg',
      cantidad: 5,
      precio_unitario: 3000,
    }];

    const estimate = estimateProduct(product, 4, inventory);

    expect(estimate.costoUnitario.toNumber()).toBeCloseTo(875 / 3);
    expect(estimate.costoTotal.toNumber()).toBeCloseTo(3500 / 3);
    expect(estimate.ingresoTotal?.toNumber()).toBeCloseTo(1200);
    expect(estimate.gananciaTotal?.toNumber()).toBeCloseTo(100 / 3);
  });

  it('includes recipe batch size, purchase conversion and waste in stock requirements', () => {
    const [requirement] = getSupplyRequirements(product, 4);

    expect(requirement.nombre).toBe('Harina');
    expect(requirement.unidad).toBe('kg');
    expect(requirement.cantidad.toNumber()).toBeCloseTo(2 / 9);
  });

  it('shows the combined shortages for planned production and orders', () => {
    const inventory: InventoryItem[] = [{
      id: '00000000-0000-4000-8000-000000000003',
      nombre: 'Harina',
      unidad: 'kg',
      cantidad: 0.1,
      precio_unitario: 2000,
    }];
    const entries: ProductionEntry[] = [{
      id: '00000000-0000-4000-8000-000000000004',
      tipo: 'production',
      product_id: product.id!,
      cantidad: 4,
      fecha: '2026-10-13',
      estado: 'planned',
    }, {
      id: '00000000-0000-4000-8000-000000000005',
      tipo: 'order',
      product_id: product.id!,
      cantidad: 4,
      fecha: '2026-10-14',
      estado: 'planned',
    }];

    const [shortage] = getOperationShortages(inventory, entries, [product]);

    expect(shortage.nombre).toBe('Harina');
    expect(shortage.cantidad.toNumber()).toBeCloseTo(4 / 9 - 0.1);
  });
});
