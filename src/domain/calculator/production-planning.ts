import Decimal from 'decimal.js';
import { Product } from '@/domain/schemas/product.schema';
import { InventoryItem, ProductionEntry } from '@/domain/schemas/operations.schema';
import { calculatePriceIncludingCommission } from './pricing';
import { calculateSupplyItemCost } from './supplies';

export interface SupplyRequirement {
  nombre: string;
  unidad: string;
  cantidad: Decimal;
}

export interface ProductEstimate {
  costoUnitario: Decimal;
  precioUnitario: Decimal | null;
  gananciaUnitaria: Decimal | null;
  ingresoTotal: Decimal | null;
  costoTotal: Decimal;
  gananciaTotal: Decimal | null;
}

export function normalizeSupplyName(name: string): string {
  return name.trim().toLocaleLowerCase('es-AR');
}

export function getSupplyRequirements(
  product: Product,
  quantity: number | Decimal
): SupplyRequirement[] {
  const units = new Decimal(quantity);
  const batchUnits = new Decimal(product.unidades_lote_base);
  const requirements = new Map<string, SupplyRequirement>();

  for (const supply of product.insumos) {
    const key = `${normalizeSupplyName(supply.nombre)}\u0000${supply.unidad_compra.trim().toLocaleLowerCase('es-AR')}`;
    const required = new Decimal(supply.cantidad_usada)
      .dividedBy(supply.factor_conversion)
      .dividedBy(new Decimal(1).minus(new Decimal(supply.merma_porcentaje).dividedBy(100)))
      .times(units)
      .dividedBy(batchUnits);
    const existing = requirements.get(key);

    if (existing) {
      existing.cantidad = existing.cantidad.plus(required);
    } else {
      requirements.set(key, {
        nombre: supply.nombre.trim(),
        unidad: supply.unidad_compra.trim(),
        cantidad: required,
      });
    }
  }

  return [...requirements.values()];
}

export function estimateProduct(
  product: Product,
  quantity: number | Decimal,
  inventory: InventoryItem[] = []
): ProductEstimate {
  const batchUnits = new Decimal(product.unidades_lote_base);
  const units = new Decimal(quantity);
  let batchCost = new Decimal(0);
  let packagingUnitCost = new Decimal(0);

  for (const supply of product.insumos) {
    const stockItem = inventory.find((item) =>
      normalizeSupplyName(item.nombre) === normalizeSupplyName(supply.nombre) &&
      item.unidad.trim().toLocaleLowerCase('es-AR') === supply.unidad_compra.trim().toLocaleLowerCase('es-AR')
    );
    batchCost = batchCost.plus(
      calculateSupplyItemCost(
        stockItem?.precio_unitario ?? supply.precio_compra,
        stockItem ? 1 : supply.cantidad_compra,
        supply.cantidad_usada,
        supply.factor_conversion,
        supply.merma_porcentaje
      )
    );
  }

  for (const item of product.packaging) {
    packagingUnitCost = packagingUnitCost.plus(new Decimal(item.costo_unitario).times(item.cantidad));
  }

  for (const energy of product.consumo_energia) {
    batchCost = batchCost.plus(
      new Decimal(energy.potencia_w)
        .dividedBy(1000)
        .times(energy.horas_uso)
        .times(energy.tarifa_kwh)
    );
  }

  for (const gas of product.consumo_gas) {
    batchCost = batchCost.plus(
      new Decimal(gas.consumo_m3_h)
        .times(gas.horas_uso)
        .times(gas.tarifa_m3)
    );
  }

  batchCost = batchCost.plus(
    new Decimal(product.tiempo_produccion_horas).times(product.costo_hora_mano_obra)
  );

  const unitCost = batchCost.dividedBy(batchUnits)
    .plus(packagingUnitCost)
    .plus(product.costos_fijos_unitarios);
  const unitPrice = getEstimatedUnitPrice(product, unitCost);
  const totalCost = unitCost.times(units);
  const totalRevenue = unitPrice?.times(units) ?? null;
  const unitProfit = unitPrice?.minus(unitCost) ?? null;

  return {
    costoUnitario: unitCost,
    precioUnitario: unitPrice,
    gananciaUnitaria: unitProfit,
    ingresoTotal: totalRevenue,
    costoTotal: totalCost,
    gananciaTotal: totalRevenue?.minus(totalCost) ?? null,
  };
}

function getEstimatedUnitPrice(product: Product, unitCost: Decimal): Decimal | null {
  if (product.precio_venta_sugerido && product.precio_venta_sugerido > 0) {
    return new Decimal(product.precio_venta_sugerido);
  }

  const commission = product.impuestos_comisiones_porcentaje;
  const target = product.porcentaje_objetivo;
  if (commission >= 100 || (product.estrategia_precio === 'margen' && target + commission >= 100)) {
    return null;
  }

  return calculatePriceIncludingCommission(
    unitCost,
    target,
    commission,
    product.estrategia_precio
  );
}

export function getOperationShortages(
  inventory: InventoryItem[],
  entries: ProductionEntry[],
  products: Product[],
  candidate?: ProductionEntry
): SupplyRequirement[] {
  const plannedEntries = entries.filter((entry) => entry.estado === 'planned');
  if (candidate?.estado === 'planned' && !plannedEntries.some((entry) => entry.id === candidate.id)) {
    plannedEntries.push(candidate);
  }

  const totals = new Map<string, SupplyRequirement>();
  for (const entry of plannedEntries) {
    const product = products.find((item) => item.id === entry.product_id);
    if (!product) continue;

    for (const requirement of getSupplyRequirements(product, entry.cantidad)) {
      const key = `${normalizeSupplyName(requirement.nombre)}\u0000${requirement.unidad.toLocaleLowerCase('es-AR')}`;
      const current = totals.get(key);
      if (current) current.cantidad = current.cantidad.plus(requirement.cantidad);
      else totals.set(key, { ...requirement, cantidad: new Decimal(requirement.cantidad) });
    }
  }

  const shortages: SupplyRequirement[] = [];
  for (const [key, required] of totals) {
    const available = inventory
      .filter((item) =>
        `${normalizeSupplyName(item.nombre)}\u0000${item.unidad.toLocaleLowerCase('es-AR')}` === key
      )
      .reduce((sum, item) => sum.plus(item.cantidad), new Decimal(0));
    const missing = required.cantidad.minus(available);
    if (missing.greaterThan(0)) shortages.push({ ...required, cantidad: missing });
  }

  return shortages;
}
