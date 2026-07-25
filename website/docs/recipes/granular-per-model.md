---
id: granular-per-model
title: Granular Per Model
---

```json title="zod-generator.config.json"
{
  "mode": "custom",
  "strictCreateInputs": false,
  "models": {
    "User": {
      "operations": ["findMany", "create"],
      "variants": { "input": { "excludeFields": ["role"] } }
    },
    "Post": {
      "operations": ["findMany", "findUnique"],
      "variants": { "result": { "excludeFields": ["internalFlag"] } }
    }
  }
}
```

Enables partial surface per model: each model gets only the operations it lists, and the per-model `variants.*.excludeFields` entries narrow that model's field surface.

:::caution Create inputs bypass exclusions by default
`strictCreateInputs` defaults to `true`, which makes `*CreateInput`, `*UncheckedCreateInput` and `*CreateMany*` schemas ignore field exclusions so they stay assignable to Prisma's own types. With the default, `role` would still appear in `UserCreateInputObjectSchema` even though it is excluded above — hence the explicit `"strictCreateInputs": false`.

If `role` is a required scalar without a default, also set `"preserveRequiredScalarsOnCreate": false`; otherwise required scalars are re-added to create inputs after the exclusion runs. `WhereUniqueInput` schemas always keep their unique selector fields regardless of either flag.
:::

:::note Where each `excludeFields` list lands
- `variants.input.excludeFields` filters `variants/input/<Model>.input.ts` and the `objects/` `Where*` / `Create*` / `Update*` input schemas.
- `variants.result.excludeFields` filters `variants/result/<Model>.result.ts` (and the field lists used for Select/Include schemas). Per-operation schemas under `results/` apply no field exclusions at all, so `internalFlag` is still present in `PostFindManyResult.schema.ts`.
- `variants.pure.excludeFields` filters `schemas/models/<Model>.schema.ts` and `variants/pure/`.

Model-level `excludeFields` lists support the same wildcard patterns as `globalExclusions.input` on the `objects/` path; the pure-model and variant-file paths match exact field names only.
:::
