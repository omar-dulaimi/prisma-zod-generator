# Circular Dependency Exclusion Recipe

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

## What it does

The feature:
- ✅ **Preserves foreign key fields** (e.g., `dealId`, `userId`)
- ✅ **Preserves required relations** over optional ones
- ✅ **Preserves single relations** over list relations  
- ✅ **Excludes back-references** to break circular imports
- ✅ **Handles self-references** by excluding one of multiple self-referencing fields

## Example output

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

## Migration from zod-prisma

This feature helps migrate from `zod-prisma`, which would "just use dealId and not include the self reference to the DealSchema."

## Use cases

- **API validation** - Clean schemas without circular dependencies
- **Form validation** - Include relations but avoid TypeScript errors  
- **Data transformation** - Preserve essential relationships while maintaining type safety
- **Legacy migration** - Smooth transition from other schema generators