---
id: mongodb
title: MongoDB Specifics
description: What changes when the datasource provider is mongodb — the findRaw and aggregateRaw argument schemas, how they are gated, and the @db.ObjectId mapping.
---

MongoDB is a fully supported provider. The provider string is read from the `datasource` block and drives a small number of branches in the pipeline; every other artifact — object schemas, CRUD argument schemas, pure models, variants, results — is produced exactly as it is for the SQL providers.

Three things are MongoDB-only: two extra argument schemas per model (`findRaw`, `aggregateRaw`), the `@db.ObjectId` length constraint, and the connector-gated operations and arguments MongoDB does not get.

## Minimal setup

```prisma
generator client {
  provider = "prisma-client"
  output   = "../src/generated/prisma"
}

generator zod {
  provider = "prisma-zod-generator"
  output   = "./generated"
  config   = "./zod-generator.config.json"
}

datasource db {
  provider = "mongodb"
  // Newer Prisma 7 releases reject `url` here (verified on 7.9): move the
  // connection string to prisma.config.ts, or pass an adapter to the
  // PrismaClient constructor. On Prisma 7.0 and earlier it is still accepted as
  // `url = env("DATABASE_URL")`.
}

model Post {
  id      String @id @default(auto()) @map("_id") @db.ObjectId
  ownerId String @db.ObjectId
  title   String
}
```

## The raw operation schemas

`findRaw` and `aggregateRaw` are the only raw operations Prisma reports per model, and they are the only extra operations the generator handles for MongoDB. Their argument schemas are emitted into `objects/`, alongside the regular input objects:

| Operation on `Post` | Emitted file | Exports |
| --- | --- | --- |
| `findRaw` | `objects/findPostRaw.schema.ts` | `PostFindRawObjectSchema`, `PostFindRawObjectZodSchema` |
| `aggregateRaw` | `objects/aggregatePostRaw.schema.ts` | `PostAggregateRawObjectSchema`, `PostAggregateRawObjectZodSchema` |

Details worth knowing:

- The **file name is the Prisma operation name** (`find<Model>Raw`, `aggregate<Model>Raw`), because input object files use the `{InputType}.schema.ts` pattern by default. The **export name** comes from the Prisma args type with `Args` stripped (`PostFindRawArgs` becomes `PostFindRaw`, then the usual `ObjectSchema` suffix), so file name and export name deliberately differ.
- The fields mirror the arguments Prisma declares for that operation on the DMMF `Query` type; the generator copies them verbatim rather than synthesising a shape.
- Both exports are **untyped**. Because the resolved name ends in `Args`, no `z.ZodType<Prisma....>` binding is emitted and no `import type { Prisma }` line is added — unlike, say, `PostCreateInputObjectSchema`. The second export is present only while `exportZodSchemas` is on (see [Dual Schema Exports](/docs/config/dual-exports)).
- Both files are re-exported from `objects/index.ts` like every other object schema.
- There is **no root-level operation schema** for either one: you get `findManyPost.schema.ts` but never a `findRawPost.schema.ts`. The raw operations exist only as these argument object schemas.

## How the raw schemas are gated

There is no `findRaw` switch. Each raw operation follows its non-raw counterpart for the same model:

| Raw operation | Emitted only when this is enabled for the model |
| --- | --- |
| `findRaw` | `findMany` |
| `aggregateRaw` | `aggregate` |

On top of that, the model itself must be enabled (`models.<Model>.enabled` not `false`), and object schemas must be emitted at all (`emit.objects` not `false`).

The operation check consults exactly one place: the per-model allow-list `models.<Model>.operations`. A model with no `operations` array has no operation restrictions, so both raw schemas are emitted. To suppress them, give the model an `operations` array that omits `findMany` and `aggregate`:

```json
{
  "models": {
    "Post": {
      "operations": ["findUnique", "findFirst", "create", "update", "delete"]
    }
  }
}
```

With that config, `objects/findPostRaw.schema.ts` and `objects/aggregatePostRaw.schema.ts` are not written — along with `Post`'s `findMany` and `aggregate` argument schemas, which is the point of the list.

:::caution Two settings that do not suppress them
`globalExclusions.operations` is honoured by the CRUD emitters but not by the raw-operation check, which reads only the per-model list. `{"globalExclusions": {"operations": ["findMany", "aggregate"]}}` therefore removes the `findMany` and `aggregate` argument schemas and still writes both raw argument schemas.

`mode: "minimal"` does not remove them either. Minimal mode's object filter drops names ending in `Args`, and these files are named after the operation (`findPostRaw`), so they fall through to the default allow. Note that listing a model under `models` in minimal mode gives it the minimal operation set (`findMany`, `findUnique`, `findFirst`, `create`, `update`, `delete`), which keeps `findRaw` and drops `aggregateRaw`.
:::

## `findRaw` and `aggregateRaw` are not values for `operations`

They are not part of the configurable operation vocabulary. The enum behind `models.<Model>.operations` (and `globalExclusions.operations`) lists the seventeen standard Prisma operations only — `findMany`, `findUnique`, `findUniqueOrThrow`, `findFirst`, `findFirstOrThrow`, `create`, `createMany`, `createManyAndReturn`, `update`, `updateMany`, `updateManyAndReturn`, `upsert`, `delete`, `deleteMany`, `aggregate`, `groupBy`, `count`.

