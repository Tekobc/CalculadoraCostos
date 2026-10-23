import { LLMExtractionRequest, LLMProfileExtraction } from './schemas';
import { ModuleType } from '../../domain/schemas/profile.schema';

/**
 * Fallback determinístico cuando no hay API key configurada o falla la conexión.
 * Aplica reglas heurísticas de detección por palabras clave de Argentina.
 */
export function generateDeterministicProfile(data: LLMExtractionRequest): LLMProfileExtraction {
  const text = (data.descripcion_usuario || '').toLowerCase();
  const rubroInput = (data.rubro_base || '').toLowerCase();

  const modulos = new Set<ModuleType>(['mano_de_obra']);
  const equipos: LLMProfileExtraction['equipos_detectados'] = [];
  const insumos: LLMProfileExtraction['insumos_sugeridos'] = [];
  const preguntas: LLMProfileExtraction['preguntas_seguimiento'] = [];
  const businessDescription = `${rubroInput} ${text}`
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  // Determinación de tipo (producto vs servicio)
  let tipo: 'producto' | 'servicio' | 'mixto' = data.tipo_base || 'producto';
  if (
    text.includes('servicio') ||
    text.includes('asesor') ||
    text.includes('consultor') ||
    text.includes('diseño gráfico') ||
    text.includes('clases') ||
    text.includes('reparación')
  ) {
    if (text.includes('vendo') || text.includes('producto')) {
      tipo = 'mixto';
    } else {
      tipo = 'servicio';
    }
  }

  if (tipo === 'producto' || tipo === 'mixto') {
    modulos.add('insumos');
    modulos.add('packaging');
  } else {
    modulos.add('servicios');
  }

  const isPrintingBusiness = [
    'imprenta',
    'impresion',
    'impresora',
    'sticker',
    'calcomania',
    'calendario',
    'almanaque',
    'grafica',
    'vinilo',
  ].some((keyword) => businessDescription.includes(keyword));
  if (isPrintingBusiness) {
    modulos.add('impresion');
  }

  // Detección de equipos y energía
  if (text.includes('horno') || text.includes('cocina') || text.includes('anaf') || text.includes('pan')) {
    if (text.includes('electrico') || text.includes('eléctrico')) {
      modulos.add('energia');
      equipos.push({
        nombre: 'Horno eléctrico',
        tipo_energia: 'luz',
        potencia_w: 2200,
        horas_uso_estimadas: 2,
      });
    } else {
      modulos.add('gas');
      equipos.push({
        nombre: 'Horno a gas',
        tipo_energia: 'gas',
        consumo_m3_h: 0.45,
        horas_uso_estimadas: 2,
      });
    }
  }

  if (text.includes('batidora') || text.includes('amasadora') || text.includes('licuadora')) {
    modulos.add('energia');
    equipos.push({
      nombre: 'Batidora / Amasadora eléctrica',
      tipo_energia: 'luz',
      potencia_w: 500,
      horas_uso_estimadas: 1,
    });
  }

  if (text.includes('maquina de coser') || text.includes('máquina de coser') || text.includes('overlock')) {
    modulos.add('energia');
    equipos.push({
      nombre: 'Máquina de coser',
      tipo_energia: 'luz',
      potencia_w: 150,
      horas_uso_estimadas: 3,
    });
  }

  if (text.includes('computadora') || text.includes('notebook') || text.includes('pc') || text.includes('diseño')) {
    modulos.add('energia');
    equipos.push({
      nombre: 'Computadora de trabajo',
      tipo_energia: 'luz',
      potencia_w: 200,
      horas_uso_estimadas: 6,
    });
  }

  // Costos fijos y comisiones
  if (data.lugar_trabajo === 'local_alquilado' || text.includes('alquiler') || text.includes('taller')) {
    modulos.add('costos_fijos');
  }
  if (text.includes('tarjeta') || text.includes('mercado pago') || text.includes('envio') || text.includes('factur')) {
    modulos.add('impuestos_comisiones');
  }

  // Sugerencias de insumos según palabras clave
  if (text.includes('torta') || text.includes('pasteler') || text.includes('dulce') || text.includes('pan') || rubroInput.includes('gastro')) {
    insumos.push(
      { nombre: 'Harina común / leudante', unidad_medida: 'kg', posible_merma_pct: 2, explicacion: 'Harina para la preparación' },
      { nombre: 'Manteca / Grasa', unidad_medida: 'gr', posible_merma_pct: 3, explicacion: 'Materia grasa base' },
      { nombre: 'Azúcar común', unidad_medida: 'kg', posible_merma_pct: 1, explicacion: 'Endulzante' }
    );
    preguntas.push({
      id: 'pregunta-gas-red',
      pregunta: '¿Usás gas natural de red o garrafa / tubo envasado?',
      ayuda: 'El costo por m³ o kg envasado difiere sustancialmente en Argentina.',
      tipo: 'opciones',
      opciones: ['Gas Natural de Red', 'Garrafa / Gas Envasado'],
    });
  } else if (text.includes('vela') || text.includes('cera') || text.includes('aroma')) {
    insumos.push(
      { nombre: 'Cera de soja', unidad_medida: 'kg', posible_merma_pct: 5, explicacion: 'Cera base con desperdicio por fundición' },
      { nombre: 'Esencia aromática', unidad_medida: 'ml', posible_merma_pct: 2, explicacion: 'Aceite aromatizante concentrado' },
      { nombre: 'Pabilos y ojalillos', unidad_medida: 'unidad', posible_merma_pct: 0, explicacion: 'Mechas para encendido' }
    );
  } else if (!isPrintingBusiness) {
    insumos.push(
      { nombre: 'Insumo principal', unidad_medida: 'unidad', posible_merma_pct: 0, explicacion: 'Materia prima esencial del producto' }
    );
  }

  // Pregunta dinámica de delivery
  if (text.includes('delivery') || text.includes('envio') || text.includes('envíos')) {
    preguntas.push({
      id: 'pregunta-logistica',
      pregunta: '¿Cómo realizás los envíos a tus clientes?',
      ayuda: 'Permite saber si tenés costos de cadetería fijos o se cobran aparte.',
      tipo: 'opciones',
      opciones: ['Cadete / Moto particular', 'Correo / Plataforma de encomiendas', 'Retiro en punto de entrega'],
    });
  }

  return {
    rubro_detectado: data.rubro_base || 'Emprendimiento de producción artesanal',
    tipo,
    modulos_recomendados: Array.from(modulos),
    equipos_detectados: equipos,
    insumos_sugeridos: insumos,
    preguntas_seguimiento: preguntas,
    resumen_comprension: `Entendimos que producís ${rubroInput || 'tus productos'} y configuramos los módulos exactos de energía, insumos y packaging correspondientes.`,
  };
}
