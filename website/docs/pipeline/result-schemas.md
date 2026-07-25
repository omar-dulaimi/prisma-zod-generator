---
id: result-schemas
title: Result Schemas
description: Per-operation Zod schemas for Prisma query results, and the relation-field contract that references pure model schemas.
---

Result schemas validate what Prisma **returns**, not what you pass in. Every other artifact in the pipeline describes the request side — `where`, `data`, `orderBy`, `select`. Result schemas describe the response side, so you can parse a Prisma result before it crosses an API boundary, or assert the shape of a fixture in a test.

They are written to `results/` under the schemas path (`<output>/schemas/results/`, or `<output>/results/` when `output` already ends in `schemas`).

## Emitted files

One file per model per operation, named `<Model><Operation>Result.schema.ts`, exporting a single const named `<Model><Operation>ResultSchema`. All thirteen operations below are emitted for every enabled model — `models.<Model>.operations` filters CRUD argument schemas, not this directory. The `findUniqueOrThrow`, `findFirstOrThrow`, `createManyAndReturn` and `updateManyAndReturn` operations have no result schema of their own.

| Operation | Top-level shape |
| --- | --- |
| `findUnique`, `findFirst` | `z.nullable(<record>)` |
| `update`, `delete` | `z.nullable(<record>)` |
| `create`, `upsert` | `<record>` |
| `findMany` | `z.object({ data: z.array(<record>), pagination: <pagination> })` |
| `createMany`, `updateMany`, `deleteMany` | `z.object({ count: z.number() })` |
| `count` | `z.number()` |
| `aggregate` | `z.object({ _count, _sum, _avg, _min, _max })` |
| `groupBy` | `z.array(z.object({ <scalars>, _count, _sum, _avg, _min, _max }))` |

`<record>` is a `z.object({ ... })` over the model's fields. `<pagination>` is a fixed object with `page`, `pageSize`, `total`, `totalPages`, `hasNext` and `hasPrev`.

On `aggregate` and `groupBy`, `_count` lists every field of the model (including relation fields) as `z.number()` and is `.optional()`; `_sum` and `_avg` are emitted only when the model has at least one `Int`/`Float`/`Decimal`/`BigInt` field; `_min` and `_max` only when it has at least one `Int`/`Float`/`Decimal`/`DateTime`/`String`/`BigInt` field. Each of those four is `.nullable().optional()`.

A `results/index.ts` re-exporting every generated result schema is written alongside them and registered with the root schemas index.

The file names and export names above are fixed. `naming.schema` patterns do not apply to `results/`; the only configurable identifiers in these files are the pure model schemas they import (see below).

## When result schemas are emitted

They are on by default in `full` mode (and in `custom` mode, which inherits the same variant defaults). Generation is skipped when any of the following holds:

- `mode` is `"minimal"`. Minimal mode is checked directly in `Transformer.generateResultSchemas`, so it wins even if you re-enable `variants.result` by hand. Minimal mode's own defaults also set `variants.result.enabled` to `false`.
- `variants.result.enabled` is `false`. The generator block option `variants = "pure,input"` produces exactly this, because it enables only the variants you list.
- `emit.results` is `false`.
- `emit.crud` is `false`. Result schemas are produced as part of the CRUD pass, so disabling CRUD also removes `results/` — `emit.results: true` cannot bring it back.
- One of the pure-only heuristics applies (`pureModelsOnlyMode`, `pureVariantOnlyMode`), which suppress the CRUD pass entirely.

Two additional per-model gates apply: `models.<Model>.enabled: false` and `models.<Model>.variants.result.enabled: false`.

:::note
`results/<Model><Op>Result.schema.ts` and `variants/result/<Model>.result.ts` are different artifacts that happen to share the `variants.result.enabled` switch. The second is the result *variant*, described in [Variants System](/docs/config/variants). Field exclusions (`globalExclusions.result`, `variants.result.excludeFields`, `models.<Model>.variants.result.excludeFields`) apply to the variant only — they do not remove fields from `results/`.
:::

## Relation fields

A result schema is built from the model's DMMF fields, and relation fields cannot be expressed by a scalar type map. Since v2.3.2 (issue [#376](https://github.com/omar-dulaimi/prisma-zod-generator/issues/376)) they reference the related model's pure schema when one is available:

- list relation: `z.array(<Model>Schema).optional()`
- to-one relation: `<Model>Schema.optional()`

with a matching `import { <Model>Schema } from '../models/<Model>.schema';` added to the file. When no pure schema is available, the field falls back to:

- list relation: `z.array(z.unknown()).optional()`
- to-one relation: `z.unknown().optional()`

Under `jsonSchemaCompatible: true` the fallback is `z.any()` instead of `z.unknown()`.

Relation fields are **always** `.optional()`, in both forms and regardless of whether the Prisma field is required. A relation is only present in a query result when the query asks for it with `include` (or `select`), so a schema that demanded `owner` would reject every result of a plain `findMany()`.

### The reference target is `models/`, not `variants/pure/`

A relation field can only point at a pure model schema in `models/`, which requires `pureModels: true` (and `emit.pureModels` not set to `false`). The pure *variant* writes `variants/pure/<Model>.pure.ts` instead and is not a valid reference target — enabling `variants.pure` without `pureModels` leaves relation fields on the fallback.