Consequences of writing `"operations": ["findRaw"]` anyway:

- An editor validating your config against the bundled JSON Schema flags the value as not allowed (see [JSON Schema IntelliSense](/docs/config/schema-json)).
- Generation does not validate the config against that schema, so nothing fails. The string simply matches no operation, and because `operations` is an allow-list it disables every standard operation for that model — which, via the gating above, also removes the raw schemas.

Control the raw schemas through `findMany` and `aggregate`.

## `@db.ObjectId`

A `String` field carrying `@db.ObjectId` keeps its `z.string()` base and gains `.max(24)`, the fixed length of an ObjectId in hex form. This happens in the input object schemas under `objects/`, and so in every CRUD argument schema that references them. For the `Post` model above:

| Prisma field | Emitted in `objects/PostCreateInput.schema.ts` |
| --- | --- |
| `id String @id @default(auto()) @map("_id") @db.ObjectId` | `id: z.string().max(24).optional()` |
| `ownerId String @db.ObjectId` | `ownerId: z.string().max(24)` |
| `title String` | `title: z.string()` |

`id` is optional because `@default(auto())` makes it optional in Prisma's own create input, not because of `@db.ObjectId`.

The constraint comes from the field's native type — the same mechanism that turns `@db.VarChar(255)` into `.max(255)`. When a field also carries a `@zod` annotation with its own `.max(...)`, the more restrictive of the two values is used and any other `.max(...)` in the chain is replaced.

:::note
Pure model schemas (`models/`), variant schemas (`variants/`) and result schemas (`results/`) map `String` to a bare `z.string()`. None of them reads native types, so `@db.ObjectId` adds nothing there, and their output does not vary by provider.
:::

## Models whose name contains `Raw`

Raw operations are matched by **exact operation name**, never by looking for the substring `Raw`. When the provider is `mongodb`, the generator records the operation names Prisma itself reports for each enabled model and tests candidate names against that record; for any other provider the record is cleared, so it cannot leak into a later non-MongoDB run in the same process.

A model called `MaterialRaw` therefore keeps its complete CRUD surface (`findManyMaterialRaw.schema.ts`, `createOneMaterialRaw.schema.ts`, `groupByMaterialRaw.schema.ts`, `objects/MaterialRawWhereInput.schema.ts`, and so on), and its own raw operations are registered under their real Prisma names. With models `Material` and `MaterialRaw` side by side:

| Model | Raw argument file | Export |
| --- | --- | --- |
| `Material` | `objects/findMaterialRaw.schema.ts` | `MaterialFindRawObjectSchema` |
| `MaterialRaw` | `objects/findMaterialRawRaw.schema.ts` | `MaterialRawFindRawObjectSchema` |
| `MaterialRaw` | `objects/aggregateMaterialRawRaw.schema.ts` | `MaterialRawAggregateRawObjectSchema` |

`findMaterialRaw` is `Material`'s genuine `findRaw` argument schema — exact-name matching keeps it from being mistaken for something belonging to `MaterialRaw`. A model with `Raw` in the middle of its name (`BerkMaterialRawInitial`) is handled the same way.

This was [issue #382](https://github.com/omar-dulaimi/prisma-zod-generator/issues/382), fixed in 2.1.6. Earlier versions reconstructed raw operation names from a substring check and misclassified these models.

## Arguments MongoDB does not get

Two connector-gated pieces of the CRUD surface are omitted for `mongodb`:

- **`createManyAndReturn` and `updateManyAndReturn` schemas are not emitted.** They are generated only when the provider is `postgresql` or `cockroachdb`.
- **`createMany` has no `skipDuplicates` argument.** That field is added only for `postgresql` and `cockroachdb`, so the MongoDB schema carries just `data`:

```ts
// createManyPost.schema.ts
export const PostCreateManyZodSchema = z
  .object({
    data: z.union([PostCreateManyInputObjectSchema, z.array(PostCreateManyInputObjectSchema)]),
  })
  .strict();
```

:::caution
The provider check for the two `AndReturn` operations is only reached when the model has no explicit `operations` array — a per-model allow-list is consulted first and wins. Listing `createManyAndReturn` or `updateManyAndReturn` for a MongoDB model re-enables emission of schemas the connector has no counterpart for. Leave them out of the list.
:::

## See also

- [Object & CRUD Generation](/docs/pipeline/objects-crud) — the pass that writes `objects/` and the operation schemas
- [Filtering](/docs/config/filtering) — `models.<Model>.operations`, `globalExclusions`
- [Emission Controls](/docs/config/emission-controls) — `emit.objects` and the other off switches
- [Generation Modes](/docs/config/modes) — what `mode: "minimal"` prunes
- [Special Type Mapping](/docs/pipeline/special-types) — the full scalar mapping table
- [@zod Comment Annotations](/docs/pipeline/zod-comments) — native-type constraints and how `@zod.max(...)` interacts with them
