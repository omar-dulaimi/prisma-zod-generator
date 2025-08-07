# Composition Approach Design

## Problem
Complex schemas with `z.lazy()` cause TypeScript to infer `any` type due to circular references.

## Current Structure (problematic)
```typescript
export const PostFindManySchema = z.object({
  select: z.lazy(() => PostSelectObjectSchema.optional()),  // Circular reference
  include: z.lazy(() => PostIncludeObjectSchema.optional()), // Circular reference
  orderBy: z.union([...]).optional(),
  where: PostWhereInputObjectSchema.optional(),
  cursor: PostWhereUniqueInputObjectSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.array(PostScalarFieldEnumSchema).optional(),
});
```

## Composition Approach
Break the schema into smaller, independently typed parts:

### 1. Base Fields Schema (no circular references)
```typescript
const PostFindManyBaseSchema = z.object({
  orderBy: z.union([...]).optional(),
  where: PostWhereInputObjectSchema.optional(),
  cursor: PostWhereUniqueInputObjectSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.array(PostScalarFieldEnumSchema).optional(),
});
```

### 2. Relation Fields Schema (with lazy loading)
```typescript
const PostFindManyRelationSchema = z.object({
  select: z.lazy(() => PostSelectObjectSchema.optional()),
  include: z.lazy(() => PostIncludeObjectSchema.optional()),
});
```

### 3. Final Composed Schema
```typescript
export const PostFindManySchema = PostFindManyBaseSchema.merge(PostFindManyRelationSchema);
```

## Benefits
- **Better Type Inference**: Base schema has clear, non-circular types
- **Preserved Functionality**: `.merge()` maintains all Zod methods
- **Modular Design**: Easier to understand and debug
- **Selective Lazy Loading**: Only relation fields use `z.lazy()`

## Implementation Strategy
1. Extract base fields (non-lazy) into separate schema
2. Extract relation fields (lazy) into separate schema  
3. Merge them together for final export
4. Generate helper functions for each part