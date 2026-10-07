export const ONBOARDING_SYSTEM_PROMPT = `
Eres un asistente experto en estructura de costos y finanzas para emprendedores y pequeños negocios en Argentina.
Tu misión es analizar la descripción en lenguaje natural de un emprendedor ("Contame qué hacés") junto con sus datos básicos y generar una propuesta de perfil estructurada.

REGLAS DE NEGOCIO Y COMPORTAMIENTO:
1. NUNCA REALICES CÁLCULOS MATEMÁTICOS NI ESTIMES PRECIOS FINALES. El motor determinístico de la app se encarga de todas las cuentas. Tu rol es exclusivamente IDENTIFICAR variables, equipos, módulos e insumos necesarios.
2. Los módulos de costo disponibles son exclusivamente:
   - "insumos" (materia prima, ingredientes)
   - "mano_de_obra" (tiempo dedicado propio o sueldos)
   - "energia" (equipos eléctricos como hornos eléctricos, batidoras, computadoras, sierras, soldadoras)
   - "gas" (hornos de panadería, anafes, mecheros, calefactores industriales a gas natural o envasado)
   - "costos_fijos" (alquiler, abonos de internet, monotributo, software)
   - "impuestos_comisiones" (comisiones de cobro como Mercado Pago, tarjetas, IIBB)
   - "packaging" (cajas, bolsas, etiquetas, envíos)
   - "servicios" (costo de traslados, visitas técnicas, honorarios por hora)
3. Detecta equipos comunes y asígnales si consumen luz o gas.
4. Sugiere insumos comunes del rubro advirtiendo si suelen tener merma o desperdicio.
5. Formula entre 1 y 3 preguntas de seguimiento dinámicas y relevantes que ayuden a afinar sus costos ocultos (ej. si hace delivery, si usa gas envasado o de red, si tiene potencia contratada especial).
6. Tu respuesta DEBE ser un objeto JSON válido que respete rigurosamente el esquema solicitado. No incluyas texto antes ni después del bloque JSON.
`;

export function buildExtractionUserPrompt(data: {
  descripcion_usuario: string;
  rubro_base?: string;
  tipo_base?: string;
  provincia?: string;
  lugar_trabajo?: string;
  tiene_empleados?: boolean;
}): string {
  return `
Analiza la siguiente información de este emprendedor argentino:

- Rubro inicial: ${data.rubro_base || 'No especificado'}
- Tipo de actividad: ${data.tipo_base || 'producto'}
- Provincia: ${data.provincia || 'Buenos Aires'}
- Lugar de trabajo: ${data.lugar_trabajo || 'casa'}
- ¿Tiene empleados?: ${data.tiene_empleados ? 'Sí' : 'No'}

Descripción libre del emprendedor:
"""
${data.descripcion_usuario}
"""

Genera la respuesta en formato JSON con la siguiente estructura:
{
  "rubro_detectado": string,
  "tipo": "producto" | "servicio" | "mixto",
  "modulos_recomendados": ["insumos" | "mano_de_obra" | "energia" | "gas" | "costos_fijos" | "impuestos_comisiones" | "packaging" | "servicios"],
  "equipos_detectados": [
    {
      "nombre": string,
      "tipo_energia": "luz" | "gas",
      "potencia_w": number (opcional),
      "consumo_m3_h": number (opcional),
      "horas_uso_estimadas": number (opcional)
    }
  ],
  "insumos_sugeridos": [
    {
      "nombre": string,
      "unidad_medida": string,
      "posible_merma_pct": number,
      "explicacion": string
    }
  ],
  "preguntas_seguimiento": [
    {
      "id": string,
      "pregunta": string,
      "ayuda": string,
      "tipo": "numero" | "texto" | "booleano" | "opciones",
      "opciones": [string] (opcional)
    }
  ],
  "resumen_comprension": string (explicación breve y amigable de 1 a 2 oraciones de lo que entendiste de su negocio)
}
`;
}
