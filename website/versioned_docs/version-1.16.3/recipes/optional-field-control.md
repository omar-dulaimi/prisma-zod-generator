---
id: optional-field-control
title: Optional Field Control
---

Configure how optional Prisma fields are validated using different Zod patterns.

## Use Cases

### API with Null Values

When your API accepts explicit null values alongside undefined/omitted fields:

```prisma
generator zod {
  provider = "prisma-zod-generator"
  optionalFieldBehavior = "nullish"  # default
}

model User {
  id   Int     @id
  name String?
  bio  String?
}
```

Generated schema accepts all these patterns:

```typescript
// All valid
{ id: 1, name: "John", bio: "Developer" }
{ id: 1, name: null, bio: undefined }
{ id: 1 } // name and bio omitted
```

### Strict No-Null API

When you want to reject explicit null values:

```prisma
generator zod {
  provider = "prisma-zod-generator"
  optionalFieldBehavior = "optional"
}
```

Generated validation:

```typescript
// Valid
{ id: 1, name: "John" }
{ id: 1 } // name omitted

// Invalid - null rejected
{ id: 1, name: null } // ❌ Validation error
```

### Always-Present Fields

When optional fields must always be included in requests:

```prisma
generator zod {
  provider = "prisma-zod-generator"
  optionalFieldBehavior = "nullable"
}
```

Generated validation:

```typescript
// Valid
{ id: 1, name: "John", bio: "Developer" }
{ id: 1, name: null, bio: null }

// Invalid - fields must be present
{ id: 1 } // ❌ Missing name and bio
```

## Configuration Options

### Generator Block

```prisma
generator zod {
  provider = "prisma-zod-generator"
  optionalFieldBehavior = "nullish" | "optional" | "nullable"
}
```

### JSON Config

```json
{
  "optionalFieldBehavior": "nullish"
}
```

## Comparison Table

| Behavior   | Zod Output    | Accepts `undefined` | Accepts `null` | Allows Omitted |
| ---------- | ------------- | ------------------- | -------------- | -------------- |
| `nullish`  | `.nullish()`  | ✅                  | ✅             | ✅             |
| `optional` | `.optional()` | ✅                  | ❌             | ✅             |
| `nullable` | `.nullable()` | ❌                  | ✅             | ❌             |

## Migration Example

Changing from the legacy `.optional().nullable()` pattern:

**Before:**

```typescript
// Legacy behavior (equivalent to nullish)
name: z.string().optional().nullable();
```

**After with explicit configuration:**

```typescript
// With optionalFieldBehavior = "nullish"
name: z.string().nullish();

// With optionalFieldBehavior = "optional"
name: z.string().optional();

// With optionalFieldBehavior = "nullable"
name: z.string().nullable();
```

## Type Safety

All behaviors maintain compatibility with Prisma types:

```typescript
import { Prisma } from '@prisma/client';

// Prisma type: { name?: string | null }
const data: Prisma.UserCreateInput = {
  id: 1,
  name: null, // Prisma allows null
};

// All optionalFieldBehavior settings accept this
UserCreateInputSchema.parse(data); // ✅ Always works
```
