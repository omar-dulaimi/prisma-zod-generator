---
id: performance
title: Performance & Build Tips
---

Strategies to reduce generation time and bundle size.

## Use Minimal Mode for Fast Iteration

`mode: "minimal"` prunes deep nested inputs and disables select/include.

## Targeted Model Generation

Models are **enabled by default** — adding an entry under `models` does not restrict generation to just that entry. To skip a model you have to disable it explicitly:

```json title="zod-generator.config.json"
{
  "models": {
    "AuditLog": { "enabled": false },
    "LegacyImport": { "enabled": false }
  }
}
```

Use per-model `operations` to trim the CRUD surface of the models you do keep.

## Disable Unused Categories

Turn off `emit.crud`, `emit.results`, or `emit.variants` when not needed.

## Single File for Deployment

`useMultipleFiles: false` produces one file—ideal for serverless bundling. Since v2.1.5 the shared `literalSchema` / `jsonSchema` helpers are hoisted and deduplicated instead of being repeated per schema, so the bundled file is smaller than on earlier releases.

## Lean Pure Models

`pureModelsLean` is already `true` by default, so pure models are emitted without the JSDoc/stat comment blocks. Only revisit this if you have set it to `false`.

Relations are likewise excluded by default (`pureModelsIncludeRelations: false`). If you opted in, trim expensive relations with `globalExclusions.pure` or `pureModelsExcludeCircularRelations: true`.

## Avoid Enum Explosion

Exclude enums or limit variants if you have large enum sets.

## CI Pipelines

Generation is a single `prisma generate` step, so the wins in CI come from not repeating it: cache `node_modules` and the generated output directory, and run `prisma generate` once in a `prebuild` step rather than per test shard.

Since v2.1.5 the generator reuses the DMMF that Prisma hands it (`options.dmmf`) instead of re-parsing `schema.prisma` with `@prisma/internals`, which removes a redundant full-schema parse from every run.
