---
id: what-is
title: Prisma Zod Generator
sidebar_label: What is it?
---

Generate strongly-typed, configurable Zod schemas directly from your Prisma schema (DMMF). Supports:

- Multiple schema variants (pure / input / result) and custom variant arrays
- Pure model schemas with customizable naming presets
- Minimal, full, and custom generation modes
- Fine-grained model / operation / field filtering with wildcard patterns
- Emission controls (enums, objects, CRUD, variants, pure models, results)
- Single-file or multi-file output layouts
- Enhanced Bytes & JSON handling, relation heuristics, aggregate support
- `@zod` comment annotations for inline validation rules

Why this matters:

- Eliminates drift between Prisma types and runtime validation
- Gives you adjustable surface area (lean minimal mode → full CRUD)
- Enables domain-specific filtered bundles (e.g. public API vs internal tools)
