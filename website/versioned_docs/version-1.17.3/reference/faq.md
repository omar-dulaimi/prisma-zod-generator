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

**Where should I place my config file?** Config file paths are resolved relative to your Prisma schema file, not the project root. If your schema is at `prisma/schema.prisma` and you use `config = "./my-config.json"`, the generator will look for `prisma/my-config.json`.

**My config file isn't being found, what's wrong?** Check that:
1. The path in `config = "./path/to/config.json"` is relative to your schema file location
2. The file exists at the resolved path (generator will show the full resolved path in error messages)
3. The config file contains valid JSON
4. You're not using an empty config path (`config = ""` will throw an error)
