import { describe, it, expect } from 'vitest';
import { calculateSupplyItemCost } from '../supplies';

describe('Supplies Calculator', () => {
  it('calculates proportional ingredient cost without waste', () => {
    // 1 kg harina (1000 gr) cuesta $1200. Usamos 250 gr.
    // Costo = (1200 / 1) * (250 / 1000) = 1200 * 0.25 = 300
    const cost = calculateSupplyItemCost(1200, 1, 250, 1000, 0);
    expect(cost.toString()).toBe('300');
  });

  it('calculates cost with scrap/waste percentage', () => {
    // Si la merma es 20%, el costo base se divide por (1 - 0.20) = 0.8
    // Costo base = $300 => 300 / 0.8 = 375
    const cost = calculateSupplyItemCost(1200, 1, 250, 1000, 20);
    expect(cost.toString()).toBe('375');
  });

  it('throws when purchase quantity is zero or negative', () => {
    expect(() => calculateSupplyItemCost(100, 0, 50, 1, 0)).toThrow();
    expect(() => calculateSupplyItemCost(100, -1, 50, 1, 0)).toThrow();
  });

  it('throws when scrap is 100% or more', () => {
    expect(() => calculateSupplyItemCost(100, 1, 1, 1, 100)).toThrow();
    expect(() => calculateSupplyItemCost(100, 1, 1, 1, 105)).toThrow();
  });
});
