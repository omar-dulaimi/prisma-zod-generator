---
id: circular-dependency-exclusion
title: Circular Dependency Exclusion
---

## Problem

When using `pureModelsIncludeRelations: true` with bidirectional relationships, you may encounter TypeScript circular dependency errors:

```
'DealSchema' implicitly has type 'any' because it does not have a type annotation and is referenced directly or indirectly in its own initializer
```

This happens with relationships like:

- `Deal` ↔ `Opportunity` (one-to-one bidirectional)
- `User` ↔ `Profile` (one-to-one with FK)
- `Category` → `Category` (self-referencing hierarchies)

## Solution

Use the `pureModelsExcludeCircularRelations` option to intelligently exclude problematic relation fields while preserving foreign keys and important relationships.

```json title="zod-generator.config.json"
{
  "mode": "custom",
  "pureModels": true,
  "pureModelsIncludeRelations": true,
  "pureModelsExcludeCircularRelations": true,
  "variants": {
    "pure": { "enabled": true, "suffix": ".model" },
    "input": { "enabled": false },
    "result": { "enabled": false }
  },
  "emit": {
    "objects": false,
    "crud": false,
    "variants": false
  },
  "naming": {
    "pureModel": { "filePattern": "{Model}.model.ts" }
  }
}
```

The `naming.pureModel.filePattern` override is what produces the `<Model>.model.ts` file names used in the snippets below; the default is `{Model}.schema.ts`. Either way the files live under `generated/schemas/models/`.

## Schema Example

```prisma title="schema.prisma"
model Deal {
  id          String  @id @default(uuid())
  name        String?
  status      String  @default("DRAFT")

  // Kept: this side wins the tiebreak
  opportunity Opportunity?
}

model Opportunity {
  id     String @id @default(uuid())
  name   String

  // dealId is always kept; the `deal` relation field is the one excluded
  dealId String? @unique
  deal   Deal?   @relation(fields: [dealId], references: [id])
}
```

## What gets excluded

For each bidirectional pair, the exclusion choice is made in this order:

1. **Keeps required relations** over optional ones.
2. **Keeps single relations** over list relations.
3. **If both sides tie**, keeps the relation on the alphabetically-earlier model and excludes the other. This is a deterministic tiebreak, not a foreign-key-aware one — for `Deal` ↔ `Opportunity` (both optional, both single) it excludes `Opportunity.deal`.
4. **Self-references**: when a model has more than one relation field pointing at itself, the first is kept and the rest are excluded.

Foreign key scalar fields such as `dealId` are never excluded — only relation object fields are.

## Generated Output

**Before (with circular dependency):**

```typescript
// Deal.model.ts
import { OpportunitySchema } from './Opportunity.model'; // ❌ Circular import
export const DealSchema = z.object({
  opportunity: z.lazy(() => OpportunitySchema).nullish(),
});

// Opportunity.model.ts
import { DealSchema } from './Deal.model'; // ❌ Circular import
export const OpportunitySchema = z.object({
  dealId: z.string().nullish(),
  deal: z.lazy(() => DealSchema).nullish(), // ❌ Causes circular dependency
});
```

**After (circular dependency resolved):**

```typescript
// Deal.model.ts
import { OpportunitySchema } from './Opportunity.model'; // ✅ One-way import
export const DealSchema = z.object({
  opportunity: z.lazy(() => OpportunitySchema).nullish(), // ✅ Works!
});

// Opportunity.model.ts
export const OpportunitySchema = z.object({
  dealId: z.string().nullish(), // ✅ Foreign key preserved
  // deal field excluded to break circular reference
});
```

## Configuration Methods

The flag only has an effect while relations are being emitted into pure models, so it needs `pureModels` and `pureModelsIncludeRelations` alongside it.

### Via JSON Config

```json title="zod-generator.config.json"
{
  "pureModels": true,
  "pureModelsIncludeRelations": true,
  "pureModelsExcludeCircularRelations": true
}
```

### Via Generator Block

`pureModelsExcludeCircularRelations` and `pureModelsIncludeRelations` are also generator-block options (booleans are passed as strings). `pureModels` itself has no generator-block flag, so keep it in the JSON config:

```prisma title="schema.prisma"
generator zod {
  provider = "prisma-zod-generator"
  pureModelsIncludeRelations = "true"
  pureModelsExcludeCircularRelations = "true"
}
```

## Use Cases

- **API validation** - Clean schemas without circular dependencies
- **Form validation** - Include relations but avoid TypeScript errors
- **Data transformation** - Preserve essential relationships while maintaining type safety
- **Legacy migration** - Smooth transition from other schema generators like `zod-prisma`

## Migration from zod-prisma

This feature helps migrate from `zod-prisma`, which would "just use dealId and not include the self reference to the DealSchema." The new option provides the same clean output while giving you control over when to include relations.
