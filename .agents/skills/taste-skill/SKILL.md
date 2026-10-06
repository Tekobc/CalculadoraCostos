---
name: taste-skill
description: >-
  Use this skill to guide frontend UI development with high design taste, layout hierarchy,
  refined spacing, typography, and purposeful motion. Respects project-specific tokens
  defined in context.md (calm, warm, accessible palette and tabular nums).
---

# Taste Skill (Frontend Design Intelligence)

## Purpose & Philosophy
This skill prevents generic, repetitive, and bland UI patterns ("AI slop", purple gradients, excessive cards) by enforcing clear craft, hierarchy, and intentional spacing.

> **CRITICAL RULE**: In this project, `context.md` (Section 10) takes precedence over all other styling guides.
> - **Palette**:
>   - Fondo: Menta pálida (`#F3F8F6`)
>   - Texto: Tinta verde (`#16302B`)
>   - Primario: Verde profundo (`#0F7B6C`)
>   - Acento: Ámbar (`#FFB400`)
>   - Apoyo: Coral (`#FF7A90`)
>   - Error: Rojo suave (`#D6455D`)
> - **Tone**: Warm, approachable, calming, not an intimidating accounting tool or flashy landing page.

---

## Configuration Dials (Project Defaults)
- `DESIGN_VARIANCE`: **4 / 10** (Clean, orderly, recognizable layout; avoids eccentric asymmetric chaos).
- `MOTION_INTENSITY`: **3 / 10** (Subtle, responsive feedback only; highlights the profile assembly step; strictly respects `prefers-reduced-motion`).
- `VISUAL_DENSITY`: **5 / 10** (Generous whitespace, mobile-first, one step at a time, clear readability).

---

## Core Guidelines

### 1. Typography & Hierarchy
- **Titles**: Warm, friendly sans (e.g. *Bricolage Grotesque*).
- **Body & UI**: Clean, legible sans (e.g. *Figtree*).
- **Numbers / Currency**: Always apply tabular numbers (`font-variant-numeric: tabular-nums`).
- **Scale**: Strict typestyle hierarchy; avoid using arbitrary font sizes. Max line length 80ch.

### 2. Spacing & Rhythm
- Base 4px / 8px grid system.
- Avoid nesting cards inside cards. Use subtle dividers, whitespace, and typographic contrast instead of borders on everything.
- Radii vary by hierarchy: softer / more rounded on buttons and badges; more restrained on data tables and panels.

### 3. Motion & Interaction
- Animations must directly respond to user actions.
- No decorative looping animations.
- Peak motion moment: dynamic sticker-like tags assembling the profile during onboarding.
