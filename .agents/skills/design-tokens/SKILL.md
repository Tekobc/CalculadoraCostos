---
name: design-tokens
description: >-
  Use this skill to reference and apply the core design tokens, color palette, typography,
  and layout rules specified in context.md (Section 10).
---

# Design Tokens Reference (Calculadora de Costos)

Source of truth: `context.md` (Sección 10). Always use CSS variables / Tailwind theme tokens rather than hardcoding values.

---

## 1. Color Palette Tokens

| Token CSS / Tailwind | Nombre | Hex | Propósito |
|---|---|---|---|
| `--color-bg-canvas` / `canvas` | Menta pálida | `#F3F8F6` | Fondo general de la aplicación |
| `--color-text-main` / `ink` | Tinta verde | `#16302B` | Texto principal, títulos y encabezados |
| `--color-primary` / `primary` | Verde profundo | `#0F7B6C` | Botones de acción principal, estados activos |
| `--color-accent` / `accent` | Ámbar | `#FFB400` | Destacados, valores "estimados", celebraciones |
| `--color-support` / `support` | Coral | `#FF7A90` | Etiquetas / stickers del perfil, detalles amistosos |
| `--color-danger` / `danger` | Rojo suave | `#D6455D` | Alertas de validación y errores reales |

---

## 2. Typography

- **Títulos (`font-heading`)**: `Bricolage Grotesque`, sans-serif. Formas amables y con personalidad.
- **Cuerpo (`font-body`)**: `Figtree`, sans-serif. Limpia, moderna y de alta legibilidad.
- **Valores numéricos**: Obligatorio `font-mono` o `tabular-nums` (`font-variant-numeric: tabular-nums`).
- **Largo de línea**: `max-w-prose` (≤ 80 caracteres).

---

## 3. Formatting Rules

- **Moneda Argentina**: `$ 1.234,50` (Punto para miles, coma para centavos):
  ```typescript
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(val);
  ```
- **Fechas**: Formato local `dd/mm/aaaa` o relativas para antigüedades de costos ("hace 45 días").
