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
        CALC_E["energy.ts"]
        CALC_S["supplies.ts"]
        CALC_P["pricing.ts"]
        CALC_U["unit-cost.ts"]
        TESTS["__tests__ (14 tests pasando)"]
    end

    subgraph UI_Tokens [Tokens & Estilos]
        CSS_TOK["src/styles/tokens.css"]
        TW_CFG["tailwind.config.js"]
    end

    Skills --> CTX
    CTX --> SCH_P
    CTX --> SCH_C
    SCH_C --> CALC_U
    CALC_E --> CALC_U
    CALC_S --> CALC_U
    CALC_E --> TESTS
    CALC_S --> TESTS
    CALC_P --> TESTS
    CALC_U --> TESTS
    DT --> CSS_TOK
    CSS_TOK --> TW_CFG
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
  - `typecheck`: 0 errores de TypeScript en modo estricto.
