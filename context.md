# context.md — SaaS Calculadora de Costos para Emprendedores

> Documento de contexto para desarrolladores y asistentes de IA que trabajen en este proyecto.
> Leelo completo antes de proponer o escribir código. Si algo acá contradice un pedido puntual, avisá la contradicción antes de seguir.

---

## 1. Qué es este proyecto

Un SaaS que ayuda a emprendedores a **calcular costos reales y definir precios** de sus productos o servicios.

Lo que lo diferencia: al registrarse, la app hace un **onboarding inteligente** que le pregunta al usuario por las características de su emprendimiento (rubro, si vende productos o servicios, si usa luz o gas, si tiene empleados, etc.) y con eso **construye un perfil** que adapta toda la app: qué insumos sugiere, qué módulos de costo activa y cuáles oculta.

Un LLM asiste en el onboarding y en el análisis, pero **nunca hace los cálculos**.

### Usuario objetivo
Emprendedores y microempresas, con foco inicial en Argentina. Gente que muchas veces no sabe cuánto le cuesta realmente producir, y que no es técnica.

### Principio de producto
> Que un emprendedor sin conocimientos de costos termine el onboarding y ya tenga una estructura de costos razonable y entendible, sin planillas.

### Principio de experiencia
> La app tiene que ser **linda, amigable y cercana**. Que se sienta como alguien que te ayuda, no como un sistema contable. El detalle de diseño está en la sección 10.

---

## 2. Decisión de arquitectura central (no negociable)

**El LLM no calcula. El motor determinístico calcula.**

| Responsabilidad | Quién la hace |
|---|---|
| Todas las cuentas: costo unitario, margen, punto de equilibrio, consumo de luz/gas | **Motor de cálculo** (código normal, con tests) |
| Entender texto libre y convertirlo en datos estructurados | LLM |
| Sugerir insumos, costos ocultos y preguntas de seguimiento | LLM |
| Explicar resultados en lenguaje simple | LLM |
| Guardar datos en la base | Backend, **solo después de validar y de que el usuario confirme** |

**Por qué:** un LLM puede dar resultados distintos para la misma cuenta. En una calculadora de costos, un error significa que el usuario pierde plata. El motor determinístico es auditable, reproducible y testeable.

**Alternativa descartada:** dejar que el LLM calcule directamente. Es más rápido de armar, pero no es confiable ni verificable.

---

## 3. Stack propuesto

| Capa | Elección | Nota |
|---|---|---|
| Frontend + backend | Next.js + TypeScript | Un solo lenguaje, despliegue simple |
| Base de datos | PostgreSQL (Supabase) | Row Level Security para multi-tenant |
| Auth | Supabase Auth | Evita implementar auth propia |
| LLM | API de Anthropic (Claude) | Modelo chico para extracción, grande para análisis |
| UI | Tailwind CSS + shadcn/ui | Sobre tokens de diseño propios (ver sección 10) |
| Validación | Zod | Esquemas para inputs y para salidas del LLM |
| Tests | Vitest | El motor de cálculo requiere cobertura alta |

**Alternativa considerada:** backend separado en Python/FastAPI. Tiene sentido si más adelante hay procesamiento pesado de datos, pero para arrancar agrega complejidad innecesaria.

> **Estado:** propuesta. Confirmar antes de iniciar el proyecto.

---

## 4. Onboarding (flujo híbrido)

Se descartó el cuestionario 100% fijo (rígido) y la conversación 100% LLM (cara e impredecible). Se usa un enfoque **híbrido**:

1. **Preguntas base fijas**
   - Rubro
   - Tipo: producto, servicio o mixto
   - Trabaja solo o con empleados
   - Local propio, alquilado o desde casa
   - Moneda y provincia

2. **Pregunta abierta:** "Contame qué hacés."
   El LLM convierte la respuesta en un **perfil estructurado** (JSON validado por esquema).

3. **Preguntas de seguimiento dinámicas**, según lo detectado.
   Ejemplos: si usa horno, pregunta potencia y horas de uso; si hace delivery, pregunta cómo lo resuelve; si es servicio, pregunta costo de traslado.

4. **Pantalla de confirmación:** el usuario revisa y corrige el perfil antes de guardarlo.

