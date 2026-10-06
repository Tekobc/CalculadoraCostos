import { describe, it, expect } from 'vitest';
import { calculateBatchCosts } from '../unit-cost';
import { BatchCalculationInput } from '../../schemas/costs.schema';

describe('Batch Unit-Cost Calculator', () => {
  it('correctly aggregates supplies, utilities, labor, and overhead into unit cost', () => {
    const input: BatchCalculationInput = {
      unidades_producidas: 10, // Lote de 10 unidades
      insumos: [
        {
          nombre: 'Harina',
          cantidad_compra: 1, // 1 kg
          unidad_compra: 'kg',
          precio_compra: 1000,
          cantidad_usada: 500, // 500 gr
          unidad_uso: 'gr',
          factor_conversion: 1000,
          merma_porcentaje: 0,
          status: 'confirmado',
        },
      ],
      consumo_energia: [
        {
          potencia_w: 2000, // 2 kW
          horas_uso: 1, // 1 h => 2 kWh
          tarifa_kwh: 100, // $200
        },
      ],
      consumo_gas: [],
      packaging: [
        {
          nombre: 'Caja',
          costo_unitario: 50,
          cantidad: 10, // $500 total
          status: 'confirmado',
        },
      ],
      mano_de_obra_horas: 2,
      costo_hora_mano_obra: 1500, // $3000 total
      costos_fijos_mensuales_asignados: 10000,
      unidades_mensuales_estimadas: 100, // Prorrateo: 10000 / 100 = $100 por unidad
      impuestos_comisiones_porcentaje: 0,
    };

    const result = calculateBatchCosts(input);

    // Insumos: 500 (harina)
    expect(result.costoInsumosTotal.toString()).toBe('500');
    // Energía: 200
    expect(result.costoEnergiaTotal.toString()).toBe('200');
    // Packaging: 500
    expect(result.costoPackagingTotal.toString()).toBe('500');
    // Mano de obra: 3000
    expect(result.costoManoDeObraTotal.toString()).toBe('3000');

    // Costo variable lote: 500 + 200 + 500 + 3000 = 4200
    expect(result.costoVariableLoteTotal.toString()).toBe('4200');

    // Costo variable unitario: 4200 / 10 = 420
    expect(result.costoVariableUnitario.toString()).toBe('420');

    // Fijos prorrateados unitarios: 10000 / 100 = 100
    expect(result.costoFijoProrrateadoUnitario.toString()).toBe('100');

    // Costo unitario final: 420 + 100 = 520
    expect(result.costoUnitarioFinal.toString()).toBe('520');
  });
});
