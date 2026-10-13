'use client';

import React, { useRef, useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { BusinessProfile, ModuleType, Equipment } from '@/domain/schemas/profile.schema';
import { LLMProfileExtraction, LLMProfileExtractionSchema } from '@/lib/llm/schemas';
import { generateDeterministicProfile } from '@/lib/llm/fallback';

interface OnboardingInteractiveProps {
  initialProfile?: BusinessProfile | null;
  onProfileCreated?: (profile: BusinessProfile) => Promise<void>;
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

export function OnboardingInteractive({ initialProfile, onProfileCreated }: OnboardingInteractiveProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [analysisWarning, setAnalysisWarning] = useState<string | null>(null);

  // Paso 1: Preguntas base
  const [rubro, setRubro] = useState(initialProfile?.rubro ?? '');
  const [tipo, setTipo] = useState<'producto' | 'servicio' | 'mixto'>(initialProfile?.tipo ?? 'producto');
  const [provincia, setProvincia] = useState(initialProfile?.provincia ?? '');
  const [lugarTrabajo, setLugarTrabajo] = useState<'casa' | 'local_propio' | 'local_alquilado' | 'taller_compartido'>(initialProfile?.lugar_trabajo ?? 'casa');
  const [tieneEmpleados, setTieneEmpleados] = useState(initialProfile?.tiene_empleados ?? false);

  // Paso 2: Explicación libre y propuesta del LLM
  const [descripcionLibre, setDescripcionLibre] = useState(initialProfile?.descripcion_negocio ?? '');

  // Paso 3: Propuesta enriquecida por LLM / Heurística
  const [modulosActivos, setModulosActivos] = useState<ModuleType[]>(initialProfile?.modulos_activos ?? ['mano_de_obra']);
  const [equiposDetectados, setEquiposDetectados] = useState<Equipment[]>(initialProfile?.equipos ?? []);
  const [insumosSugeridos, setInsumosSugeridos] = useState<LLMProfileExtraction['insumos_sugeridos']>(initialProfile?.insumos_sugeridos ?? []);
  const [preguntasSeguimiento, setPreguntasSeguimiento] = useState<LLMProfileExtraction['preguntas_seguimiento']>(initialProfile?.preguntas_seguimiento ?? []);
  const [respuestasPreguntas, setRespuestasPreguntas] = useState<Record<string, string>>(initialProfile?.respuestas_seguimiento ?? {});
  const [resumenLLM, setResumenLLM] = useState<string>(initialProfile?.resumen_analisis ?? '');
  const [fuenteAnalisis, setFuenteAnalisis] = useState<'llm_api' | 'fallback_heuristico'>(initialProfile?.fuente_analisis ?? 'fallback_heuristico');
  const [proveedor, setProveedor] = useState<string>(initialProfile?.proveedor_analisis ?? 'fallback');
  const cachedAnalysis = useRef<{
    key: string;
    proposal: LLMProfileExtraction;
    provider: string;
  } | null>(null);

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
    setErrorMessage(null);
    setAnalysisWarning(null);
    const request = {
      descripcion_usuario: descripcionLibre,
      rubro_base: rubro,
      tipo_base: tipo,
      provincia,
      lugar_trabajo: lugarTrabajo,
      tiene_empleados: tieneEmpleados,
    };

    const applyProposal = (proposal: LLMProfileExtraction) => {
      setRubro(proposal.rubro_detectado);
      setModulosActivos(proposal.modulos_recomendados);
      setEquiposDetectados(
        proposal.equipos_detectados.map((equipment) => ({
          nombre: equipment.nombre,
          tipo_energia: equipment.tipo_energia,
          potencia_w: equipment.potencia_w,
          consumo_m3_h: equipment.consumo_m3_h,
          horas_uso_estimadas: equipment.horas_uso_estimadas,
          status: 'estimado',
        }))
      );
      setInsumosSugeridos(proposal.insumos_sugeridos.map((supply) => ({
        ...supply,
        status: 'estimado',
      })));
      setPreguntasSeguimiento(proposal.preguntas_seguimiento);
      setResumenLLM(proposal.resumen_comprension);
      setTipo(proposal.tipo);
    };

    const requestKey = JSON.stringify(request);
    if (cachedAnalysis.current?.key === requestKey) {
      applyProposal(cachedAnalysis.current.proposal);
      setFuenteAnalisis('llm_api');
      setProveedor(cachedAnalysis.current.provider);
      setStep(3);
      setLoading(false);
      return;
    }

    if (
      initialProfile?.resumen_analisis &&
      request.descripcion_usuario === initialProfile.descripcion_negocio &&
      request.rubro_base === initialProfile.rubro &&
      request.tipo_base === initialProfile.tipo &&
      request.provincia === initialProfile.provincia &&
      request.lugar_trabajo === initialProfile.lugar_trabajo &&
      request.tiene_empleados === initialProfile.tiene_empleados
    ) {
      setRubro(initialProfile.rubro);
      setTipo(initialProfile.tipo);
      setModulosActivos(initialProfile.modulos_activos);
      setEquiposDetectados(initialProfile.equipos);
      setInsumosSugeridos(initialProfile.insumos_sugeridos);
      setPreguntasSeguimiento(initialProfile.preguntas_seguimiento);
      setResumenLLM(initialProfile.resumen_analisis);
      setFuenteAnalisis(initialProfile.fuente_analisis);
      setProveedor(initialProfile.proveedor_analisis);
      setStep(3);
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/onboarding/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? 'No pudimos consultar al asistente.');
      }

      const data = await res.json();
      const validation = LLMProfileExtractionSchema.safeParse(data.perfil_propuesto);
      if (!validation.success) {
        throw new Error('El asistente devolvió una propuesta que no se pudo validar.');
      }
      applyProposal(validation.data);
      setFuenteAnalisis(data.fuente);
      setProveedor(data.proveedor || 'fallback');
      if (data.fuente === 'llm_api') {
        cachedAnalysis.current = {
          key: requestKey,
          proposal: validation.data,
          provider: data.proveedor,
        };
      }
      setAnalysisWarning(data.advertencia ?? null);
      setStep(3);
    } catch (error) {
      applyProposal(generateDeterministicProfile(request));
      setFuenteAnalisis('fallback_heuristico');
      setProveedor('fallback');
      setAnalysisWarning(error instanceof Error ? `${error.message} Se armó una propuesta local para que puedas continuar.` : 'Se armó una propuesta local para que puedas continuar.');
      setStep(3);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmarPerfil = async () => {
    if (!onProfileCreated) return;
    setSaving(true);
    setErrorMessage(null);
    const profile: BusinessProfile = {
      id: initialProfile?.id,
      rubro,
      tipo,
      moneda: initialProfile?.moneda ?? 'ARS',
      provincia,
      tiene_empleados: tieneEmpleados,
      lugar_trabajo: lugarTrabajo,
      modulos_activos: modulosActivos,
      equipos: equiposDetectados,
      descripcion_negocio: descripcionLibre,
      preguntas_seguimiento: preguntasSeguimiento,
      respuestas_seguimiento: respuestasPreguntas,
      insumos_sugeridos: insumosSugeridos.map((supply) => ({
        ...supply,
        status: 'estimado',
      })),
      resumen_analisis: resumenLLM,
      fuente_analisis: fuenteAnalisis,
      proveedor_analisis: proveedor === 'gemini' || proveedor === 'groq' || proveedor === 'anthropic'
        ? proveedor
        : 'fallback',
      origen: fuenteAnalisis === 'llm_api'
        ? 'llm_confirmado_por_usuario'
        : 'fallback_confirmado_por_usuario',
    };

    try {
      await onProfileCreated(profile);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'No se pudo guardar el perfil. Revisá tu conexión e intentá nuevamente.');
    } finally {
      setSaving(false);
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
        {analysisWarning && (
          <p role="status" className="mb-4 rounded-xl border border-accent/30 bg-accent/10 px-3.5 py-3 text-xs text-ink">
            {analysisWarning}
          </p>
        )}
        {errorMessage && (
          <p role="alert" className="mb-4 rounded-xl border border-danger/30 bg-danger/5 px-3.5 py-3 text-xs text-danger">
            {errorMessage}
          </p>
        )}
        {step === 1 && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="rubro-input" required>Rubro o actividad principal</Label>
                <Input
                  id="rubro-input"
                  required
                  value={rubro}
                  onChange={(e) => setRubro(e.target.value)}
                  placeholder="Ej: Panadería, Indumentaria, Carpintería"
                />
              </div>

              <div>
                <Label htmlFor="provincia-input" required>Provincia (para tarifas y contexto)</Label>
                <Input
                  id="provincia-input"
                  required
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
                onChange={(e) => setLugarTrabajo(e.target.value as BusinessProfile['lugar_trabajo'])}
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
                required
                minLength={5}
                maxLength={3000}
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
                    <div className="space-y-2">
                      {equiposDetectados.map((eq, idx) => (
                        <div key={`${eq.nombre}-${idx}`} className="grid grid-cols-2 gap-2 rounded-lg bg-canvas p-2.5">
                          <Input
                            aria-label="Nombre del equipo"
                            value={eq.nombre}
                            onChange={(event) => setEquiposDetectados((current) =>
                              current.map((equipment, equipmentIndex) =>
                                equipmentIndex === idx ? { ...equipment, nombre: event.target.value } : equipment
                              )
                            )}
                            className="h-9 text-xs"
                          />
                          <select
                            aria-label="Tipo de energía del equipo"
                            value={eq.tipo_energia}
                            onChange={(event) => setEquiposDetectados((current) =>
                              current.map((equipment, equipmentIndex) =>
                                equipmentIndex === idx
                                  ? { ...equipment, tipo_energia: event.target.value as Equipment['tipo_energia'] }
                                  : equipment
                              )
                            )}
                            className="h-9 rounded-lg border border-ink/15 bg-white px-2 text-xs"
                          >
                            <option value="luz">Eléctrico</option>
                            <option value="gas">Gas</option>
                          </select>
                          {eq.tipo_energia === 'luz' ? (
                            <Input
                              aria-label="Potencia del equipo en watts"
                              type="number"
                              min="0"
                              placeholder="Potencia W"
                              value={eq.potencia_w ?? ''}
                              onChange={(event) => setEquiposDetectados((current) =>
                                current.map((equipment, equipmentIndex) =>
                                  equipmentIndex === idx
                                    ? { ...equipment, potencia_w: event.target.value === '' ? undefined : Number(event.target.value) }
                                    : equipment
                                )
                              )}
                              className="h-9 text-xs"
                            />
                          ) : (
                            <Input
                              aria-label="Consumo de gas del equipo en metros cúbicos por hora"
                              type="number"
                              min="0"
                              step="0.01"
                              placeholder="Consumo m³/h"
                              value={eq.consumo_m3_h ?? ''}
                              onChange={(event) => setEquiposDetectados((current) =>
                                current.map((equipment, equipmentIndex) =>
                                  equipmentIndex === idx
                                    ? { ...equipment, consumo_m3_h: event.target.value === '' ? undefined : Number(event.target.value) }
                                    : equipment
                                )
                              )}
                              className="h-9 text-xs"
                            />
                          )}
                          <Input
                            aria-label="Horas estimadas de uso por tanda"
                            type="number"
                            min="0"
                            step="0.1"
                            placeholder="Horas/tanda"
                            value={eq.horas_uso_estimadas ?? ''}
                            onChange={(event) => setEquiposDetectados((current) =>
                              current.map((equipment, equipmentIndex) =>
                                equipmentIndex === idx
                                  ? { ...equipment, horas_uso_estimadas: event.target.value === '' ? undefined : Number(event.target.value) }
                                  : equipment
                              )
                            )}
                            className="h-9 text-xs"
                          />
                          <button
                            type="button"
                            onClick={() => setEquiposDetectados((current) =>
                              current.filter((_, equipmentIndex) => equipmentIndex !== idx)
                            )}
                            className="text-left text-xs text-danger underline"
                          >
                            Quitar equipo
                          </button>
                        </div>
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
                      {q.tipo === 'booleano' ? (
                        <div className="flex flex-wrap gap-2 pt-1">
                          {['Sí', 'No'].map((answer) => (
                            <button
                              key={answer}
                              type="button"
                              onClick={() => setRespuestasPreguntas({ ...respuestasPreguntas, [q.id]: answer })}
                              className={`min-h-[40px] rounded-lg border px-3 py-1.5 text-xs font-medium ${
                                respuestasPreguntas[q.id] === answer
                                  ? 'border-primary bg-primary text-white'
                                  : 'border-ink/15 bg-white text-ink/80'
                              }`}
                            >
                              {answer}
                            </button>
                          ))}
                        </div>
                      ) : q.opciones && q.opciones.length > 0 ? (
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
                          type={q.tipo === 'numero' ? 'number' : 'text'}
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
          <Button
            variant="outline"
            size="md"
            disabled={loading || saving}
            onClick={() => setStep(step === 3 ? 2 : 1)}
          >
            Atrás
          </Button>
        ) : (
          <div />
        )}

        {step === 1 && (
          <Button size="md" disabled={!rubro.trim() || !provincia.trim()} onClick={() => setStep(2)}>
            Siguiente paso
          </Button>
        )}

        {step === 2 && (
          <Button size="md" onClick={handleAnalizarPerfil} disabled={loading || descripcionLibre.trim().length < 5}>
            {loading ? 'Analizando con asistente...' : 'Analizar y ver módulos ✨'}
          </Button>
        )}

        {step === 3 && (
          <Button size="md" variant="accent" onClick={handleConfirmarPerfil} disabled={saving}>
            {saving ? 'Guardando perfil...' : 'Confirmar perfil y comenzar'}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
