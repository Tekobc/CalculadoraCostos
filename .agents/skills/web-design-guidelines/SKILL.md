---
name: web-design-guidelines
description: >-
  Use this skill to audit and review UI components, accessibility (WCAG AA), forms, keyboard navigation,
  and layout quality after building or updating screens.
---

# Web Design & Interface Guidelines Audit

## Purpose
Enforce interface quality, accessibility, usability, and design system adherence on all frontend screens.
Run this audit as a post-implementation review step.

---

## Audit Checklist

### 1. Accessibility (WCAG AA Standards)
- [ ] **Contrast**: Text elements meet at least 4.5:1 contrast against their background (e.g., `#16302B` on `#F3F8F6`).
- [ ] **Touch Targets**: All interactive elements (buttons, inputs, clickable badges) have minimum 44 × 44 px hit areas on mobile.
- [ ] **Keyboard & Focus**: All interactive controls are fully reachable and operatable via keyboard; visible focus rings (`focus-visible`) are never removed.
- [ ] **Labels & Semantics**: Every `<input>`, `<select>`, `<textarea>` has an associated `<label>` or accessible label (`aria-label`). Error states are announced and not conveyed solely through color.
- [ ] **Reduced Motion**: Respects `prefers-reduced-motion` on transitions and keyframe animations.

### 2. Microcopy & UX Voice (Argentine Spanish Context)
- [ ] **Sentence Case**: Titles and buttons in sentence case ("Guardar perfil", not "GUARDAR PERFIL" or "Guardar Perfil").
- [ ] **Clear Actions**: Button labels explicitly describe outcome ("Guardar perfil", "Confirmar insumos").
- [ ] **Error Explanations**: Errors explain what happened and how to fix it without technical jargon.
- [ ] **Estimations**: LLM-suggested values display the visible tag **"estimado"** until confirmed by user.
- [ ] **Currency Formatting**: Formatted via `Intl.NumberFormat('es-AR')` (`$ 1.234,50`) with tabular figures (`tabular-nums`).

### 3. Layout & Responsiveness
- [ ] **Mobile-first**: Layout functions seamlessly on 360px width viewports without horizontal scroll.
- [ ] **Clarity**: Key numbers (unit cost, recommended price, profit margin) visible first; fine details collapsible or progressive.
