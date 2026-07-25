---
id: pure-models-lean
title: Pure Models Lean
---

Emit slim, comment-free pure model schemas with no relation fields:

```json title="zod-generator.config.json"
{
  "pureModels": true,
  "pureModelsLean": true,
  "pureModelsIncludeRelations": false
}
```

Generates scalar-centric schemas for simpler validation surfaces.

## What each option does

- `pureModelsLean: true` suppresses the generated file header, the model and per-field doc comments, the inferred-type JSDoc and the trailing `Schema Statistics:` block. Set it to `false` when you want that verbose output back.
- `pureModelsIncludeRelations: false` is what omits relation fields. `pureModelsLean` has no effect on relations — the two options are independent.

Both flags above are already the defaults; they are spelled out here so the intent of the config is explicit.

## Dropping only *some* relations

If you want relation fields in general but not the heavy collections, keep relations on and name the ones to drop:

```json title="zod-generator.config.json"
{
  "pureModels": true,
  "pureModelsLean": true,
  "pureModelsIncludeRelations": true,
  "globalExclusions": { "pure": ["posts", "comments"] }
}
```

:::caution Exact field names only
`globalExclusions.pure` is matched by exact field name, so a pattern such as `"*Relation"` silently matches nothing. List each field name you want dropped. (Wildcards are only honoured for `globalExclusions.input`, which feeds the `objects/` input schemas.)
:::

Bidirectional relations can still produce TypeScript circular-reference errors once relations are included — see [Circular Dependency Exclusion](./circular-dependency-exclusion.md).

## Restricting the output to models only

These options change what goes *inside* each pure model file — they do not switch off the other output categories. With the config above, `objects/`, the CRUD argument schemas and `results/` are all still emitted alongside `schemas/models/`.

To keep the output to pure models and nothing else, add the emission controls from [Models Only](./models-only.md) on top of this config.
