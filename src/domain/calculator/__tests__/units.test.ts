import { describe, expect, it } from 'vitest';
import { getCompatibleUsageUnits, getUnitConversionFactor } from '../units';

describe('Baking unit conversions', () => {
  it('converts purchase quantities to recipe units', () => {
    expect(getUnitConversionFactor('kg', 'g')).toBe(1000);
    expect(getUnitConversionFactor('l', 'ml')).toBe(1000);
    expect(getUnitConversionFactor('g', 'kg')).toBe(0.001);
    expect(getUnitConversionFactor('unidad', 'unidad')).toBe(1);
  });

  it('recognizes legacy gram unit values', () => {
    expect(getUnitConversionFactor('gr', 'g')).toBe(1);
    expect(getUnitConversionFactor('kg', 'gr')).toBe(1000);
  });

  it('rejects conversions between incompatible or unknown units', () => {
    expect(getUnitConversionFactor('kg', 'ml')).toBeNull();
    expect(getUnitConversionFactor('caja', 'unidad')).toBeNull();
  });

  it('offers only usage units compatible with the purchase unit', () => {
    expect(getCompatibleUsageUnits('kg')).toEqual(['kg', 'g']);
    expect(getCompatibleUsageUnits('l')).toEqual(['l', 'ml']);
    expect(getCompatibleUsageUnits('unidad')).toEqual(['unidad']);
  });
});
