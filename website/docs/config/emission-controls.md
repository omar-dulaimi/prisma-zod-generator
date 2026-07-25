---
id: emission-controls
title: Emission Controls
---

Flags under `emit` are **off switches**. Most are read as `!== false` — so a flag can suppress a category early, but setting it to `true` never forces a category on that is off for another reason:

- `enums`
- `objects` (input object schemas)
- `crud` (operation argument/result grouping)
- `pureModels` — mirrors the top-level `pureModels` option when omitted. Setting `emit.pureModels: true` does **not** enable pure models on its own; `pureModels` must also be `true`.
- `variants` (wrapper / variant sets)
- `results` (result schemas) — `emit.results: false` forces a skip, but `emit.results: true` does **not** re-enable result schemas already suppressed by `mode: "minimal"` or `variants.result.enabled: false`.

Skipping enums while generating objects or CRUD may break references → warning emitted.

Heuristic shortcuts (`pureModelsOnlyMode`, `pureVariantOnlyMode`) suppress objects / CRUD regardless of their flags.

See also: [Dual Schema Exports](./dual-exports.md) for typed vs method-friendly CRUD schema pairs (result schemas are single-export).
