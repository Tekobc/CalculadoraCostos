import Decimal from 'decimal.js';
import { SupplyItem } from '../schemas/costs.schema';
import { Product } from '../schemas/product.schema';

export type InflationAlertLevel = 'ok' | 'warning' | 'critical';

export interface InflationStatus {
  diasDesdeActualizacion: number;
  nivel: InflationAlertLevel;
  mensaje: string;
}

/**
 * Evalúa la vigencia de un precio según el contexto de inflación en Argentina.
 * - < 30 días: ok (actualizado)
 * - 30 a 45 días: warning (revisar pronto)
 * - > 45 días: critical (desactualizado, riesgo de perder dinero)
 */
export function checkSupplyInflationStatus(fechaActualizacionIso?: string): InflationStatus {
  if (!fechaActualizacionIso) {
    return {
      diasDesdeActualizacion: 999,
      nivel: 'critical',
      mensaje: 'Sin fecha de actualización. Requiere verificación.',
    };
  }

  const updated = new Date(fechaActualizacionIso);
  const now = new Date();
  const diffTime = Math.max(0, now.getTime() - updated.getTime());
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays <= 30) {
    return {
      diasDesdeActualizacion: diffDays,
      nivel: 'ok',
      mensaje: diffDays === 0 ? 'Actualizado hoy' : `Actualizado hace ${diffDays} días`,
    };
  }

  if (diffDays <= 45) {
    return {
      diasDesdeActualizacion: diffDays,
      nivel: 'warning',
      mensaje: `Hace ${diffDays} días que no se actualiza este precio.`,
    };
  }

  return {
    diasDesdeActualizacion: diffDays,
    nivel: 'critical',
    mensaje: `¡Alerta! Precio de hace ${diffDays} días. Podrías estar vendiendo a pérdida por inflación.`,
  };
}

export interface SupplyAdjustment {
  supplyId?: string;
  nombreCoincidencia?: string;
  porcentajeAumento: number; // Ej: 15 para +15%
}

/**
 * Simula el impacto de un aumento porcentual de insumos o tarifas
 * sobre el costo de un producto completo, calculando la diferencia exacta con Decimal.js.
 */
export function simulateSupplyPriceIncrease(
  insumo: SupplyItem,
  porcentajeAumento: number
): SupplyItem {
  const precioActual = new Decimal(insumo.precio_compra);
  const factor = new Decimal(1).plus(new Decimal(porcentajeAumento).dividedBy(100));
  const nuevoPrecio = precioActual.times(factor);

  return {
    ...insumo,
    precio_compra: nuevoPrecio.toNumber(),
    fecha_actualizacion: new Date().toISOString(),
  };
}

/**
 * Aplica aumentos en lote a una lista de insumos de un producto
 */
export function simulateProductCostIncrease(
  producto: Product,
  porcentajeGeneralInsumos: number,
  porcentajeTarifasEnergia: number = 0
): Product {
  const factorInsumos = new Decimal(1).plus(new Decimal(porcentajeGeneralInsumos).dividedBy(100));
  const factorTarifas = new Decimal(1).plus(new Decimal(porcentajeTarifasEnergia).dividedBy(100));

  const nuevosInsumos = producto.insumos.map((i) => ({
    ...i,
    precio_compra: new Decimal(i.precio_compra).times(factorInsumos).toNumber(),
    fecha_actualizacion: new Date().toISOString(),
  }));

  const nuevoConsumoEnergia = producto.consumo_energia.map((e) => ({
    ...e,
    tarifa_kwh: new Decimal(e.tarifa_kwh).times(factorTarifas).toNumber(),
  }));

  const nuevoConsumoGas = producto.consumo_gas.map((g) => ({
    ...g,
    tarifa_m3: new Decimal(g.tarifa_m3).times(factorTarifas).toNumber(),
  }));

  return {
    ...producto,
    insumos: nuevosInsumos,
    impresion: producto.impresion
      ? {
          ...producto.impresion,
          costo_por_hoja: new Decimal(producto.impresion.costo_por_hoja)
            .times(factorInsumos)
            .toNumber(),
        }
      : producto.impresion,
    consumo_energia: nuevoConsumoEnergia,
    consumo_gas: nuevoConsumoGas,
    fecha_actualizacion: new Date().toISOString(),
  };
}
