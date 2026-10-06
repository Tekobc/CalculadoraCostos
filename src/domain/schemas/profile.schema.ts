import { z } from 'zod';

export const ModuleTypeSchema = z.enum([
  'insumos',
  'mano_de_obra',
  'energia',
  'gas',
  'costos_fijos',
  'impuestos_comisiones',
  'packaging',
  'servicios',
]);

export type ModuleType = z.infer<typeof ModuleTypeSchema>;

export const EquipmentSchema = z.object({
  id: z.string().uuid().optional(),
  nombre: z.string().min(1, 'El nombre del equipo es obligatorio'),
  tipo_energia: z.enum(['luz', 'gas']),
  potencia_w: z.number().nonnegative().optional(),
  consumo_m3_h: z.number().nonnegative().optional(),
});

export type Equipment = z.infer<typeof EquipmentSchema>;

export const BusinessProfileSchema = z.object({
  id: z.string().uuid().optional(),
  rubro: z.string().min(1, 'El rubro es obligatorio'),
  tipo: z.enum(['producto', 'servicio', 'mixto']),
  moneda: z.string().default('ARS'),
  provincia: z.string().min(1, 'La provincia es obligatoria'),
  tiene_empleados: z.boolean(),
  lugar_trabajo: z.enum(['casa', 'local_propio', 'local_alquilado', 'taller_compartido']),
  modulos_activos: z.array(ModuleTypeSchema).min(1, 'Debe activar al menos un módulo de costo'),
  equipos: z.array(EquipmentSchema).default([]),
  origen: z.enum(['cuestionario_fijo', 'llm_confirmado_por_usuario']).default('cuestionario_fijo'),
});

export type BusinessProfile = z.infer<typeof BusinessProfileSchema>;