### Reglas del onboarding
- El LLM **propone**, el usuario **confirma**. Nunca escribe directo en la base.
- Todo dato sugerido por el LLM se marca como `estimado` hasta que el usuario lo confirme.
- Si la salida del LLM no valida contra el esquema: reintentar una vez; si falla, caer al cuestionario fijo.
- Debe poder completarse sin LLM (degradación elegante si la API falla).

---

## 5. Modelo de perfil: módulos de costo

Cada emprendimiento activa **solo los módulos que le aplican**. Esto resuelve, por ejemplo, el cálculo de gas o luz: el módulo existe para un panadero y no aparece para un diseñador gráfico.

| Módulo | Aplica a | Qué calcula |
|---|---|---|
| Insumos | Productos | Costo de materia prima por unidad, con merma |
| Mano de obra | Todos | Tiempo propio valorizado + empleados |
| Energía eléctrica | Quien use equipos | potencia (kW) × horas × tarifa kWh |
| Gas | Quien use hornos, cocinas, etc. | consumo (m³) × tarifa m³ |
| Costos fijos | Todos | Alquiler, internet, software, prorrateados |
| Impuestos y comisiones | Todos | Monotributo, comisiones de cobro, plataformas |
| Packaging y logística | Productos | Envases, envío, delivery |
| Servicios | Servicios | Costo por hora, traslados, materiales |

### Ejemplo de perfil (forma de referencia)

```json
{
  "rubro": "gastronomia",
  "tipo": "producto",
  "moneda": "ARS",
  "provincia": "Buenos Aires",
  "tiene_empleados": false,
  "lugar_trabajo": "casa",
  "modulos_activos": ["insumos", "mano_de_obra", "energia", "gas", "packaging"],
  "equipos": [
    { "nombre": "horno", "tipo_energia": "gas", "consumo_m3_h": 0.4 },
    { "nombre": "batidora", "tipo_energia": "luz", "potencia_w": 300 }
  ],
  "origen": "llm_confirmado_por_usuario"
}
```

> El esquema definitivo debe vivir en un único lugar (Zod) y de ahí derivarse tipos y validaciones. No duplicarlo.

### Estructura de carpetas propuesta (Clean Architecture en Next.js App Router)

```text
src/
├── app/                        # Next.js App Router (páginas, layouts, server actions)
│   ├── (auth)/                 # Login, registro, recuperación
│   ├── (dashboard)/            # Vistas principales: costos, productos, simulación
│   │   ├── onboarding/         # Flujo conversacional e interactivo
│   │   ├── productos/          # Lista y ficha de costo unitario
│   │   └── configuracion/      # Tarifas de luz/gas, datos del negocio
│   └── api/                    # Endpoints seguros (webhooks, rate limit LLM)
├── components/                 # Componentes UI
│   ├── ui/                     # Primitivos shadcn/ui estilizados con tokens
│   ├── onboarding/             # Componente de conversación y stickers reactivos
│   └── calculator/             # Widgets de cálculo, comparador margen vs markup
├── domain/                     # NÚCLEO DETERMINÍSTICO (100% puro, sin dependencias de Next/Supabase)
│   ├── calculator/             # Fórmulas puras: energía, gas, margen, markup, punto de equilibrio
│   │   ├── unit-cost.ts
│   │   ├── energy.ts
│   │   ├── pricing.ts
│   │   └── __tests__/          # Tests unitarios exhaustivos con Vitest
│   ├── schemas/                # Esquemas Zod (fuente de verdad única)
│   │   ├── profile.schema.ts
│   │   ├── product.schema.ts
│   │   └── costs.schema.ts
│   └── money/                  # Manejo de precisión decimal (decimal.js o bigint centavos)
├── lib/                        # Integraciones e infraestructura
│   ├── supabase/               # Clientes cliente/servidor y middleware RLS
│   ├── llm/                    # Llamadas a Claude, structured outputs y fallback
│   └── formatters/             # Formateo es-AR (moneda, fechas relativas)
└── styles/
    └── tokens.css              # Variables CSS de diseño (Sección 10)
```

---

## 6. Motor de cálculo

