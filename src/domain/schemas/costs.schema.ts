import { z } from 'zod';

export const CostStatusSchema = z.enum(['confirmado', 'estimado']);
export type CostStatus = z.infer<typeof CostStatusSchema>;

export const SupplyItemSchema = z.object({
  id: z.string().uuid().optional(),
  nombre: z.string().min(1, 'El nombre del insumo es obligatorio'),
  cantidad_compra: z.number().positive('La cantidad de compra debe ser mayor a 0'),
  unidad_compra: z.string().min(1, 'La unidad de compra es obligatoria'), // ej: kg, litro, unidad
  precio_compra: z.number().nonnegative('El precio de compra no puede ser negativo'),
  cantidad_usada: z.number().positive('La cantidad usada debe ser mayor a 0'),
  unidad_uso: z.string().min(1, 'La unidad de uso es obligatoria'), // ej: gr, ml, unidad
  factor_conversion: z.number().positive().default(1), // ej: 1 kg = 1000 gr => factor de escala
  merma_porcentaje: z.number().min(0).max(100).default(0), // % de desperdicio
  fecha_actualizacion: z.string().datetime().optional(),
  status: CostStatusSchema.default('confirmado'),
});

export type SupplyItem = z.infer<typeof SupplyItemSchema>;

export const EnergyUsageSchema = z.object({
  potencia_w: z.number().nonnegative(),
  horas_uso: z.number().nonnegative(),
  tarifa_kwh: z.number().nonnegative(),
});

export type EnergyUsage = z.infer<typeof EnergyUsageSchema>;

export const GasUsageSchema = z.object({
  consumo_m3_h: z.number().nonnegative(),
  horas_uso: z.number().nonnegative(),
  tarifa_m3: z.number().nonnegative(),
});

export type GasUsage = z.infer<typeof GasUsageSchema>;

export const PackagingItemSchema = z.object({
  nombre: z.string().min(1),
  costo_unitario: z.number().nonnegative(),
  cantidad: z.number().positive().default(1),
  status: CostStatusSchema.default('confirmado'),
});

export type PackagingItem = z.infer<typeof PackagingItemSchema>;

export const BatchCalculationInputSchema = z.object({
  unidades_producidas: z.number().positive('Las unidades producidas deben ser mayor a 0'),
  insumos: z.array(SupplyItemSchema).default([]),
  consumo_energia: z.array(EnergyUsageSchema).default([]),
  consumo_gas: z.array(GasUsageSchema).default([]),
  packaging: z.array(PackagingItemSchema).default([]),
  mano_de_obra_horas: z.number().nonnegative().default(0),
  costo_hora_mano_obra: z.number().nonnegative().default(0),
  costos_fijos_mensuales_asignados: z.number().nonnegative().default(0),
  unidades_mensuales_estimadas: z.number().positive().default(1),
  impuestos_comisiones_porcentaje: z.number().min(0).max(100).default(0),
});

export type BatchCalculationInput = z.infer<typeof BatchCalculationInputSchema>;

export const PricingModeSchema = z.enum(['markup', 'margen']);
export type PricingMode = z.infer<typeof PricingModeSchema>;
