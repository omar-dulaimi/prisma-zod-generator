---
id: input-only
title: Input Variant Only
---

```json title="zod-generator.config.json"
{
  "mode": "custom",
  "variants": {
    "pure": { "enabled": false },
    "input": { "enabled": true, "suffix": ".input" },
    "result": { "enabled": false }
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

This emits only `variants/input/<Model>.input.ts` plus the enums those schemas reference. Good for request validation only.

The `emit` block is required. `emit.objects` and `emit.crud` both default to `true`, and the heuristics that suppress them (`pureModelsOnlyMode`, `pureVariantOnlyMode`) only fire when `pureModels` is truthy — so enabling just the `input` variant does not, on its own, stop the `objects/`, CRUD and `results/` schemas from being written. Per-operation `results/` schemas are produced inside the CRUD pass, so `"crud": false` suppresses them too.

## Making every field optional

For update operations, enable the `partial` flag:

```json title="zod-generator.config.json"
{
  "mode": "custom",
  "variants": {
    "pure": { "enabled": false },
    "input": { "enabled": true, "suffix": ".input", "partial": true },
    "result": { "enabled": false }
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

`partial: true` appends `.partial()` to the generated schema, making every field optional — handy for PATCH-style request bodies.

:::note Scope of `partial`
The flag applies to the variant file it is configured on, here `variants/input/<Model>.input.ts`. It does not make the `objects/<Model>UpdateInput.schema.ts` schemas partial. See [the partial flag in variants configuration](../config/variants.md#partial-flag).
:::

## Related recipes

- [Result Variant Only](./result-only.md) — the response-side counterpart, same `emit` shape.
- [CRUD Only](./crud-only.md) — if you want the `objects/` input schemas rather than an input variant.
