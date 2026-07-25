---
id: optional-fields
title: Optional Field Behavior
---

The `optionalFieldBehavior` configuration option controls how optional Prisma fields (marked with `?`) are mapped to Zod validation schemas.

:::note
**Scope.** `optionalFieldBehavior` applies to **pure model schemas** — the `models/` output produced with `pureModels: true`. CRUD input object schemas under `objects/` follow the fixed policy described in [Object Schemas: Optional vs Nullable](#object-schemas-optional-vs-nullable-behavior-note), and variant schemas under `variants/` use their own fixed policy. Neither reads this setting.
:::

## Configuration Options

| Value               | Zod Output    | TypeScript Type          | Description                                            |
| ------------------- | ------------- | ------------------------ | ------------------------------------------------------ |
| `nullish` (default) | `.nullish()`  | `T \| null \| undefined` | Field can be omitted, explicitly null, or have a value |
| `optional`          | `.optional()` | `T \| undefined`         | Field can be omitted or have a value, but not null     |
| `nullable`          | `.nullable()` | `T \| null`              | Field must be present but can be null or have a value  |

## Usage

### Generator Block Configuration

Configure directly in your `schema.prisma`:

```prisma
generator zod {
  provider = "prisma-zod-generator"
  optionalFieldBehavior = "optional"
}
```

### JSON Configuration

Or in your `zod-generator.config.json`:

```json
{
  "optionalFieldBehavior": "nullish"
}
```

## Examples

The snippets below show the generated **pure model** schema (`generated/schemas/models/User.schema.ts`). Given this Prisma model:

```prisma
model User {
  id    Int     @id @default(autoincrement())
  email String  @unique
  name  String?  // Optional field
  bio   String?  // Optional field
}
```

### Nullish Behavior (Default)

```typescript
// generated/schemas/models/User.schema.ts
export const UserSchema = z.object({
  email: z.string(),
  name: z.string().nullish(),
  bio: z.string().nullish()
});

// Valid inputs
{ email: "test@example.com", name: "John", bio: "Developer" }
{ email: "test@example.com", name: null, bio: undefined }
{ email: "test@example.com" } // name and bio omitted
```

### Optional Behavior

```typescript
// generated/schemas/models/User.schema.ts
export const UserSchema = z.object({
  email: z.string(),
  name: z.string().optional(),
  bio: z.string().optional()
});

// Valid inputs
{ email: "test@example.com", name: "John", bio: "Developer" }
{ email: "test@example.com", name: undefined, bio: undefined }
{ email: "test@example.com" } // name and bio omitted

// Invalid input
{ email: "test@example.com", name: null } // ❌ null not allowed
```

### Nullable Behavior

```typescript
// generated/schemas/models/User.schema.ts
export const UserSchema = z.object({
  email: z.string(),
  name: z.string().nullable(),
  bio: z.string().nullable()
});

// Valid inputs
{ email: "test@example.com", name: "John", bio: "Developer" }
{ email: "test@example.com", name: null, bio: null }

// Invalid input
{ email: "test@example.com" } // ❌ name and bio must be present
```

## Type Compatibility

All three behaviors produce types assignable to Prisma's generated input types, but they are **not** interchangeable at runtime: only `nullish` and `nullable` accept an explicit `null`.

```typescript
import { Prisma } from '@prisma/client';

const prismaUser: Prisma.UserCreateInput = {
  email: 'test@example.com',
  name: null, // Prisma allows null for optional fields
};

// Valid under `nullish` (default) and `nullable`.
// Rejected under `optional`, which does not accept an explicit null.
UserSchema.parse(prismaUser);
```

## Use Cases

### API Validation

**Nullish** (default) is recommended for most API scenarios where clients can:

- Omit fields entirely
- Explicitly send null values
- Send actual values

### Strict Input Validation

**Optional** is useful when you want to:

- Allow fields to be omitted
- Reject explicit null values
- Maintain clean undefined-only semantics

### Always-Present Fields

**Nullable** is suitable when:

- Fields must always be included in requests
- Null is a meaningful value
- You want to distinguish between "not set" and "explicitly null"

## Object Schemas: Optional vs Nullable (Behavior Note)

For input object schemas under `objects/` (e.g., `UserCreateInput.schema.ts`, `PostUpdateInput.schema.ts`), the generator applies a policy that aligns Prisma optionality with practical API usage:

- Optional non‑relation fields (scalars/enums/unions) are emitted as `.optional().nullable()` to accept both omission and explicit `null`.
- Optional relation‑shaped fields remain `.optional()` only and reject `null` (use omission to skip).

Examples:

```ts
// Optional non-relation scalar
name: z.string().optional().nullable()

// Optional non-relation union (e.g., update operations)
title: z.union([z.string(), TitleFieldUpdateOperationsInputObjectSchema]).optional().nullable()

// Optional relation-shaped fields
author: z.lazy(() => UserCreateNestedOneWithoutPostsInputObjectSchema).optional()         // ✅ undefined ok
// author: null  // ❌ invalid, use omission instead
```

Additionally, in filter/where inputs, optional non-relation unions (e.g., `AND`, `OR`, `NOT`, or scalar filter unions) are treated as optional + nullable to allow `null` as a shorthand for “not applied”.

Rationale:
- Prisma optional fields often map to nullable columns; allowing `null` and omission improves ergonomics for JSON clients while keeping relation operations explicit and unambiguous.

This policy applies to object input schemas irrespective of `optionalFieldBehavior`, which affects **pure model schemas only** (the `models/` output produced with `pureModels: true`).

Variant schemas under `variants/` also ignore `optionalFieldBehavior` and use their own fixed policy for optional fields:

- `input` variant → `.optional().nullable()`
- `pure` and `result` variants → `.nullable()`

## Migration

When changing `optionalFieldBehavior`, regenerate your schemas:

```bash
npx prisma generate
```

The three behaviors differ in what they accept at runtime — `optional` rejects explicit `null`, `nullable` rejects omission — so switching between them can invalidate payloads that used to parse. Pick the one that matches your API contract.
