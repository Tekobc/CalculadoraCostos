import Decimal from 'decimal.js';

/**
 * Cálculo de precio por markup:
 *   precio = costo * (1 + markup_porcentaje / 100)
 */
export function calculatePriceFromMarkup(
  costo: number | Decimal,
  markupPorcentaje: number | Decimal
): Decimal {
  const c = new Decimal(costo);
  const m = new Decimal(markupPorcentaje);

  if (c.isNegative()) {
    throw new Error('El costo no puede ser negativo');
  }
  if (m.isNegative()) {
    throw new Error('El markup no puede ser negativo');
  }

  const factor = new Decimal(1).plus(m.dividedBy(100));
  return c.times(factor);
}

/**
 * Cálculo de precio por margen de ganancia:
 *   precio = costo / (1 - margen_porcentaje / 100)
 */
export function calculatePriceFromMargin(
  costo: number | Decimal,
  margenPorcentaje: number | Decimal
): Decimal {
  const c = new Decimal(costo);
  const m = new Decimal(margenPorcentaje);

  if (c.isNegative()) {
    throw new Error('El costo no puede ser negativo');
  }
  if (m.isNegative()) {
    throw new Error('El margen no puede ser negativo');
  }
  if (m.greaterThanOrEqualTo(100)) {
    throw new Error('El margen debe ser estrictamente menor al 100%');
  }

  const factor = new Decimal(1).minus(m.dividedBy(100));
  return c.dividedBy(factor);
}

/**
 * Margen porcentual a partir de costo y precio:
 *   margen = ((precio - costo) / precio) * 100
 */
export function calculateMarginPercentage(
  costo: number | Decimal,
  precio: number | Decimal
): Decimal {
  const c = new Decimal(costo);
  const p = new Decimal(precio);

  if (p.isZero() || p.isNegative()) {
    throw new Error('El precio debe ser estrictamente mayor a 0 para calcular margen');
  }

  return p.minus(c).dividedBy(p).times(100);
}

/**
 * Markup porcentual a partir de costo y precio:
 *   markup = ((precio - costo) / costo) * 100
 */
export function calculateMarkupPercentage(
  costo: number | Decimal,
  precio: number | Decimal
): Decimal {
  const c = new Decimal(costo);
  const p = new Decimal(precio);

  if (c.isZero() || c.isNegative()) {
    throw new Error('El costo debe ser estrictamente mayor a 0 para calcular markup');
  }

  return p.minus(c).dividedBy(c).times(100);
}

/**
 * Punto de equilibrio en unidades:
 *   unidades = costos_fijos / (precio_unitario - costo_variable_unitario)
 */
export function calculateBreakevenUnits(
  costosFijosTotales: number | Decimal,
  precioUnitario: number | Decimal,
  costoVariableUnitario: number | Decimal
): Decimal {
  const fijos = new Decimal(costosFijosTotales);
  const precio = new Decimal(precioUnitario);
  const varUnit = new Decimal(costoVariableUnitario);

  if (fijos.isNegative() || precio.isNegative() || varUnit.isNegative()) {
    throw new Error('Ningún valor de punto de equilibrio puede ser negativo');
  }

  const margenContribucion = precio.minus(varUnit);
  if (margenContribucion.lessThanOrEqualTo(0)) {
    throw new Error('El precio unitario debe superar al costo variable unitario para cubrir costos fijos');
  }

  return fijos.dividedBy(margenContribucion);
}
