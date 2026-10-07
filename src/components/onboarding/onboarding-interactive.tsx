'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { BusinessProfile, ModuleType, Equipment } from '@/domain/schemas/profile.schema';
import { LLMProfileExtraction } from '@/lib/llm/schemas';

interface OnboardingInteractiveProps {
  onProfileCreated?: (profile: BusinessProfile) => void;
}

const MODULOS_DISPONIBLES: { id: ModuleType; label: string; desc: string }[] = [
  { id: 'insumos', label: 'Insumos y Materias Primas', desc: 'Ingredientes, telas, maderas, con control de merma' },
  { id: 'mano_de_obra', label: 'Mano de Obra', desc: 'Tu tiempo propio valorizado y el de tus colaboradores' },
  { id: 'energia', label: 'Energía Eléctrica', desc: 'Consumo de hornos eléctricos, máquinas, computadoras' },
  { id: 'gas', label: 'Gas Natural / Envasado', desc: 'Hornos de panadería, anafes, mecheros' },
  { id: 'costos_fijos', label: 'Costos Fijos', desc: 'Alquiler, internet, servicios prorrateados por mes' },
  { id: 'packaging', label: 'Packaging y Envíos', desc: 'Cajas, bolsas, etiquetas y costo logístico' },
  { id: 'impuestos_comisiones', label: 'Impuestos y Comisiones', desc: 'Monotributo, Mercado Pago, comisiones de venta' },
  { id: 'servicios', label: 'Servicios Profesionales', desc: 'Costo por hora, traslados y visitas técnicas' },
];