The imported identifier and file name follow the pure-model naming resolver, so a `naming.preset` changes them: the default preset yields `<Model>Schema` in `<Model>.schema.ts`, while `zod-prisma-types` yields `<Model>` in `<Model>.schema.ts`, and the emitted import tracks whichever you configured. The import specifier also picks up the resolved extension, so an ESM setup that needs `../models/Tag.schema.js` gets it — see [NodeNext / Native TypeScript Imports](/docs/recipes/nodenext-imports).

### The three fallback triggers

1. **Pure models are not emitted.** No `models/` file exists to import.
2. **Self-relations.** A model whose relation targets itself would need the result file to import a schema for its own cycle, so it stays on the fallback.
3. **Single-file mode.** The bundle inlines every schema and strips relative imports, and result schemas are appended to the bundle *before* pure models, so a reference would be a forward reference that does not resolve. Relations therefore degrade to the fallback across the whole bundle. See [Single File Mode](/docs/pipeline/single-file).

## Before and after

```prisma
model Video {
  id      Int    @id @default(autoincrement())
  path    String
  tags    Tag[]
  owner   User   @relation(fields: [ownerId], references: [id])
  ownerId Int
}

model Tag {
  id     Int     @id @default(autoincrement())
  name   String
  videos Video[]
}

model User {
  id     Int     @id @default(autoincrement())
  email  String  @unique
  videos Video[]
}
```

With `pureModels` off:

```json title="zod-generator.config.json"
{
  "mode": "full",
  "pureModels": false
}
```

```ts title="generated/schemas/results/VideoCreateResult.schema.ts"
import * as z from 'zod';
export const VideoCreateResultSchema = z.object({
  id: z.number().int(),
  path: z.string(),
  tags: z.array(z.unknown()).optional(),
  owner: z.unknown().optional(),
  ownerId: z.number().int()
});
```

With `pureModels` on:

```json title="zod-generator.config.json"
{
  "mode": "full",
  "pureModels": true
}
```

```ts title="generated/schemas/results/VideoCreateResult.schema.ts"
import * as z from 'zod';
import { TagSchema } from '../models/Tag.schema';
import { UserSchema } from '../models/User.schema';
export const VideoCreateResultSchema = z.object({
  id: z.number().int(),
  path: z.string(),
  tags: z.array(TagSchema).optional(),
  owner: UserSchema.optional(),
  ownerId: z.number().int()
});
```

Scalar fields are untouched between the two: the required foreign key `ownerId` stays non-optional, and only the two relation fields change.

### Self-relation

```prisma
model Node {
  id       Int    @id @default(autoincrement())
  name     String
  parent   Node?  @relation("NodeChildren", fields: [parentId], references: [id])
  parentId Int?
  children Node[] @relation("NodeChildren")
}
```

Even with `pureModels: true`, `Node` never imports itself:

```ts title="generated/schemas/results/NodeFindUniqueResult.schema.ts"
import * as z from 'zod';
export const NodeFindUniqueResultSchema = z.nullable(z.object({
  id: z.number().int(),
  name: z.string(),
  parent: z.unknown().optional(),
  parentId: z.number().int().optional(),
  children: z.array(z.unknown()).optional()
}));
```

Note the two kinds of optionality in that file: `parentId` is `.optional()` because the Prisma field is nullable, while `parent` and `children` are `.optional()` because they are relations.

## Depth of the referenced schema

The pure model schema you get is whatever [Pure Model Schemas](/docs/pipeline/pure-models) is configured to emit. With the default `pureModelsIncludeRelations: false`, `UserSchema` covers `User`'s scalars and enums but not `User`'s own relations — which matches a one-level `include`. Generated schemas are plain `z.object(...)` with no `.strict()`, so a deeper `include` still parses; the extra nested keys are stripped rather than rejected.

## Field mapping caveats

Result schemas use their own type map, which is narrower than the one behind pure models and object schemas:

- `DateTime` is always `z.date()`. `dateTimeStrategy` and `dateTimeSplitStrategy` do not reach `results/`.
- `Decimal` is always `z.number()`, regardless of `decimalMode`.
- `Bytes` is `z.instanceof(Uint8Array)`.
- `Json` is `z.unknown()`.
- Enum fields fall back to `z.unknown()`; no enum schema is imported.
- Nullable scalars get a plain `.optional()`. `optionalFieldBehavior` (`optional`/`nullable`/`nullish`) shapes pure model schemas, not `results/`.
- `jsonSchemaCompatible: true` replaces `DateTime`, `BigInt` and `Bytes` with the regex-validated string forms described in [JSON Schema Compatibility](/docs/config/json-schema-compatibility), and turns every `z.unknown()` above into `z.any()`.

Each file contains the zod import, any `../models/` imports, and one `export const`. No `export type` companion and no typed/method-friendly export pair is written, so derive types yourself with `z.infer<typeof VideoCreateResultSchema>`.

Generated schema files are not run through a formatter unless `formatGeneratedSchemas: true`, so on-disk whitespace differs from the snippets above; the expressions do not.

## See also

- [Object & CRUD Generation](/docs/pipeline/objects-crud) — the pass that result schemas ride along with
- [Pure Model Schemas](/docs/pipeline/pure-models) — what the relation references point at
- [Emission Controls](/docs/config/emission-controls) — `emit.results`, `emit.crud`, `emit.pureModels`
- [Generation Modes](/docs/config/modes) — why minimal mode has no `results/`
- [Result Variant Only](/docs/recipes/result-only) — the variant artifact and how it differs
