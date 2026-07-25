---
id: result-only
title: Result Variant Only
---

Focus on response shaping for outbound APIs:

```json title="zod-generator.config.json"
{
  "mode": "custom",
  "variants": {
    "pure": { "enabled": false },
    "input": { "enabled": false },
    "result": { "enabled": true, "suffix": ".result" }
  },
  "emit": {
    "objects": false,
    "crud": false,
    "pureModels": false,
    "variants": true,
    "enums": true
  }
}
```

This emits only `variants/result/<Model>.result.ts` plus the enums those schemas reference.

The `emit` block is what makes the recipe live up to its name. `emit.objects` and `emit.crud` both default to `true`, and the heuristics that suppress them (`pureModelsOnlyMode`, `pureVariantOnlyMode`) require `pureModels` to be truthy — so without these flags a result-only config still writes the whole `objects/` + CRUD + `results/` surface alongside `variants/result/`.

:::note Two different "result" artifacts
`variants/result/<Model>.result.ts` (the result *variant*, gated by `emit.variants` plus `variants.result.enabled`) and `results/<Model><Op>Result.schema.ts` (per-operation *result schemas*) are separate outputs.

Per-operation result schemas are generated as part of the CRUD pass, so they require `emit.crud` to stay enabled — `"crud": false` above suppresses them regardless of what `emit.results` says. If you want `results/` instead, keep `emit.crud: true` and accept that the CRUD argument schemas are emitted alongside it; see [CRUD Only](./crud-only.md).
:::

## Relation fields

The two artifacts treat relation fields differently.

In `variants/result/<Model>.result.ts`, relation fields are emitted as `z.unknown()` (or `z.array(z.unknown())` for to-many relations), with `.nullable()` appended for optional relations.

In `results/<Model><Op>Result.schema.ts`, a relation field references the related pure model schema when that model is emitted — `z.array(TagSchema).optional()` for to-many, `ProfileSchema.optional()` for to-one — imported from `../models/` (v2.3.2). Relations are always `.optional()` there because they only appear in a response when the query explicitly `include`s them. The schema falls back to `z.unknown().optional()` when:

- pure models are not being emitted (`pureModels` falsy or `emit.pureModels: false`), so there is no `models/` file to import;
- the relation is a self-relation, which would otherwise need a cyclic import;
- single-file mode is active, because result schemas are inlined into the bundle before the pure models they would reference.

Under `jsonSchemaCompatible: true` the fallback is `z.any()` instead of `z.unknown()`.

## Related recipes

- [Input Variant Only](./input-only.md) — the request-side counterpart, same `emit` shape.
- [Models Only](./models-only.md) — pure model schemas instead of a variant set.