### Reglas obligatorias
- **Nunca usar `float` para dinero.** Se utiliza `decimal.js` (o representación en enteros de centavos para montos básicos) para garantizar precisión exacta y evitar errores de punto flotante IEEE 754.
- Funciones **puras**, sin acceso a base ni a red, para poder testearlas fácil.
- Cobertura de tests unitarios obligatoria en `src/domain/calculator/__tests__/` cubriendo casos límite: cero, negativos, listas vacías, divisiones por cero (`markup` con costo cero o `margen = 1`).
- Distinguir **margen** de **markup**; son cosas distintas y se confunden mucho:
  - `precio = costo × (1 + markup)`
  - `precio = costo / (1 − margen)`
  La UI debe dejar clara cuál se está usando mediante ayuda visual contextual.

### Fórmulas base (Especificación formal)
- **Energía eléctrica**:
  - `kWh = (potencia_W / 1000) × horas`
  - `costo_energia = kWh × tarifa_kWh`
- **Gas natural**:
  - `costo_gas = consumo_m3 × tarifa_m3`
- **Costo unitario de lote**:
  - `costo_variable_total = insumos + packaging + energia + gas`
  - `costo_variable_unitario = costo_variable_total / unidades`
  - `costo_fijo_prorrateado_unitario = fijos_mensuales_asignados / unidades_producidas_mes`
  - `costo_unitario_total = costo_variable_unitario + costo_fijo_prorrateado_unitario + costo_mano_obra_unitario`
- **Punto de equilibrio (en unidades)**:
  - `punto_equilibrio_unidades = costos_fijos_totales / (precio_unitario − costo_variable_unitario)`

---

## 7. Contexto Argentina

- **Inflación:** los precios de insumos pierden vigencia rápido. Cada precio guarda su `fecha_actualizacion` (ISO timestamp). La UI emitirá una advertencia contextual cuando un insumo supere los 30-45 días sin actualizar.
- **Tarifas de luz y gas:** varían por provincia y distribuidora (Edenor, Edesur, Camuzzi, Metrogas, etc.). En la v1 el usuario carga sus valores unitarios de tarifa directamente (`tarifa_kWh` y `tarifa_m3`).
- **Impuestos y comisiones:**
  - Monotributo: prorrateo como costo fijo mensual.
  - Ingresos Brutos (IIBB) y comisiones de cobro (Mercado Pago, tarjetas): modelados como porcentaje sobre el precio de venta final.
- **Moneda:** ARS como base principal (`Intl.NumberFormat('es-AR')`). Se prevé soporte para registrar insumos en USD con tasa de conversión de referencia.

---

## 8. Seguridad (siempre aplica)

