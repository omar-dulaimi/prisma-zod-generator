---
id: filtering
title: Model / Operation / Field Filtering
---

Model enable check: `isModelEnabled` (minimal mode defaults to disabled unless configured).

Operation filtering: `isOperationEnabled` with alias mapping (createOne→create, etc.). Minimal mode reduces allowed ops unless overridden.

## Schema-Level Filtering

In minimal mode, entire schema types are filtered out to reduce complexity:

**Blocked in minimal mode:**
- `*CreateInput` schemas (use `*UncheckedCreateInput` instead)
- Nested relation inputs (`*CreateNestedInput`, `*UpdateNestedInput`)
- Complex relation patterns (`*CreateWithoutInput`, `*CreateOrConnectWithoutInput`)
- Aggregation inputs (`*AggregateInput`, etc.)
- Select/Include helper schemas

**Always allowed:**
- `*UncheckedCreateInput` (simple foreign key-based creation)
- `*UpdateInput` and `*UncheckedUpdateInput` (update flexibility)
- `*WhereInput` and `*WhereUniqueInput` (query filtering)
- `*OrderByWithRelationInput` (sorting)

## Field-Level Filtering

Field filtering precedence (stop at first include win):

1. `model.fields.include`
2. Model variant `excludeFields`
3. Legacy `model.fields.exclude`
4. `globalExclusions[variant]`
5. Global array legacy excludes

Wildcard patterns supported: `field*`, `*field`, `*middle*`.

WhereUniqueInput & strict base create inputs bypass variant exclusions to preserve shape fidelity.

Excluded relation fields cause foreign key scalar preservation for create inputs (maintain referential integrity constraints).
