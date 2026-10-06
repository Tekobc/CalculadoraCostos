import Decimal from 'decimal.js';
import { BatchCalculationInput } from '../schemas/costs.schema';
import { calculateSupplyItemCost } from './supplies';
import { calculateElectricityCost, calculateGasCost } from './energy';

export interface BatchCalculationResult {
  costoInsumosTotal: Decimal;
  costoEnergiaTotal: Decimal;
  costoGasTotal: Decimal;
  costoPackagingTotal: Decimal;
  costoManoDeObraTotal: Decimal;
  costoVariableLoteTotal: Decimal;
  costoVariableUnitario: Decimal;
  costoFijoProrrateadoUnitario: Decimal;
  costoUnitarioFinal: Decimal;
}

export function calculateBatchCosts(input: BatchCalculationInput): BatchCalculationResult {
  const unidades = new Decimal(input.unidades_producidas);
  if (unidades.lessThanOrEqualTo(0)) {
    throw new Error('Las unidades producidas del lote deben ser mayores a 0');
  }

  // 1. Insumos
  let costoInsumosTotal = new Decimal(0);
  for (const item of input.insumos) {
    const itemCost = calculateSupplyItemCost(
      item.precio_compra,
      item.cantidad_compra,
      item.cantidad_usada,
      item.factor_conversion,
      item.merma_porcentaje
    );
    costoInsumosTotal = costoInsumosTotal.plus(itemCost);
  }

  // 2. Energía eléctrica
  let costoEnergiaTotal = new Decimal(0);
  for (const e of input.consumo_energia) {
    const eCost = calculateElectricityCost(e.potencia_w, e.horas_uso, e.tarifa_kwh);
    costoEnergiaTotal = costoEnergiaTotal.plus(eCost);
  }

  // 3. Gas
  let costoGasTotal = new Decimal(0);
  for (const g of input.consumo_gas) {
    const gCost = calculateGasCost(g.consumo_m3_h, g.horas_uso, g.tarifa_m3);
    costoGasTotal = costoGasTotal.plus(gCost);
  }

  // 4. Packaging
  let costoPackagingTotal = new Decimal(0);
  for (const p of input.packaging) {
    const pCost = new Decimal(p.costo_unitario).times(p.cantidad);
    costoPackagingTotal = costoPackagingTotal.plus(pCost);
  }

  // 5. Mano de obra directa del lote
  const horasMo = new Decimal(input.mano_de_obra_horas);
  const tarifaMo = new Decimal(input.costo_hora_mano_obra);
  const costoManoDeObraTotal = horasMo.times(tarifaMo);

  // 6. Costo variable del lote
  const costoVariableLoteTotal = costoInsumosTotal
    .plus(costoEnergiaTotal)
    .plus(costoGasTotal)
    .plus(costoPackagingTotal)
    .plus(costoManoDeObraTotal);

  const costoVariableUnitario = costoVariableLoteTotal.dividedBy(unidades);

  // 7. Costo fijo prorrateado
  const fijosMensuales = new Decimal(input.costos_fijos_mensuales_asignados);
  const unidadesMes = new Decimal(input.unidades_mensuales_estimadas);
  if (unidadesMes.lessThanOrEqualTo(0)) {
    throw new Error('Las unidades mensuales estimadas para prorrateo deben ser mayores a 0');
  }
  const costoFijoProrrateadoUnitario = fijosMensuales.dividedBy(unidadesMes);

  // 8. Costo unitario final
  const costoUnitarioFinal = costoVariableUnitario.plus(costoFijoProrrateadoUnitario);

  return {
    costoInsumosTotal,
    costoEnergiaTotal,
    costoGasTotal,
    costoPackagingTotal,
    costoManoDeObraTotal,
    costoVariableLoteTotal,
    costoVariableUnitario,
    costoFijoProrrateadoUnitario,
    costoUnitarioFinal,
  };
}
