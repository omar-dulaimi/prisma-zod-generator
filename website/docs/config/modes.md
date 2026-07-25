---
id: modes
title: Generation Modes
---

| Mode    | Models default              | Variants default                        | Operations                  | Notes                                                                     |
| ------- | --------------------------- | --------------------------------------- | --------------------------- | ------------------------------------------------------------------------- |
| full    | all enabled                 | all enabled                             | all Prisma ops              | Richest output                                                            |
| minimal | all enabled unless disabled | input & pure enabled (result often off) | Restricted core CRUD + find | Prunes complex nested inputs, disables select/include; model selection behaves exactly like full mode |
| custom  | all enabled unless disabled | respect `variants.*.enabled`            | all unless filtered         | Explicit control                                                          |

Minimal mode specifics:

- **Does not disable models**: every model is generated unless you set `models.<Name>.enabled = false`. Minimal mode narrows the *operation* set and prunes nested input objects; it never blanket-disables models.
- Forces `select/include` disabled even if flags set.
- Applies `MINIMAL_OPERATIONS` for models that do not specify their own `operations`. The built-in set is `findMany`, `findUnique`, `findFirst`, `create`, `update`, `delete`.
- Skips many heavy nested input object schemas (allow-list basics).
- **Create operations use `UncheckedCreateInput` only**: Blocks regular `*CreateInput` schemas that require complex nested relations, favoring simple foreign key-based `*UncheckedCreateInput` schemas.
- **Update operations support both variants**: Allows both `*UpdateInput` and `*UncheckedUpdateInput` for flexibility.

### Overriding the minimal operation set

You can replace the built-in allow-list with your own by adding a top-level `minimalOperations` array of canonical operation names:

```json
{
  "mode": "minimal",
  "minimalOperations": ["findMany", "findUnique", "create", "createMany", "update"]
}
```

The array replaces the built-in allow-list wholesale for models you have not listed under `models` — a model with its own `operations` array always wins, and a model listed without one still receives `MINIMAL_OPERATIONS`. Legacy aliases (`createOne`, `updateOne`, `deleteOne`, `upsertOne`) are normalised to their canonical names before the check, so only the canonical form is needed here. Including `create` or `createMany` additionally unblocks the `*CreateManyInput` object schemas that minimal mode otherwise skips as too heavy.

:::caution
`minimalOperations` is an escape hatch rather than part of the declared config contract: it is absent from the generator's TypeScript config interface and from the published JSON Schema. If you wire up `$schema` (see [JSON Schema IntelliSense](./schema-json.md)), your editor will report it as an unknown property even though the generator honours it.
:::

## Emission Heuristics

| Condition                                                              | Effect                                                            |
| ---------------------------------------------------------------------- | ----------------------------------------------------------------- |
| `pureModels=true` AND all `variants.*.enabled=false` AND `mode=custom` | Pure-models-only (emit only pure model schemas)                   |
| `pureModels=true` AND only `variants.pure.enabled=true`                | Pure-variant-only (skip CRUD/input/result schemas)                |
| `emit.results=false`                                                   | Internally sets `variants.result.enabled=false` before generation |
| `useMultipleFiles=false`                                               | Single-file bundle; directory cleanup after flush                 |
| `mode=minimal`                                                         | Suppresses select/include + prunes deep input objects             |

Explicit `emit.*` booleans, when provided, override heuristics for that category (except minimal’s enforced suppressions).
