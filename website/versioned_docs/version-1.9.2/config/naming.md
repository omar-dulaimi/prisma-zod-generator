---
id: naming
title: Naming & Presets
---

Pure model naming resolved by `resolvePureModelNaming`:

Presets:

- `default`: `{Model}.schema.ts`, export `{Model}Schema` / type `{Model}Type`.
- `zod-prisma`: same as default + legacy aliases.
- `zod-prisma-types`: file `{Model}.schema.ts`, export `{Model}` (no suffixes), legacy aliases.
- `legacy-model-suffix`: `{Model}.model.ts`, export `{Model}Model`.

Overrides via `naming.pureModel`:

- `filePattern` (`{Model}.schema.ts`, supports tokens `{Model}{SchemaSuffix}` etc.)
- `schemaSuffix`, `typeSuffix`, `exportNamePattern`, `legacyAliases`.

Relation import rewriting adapts when using `.model` pattern.
