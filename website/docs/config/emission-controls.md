---
id: emission-controls
title: Emission Controls
---

Flags under `emit` can disable whole categories early:

- `enums`
- `objects` (input object schemas)
- `crud` (operation argument/result grouping)
- `pureModels`
- `variants` (wrapper / variant sets)
- `results` (result schemas)

Skipping enums while generating objects or CRUD may break references → warning emitted.

Heuristic shortcuts (`pureModelsOnlyMode`, `pureVariantOnlyMode`) suppress objects / CRUD regardless of their flags.

See also: [Dual Schema Exports](./dual-exports.md) for typed vs method-friendly CRUD/result schema pairs.
