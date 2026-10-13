  # Repository Architecture Graph & Feature Log (Graphify)

Este documento registra los nodos arquitectónicos y el mapa de dependencias actualizado por cada feature implementada.

---

## Mapa de Nodos y Conexiones

```mermaid
graph TD
    subgraph Skills [Skills de Agente]
        DT["design-tokens"]
        TS["taste-skill"]
        WDG["web-design-guidelines"]
        GF["graphify"]
    end

    subgraph Docs [Documentación y Contratos]
        CTX["context.md (Reglas y Especificación)"]
    end

    subgraph Domain [Motor Determinístico (src/domain)]
        SCH_P["profile.schema.ts"]
        SCH_C["costs.schema.ts"]
        SCH_PRD["product.schema.ts"]
        CALC_E["energy.ts"]
        CALC_S["supplies.ts"]
        CALC_P["pricing.ts"]
        CALC_U["unit-cost.ts"]
        CALC_INF["inflation.ts (Alertas y Simulación)"]
        TESTS["__tests__ (Cálculos puramente matemáticos)"]
    end

    subgraph LLM_Layer [Capa de Asistencia LLM (src/lib/llm)]
        LLM_SCH["schemas.ts (Zod)"]
        LLM_PRM["prompts.ts (System Prompt & Extraction)"]
        LLM_FLB["fallback.ts (Heurística determinística)"]
        LLM_CLI["client.ts (Gemini Free / Groq Free / Claude)"]
        API_ONB["/api/onboarding/extract (Route Handler)"]
        LLM_TST["__tests__/llm-extraction.test.ts"]
    end

    subgraph Supabase_Auth [Persistencia y Multi-tenant (src/lib/supabase)]
        SUPA_SQL["schema.sql (PostgreSQL + RLS)"]
        SUPA_CLI["client.ts (Browser SSR)"]
        SUPA_SRV["server.ts (Server Client con Cookies)"]
        AUTH_ACT["auth-actions.ts (Login / Register / Logout)"]
        DB_ACT["db-actions.ts (CRUD seguro RLS)"]
        AUTH_UI["auth-modal.tsx (Formulario UI)"]
    end

    subgraph UI_Tokens [Tokens & Primitivos UI]
        CSS_TOK["src/styles/tokens.css"]
        TW_CFG["tailwind.config.js"]
        UI_BTN["button.tsx"]
        UI_CRD["card.tsx"]
        UI_INP["input.tsx"]
        UI_LBL["label.tsx"]
        UI_BDG["badge.tsx"]
    end

    subgraph Features [Componentes de Aplicación]
        PAGE["src/app/page.tsx"]
        ONB["onboarding-interactive.tsx"]
        QUC["quick-unit-cost.tsx"]
        SIM["pricing-simulator.tsx"]
        PRD_CAT["product-catalog-manager.tsx"]
        INF_SIM["cost-variation-simulator.tsx"]
        INF_BDG["inflation-alert-badge.tsx"]
    end

    Skills --> CTX
    CTX --> SCH_P
    CTX --> SCH_C
    CTX --> SCH_PRD
    SCH_C --> CALC_U
    CALC_E --> CALC_U
    CALC_S --> CALC_U
    CALC_S --> CALC_INF
    CALC_E --> TESTS
    CALC_S --> TESTS
    CALC_P --> TESTS
    CALC_U --> TESTS
    CALC_INF --> TESTS
    DT --> CSS_TOK
    CSS_TOK --> TW_CFG
    TW_CFG --> UI_BTN
    TW_CFG --> UI_CRD
    TW_CFG --> UI_INP
    TW_CFG --> UI_BDG
    UI_CRD --> QUC
    UI_CRD --> SIM
    UI_CRD --> ONB
    UI_CRD --> PRD_CAT
    UI_CRD --> INF_SIM
    UI_CRD --> AUTH_UI
    CALC_P --> SIM
    CALC_S --> QUC
    CALC_INF --> INF_BDG
    INF_BDG --> PRD_CAT
    CALC_INF --> INF_SIM
    SCH_P --> ONB
    LLM_SCH --> API_ONB
    LLM_PRM --> LLM_CLI
    LLM_FLB --> LLM_CLI
    LLM_CLI --> API_ONB
    LLM_FLB --> LLM_TST
    API_ONB --> ONB
    SUPA_SRV --> AUTH_ACT
    SUPA_SRV --> DB_ACT
    AUTH_ACT --> AUTH_UI
    AUTH_UI --> PAGE
    QUC --> PAGE
    SIM --> PAGE
    ONB --> PAGE
    PRD_CAT --> PAGE
    INF_SIM --> PAGE
```

