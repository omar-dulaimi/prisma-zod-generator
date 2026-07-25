---
id: crud-only
title: CRUD Only
---

Skip pure model variant and focus on object + CRUD argument schemas:

```json title="zod-generator.config.json"
{
  "mode": "custom",
  "emit": {
    "objects": true,
    "crud": true,
    "results": false,
    "pureModels": false,
    "variants": false,
    "enums": true
  }
}
```

Emits the `objects/` input schemas and the root-level CRUD argument schemas (`UserFindManySchema`, `UserCreateOneSchema`, …) plus the enums they reference.

:::note `results: false` is required here
Per-operation result schemas are produced inside the same pass as the CRUD schemas, so leaving `emit.results` unset would still write a `results/` directory. `emit.results` can only ever subtract from what `emit.crud` enables — it cannot turn `results/` on while `emit.crud` is `false`.
:::

## Related recipes

- [Models Only](./models-only.md) — the inverse preset: pure models with no objects/CRUD.
- [Input Variant Only](./input-only.md) / [Result Variant Only](./result-only.md) — emit a single `variants/` set instead of the CRUD surface.
