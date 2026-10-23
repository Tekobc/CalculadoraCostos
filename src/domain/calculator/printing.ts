import Decimal from 'decimal.js';
import { PrintingCost } from '../schemas/costs.schema';

export function calculatePrintedSheets(
  units: number | Decimal,
  unitsPerSheet: number
): Decimal {
  const quantity = new Decimal(units);
  const yieldPerSheet = new Decimal(unitsPerSheet);
  if (!quantity.isFinite() || quantity.lessThanOrEqualTo(0)) {
    throw new Error('La cantidad a imprimir debe ser mayor a cero.');
  }
  if (!yieldPerSheet.isFinite() || !yieldPerSheet.isInteger() || yieldPerSheet.lessThanOrEqualTo(0)) {
    throw new Error('Las piezas por hoja deben ser un entero mayor a cero.');
  }
  return quantity.dividedBy(yieldPerSheet).ceil();
}

export function calculatePrintingCost(
  printing: PrintingCost | null | undefined,
  units: number | Decimal
): Decimal {
  if (!printing) return new Decimal(0);
  return calculatePrintedSheets(units, printing.unidades_por_hoja)
    .times(printing.costo_por_hoja);
}

export function calculatePrintingUnitCost(
  printing: PrintingCost | null | undefined
): Decimal {
  if (!printing) return new Decimal(0);
  return new Decimal(printing.costo_por_hoja)
    .dividedBy(new Decimal(printing.unidades_por_hoja));
}
