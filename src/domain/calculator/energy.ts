import Decimal from 'decimal.js';

export function calculateKWh(potenciaWatts: number | Decimal, horas: number | Decimal): Decimal {
  const watts = new Decimal(potenciaWatts);
  const h = new Decimal(horas);
  if (watts.isNegative() || h.isNegative()) {
    throw new Error('La potencia y las horas no pueden ser negativas');
  }
  return watts.dividedBy(1000).times(h);
}

export function calculateElectricityCost(
  potenciaWatts: number | Decimal,
  horas: number | Decimal,
  tarifaKWh: number | Decimal
): Decimal {
  const kwh = calculateKWh(potenciaWatts, horas);
  const tarifa = new Decimal(tarifaKWh);
  if (tarifa.isNegative()) {
    throw new Error('La tarifa eléctrica no puede ser negativa');
  }
  return kwh.times(tarifa);
}

export function calculateGasCost(
  consumoM3H: number | Decimal,
  horas: number | Decimal,
  tarifaM3: number | Decimal
): Decimal {
  const m3h = new Decimal(consumoM3H);
  const h = new Decimal(horas);
  const tarifa = new Decimal(tarifaM3);

  if (m3h.isNegative() || h.isNegative() || tarifa.isNegative()) {
    throw new Error('El consumo de gas, las horas y la tarifa no pueden ser negativos');
  }

  return m3h.times(h).times(tarifa);
}
