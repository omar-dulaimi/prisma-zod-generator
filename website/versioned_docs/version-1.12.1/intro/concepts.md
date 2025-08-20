---
id: concepts
title: Core Concepts
---

**Variants**: Parallel schema sets expressing different contexts.

| Variant | Intent                                     | Typical Fields             |
| ------- | ------------------------------------------ | -------------------------- |
| pure    | Canonical model snapshot (optionally lean) | All / minus excluded       |
| input   | Data accepted for create/update ops        | Often omits id, timestamps |
| result  | Data returned to callers                   | Usually full model         |

You can also define **array-based custom variants** with suffix, exclusions, and optional field transforms.

**Modes**:

- `full` – everything enabled by default.
- `minimal` – lean subset: restricts operations, disables select/include, prunes complex nested inputs.
- `custom` – you explicitly enable/disable.

**Filtering Layers** (highest precedence first):

1. `model.fields.include`
2. model variant excludes (`models[Model].variants.variant.excludeFields`)
3. legacy `model.fields.exclude`
4. global variant excludes (`globalExclusions.variant`)
5. global array excludes (legacy array form)

**Emission Controls**: `emit.enums`, `emit.objects`, `emit.crud`, `emit.pureModels`, `emit.variants`, `emit.results`—each can short‑circuit generation to reduce output.

**Heuristics**:

- `pureModelsOnlyMode`: pureModels + all variants disabled (custom mode) ⇒ only pure models emitted.
- `pureVariantOnlyMode`: pureModels + only pure variant enabled ⇒ skip CRUD/input/result scaffolding.

**Naming Presets** drive file & export shapes for pure models (`naming.preset` + overrides). See reference page.
