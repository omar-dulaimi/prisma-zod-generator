---
id: faq
title: FAQ
---

**Why are select/include schemas missing?** Minimal mode disables them unconditionally to keep surface lean.

**Why didn’t my JSON config output path apply?** Generator block `output` attribute (if explicitly present) takes precedence.

**How do I exclude a field across all variants?** Use `globalExclusions` or legacy global array; variant-specific overrides for finer control.

**Can I only emit pure models?** Enable `pureModels`, disable variants or set all variant enabled flags false (custom mode) → pureModelsOnly heuristic.

**Why enums missing?** `emit.enums=false` was set; object/CRUD schemas referencing enums may fail.

**How do I control optional field validation?** Use `optionalFieldBehavior` to choose between `.nullish()` (default), `.optional()`, or `.nullable()` for optional Prisma fields.
