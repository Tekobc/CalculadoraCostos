---
name: graphify
description: >-
  Use this skill to inspect or generate repository relationship graphs and architectural maps,
  understanding how calculations, schemas, and components connect.
---

# Graphify (Codebase Architecture & Dependency Mapping)

## Purpose
Helps map dependencies, schemas, and functional relationships across the codebase without reading every file individually.

## Core Rules for this Project
1. **Never index secrets**: Exclude `.env*`, keys, and user/client data.
2. **Keep deterministic core highlighted**: Ensure the boundary between the deterministic calculation engine (`/lib/calculator` or `/domain`) and LLM suggestions is clearly separated.
3. Output mapping directories (such as `graphify-out/`) should remain ignored in `.gitignore`.
