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

### Enum Generation Strategy

While the `emit.enums` flag toggles enum generation entirely, you can use `enumStrategy` to filter *which* enums are generated. This is useful for removing Prisma's internal query enums (like `ScalarFieldEnum`) from your generated files.

```prisma
generator zod {
  provider     = "prisma-zod-generator"
  enumStrategy = "datamode" // 'full' (default) | 'datamode'
}
```
- `full` (default) Emits all enums, including Prisma's internal operational/query enums and datamodel enums.
- `datamode` Emits Zod schemas only for the enums explicitly declared in your schema.prisma file.

See also: [Dual Schema Exports](./dual-exports.md) for typed vs method-friendly CRUD/result schema pairs.
