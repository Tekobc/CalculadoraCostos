import { describe, it, expect } from 'vitest';
import {
  calculatePriceFromMarkup,
  calculatePriceFromMargin,
  calculatePriceIncludingCommission,
  calculateMarginPercentage,
  calculateMarkupPercentage,
  calculateBreakevenUnits,
} from '../pricing';

describe('Pricing & Margin vs Markup Calculator', () => {
  it('distinguishes between 50% markup and 50% margin', () => {
    const costo = 1000;

    // Markup 50%: Costo * 1.5 = 1500
    const precioMarkup = calculatePriceFromMarkup(costo, 50);
    expect(precioMarkup.toString()).toBe('1500');

    // Margen 50%: Costo / (1 - 0.5) = 2000
    const precioMargen = calculatePriceFromMargin(costo, 50);
    expect(precioMargen.toString()).toBe('2000');
  });

  it('calculates reciprocal margin and markup percentages', () => {
    const costo = 1000;
    const precio = 1500;

    // Markup: (1500 - 1000) / 1000 = 50%
    const markup = calculateMarkupPercentage(costo, precio);
    expect(markup.toString()).toBe('50');

    // Margen: (1500 - 1000) / 1500 = 33.333333333333333333%
    const margin = calculateMarginPercentage(costo, precio);
    expect(margin.toFixed(2)).toBe('33.33');
  });

  it('throws on impossible margins', () => {
    expect(() => calculatePriceFromMargin(100, 100)).toThrow();
    expect(() => calculatePriceFromMargin(100, 105)).toThrow();
  });

  it('includes fixed per-unit costs and sales commission in the suggested price', () => {
    const marginPrice = calculatePriceIncludingCommission(1200, 30, 5, 'margen');
    expect(marginPrice.toFixed(2)).toBe('1846.15');

    const markupPrice = calculatePriceIncludingCommission(1200, 30, 5, 'markup');
    expect(markupPrice.toFixed(2)).toBe('1642.11');
  });

  it('rejects a margin and commission that consume the full sale price', () => {
    expect(() => calculatePriceIncludingCommission(100, 95, 5, 'margen')).toThrow();
    expect(() => calculatePriceIncludingCommission(100, 30, 100, 'markup')).toThrow();
  });

  it('calculates breakeven point in units', () => {
    // Costos fijos = $100.000, Precio = $5.000, Costo variable unitario = $3.000
    // Margen contribución = $2.000
    // Unidades para punto de equilibrio = 100.000 / 2.000 = 50 unidades
    const unidades = calculateBreakevenUnits(100000, 5000, 3000);
    expect(unidades.toString()).toBe('50');
  });

  it('throws on negative margin of contribution in breakeven', () => {
    // Si precio <= costo variable, nunca cubre costos fijos
    expect(() => calculateBreakevenUnits(100000, 2000, 3000)).toThrow();
    expect(() => calculateBreakevenUnits(100000, 3000, 3000)).toThrow();
  });
});
