import Decimal from 'decimal.js';

/**
 * Calcula el costo de un insumo considerando compra, uso y merma de desperdicio.
 * Fórmula:
 *   costo_base = (precio_compra / cantidad_compra) * (cantidad_usada / factor_conversion)
 *   costo_con_merma = costo_base / (1 - merma_porcentaje / 100)
 */
export function calculateSupplyItemCost(
  precioCompra: number | Decimal,
  cantidadCompra: number | Decimal,
  cantidadUsada: number | Decimal,
  factorConversion: number | Decimal = 1,
  mermaPorcentaje: number | Decimal = 0
): Decimal {
  const precio = new Decimal(precioCompra);
  const cantCompra = new Decimal(cantidadCompra);
  const cantUso = new Decimal(cantidadUsada);
  const factor = new Decimal(factorConversion);
  const merma = new Decimal(mermaPorcentaje);

  if (cantCompra.isZero() || cantCompra.isNegative()) {
    throw new Error('La cantidad de compra debe ser estrictamente mayor a 0');
  }
  if (factor.isZero() || factor.isNegative()) {
    throw new Error('El factor de conversión debe ser estrictamente mayor a 0');
  }
  if (precio.isNegative() || cantUso.isNegative()) {
    throw new Error('El precio y la cantidad usada no pueden ser negativos');
  }
  if (merma.greaterThanOrEqualTo(100)) {
    throw new Error('La merma no puede ser 100% o superior');
  }
  if (merma.isNegative()) {
    throw new Error('La merma no puede ser negativa');
  }

  // Costo por unidad de compra
  const precioUnitarioCompra = precio.dividedBy(cantCompra);
  // Cantidad normalizada a la unidad de compra
  const cantidadEnUnidadCompra = cantUso.dividedBy(factor);
  const costoBase = precioUnitarioCompra.times(cantidadEnUnidadCompra);

  if (merma.isZero()) {
    return costoBase;
  }

  // Ajuste por merma: si se desperdicia 10%, necesitás costoBase / 0.90
  const factorAprovechamiento = new Decimal(1).minus(merma.dividedBy(100));
  return costoBase.dividedBy(factorAprovechamiento);
}
