import { describe, expect, it } from 'vitest';
import {
  calculatePrintedSheets,
  calculatePrintingCost,
  calculatePrintingUnitCost,
} from '../printing';
import { PrintingCost } from '../../schemas/costs.schema';

const printing: PrintingCost = {
  nombre_hoja: 'A4 autoadhesiva',
  costo_por_hoja: 1200,
  unidades_por_hoja: 24,
};

describe('printing cost calculator', () => {
  it('rounds up to whole printed sheets', () => {
    expect(calculatePrintedSheets(48, 24).toNumber()).toBe(2);
    expect(calculatePrintedSheets(49, 24).toNumber()).toBe(3);
  });

  it('calculates sheet costs for a batch and a single unit', () => {
    expect(calculatePrintingCost(printing, 49).toNumber()).toBe(3600);
    expect(calculatePrintingCost(printing, 1).toNumber()).toBe(1200);
    expect(calculatePrintingUnitCost(printing).toNumber()).toBe(50);
  });

  it('returns zero when the product has no printing cost', () => {
    expect(calculatePrintingCost(null, 10).toNumber()).toBe(0);
  });

  it('rejects invalid quantities and yields', () => {
    expect(() => calculatePrintedSheets(0, 24)).toThrow('La cantidad a imprimir debe ser mayor a cero.');
    expect(() => calculatePrintedSheets(10, 0)).toThrow('Las piezas por hoja deben ser un entero mayor a cero.');
    expect(() => calculatePrintedSheets(10, 1.5)).toThrow('Las piezas por hoja deben ser un entero mayor a cero.');
  });
});
