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
  horas_uso_estimadas: z.number().nonnegative().optional(),
  status: z.enum(['estimado', 'confirmado']).default('estimado'),
});

export type Equipment = z.infer<typeof EquipmentSchema>;

export const SuggestedSupplySchema = z.object({
  nombre: z.string().min(1),
  unidad_medida: z.string().min(1),
  posible_merma_pct: z.number().min(0).max(100).default(0),
  explicacion: z.string().optional(),
  status: z.enum(['estimado', 'confirmado']).default('estimado'),
});

export const FollowUpQuestionSchema = z.object({
  id: z.string(),
  pregunta: z.string(),
  ayuda: z.string().optional(),
  tipo: z.enum(['numero', 'texto', 'booleano', 'opciones']),
  opciones: z.array(z.string()).optional(),
});

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
  descripcion_negocio: z.string().optional(),
  preguntas_seguimiento: z.array(FollowUpQuestionSchema).default([]),
  respuestas_seguimiento: z.record(z.string()).default({}),
  insumos_sugeridos: z.array(SuggestedSupplySchema).default([]),
  resumen_analisis: z.string().optional(),
  fuente_analisis: z.enum(['llm_api', 'fallback_heuristico']).default('fallback_heuristico'),
  proveedor_analisis: z.enum(['gemini', 'groq', 'anthropic', 'fallback']).default('fallback'),
  origen: z.enum([
    'cuestionario_fijo',
    'llm_confirmado_por_usuario',
    'fallback_confirmado_por_usuario',
  ]).default('cuestionario_fijo'),
});

export type BusinessProfile = z.infer<typeof BusinessProfileSchema>;