---

## Log de Features Registradas

### [Feature 0] Inicialización y Configuración de Reglas
- **Fecha**: 2026-10-06
- **Archivos creados/modificados**:
  - `context.md` (especificación técnica y de flujo)
  - `.agents/skills/*` (tokens, taste, web guidelines, graphify)
  - `.gitignore` (exclusiones de entorno, build y temporales)
  - `GRAPH.md` (mapa de dependencias inicial)
- **Conexiones**:
  - `context.md` define los tokens consumidos por `design-tokens`.
  - `design-tokens` y `taste-skill` alimentan las reglas de diseño para la UI.
- **Estado de validación**: Repositorio Git inicializado y vinculado con origen remoto.

### [Feature 1] Núcleo Determinístico y Tokens de Diseño
- **Fecha**: 2026-10-06
- **Archivos creados/modificados**:
  - `package.json`, `tsconfig.json`, `vitest.config.ts`, `tailwind.config.js`, `postcss.config.js`
  - `src/styles/tokens.css`, `src/app/layout.tsx`, `src/app/page.tsx`
  - `src/domain/schemas/profile.schema.ts`, `src/domain/schemas/costs.schema.ts`
  - `src/domain/calculator/energy.ts`, `src/domain/calculator/supplies.ts`, `src/domain/calculator/pricing.ts`, `src/domain/calculator/unit-cost.ts`
  - `src/domain/calculator/__tests__/*`
  - `src/lib/formatters/currency.ts`
- **Conexiones**:
  - El motor de cálculo (`src/domain/calculator/`) opera como módulo 100% puro aislado usando `decimal.js`.
  - `unit-cost.ts` orquesta el cálculo consolidado del lote de producción a partir de insumos, servicios energéticos, empaques y mano de obra.
  - Los tokens CSS centralizados conectan la paleta identitaria (`#F3F8F6`, `#16302B`, `#0F7B6C`, etc.) con Tailwind.
- **Estado de validación**:
  - `vitest`: 14 tests unitarios aprobados (100% de los casos límite de cálculos).

### [Feature 2] Interfaz Interactiva de Onboarding, Calculadora de Lotes y Simulador de Precios
- **Fecha**: 2026-10-07
- **Archivos creados/modificados**:
  - `src/components/ui/badge.tsx` (etiquetas visuales con variantes de tokens: `accent`, `support`, `danger`)
  - `src/components/calculator/pricing-simulator.tsx` (simulador reactivo Margen vs Markup y punto de equilibrio)
  - `src/components/calculator/quick-unit-cost.tsx` (cálculo de tanda/receta, insumos con mermas y mano de obra)
  - `src/components/onboarding/onboarding-interactive.tsx` (flujo híbrido en 3 pasos con stickers y activación selectiva de módulos)
  - `src/app/page.tsx` (dashboard principal accesible con navegación por solapas)
- **Conexiones**:
  - `pricing-simulator.tsx` consume las funciones puras de `pricing.ts` mostrando en tiempo real precios comparados y unidades de equilibrio.
  - `quick-unit-cost.tsx` consume `supplies.ts` para aplicar factores de conversión y mermas a insumos con formato `es-AR`.
  - `onboarding-interactive.tsx` tipa y valida el modelo de negocio contra `BusinessProfileSchema`.

