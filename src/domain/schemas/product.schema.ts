import { z } from 'zod';
import {
  SupplyItemSchema,
  PackagingItemSchema,
  EnergyUsageSchema,
  GasUsageSchema,
  PricingModeSchema,
  PrintingCostSchema,
} from './costs.schema';

export const ProductTypeSchema = z.enum(['producto', 'servicio']);
export type ProductType = z.infer<typeof ProductTypeSchema>;

export const ProductSchema = z.object({
  id: z.string().uuid().optional(),
  nombre: z.string().min(1, 'El nombre del producto es obligatorio'),
  descripcion: z.string().optional(),
  tipo: ProductTypeSchema.default('producto'),
  categoria: z.string().optional(),
  
  // Parámetros de lote y producción
  unidades_lote_base: z.number().positive('Las unidades del lote deben ser mayor a 0').default(1),
  
  // Componentes de costo directo
  insumos: z.array(SupplyItemSchema).default([]),
  packaging: z.array(PackagingItemSchema).default([]),
  consumo_energia: z.array(EnergyUsageSchema).default([]),
  consumo_gas: z.array(GasUsageSchema).default([]),
  impresion: PrintingCostSchema.nullable().optional(),
  
  // Mano de obra
  tiempo_produccion_horas: z.number().nonnegative().default(0),
  costo_hora_mano_obra: z.number().nonnegative().default(0),
  costos_fijos_unitarios: z.number().nonnegative().default(0),
  impuestos_comisiones_porcentaje: z.number().min(0).max(99.9).default(0),
  
  // Parámetros de precio y rentabilidad
  estrategia_precio: PricingModeSchema.default('margen'),
  porcentaje_objetivo: z.number().nonnegative().max(99.9, 'El margen no puede ser 100% o superior').default(30),
  precio_venta_sugerido: z.number().nonnegative().optional(),
  
  // Metadatos
  fecha_creacion: z.string().datetime().optional(),
  fecha_actualizacion: z.string().datetime().optional(),
});

export type Product = z.infer<typeof ProductSchema>;
