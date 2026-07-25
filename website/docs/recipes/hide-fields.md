---
id: hide-fields
title: Hide Sensitive Fields
---

Remove credentials and internal columns from the schemas that face the outside world.

```json title="zod-generator.config.json"
{
  "globalExclusions": {
    "result": ["password", "hashedPassword", "secretToken"]
  }
}
```

Removes the listed fields from the result variant schemas (`variants/result/<Model>.result.ts`).

:::caution Exact names only on this path
When they are applied to the pure-model files and the `variants/` files, `globalExclusions.result` and `globalExclusions.pure` are matched by **exact field name** — so a pattern such as `"secret*"` silently matches nothing there. Spell out each field.

Wildcards (`field*`, `*field`, `*middle*`) are honoured for `globalExclusions.input` when it is applied to the `objects/` input schemas — but the `variants/input/` files use exact matching for the same list, so a wildcard there drops the field from `objects/` and leaves it in the variant file. Note that the JSON Schema shipped for editor validation restricts these entries to plain identifiers, so a wildcard will be flagged by `$schema` autocomplete even where the generator honours it.
:::

## Which output categories honour exclusions

| Exclusion list | Applies to | Matching |
| --- | --- | --- |
| `globalExclusions.pure` | `schemas/models/`, `variants/pure/` | exact |
| `globalExclusions.input` | `objects/` input schemas | wildcards |
| `globalExclusions.input` | `variants/input/` | exact |
| `globalExclusions.result` | `variants/result/` | exact |
| — | `results/` per-operation schemas | not applied |

Per-operation result schemas under `results/` are built directly from the model's fields and never consult the exclusion lists, so "hidden from result schemas" means the result *variant*. If a field must never leave your process, keep it out of the response payload in application code as well.

One wrinkle on the `objects/` path: which list applies is decided from the schema name. Names containing `Create`, `Update` or `Where` are treated as `input`; names containing `Result` or `Output` as `result`; everything else — `*OrderByWithRelationInput`, the aggregate inputs, and so on — falls back to `pure`. So `globalExclusions.pure` also trims those object schemas, and wildcards do work there.

## Also hiding a field from request inputs

Create-like input schemas bypass exclusions by default so they keep matching Prisma's own types. To strip a field from them too:

```json title="zod-generator.config.json"
{
  "strictCreateInputs": false,
  "preserveRequiredScalarsOnCreate": false,
  "globalExclusions": {
    "input": ["password", "hashedPassword"],
    "pure": ["password", "hashedPassword"],
    "result": ["password", "hashedPassword"]
  }
}
```

- `strictCreateInputs: false` lets exclusions reach `*CreateInput`, `*UncheckedCreateInput` and `*CreateMany*` schemas.
- `preserveRequiredScalarsOnCreate: false` stops required scalars without a default from being re-added to those create inputs afterwards.
- `WhereUniqueInput` schemas always keep their unique selector fields, regardless of both flags.

For per-model rather than global control, see [Granular Per Model](./granular-per-model.md).
