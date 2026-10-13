import { z } from 'zod';
import { ModuleTypeSchema, EquipmentSchema } from '../../domain/schemas/profile.schema';

/**
 * Esquema de respuesta estructurada esperada del LLM para el perfil de negocio.
 */
export const LLMProfileExtractionSchema = z.object({
  rubro_detectado: z.string().min(1),
  tipo: z.enum(['producto', 'servicio', 'mixto']),
  modulos_recomendados: z.array(ModuleTypeSchema).min(1),
  equipos_detectados: z.array(
    z.object({
      nombre: z.string().min(1),
      tipo_energia: z.enum(['luz', 'gas']),
      potencia_w: z.number().nonnegative().optional(),
      consumo_m3_h: z.number().nonnegative().optional(),
      horas_uso_estimadas: z.number().nonnegative().optional(),
    })
  ).default([]),
  insumos_sugeridos: z.array(
    z.object({
      nombre: z.string().min(1),
      unidad_medida: z.string().min(1),
      posible_merma_pct: z.number().min(0).max(100).default(0),
      explicacion: z.string().optional(),
    })
  ).default([]),
  preguntas_seguimiento: z.array(
    z.object({
      id: z.string(),
      pregunta: z.string(),
      ayuda: z.string().optional(),
      tipo: z.enum(['numero', 'texto', 'booleano', 'opciones']),
      opciones: z.array(z.string()).optional(),
    })
  ).default([]),
  resumen_comprension: z.string().min(1),
});

export type LLMProfileExtraction = z.infer<typeof LLMProfileExtractionSchema>;

export const LLMExtractionRequestSchema = z.object({
  descripcion_usuario: z.string().trim().min(5, 'La descripción debe tener al menos 5 caracteres').max(3000),
  rubro_base: z.string().optional(),
  tipo_base: z.enum(['producto', 'servicio', 'mixto']).optional(),
  provincia: z.string().optional(),
  lugar_trabajo: z.enum(['casa', 'local_propio', 'local_alquilado', 'taller_compartido']).optional(),
  tiene_empleados: z.boolean().optional(),
});

export type LLMExtractionRequest = z.infer<typeof LLMExtractionRequestSchema>;
