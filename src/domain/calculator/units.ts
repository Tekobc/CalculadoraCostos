const UNIT_BASE_SIZE: Record<string, { family: 'mass' | 'volume' | 'count'; size: number }> = {
  kg: { family: 'mass', size: 1000 },
  g: { family: 'mass', size: 1 },
  gr: { family: 'mass', size: 1 },
  l: { family: 'volume', size: 1000 },
  litro: { family: 'volume', size: 1000 },
  ml: { family: 'volume', size: 1 },
  unidad: { family: 'count', size: 1 },
  unidades: { family: 'count', size: 1 },
};

export const BAKING_UNITS = ['kg', 'g', 'l', 'ml', 'unidad'] as const;

export function getUnitConversionFactor(
  purchaseUnit: string,
  usageUnit: string
): number | null {
  const purchase = UNIT_BASE_SIZE[purchaseUnit.toLowerCase()];
  const usage = UNIT_BASE_SIZE[usageUnit.toLowerCase()];

  if (!purchase || !usage || purchase.family !== usage.family) return null;
  return purchase.size / usage.size;
}

export function getCompatibleUsageUnits(purchaseUnit: string): string[] {
  const purchase = UNIT_BASE_SIZE[purchaseUnit.toLowerCase()];
  if (!purchase) return [purchaseUnit];

  return BAKING_UNITS.filter((unit) => UNIT_BASE_SIZE[unit].family === purchase.family);
}
