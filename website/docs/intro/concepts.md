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

**Circular Dependency Resolution**: When `pureModelsIncludeRelations` is enabled, `pureModelsExcludeCircularRelations` can intelligently exclude problematic bidirectional relations to avoid TypeScript circular dependency errors while preserving foreign keys.

**Strict Mode Configuration**: Fine-grained control over when `.strict()` is applied to generated Zod schemas:

- **Global Control**: Configure strict mode for all schemas or specific schema types (operations, objects, variants)
- **Model-Level Overrides**: Set different strict mode behavior for specific models
- **Operation-Specific**: Control strict mode for individual operations (findMany, create, update, etc.)
- **Variant-Level**: Configure strict mode independently for pure, input, and result variants
- **Enum Handling**: Enums are inherently strict and don't support `.strict()` method
- **Backward Compatible**: Defaults to strict mode enabled everywhere for existing projects

See the [strict mode configuration page](/docs/config/strict-mode) for complete documentation and common patterns.

**Naming Customization** drives file & export shapes across all schema types:
- **Pure Models**: `naming.preset` + `naming.pureModel` overrides
- **CRUD Schemas**: `naming.schema` for operation file/export patterns (requires `{operation}` token to avoid collisions)
- **Input Objects**: `naming.input` for input type file/export patterns
- **Enums**: `naming.enum` for enum file/export patterns

See the [naming configuration page](/docs/config/naming) for complete documentation.