### [Feature 3] Fase 2 — Inteligencia, Modelos Gratuitos y Onboarding Híbrido Asistido por LLM
- **Fecha**: 2026-10-07
- **Archivos creados/modificados**:
  - `src/lib/llm/schemas.ts` (esquema Zod estricto para estructurar y validar sugerencias de perfil, equipos, insumos y preguntas dinámicas)
  - `src/lib/llm/prompts.ts` (system prompt versionado y constructor de prompt con contexto argentino y restricción de nunca calcular precios)
  - `src/lib/llm/fallback.ts` (motor heurístico de degradación elegante cuando no hay conexión o API key configurada)
  - `src/lib/llm/client.ts` (soporte multimodelo: Google Gemini Flash gratuito, Groq Llama 3 gratuito, Claude de Anthropic y fallback heurístico)
  - `src/app/api/onboarding/extract/route.ts` (route handler de Next.js que expone el endpoint seguro `/api/onboarding/extract`)
  - `src/components/onboarding/onboarding-interactive.tsx` (integración completa del llamado al asistente, presentación de resumen, stickers `estimado` y preguntas de seguimiento dinámicas)
  - `src/lib/llm/__tests__/llm-extraction.test.ts` (tests unitarios para el fallback y validación del esquema Zod)
  - `.env.example` (documentación de claves gratuitas)

### [Feature 4] Fase 3 — Gestión de Productos, Control de Inflación y Variación de Costos
- **Fecha**: 2026-10-07
- **Archivos creados/modificados**:
  - `src/domain/calculator/inflation.ts` (motor determinístico para cálculo de días desde la última actualización, umbrales de alerta y simulación de variaciones)
  - `src/domain/calculator/__tests__/inflation.test.ts` (cobertura completa de casos de inflación y simulación de aumento de insumos y tarifas)
  - `src/components/calculator/inflation-alert-badge.tsx` (etiqueta visual accesible con estados `ok`, `warning` (>30 días) y `critical` (>45 días o sin fecha))
  - `src/components/calculator/product-catalog-manager.tsx` (administrador de recetas/productos con edición rápida de precios de insumos en pesos)
  - `src/components/calculator/cost-variation-simulator.tsx` (simulador en tiempo real de subas inflacionarias en insumos y tarifas energéticas)
  - `src/app/page.tsx` (integración en el menú principal con alerta global de insumos por revisar)

### [Feature 5] Fase 4 — Multi-tenant, Persistencia en PostgreSQL y Autenticación con Supabase
- **Fecha**: 2026-10-07
- **Archivos creados/modificados**:
  - `src/lib/supabase/schema.sql` (esquema DDL completo con tablas `business_profiles`, `supplies`, `products` y políticas Row Level Security `auth.uid() = user_id`)
  - `src/lib/supabase/client.ts` (cliente browser de `@supabase/ssr` para componentes interactivos)
  - `src/lib/supabase/server.ts` (cliente servidor seguro de `@supabase/ssr` con cookies en Server Actions y Server Components)
  - `src/lib/supabase/auth-actions.ts` (Server Actions para registro, login y logout)
  - `src/lib/supabase/db-actions.ts` (Server Actions con validación Zod estricta para guardar y leer perfiles y productos con RLS)
  - `src/components/auth/auth-modal.tsx` (formulario UI de autenticación y estado de sesión)
  - `src/app/page.tsx` (nueva pestaña 'Guardar en la Nube' y sincronización de sesión)
  - `.env.example` (instrucciones para `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
- **Conexiones**:
  - Aislamiento multi-tenant no negociable (Sección 8 de `context.md`): ningún usuario puede leer ni modificar costos de otro emprendimiento.
  - Toda mutación pasa primero por validación Zod (`safeParse`) antes de tocar la base de datos.
