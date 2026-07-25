---
id: models-only
title: Models Only
---

Emit only pure model schemas (no CRUD/object scaffolding):

```json title="zod-generator.config.json"
{
  "mode": "custom",
  "pureModels": true,
  "variants": {
    "pure": { "enabled": true },
    "input": { "enabled": false },
    "result": { "enabled": false }
  },
  "emit": {
    "objects": false,
    "crud": false,
    "pureModels": true,
    "variants": false,
    "enums": true
  }
}
```

Output is limited to `schemas/models/<Model>.schema.ts` plus the enum schemas those models reference.

Because `pureModels` is on and only the `pure` variant is enabled, the `pureVariantOnlyMode` heuristic fires and suppresses the `objects/`, CRUD and `results/` categories on its own — the `emit` flags above just make that intent explicit. (Disabling `pure` as well would instead trigger the sibling `pureModelsOnlyMode` heuristic, with the same effect. That one additionally requires `"mode": "custom"`.)

:::note
Per-operation schemas under `results/` are produced inside the CRUD pass, so `"crud": false` already suppresses them — there is no need to set `emit.results` here. See [CRUD Only](./crud-only.md) for the case where you keep CRUD but want `results/` off.
:::

## Related recipes

- [Pure Models Lean](./pure-models-lean.md) — same output category, focused on trimming what each pure model file contains.
- [Input Variant Only](./input-only.md) / [Result Variant Only](./result-only.md) — emit a single `variants/` set instead of pure models.
