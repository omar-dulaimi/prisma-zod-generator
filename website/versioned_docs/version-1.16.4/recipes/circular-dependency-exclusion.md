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
    "pure": { "enabled": true }
  },
  "emit": {
    "objects": false,
    "crud": false
  }
}
```

## Schema Example

```prisma title="schema.prisma"
model Deal {
  id          String  @id @default(uuid())
  name        String?
  status      String  @default("DRAFT")

  // This back-reference will be excluded
  opportunity Opportunity?
}

model Opportunity {
  id     String @id @default(uuid())
  name   String

  // Foreign key preserved, relation preserved
  dealId String? @unique
  deal   Deal?   @relation(fields: [dealId], references: [id])
}
```

## What gets excluded

The feature uses smart heuristics to determine which relations to exclude:

1. **Preserves required relations** over optional ones
2. **Preserves single relations** over list relations
3. **Preserves FK-side relations** over back-references
4. **Handles self-references** by excluding one of multiple self-referencing fields

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

### Via JSON Config

```json title="zod-generator.config.json"
{
  "pureModelsExcludeCircularRelations": true
}
```

### Via Generator Block

```prisma title="schema.prisma"
generator zod {
  provider = "prisma-zod-generator"
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
