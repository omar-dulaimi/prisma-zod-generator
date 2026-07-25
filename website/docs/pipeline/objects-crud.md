---
id: objects-crud
title: Object & CRUD Generation
---

Steps:

1. DMMF taken from `options.dmmf` when Prisma supplies it, avoiding a redundant re-parse of the schema; `getDMMF({ datamodel, previewFeatures })` is only used as a fallback.
2. Input object & model operation lists cloned.
3. Hidden models/fields resolved from model comments.
4. Missing input object types added (legacy support) before filtering.
5. Object schemas generated if `emit.objects` and not pure-only heuristics; each object pre-filtered with `filterFields`.
6. CRUD operation schemas assembled (model args, aggregate support) if `emit.crud`.
7. Objects index synthesized (for integration consistency).

`isObjectSchemaEnabled` checks model enablement + required operations + minimal mode pruning heuristics.

Aggregate result schemas produced via `generateResultSchemas` (if results not forcibly disabled).

## Generated Shapes

A few details of the assembled schemas are worth knowing when you read the output:

- **Select schemas accept nested relation args.** A relation field in a `select` is a union, not a bare boolean, so you can pass query arguments through it (here for a `Form` model with a `layouts` relation):

  ```ts
  layouts: z.union([z.boolean(), z.lazy(() => LayoutFindManySchema)]).optional(),
  _count: z.union([z.boolean(), z.lazy(() => FormCountOutputTypeArgsObjectSchema)]).optional(),
  ```

- **Relation fields in `Create*` and `Unchecked*Input` keep DMMF optionality.** `schema.inputObjectTypes` is the source of truth, because that is what the Prisma Client input types are generated from. The datamodel recompute may only relax requiredness (a field with a database default becomes optional); it never promotes a DMMF-optional field to required. List fields are always treated as optional, matching the client's input types.

- **Result schemas reference pure models for relations.** When `pureModels` is enabled, a relation field is typed as `z.array(<Model>Schema).optional()` or `<Model>Schema.optional()` and imported from `../models/`. Self-relations, runs without pure models, and single-file mode fall back to `z.array(z.unknown()).optional()` / `z.unknown().optional()`. Relation fields are always `.optional()` because they are only present when the query `include`s them.

- **`Prisma` is only imported when it is used.** `import type { Prisma }` is emitted only when the file's typed export actually references `Prisma`, so files that do not need it no longer carry an unused import. In `decimalMode: "decimal"` it becomes a value import instead, since `Prisma.Decimal.isDecimal` checks and Decimal defaults need the runtime value.
