import { describe, it, expect } from 'vitest';
import { generateDeterministicProfile } from '../fallback';
import { LLMProfileExtractionSchema } from '../schemas';

describe('LLM Extraction Fallback & Schema Validation', () => {
  it('extracts gastronomy profile and detects gas ovens and baking supplies', () => {
    const input = {
      descripcion_usuario: 'Hago tortas artesanales y alfajores. Uso horno a gas y batidora eléctrica. Envío en cajas.',
      rubro_base: 'Pastelería',
      provincia: 'Buenos Aires',
      lugar_trabajo: 'casa' as const,
      tiene_empleados: false,
    };

    const result = generateDeterministicProfile(input);

    // Validación estricta con el esquema Zod
    const validated = LLMProfileExtractionSchema.safeParse(result);
    expect(validated.success).toBe(true);

    // Módulos esenciales activados
    expect(result.modulos_recomendados).toContain('insumos');
    expect(result.modulos_recomendados).toContain('gas');
    expect(result.modulos_recomendados).toContain('energia');
    expect(result.modulos_recomendados).toContain('packaging');

    // Equipos detectados
    const tieneHornoGas = result.equipos_detectados.some((e) => e.nombre.includes('Horno') && e.tipo_energia === 'gas');
    expect(tieneHornoGas).toBe(true);

    const tieneBatidora = result.equipos_detectados.some((e) => e.tipo_energia === 'luz');
    expect(tieneBatidora).toBe(true);

    // Pregunta de seguimiento sobre tipo de gas
    expect(result.preguntas_seguimiento.length).toBeGreaterThan(0);
    expect(result.preguntas_seguimiento[0].id).toBe('pregunta-gas-red');
  });

  it('correctly categorizes services and does not activate physical supplies by default', () => {
    const input = {
      descripcion_usuario: 'Brindo consultoría y diseño gráfico freelance para marcas en computadora.',
      rubro_base: 'Diseño',
      provincia: 'Córdoba',
      lugar_trabajo: 'casa' as const,
      tiene_empleados: false,
    };

    const result = generateDeterministicProfile(input);
    const validated = LLMProfileExtractionSchema.safeParse(result);
    expect(validated.success).toBe(true);

    expect(result.tipo).toBe('servicio');
    expect(result.modulos_recomendados).toContain('servicios');
    expect(result.modulos_recomendados).toContain('energia');
    expect(result.modulos_recomendados).not.toContain('gas');
  });

  it('recommends sheet printing costs for a sticker and calendar business', () => {
    const result = generateDeterministicProfile({
      descripcion_usuario: 'Imprimo stickers y almanaques en hojas A4 autoadhesivas.',
      rubro_base: 'Imprenta gráfica',
      provincia: 'Buenos Aires',
      lugar_trabajo: 'local_alquilado',
      tiene_empleados: true,
    });

    expect(result.modulos_recomendados).toContain('impresion');
    expect(LLMProfileExtractionSchema.safeParse(result).success).toBe(true);
  });
});
