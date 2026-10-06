import { describe, it, expect } from 'vitest';
import Decimal from 'decimal.js';
import { calculateKWh, calculateElectricityCost, calculateGasCost } from '../energy';

describe('Energy Calculator', () => {
  it('calculates kWh accurately', () => {
    // Horno 2000W por 1.5 horas = 3 kWh
    const result = calculateKWh(2000, 1.5);
    expect(result.toString()).toBe('3');
  });

  it('calculates electricity cost in ARS', () => {
    // 3 kWh a $150 el kWh = $450
    const result = calculateElectricityCost(2000, 1.5, 150);
    expect(result.toString()).toBe('450');
  });

  it('calculates gas cost accurately', () => {
    // 0.4 m3/h por 2 horas a $85 el m3 = 0.8 * 85 = 68
    const result = calculateGasCost(0.4, 2, 85);
    expect(result.toString()).toBe('68');
  });

  it('throws on negative inputs', () => {
    expect(() => calculateKWh(-100, 2)).toThrow();
    expect(() => calculateElectricityCost(100, -1, 50)).toThrow();
    expect(() => calculateGasCost(0.5, 1, -10)).toThrow();
  });
});
