<div align="center">

# ⚙️ Prisma Zod Generator – Configuration Reference

<em>Authoritative reference for every config flag supported by <code>prisma-zod-generator</code>.</em>

</div>

This file documents the structure of `zod-generator.config.json` (or the object passed via the Prisma generator block `config` option). Every option is optional. Sensible defaults apply per `mode`.

Quick navigation:
- [Modes](#modes)
- [Core output & layout](#core-output--layout)
- [Schema content controls](#schema-content-controls)
- [Explicit emission controls](#explicit-emission-controls)
- [Variants](#variants)
- [Per‑model overrides](#models)
- [Single-file mode specifics](#single-file-mode)
- [Zod import target](#zod-import-target)
- [Field exclusion precedence](#field-exclusion-logic-summary)
- [Patterns & examples](#recommended-config-patterns)
- [Troubleshooting / FAQ](#troubleshooting)

---

## Core Output & Layout

| Option | Type | Default | Applies When | Purpose |
|--------|------|---------|--------------|---------|
| `mode` | `full | minimal | custom` | `full` | always | Generation profile (see [Modes](#modes)). |
| `output` | `string` | `./generated/schemas` | always | Target directory (Prisma generator `output` wins if both given). |
| `useMultipleFiles` | `boolean` | `true` | always | Multi-file tree vs single bundle. |
| `singleFileName` | `string` | `schemas.ts` | `useMultipleFiles=false` | Bundle filename. |
| `placeSingleFileAtRoot` | `boolean` | `true` | single-file | Put bundle at root (true) or inside `schemas/`. |
| `formatGeneratedSchemas` | `boolean` | `false` | always | Pretty-format schema files (slower). |
| `placeArrayVariantsAtRoot` | `boolean` | `true` | internal/future | Planned variants folder layout flag (no effect today). |

## Schema Content Controls

| Option | Type | Default (full) | Minimal Mode | Description |
|--------|------|----------------|--------------|-------------|
| `pureModels` | `boolean` | `false` | `true` | Emit plain model Zod objects (no operation wiring). |
| `addSelectType` | `boolean` (legacy) | `false` | forced `false` | Legacy select helper schemas (prefer variants). |
| `addIncludeType` | `boolean` (legacy) | `false` | forced `false` | Legacy include helper schemas. |
| `strictCreateInputs` | `boolean` | `true` | `true` | Ignore exclusions for create inputs when true. |
| `preserveRequiredScalarsOnCreate` | `boolean` | `true` | `true` | Keep required scalar fields even when `strictCreateInputs=false`. |
| `inferCreateArgsFromSchemas` | `boolean` | `false` | `false` | Build create args from generated schemas instead of Prisma types. |
| `pureModelsLean` | `boolean` | `true` | `true` | When `pureModels` are enabled, emit a lean form (no JSDoc header blocks, statistics, or field doc comments). Set `false` to restore rich docs. |
| `pureModelsIncludeRelations` | `boolean` | `false` | `false` | When `pureModels` are enabled, include relation fields (lazy refs). Default omits relations for slimmer pure models. |
| `pureModelsExcludeCircularRelations` | `boolean` | `false` | `false` | When `pureModelsIncludeRelations` is true, exclude relation fields that would create circular references. Keeps foreign key fields but omits relation object fields to avoid TypeScript circular dependency errors. |
| `dateTimeStrategy` | `"date" | "coerce" | "isoString"` | `"date"` | `"date"` | Maps Prisma `DateTime` scalars in generated schemas. See DateTime Strategies section. |
| `optionalFieldBehavior` | `"nullish" | "optional" | "nullable"` | `"nullish"` | `"nullish"` | Controls how optional Prisma fields are mapped to Zod validations. See Optional Field Strategies section. |

## Explicit Emission Controls

Fine‑grained on/off switches. Omit a key to retain legacy/heuristic behavior. Set to `false` to hard disable regardless of mode heuristics.

| Key | Type | Default (implicit) | Effect |
|-----|------|--------------------|--------|
| `emit.enums` | boolean | `true` | Generate enum schemas (required by many inputs/CRUD). Disabling while keeping objects/crud may break imports (warning logged). |
| `emit.objects` | boolean | `true` unless suppressed by minimal / pure‐only heuristics | Generate input/object schemas under `objects/`. |
| `emit.crud` | boolean | `true` unless suppressed by pure variant only heuristics | Generate operation arg schemas (findMany, createOne, etc.). |
| `emit.results` | boolean | Follows legacy gating (`mode!=='minimal'` and `variants.result.enabled!==false`) | Generate result schemas under `results/`. Set `false` to force skip. |
| `emit.pureModels` | boolean | Mirrors `pureModels` flag | Emit pure model schemas even if variants heuristics would suppress. |
| `emit.variants` | boolean | `true` if any variant enabled | Emit variant wrapper/index directory. Set `false` to skip variant layer entirely. |

Example – only pure model variant plus enums:
```jsonc
{
  "mode": "custom",
  "pureModels": true,
  "variants": { "pure": { "enabled": true, "suffix": ".model" }, "input": { "enabled": false }, "result": { "enabled": false } },
  "emit": { "crud": false, "objects": false, "results": false, "variants": true, "enums": true }
}
```

Example – CRUD only (no pure models / results / variants):
```jsonc
{
  "mode": "custom",
  "emit": { "crud": true, "objects": true, "results": false, "pureModels": false, "variants": false }
}
```

Notes:
- `emit.results=false` internally flips `variants.result.enabled=false` to unify gating logic.
- If you disable enums while still emitting objects or CRUD, a warning is logged because generated inputs may reference missing enum schemas.
- Explicit flags always override heuristic shortcuts (e.g. pure‑variant only) for the targeted group.

## Global Filtering

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `globalExclusions` | `{ input?: string[]; result?: string[]; pure?: string[] }` | `{}` | Fields removed from EVERY model for the given variant class. |
| `variants` | object | see below | Global variant enable/suffix/exclusions. |
| `models` | object | `{}` | Per-model granular overrides. |

## Modes

### full
Everything: all object schemas (inputs, filters, nested), operation args, result schemas, and configured variants. Suitable for strongly typed API layers (tRPC/GraphQL) needing full breadth.

### minimal
Focused read/write operations only; skips noisy nested inputs (performance). Defaults: `pureModels: true`, `variants.pure.enabled=true`, `variants.input.enabled=true` (with default exclusions), `variants.result.enabled=false`.

### custom
Starts from base defaults with no opinionated pruning: you explicitly enable/disable pieces via `pureModels`, `variants`, `models.*.operations`, etc.

## globalExclusions
```jsonc
"globalExclusions": {
  "input": ["internalId"],
  "result": ["secret"],
  "pure": ["password"]
}
```
Applied before per-model exclusions; variant-specific overrides still apply.

## Variants

Variant classes let you emit parallel schema sets with different exclusions or naming. Built-in keys: `pure`, `input`, `result`.

| Field | Type | Default (full) | Minimal Mode | Notes |
|-------|------|----------------|--------------|-------|
| `enabled` | `boolean` | `true` for all | `pure:true`, `input:true`, `result:false` | Disable to skip entire variant set. |
| `suffix` | `string` | `.model` / `.input` / `.result` | same | Appended to base name (where applicable). |
| `excludeFields` | `string[]` | `[]` | input gets heuristic exclusions | Field-level removals for that variant. |

Example:
```jsonc
"variants": {
  "pure":  { "enabled": true,  "suffix": ".model" },
  "input": { "enabled": true,  "suffix": ".input",  "excludeFields": ["password"] },
  "result":{ "enabled": false, "suffix": ".result" }
}
```

Heuristics (minimal mode): common audit/meta fields (`id`, `createdAt`, `updatedAt`) auto-excluded from `input` variant to reduce friction.

## Models

Per-model block shape:
```ts
models: {
  [ModelName]: {
    enabled?: boolean;
    operations?: ("findMany"|"findUnique"|"findFirst"|"create"|"createMany"|"update"|"updateMany"|"upsert"|"delete"|"deleteMany"|"aggregate"|"groupBy"|"count")[];
    variants?: { [K in 'pure'|'input'|'result']?: { enabled?: boolean; suffix?: string; excludeFields?: string[] } };
  }
}
```

Example:
```jsonc
"models": {
  "User": {
    "operations": ["findMany", "findUnique", "create", "update"],
    "variants": {
      "input": { "excludeFields": ["password"] },
      "pure":  { "excludeFields": ["password", "internalId"] }
    }
  },
  "AuditLog": { "enabled": false }
}
```

Merge precedence (highest wins):
1. `models[Model].variants[variant].excludeFields`
2. `variants[variant].excludeFields`
3. `globalExclusions[variant]`

## Single-File Mode
Activate via `useMultipleFiles: false`.
Additional keys:
- `singleFileName`: bundle name (default `schemas.ts`).
- `placeSingleFileAtRoot`: put bundle at output root (default true). Set `false` to nest under `schemas/`.

Behavioral differences:
- Index barrels ignored (content is concatenated).
- Pure models can be inlined exclusively if variants disabled (optimization).

## Zod import target

Control how the generator imports Zod to support consumers on Zod v3 or Zod v4.

| Option | Type | Default | Effect |
|--------|------|---------|--------|
| `zodImportTarget` | `"auto" | "v3" | "v4"` | `"auto"` | Chooses the import statement emitted in generated files. |

Mapping:
- `auto` (and `v3`): `import { z } from 'zod'` (works with Zod v3 and v4)
- `v4`: `import * as z from 'zod/v4'`

Notes:
- The package now declares a peerDependency on Zod: `>=3.25.0 <5`. Install your preferred Zod version in your app.
- Single-file bundles hoist a single Zod import at the top using the same strategy.

## Field Exclusion Logic Summary
Order of application:
1. `globalExclusions[variant]`
2. `variants[variant].excludeFields`
3. `models[Model].variants[variant].excludeFields`
4. Legacy `models[Model].fields.exclude` (if parser preserved)

Create inputs: if `strictCreateInputs=true`, exclusions ignored for create-like schemas; if false, apply exclusions but always retain required scalar fields when `preserveRequiredScalarsOnCreate=true`.

## Legacy Flags
`addSelectType`, `addIncludeType`: Kept for backward compatibility; prefer variants. Minimal mode silently disables them.

## Recommended Config Patterns

Minimal REST API:
```jsonc
{
  "mode": "minimal",
  "output": "./zod",
  "pureModels": true,
  "variants": { "result": { "enabled": false } }
}
```

Custom with security exclusions:
```jsonc
{
  "mode": "custom",
  "globalExclusions": { "pure": ["password"], "input": ["internalId"], "result": [] },
  "variants": {
    "pure": { "enabled": true, "suffix": ".model" },
    "input": { "enabled": true, "suffix": ".input" },
    "result": { "enabled": true, "suffix": ".result" }
  },
  "models": {
    "User": { "variants": { "input": { "excludeFields": ["password"] } } }
  }
}
```

Single bundle pure models only:
```jsonc
{
  "mode": "custom",
  "useMultipleFiles": false,
  "pureModels": true,
  "variants": { "pure": { "enabled": false }, "input": { "enabled": false }, "result": { "enabled": false } }
}
```

### DateTime Strategies

Control how Prisma `DateTime` fields are represented in generated Zod schemas using `dateTimeStrategy`.

| Value | Zod Shape | Use Case |
|-------|-----------|----------|
| `date` (default) | `z.date()` | Best when your application already converts incoming strings to `Date` objects before validation (e.g. framework middlewares) or when working purely server-side. |
| `coerce` | `z.coerce.date()` | Accepts strings/numbers/`Date` and coerces to `Date`. Good for ergonomic API ingestion while still ending with a `Date` instance. |
| `isoString` | `z.string().regex(ISO).transform(v => new Date(v))` | Strict ISO-8601 string validation at the boundary then transform to `Date`. Useful for explicit boundary validation or where you want early, clear ISO errors. |

Example JSON config snippet:
```jsonc
{
  "pureModels": true,
  "dateTimeStrategy": "isoString"
}
```

### Optional Field Strategies

Control how optional Prisma fields (marked with `?`) are represented in generated Zod schemas using `optionalFieldBehavior`.

| Value | Zod Shape | TypeScript Type | Use Case |
|-------|-----------|-----------------|----------|
| `nullish` (default) | `z.string().nullish()` | `string \| null \| undefined` | Most semantically correct - field can be omitted entirely, explicitly null, or have a value. Best for API boundaries. |
| `optional` | `z.string().optional()` | `string \| undefined` | Field can be omitted or have a value, but not explicitly null. Good when null values should be rejected. |
| `nullable` | `z.string().nullable()` | `string \| null` | Field must be present but can be null or have a value. Useful when the field is always sent in requests. |

All three options maintain full type compatibility with Prisma's generated types and pass the same runtime validation tests.

**Configuration Examples:**

Generator block (Prisma schema):
```prisma
generator zod {
  provider = "prisma-zod-generator"
  optionalFieldBehavior = "optional"
}
```

JSON config:
```jsonc
{
  "optionalFieldBehavior": "nullish"
}
```

**Generated Output Examples:**

For a Prisma model with an optional field:
```prisma
model User {
  id   Int     @id
  name String?  // Optional field
}
```

The generated schemas will be:
- `nullish`: `name: z.string().nullish()`
- `optional`: `name: z.string().optional()`  
- `nullable`: `name: z.string().nullable()`

### pureModelsLean

When `pureModels: true`, the generator (by default) produces *lean* model schema files: no leading JSDoc banner, no schema statistics block, and no propagated field-level documentation comments. This keeps the emitted files minimal and diff-friendly.

Set `pureModelsLean: false` to re-enable rich documentation (headers + field docs) when you rely on them for code browsing or generated docs.

```jsonc
{
  "pureModels": true,
  "pureModelsLean": false // restore verbose docs
}
```

Notes:
- Lean mode affects only pure model schema emitters; operation/variant schemas are unaffected.
- Tests depending on JSDoc should explicitly set `pureModelsLean: false` to avoid brittleness.

### Inline @zod.custom.use Override

Replace a field's generated schema entirely:

```prisma
model Chat {
  id       String @id @default(cuid())
  /// @zod.custom.use(z.array(z.object({ msg: z.string() })))
  payload  Json   @default("[]")
}
```

Rules:
1. The expression inside `@zod.custom.use(...)` becomes the field schema verbatim.
2. Other inline @zod annotations on that field are ignored once a custom override is detected.
3. Default / optional wrapping still applies based on model metadata.

Helper export:
```ts
import { jsonMaxDepthRefinement } from 'prisma-zod-generator';
const Schema = z.unknown()${'${jsonMaxDepthRefinement(10)}'}; // reuse internal depth validator
```

Use helpers if you want consistent depth / structure guards while hand‑crafting the base shape.

### Inline @zod.custom.use Override

Replace a field's generated schema entirely:

```prisma
model Chat {
  id       String @id @default(cuid())
  /// @zod.custom.use(z.array(z.object({ msg: z.string() })))
  payload  Json   @default("[]")
}
```

Rules:
1. The expression inside `@zod.custom.use(...)` becomes the field schema verbatim.
2. Other inline @zod annotations on that field are ignored once a custom override is detected.
3. Default / optional wrapping still applies based on model metadata.

Helper export:
```ts
import { jsonMaxDepthRefinement } from 'prisma-zod-generator';
const Schema = z.unknown()${'${jsonMaxDepthRefinement(10)}'}; // reuse internal depth validator
```

Use helpers if you want consistent depth / structure guards while hand‑crafting the base shape.

## Troubleshooting
- Missing output directory: generator creates it; ensure process has write permissions.
- Mismatched `useMultipleFiles` between schema block and JSON: a debug warning logs; unify to avoid surprises.
- Unexpected large bundle: disable unused variants or enable single-file pure-model optimization by disabling all variants while keeping `pureModels: true`.
- Create inputs missing fields: either exclusions removed them (set `strictCreateInputs=true`) or field truly optional/auto-generated.

## FAQ
**Q: How do I just get plain model schemas?**
Set `pureModels: true` and disable other variants or use minimal mode.

**Q: How do I exclude a field from every input schema?**
Add it to `globalExclusions.input`.

**Q: Why is a nullable column using `.optional()`?**
Nullable vs optional distinctions are evolving; watch release notes—config stays stable.

---
Generated reference. Keep this file in sync with `src/config/schema.ts` when adding new options.