export function OnboardingInteractive({ onProfileCreated }: OnboardingInteractiveProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);

  // Paso 1: Preguntas base
  const [rubro, setRubro] = useState('Gastronomía y Pastelería');
  const [tipo, setTipo] = useState<'producto' | 'servicio' | 'mixto'>('producto');
  const [provincia, setProvincia] = useState('Buenos Aires');
  const [lugarTrabajo, setLugarTrabajo] = useState<'casa' | 'local_propio' | 'local_alquilado' | 'taller_compartido'>('casa');
  const [tieneEmpleados, setTieneEmpleados] = useState(false);

  // Paso 2: Explicación libre y propuesta del LLM
  const [descripcionLibre, setDescripcionLibre] = useState(
    'Hago tortas artesanales y alfajores desde casa. Uso batidora eléctrica y horno a gas. Envaso en cajas con visor y hago envíos.'
  );

  // Paso 3: Propuesta enriquecida por LLM / Heurística
  const [modulosActivos, setModulosActivos] = useState<ModuleType[]>([
    'insumos',
    'mano_de_obra',
    'gas',
    'packaging',
  ]);
  const [equiposDetectados, setEquiposDetectados] = useState<Equipment[]>([]);
  const [insumosSugeridos, setInsumosSugeridos] = useState<LLMProfileExtraction['insumos_sugeridos']>([]);
  const [preguntasSeguimiento, setPreguntasSeguimiento] = useState<LLMProfileExtraction['preguntas_seguimiento']>([]);
  const [respuestasPreguntas, setRespuestasPreguntas] = useState<Record<string, string>>({});
  const [resumenLLM, setResumenLLM] = useState<string>('');
  const [fuenteAnalisis, setFuenteAnalisis] = useState<'llm_api' | 'fallback_heuristico'>('fallback_heuristico');
  const [proveedor, setProveedor] = useState<string>('fallback');

  const toggleModulo = (modulo: ModuleType) => {
    if (modulosActivos.includes(modulo)) {
      if (modulosActivos.length > 1) {
        setModulosActivos(modulosActivos.filter((m) => m !== modulo));
      }
    } else {
      setModulosActivos([...modulosActivos, modulo]);
    }
  };

  const handleAnalizarPerfil = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/onboarding/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          descripcion_usuario: descripcionLibre,
          rubro_base: rubro,
          tipo_base: tipo,
          provincia,
          lugar_trabajo: lugarTrabajo,
          tiene_empleados: tieneEmpleados,
        }),
      });

      if (!res.ok) {
        throw new Error('Error al conectar con el servidor');
      }

      const data = await res.json();
      const prop: LLMProfileExtraction = data.perfil_propuesto;

      if (prop) {
        setModulosActivos(prop.modulos_recomendados);
        setEquiposDetectados(
          prop.equipos_detectados.map((e) => ({
            nombre: e.nombre,
            tipo_energia: e.tipo_energia,
            potencia_w: e.potencia_w,
            consumo_m3_h: e.consumo_m3_h,
          }))
        );
        setInsumosSugeridos(prop.insumos_sugeridos);
        setPreguntasSeguimiento(prop.preguntas_seguimiento);
        setResumenLLM(prop.resumen_comprension);
        setFuenteAnalisis(data.fuente);
        setProveedor(data.proveedor || 'fallback');
        if (prop.tipo) {
          setTipo(prop.tipo);
        }
      }
      setStep(3);
    } catch (err) {
      console.warn('Fallback local en cliente:', err);
      // Caída segura en el cliente si la red o API estuviera inaccesible
      setStep(3);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmarPerfil = () => {
    const profile: BusinessProfile = {
      rubro,
      tipo,
      moneda: 'ARS',
      provincia,
      tiene_empleados: tieneEmpleados,
      lugar_trabajo: lugarTrabajo,
      modulos_activos: modulosActivos,
      equipos: equiposDetectados,
      origen: 'llm_confirmado_por_usuario',
    };

    if (onProfileCreated) {
      onProfileCreated(profile);
    }
  };

  return (
    <Card className="border-ink/15 shadow-md">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Configurá el Perfil de tu Emprendimiento</CardTitle>
          <div className="flex gap-1.5" aria-label={`Paso ${step} de 3`}>
            <span className={`h-2.5 w-6 rounded-full transition-all ${step >= 1 ? 'bg-primary' : 'bg-ink/10'}`} />
            <span className={`h-2.5 w-6 rounded-full transition-all ${step >= 2 ? 'bg-primary' : 'bg-ink/10'}`} />
            <span className={`h-2.5 w-6 rounded-full transition-all ${step >= 3 ? 'bg-primary' : 'bg-ink/10'}`} />
          </div>
        </div>
        <CardDescription>
          {step === 1 && 'Paso 1 de 3: Datos esenciales de tu modelo de negocio.'}
          {step === 2 && 'Paso 2 de 3: Contanos qué hacés para adaptar las sugerencias.'}
          {step === 3 && 'Paso 3 de 3: Revisá y confirmá la propuesta estructurada.'}
        </CardDescription>
      </CardHeader>

      <CardContent>
        {step === 1 && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="rubro-input" required>Rubro o actividad principal</Label>
                <Input
                  id="rubro-input"
                  value={rubro}
                  onChange={(e) => setRubro(e.target.value)}
                  placeholder="Ej: Panadería, Indumentaria, Carpintería"
                />
              </div>

              <div>
                <Label htmlFor="provincia-input" required>Provincia (para tarifas y contexto)</Label>
                <Input
                  id="provincia-input"
                  value={provincia}
                  onChange={(e) => setProvincia(e.target.value)}
                  placeholder="Ej: Córdoba, CABA, Santa Fe"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>¿Qué comercializás?</Label>
                <div className="grid grid-cols-3 gap-2">
                  {(['producto', 'servicio', 'mixto'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTipo(t)}
                      className={`min-h-[44px] px-3 py-2 text-xs font-semibold rounded-xl border capitalize transition-all ${
                        tipo === t
                          ? 'bg-primary text-white border-primary shadow-sm'
                          : 'bg-white text-ink/80 border-ink/15 hover:bg-canvas'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label htmlFor="lugar-trabajo">¿Desde dónde operás?</Label>
                <select
                  id="lugar-trabajo"
                  value={lugarTrabajo}
                  onChange={(e) => setLugarTrabajo(e.target.value as any)}
                  className="w-full min-h-[44px] rounded-xl border border-ink/15 bg-white/80 px-3.5 py-2.5 text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <option value="casa">Desde mi casa</option>
                  <option value="local_propio">Local propio</option>
                  <option value="local_alquilado">Local alquilado</option>
                  <option value="taller_compartido">Taller / Coworking compartido</option>
                </select>
              </div>
            </div>

            <div className="pt-2">
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={tieneEmpleados}
                  onChange={(e) => setTieneEmpleados(e.target.checked)}
                  className="w-4 h-4 rounded text-primary focus:ring-primary border-ink/20"
                />
                <span className="text-sm text-ink/90 font-medium">Tengo colaboradores o empleados a cargo</span>
              </label>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="desc-libre" required>Contanos en tus palabras cómo producís y qué usás:</Label>
              <textarea
                id="desc-libre"
                rows={4}
                value={descripcionLibre}
                onChange={(e) => setDescripcionLibre(e.target.value)}
                placeholder="Ejemplo: Hago tortas artesanales y alfajores. Uso batidora eléctrica y horno a gas. Vendo en cajas y hago envíos los fines de semana..."
                className="w-full rounded-xl border border-ink/15 bg-white/80 p-3.5 text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary leading-relaxed"
              />
              <p className="text-xs text-ink/65 mt-1.5">
                💡 El asistente identificará equipos eléctricos, hornos de gas, mermas de insumos y costos ocultos automáticamente.
              </p>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            {/* Banner de comprensión inteligente */}
            <div className="bg-canvas/90 p-4 rounded-xl border border-ink/10 flex items-start gap-3">
              <span className="text-xl">✨</span>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-ink">Estructura adaptada para: {rubro}</h4>
                  <Badge variant={fuenteAnalisis === 'llm_api' ? 'accent' : 'support'}>
                    {proveedor === 'gemini' && '✨ Google Gemini (Gratis)'}
                    {proveedor === 'groq' && '⚡ Groq Llama 3 (Gratis)'}
                    {proveedor === 'anthropic' && 'Asistido por Claude'}
                    {(proveedor === 'fallback' || !proveedor) && 'Extracción Heurística (Offline)'}
                  </Badge>
                </div>
                {resumenLLM && <p className="text-xs text-ink/75 leading-relaxed">{resumenLLM}</p>}
              </div>
            </div>

            {/* Módulos de costo interactivos */}
            <div>
              <h5 className="text-xs uppercase tracking-wider text-ink/60 font-bold mb-2">
                1. Módulos de costo activados
              </h5>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {MODULOS_DISPONIBLES.map((m) => {
                  const activo = modulosActivos.includes(m.id);
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => toggleModulo(m.id)}
                      className={`p-3 rounded-xl border text-left transition-all flex items-start justify-between gap-3 ${
                        activo
                          ? 'border-primary bg-primary/5 text-ink shadow-sm'
                          : 'border-ink/10 bg-white/50 text-ink/50 hover:bg-white'
                      }`}
                    >
                      <div>
                        <p className="text-xs sm:text-sm font-semibold">{m.label}</p>
                        <p className="text-[11px] opacity-75 mt-0.5">{m.desc}</p>
                      </div>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                          activo ? 'bg-primary text-white' : 'bg-ink/10 text-ink/60'
                        }`}
                      >
                        {activo ? 'Activo' : 'Oculto'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Equipos e Insumos detectados como stickers reactivos */}
            {(equiposDetectados.length > 0 || insumosSugeridos.length > 0) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                {equiposDetectados.length > 0 && (
                  <div className="bg-white/80 p-3.5 rounded-xl border border-ink/10 space-y-2">
                    <span className="text-xs font-bold text-ink flex items-center gap-1.5">
                      ⚡ Equipos y Energía
                      <Badge variant="accent">estimado</Badge>
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {equiposDetectados.map((eq, idx) => (
                        <span
                          key={idx}
                          className="px-2.5 py-1 rounded-lg text-xs font-medium bg-canvas border border-ink/10 text-ink"
                        >
                          {eq.nombre} ({eq.tipo_energia === 'gas' ? 'Gas' : 'Eléctrico'})
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {insumosSugeridos.length > 0 && (
                  <div className="bg-white/80 p-3.5 rounded-xl border border-ink/10 space-y-2">
                    <span className="text-xs font-bold text-ink flex items-center gap-1.5">
                      📦 Insumos sugeridos
                      <Badge variant="accent">estimado</Badge>
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {insumosSugeridos.map((ins, idx) => (
                        <span
                          key={idx}
                          className="px-2.5 py-1 rounded-lg text-xs font-medium bg-canvas border border-ink/10 text-ink"
                          title={ins.explicacion}
                        >
                          {ins.nombre} {ins.posible_merma_pct > 0 && `(merma ~${ins.posible_merma_pct}%)`}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Preguntas de seguimiento dinámicas */}
            {preguntasSeguimiento.length > 0 && (
              <div className="space-y-3 pt-2">
                <h5 className="text-xs uppercase tracking-wider text-ink/60 font-bold">
                  2. Preguntas de seguimiento dinámicas
                </h5>
                <div className="space-y-3">
                  {preguntasSeguimiento.map((q) => (
                    <div key={q.id} className="p-3.5 rounded-xl bg-canvas border border-ink/10 space-y-2 text-xs">
                      <p className="font-semibold text-ink text-sm">{q.pregunta}</p>
                      {q.ayuda && <p className="text-ink/65 text-xs">{q.ayuda}</p>}
                      {q.opciones && q.opciones.length > 0 ? (
                        <div className="flex flex-wrap gap-2 pt-1">
                          {q.opciones.map((opt) => (
                            <button
                              key={opt}
                              type="button"
                              onClick={() => setRespuestasPreguntas({ ...respuestasPreguntas, [q.id]: opt })}
                              className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                                respuestasPreguntas[q.id] === opt
                                  ? 'bg-primary text-white border-primary'
                                  : 'bg-white text-ink/80 border-ink/15 hover:bg-canvas'
                              }`}
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <Input
                          placeholder="Tu respuesta..."
                          value={respuestasPreguntas[q.id] || ''}
                          onChange={(e) => setRespuestasPreguntas({ ...respuestasPreguntas, [q.id]: e.target.value })}
                          className="text-xs h-9 bg-white"
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>

      <CardFooter className="justify-between">
        {step > 1 ? (
          <Button variant="outline" size="md" onClick={() => setStep((s) => (s - 1) as any)}>
            Atrás
          </Button>
        ) : (
          <div />
        )}

        {step === 1 && (
          <Button size="md" onClick={() => setStep(2)}>
            Siguiente paso
          </Button>
        )}

        {step === 2 && (
          <Button size="md" onClick={handleAnalizarPerfil} disabled={loading}>
            {loading ? 'Analizando con asistente...' : 'Analizar y ver módulos ✨'}
          </Button>
        )}

        {step === 3 && (
          <Button size="md" variant="accent" onClick={handleConfirmarPerfil}>
            Confirmar perfil y comenzar
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