- **Multi-tenant:** cada usuario accede solo a sus datos. Row Level Security (RLS) habilitado en todas las tablas de Supabase con `auth.uid() = user_id`.
- **Prompt injection:** texto del usuario considerado no confiable. El LLM nunca ejecuta mutaciones directas en la base de datos; solo sugiere objetos validados por esquemas Zod en el servidor.
- **Validar en los bordes:** toda entrada (formularios, Server Actions, API routes, respuestas del LLM) se valida vía Zod (`safeParse`).
- **Secretos:** API keys (`ANTHROPIC_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) exclusivamente en variables de entorno del servidor.
- **Límites de uso:** rate limit en endpoints de LLM para evitar consumo desmedido de tokens.
- **Datos sensibles:** cifrado en tránsito (HTTPS) y en reposo. Logs sanitizados sin mostrar números comerciales privados.

---

## 9. Uso del LLM

- Modelo chico/rápido (`claude-3-5-haiku` / equivalente) para extracción JSON estructurado en onboarding.
- Respuestas forzadas a `tool_use` o structured output con validación inmediata por Zod.
- Prompts versionados en archivos dedicados (`src/lib/llm/prompts/`).
- Todo precio o cantidad inferida por el modelo se rotula obligatoriamente con el estado `status: "estimado"`.
- Fallback automático: si la llamada falla por timeout o error de API, el flujo degrada inmediatamente a formulario convencional sin bloquear al usuario.

---

## 10. Diseño y experiencia (UX/UI) y Skills de soporte

### Integración de Skills en el proyecto
El proyecto cuenta con skills configuradas en `.agents/skills/`:
- **`design-tokens`**: Especifica los tokens CSS exactos (paleta `#F3F8F6`, `#16302B`, `#0F7B6C`, `#FFB400`, `#FF7A90`, `#D6455D`), fuentes (`Bricolage Grotesque`, `Figtree`) y alineación con `tabular-nums`.
- **`taste-skill`**: Guía el desarrollo visual con diales (`DESIGN_VARIANCE: 4`, `MOTION_INTENSITY: 3`, `VISUAL_DENSITY: 5`). Prioriza calidez, formas suaves y accesibilidad sobre estéticas genéricas.
- **`web-design-guidelines`**: Auditoría de contraste AA, áreas táctiles ≥ 44×44px, formularios accesibles y microcopy rioplatense.
- **`graphify`**: Mapeo y trazabilidad del código manteniendo aislado el dominio de cálculo.

---

## 11. Convenciones de código

- TypeScript en modo estricto (`strict: true`, `noImplicitAny: true`).
- Arquitectura limpia: el código de cálculo vive en `src/domain/` y no importa librerías de UI, React ni base de datos.
- Manejo explícito de errores: uso de `Result<T, E>` o excepciones tipadas para cálculos inválidos.
- Pruebas unitarias para cualquier fórmula o cambio en el motor antes de dar por completada una tarea.
- **Regla de control de versiones**: Commit atómico y descriptivo por cada feature terminada (con registro graphify asociado).
- **Regla de compilación eficiente**: No ejecutar `run build` completo para cada cambio menor; agrupar features homogéneas y ejecutar un único build/check por sección o bloque funcional (validando con vitest/typecheck intermedio).

---

## 12. Decisiones resueltas y cerradas

1. **Gestión de Skills**: Se utilizan las skills nativas de Antigravity en `.agents/skills/` (`design-tokens`, `taste-skill`, `web-design-guidelines`, `graphify`).
2. **Archivos de grafiticación / temporales**: Carpetas como `graphify-out/` o `.agent/` se ignoran en `.gitignore`.
3. **Modo oscuro en v1**: No se implementa en la primera versión para focalizar en pulir la paleta identitaria cálida (`#F3F8F6` / `#16302B`).
4. **Stack confirmado**: Next.js App Router (TypeScript) + Tailwind CSS + Supabase (PostgreSQL / RLS / Auth) + Zod + Vitest + `decimal.js`.

---

## 13. Roadmap de desarrollo

**Fase 1 — Núcleo y Motor Determinístico (Sprint actual)**
- Configuración inicial del repositorio (Next.js, TypeScript, Tailwind, Vitest).
- Implementación de tokens de diseño CSS y utilidades base en Tailwind.
- Definición de esquemas Zod en `src/domain/schemas/`.
- Motor de cálculo matemático puro con `decimal.js` y tests unitarios completos (100% cobertura en casos borde).
- Flujo de onboarding guiado base (sin LLM) como respaldo confiable.

**Fase 2 — Inteligencia y Onboarding Híbrido**
- Integración del LLM para el paso abierto "Contame qué hacés".
- Generación reactiva del perfil con etiquetas tipo stickers interactivos.
- Preguntas dinámicas condicionales.

**Fase 3 — Gestión de Costos y Alertas Locales**
- CRUD de insumos y productos con control de inflación (antigüedad de costos).
- Simulador de variaciones de costos (tarifas, materias primas).

**Fase 4 — Multi-tenant y Autenticación**
- Integración de Supabase Auth y políticas RLS para aislamiento de datos.

---

## 15. Limitaciones conocidas

- Las skills de terceros (sección 12) cambian con el tiempo: los comandos de instalación y las estrellas citadas se verificaron al **06/10/2026** y conviene revisarlos antes de instalar.
- La dirección visual de la sección 10 es una **propuesta**: hay que probarla con usuarios reales y con un prototipo antes de darla por buena.
- Las tarifas de energía no se actualizan automáticamente en la v1.
- Las sugerencias de precios del LLM no son una fuente de verdad.
- El perfil de rubros poco comunes puede requerir ajuste manual por parte del usuario.
