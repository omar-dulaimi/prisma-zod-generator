---
id: objects-crud
title: Object & CRUD Generation
---

Steps:

1. Prisma DMMF loaded via `getDMMF`.
2. Input object & model operation lists cloned.
3. Hidden models/fields resolved from model comments.
4. Missing input object types added (legacy support) before filtering.
5. Object schemas generated if `emit.objects` and not pure-only heuristics; each object pre-filtered with `filterFields`.
6. CRUD operation schemas assembled (model args, aggregate support) if `emit.crud`.
7. Objects index synthesized (for integration consistency).

`isObjectSchemaEnabled` checks model enablement + required operations + minimal mode pruning heuristics.

Aggregate result schemas produced via `generateResultSchemas` (if results not forcibly disabled).
