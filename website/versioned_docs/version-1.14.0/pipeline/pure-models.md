---
id: pure-models
title: Pure Model Schemas
---

Activated when `pureModels` true (implicitly in minimal mode) or `emit.pureModels`.

Flow:

- Enabled models filtered.
- Per-model exclusions combined (global pure exclusions + legacy + variant pure excludes).
- Naming preset resolved → fileName, export names, optional legacy aliases.
- Relation imports & enum imports normalized for custom patterns.
- If single-file mode: still written individually, then bundled.

Lean vs relations:

- `pureModelsLean` keeps scalar + enum fields (default true).
- `pureModelsIncludeRelations` can include relation lazy refs.
- `pureModelsExcludeCircularRelations` excludes problematic circular relations when `pureModelsIncludeRelations` is true.

Bytes default: base64 string; set `complexTypes.bytes.useBase64=false` (in config) for Uint8Array.
