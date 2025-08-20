---
id: zod-comments
title: '@zod Comment Annotations'
---

Use triple-slash Prisma doc comments with `@zod` to append validations.

```prisma
model User {
  id    String @id @default(cuid())
  /// @zod .email().min(5)
  email String @unique
}
```

Result:

```ts
export const UserSchema = z
  .object({
    email: z.string().email().min(5),
    // ...
  })
  .strict();
```

Annotations are concatenated after base type; unsafe expressions are not executed (string append model). Keep rules pure.

## Custom Inline Override (@zod.custom.use)

Replace an entire field schema inline:

```prisma
model AiChat {
  id        String @id @default(cuid())
  /// @zod.custom.use(z.array(z.object({ role: z.enum(['user','assistant','system']), parts: z.array(z.object({ type: z.enum(['text','image']), text: z.string() })) })))
  messages  Json   @default("[]")
}
```

Result (excerpt):

```ts
messages: z.array(
  z.object({
    role: z.enum(['user', 'assistant', 'system']),
    parts: z.array(z.object({ type: z.enum(['text', 'image']), text: z.string() })),
  }),
).default('[]');
```

This short-circuits other annotations for that field.

Optional helper for deep JSON arrays:

```ts
import { jsonMaxDepthRefinement } from 'prisma-zod-generator';
const ChatMessagesSchema = z.array(MessageSchema)${'${jsonMaxDepthRefinement(10)}'};
```

## Native Type Max Length Validation

The generator automatically extracts max length constraints from database native types and applies them as Zod `.max()` validations.

### Supported Native Types

| Database       | Native Types                                       | Example             | Generated Validation  |
| -------------- | -------------------------------------------------- | ------------------- | --------------------- |
| **PostgreSQL** | `VarChar(n)`, `Char(n)`                            | `@db.VarChar(255)`  | `z.string().max(255)` |
| **MySQL**      | `VarChar(n)`, `Char(n)`                            | `@db.VarChar(100)`  | `z.string().max(100)` |
| **SQL Server** | `VarChar(n)`, `Char(n)`, `NVarChar(n)`, `NChar(n)` | `@db.NVarChar(500)` | `z.string().max(500)` |
| **SQLite**     | No length constraints                              | -                   | No auto-validation    |
| **MongoDB**    | `ObjectId`                                         | `@db.ObjectId`      | `z.string().max(24)`  |

### Basic Usage

```prisma
model User {
  id          String  @id @default(cuid())
  email       String  @db.VarChar(320)  // → z.string().max(320)
  displayName String? @db.VarChar(100)  // → z.string().max(100).optional()
  bio         String? @db.Char(500)     // → z.string().max(500).optional()
}
```

Generated schema:

```ts
export const UserCreateInputSchema = z.object({
  email: z.string().max(320),
  displayName: z.string().max(100).optional(),
  bio: z.string().max(500).optional(),
});
```

### Conflict Resolution with @zod Comments

When both native types and `@zod.max()` exist, the **more restrictive** constraint is used:

```prisma
model Product {
  id          String  @id @default(cuid())

  // Native type wins (more restrictive)
  shortName   String  @db.VarChar(50) /// @zod.max(100)

  // @zod wins (more restrictive)
  description String? @db.VarChar(1000) /// @zod.max(500)

  // Only native constraint
  category    String  @db.VarChar(80)

  // Only @zod constraint
  tags        String? /// @zod.max(200)
}
```

Generated result:

```ts
export const ProductCreateInputSchema = z.object({
  shortName: z.string().max(50), // Native type (50) < @zod (100)
  description: z.string().max(500).optional(), // @zod (500) < Native (1000)
  category: z.string().max(80), // Only native constraint
  tags: z.string().max(200).optional(), // Only @zod constraint
});
```

### Complex Validations

Native constraints work alongside other `@zod` validations:

```prisma
model Account {
  id       String @id @default(cuid())
  /// @zod.email().toLowerCase()
  email    String @unique @db.VarChar(320)
  /// @zod.min(8).regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
  password String @db.VarChar(255)
}
```

Generated schema:

```ts
export const AccountCreateInputSchema = z.object({
  email: z.string().max(320).email().toLowerCase(),
  password: z
    .string()
    .max(255)
    .min(8)
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/),
});
```

### Array Support

Native constraints are applied to array elements:

```prisma
model Tags {
  id    String   @id @default(cuid())
  names String[] @db.VarChar(50)  // Each string max 50 chars
}
```

Generated schema:

```ts
export const TagsCreateInputSchema = z.object({
  names: z.string().max(50).array(),
});
```

### Edge Cases

The generator handles various edge cases gracefully:

- **Zero length**: `@db.VarChar(0)` is ignored (invalid constraint)
- **Very large lengths**: `@db.VarChar(65535)` works normally
- **Multiple max constraints**: Duplicate `.max()` calls are consolidated into the most restrictive value
- **Non-string fields**: Native types on Int/DateTime/etc. are ignored for max length extraction
- **Text types**: `@db.Text` (without length parameter) doesn't generate max constraints

### MongoDB ObjectId

MongoDB ObjectId fields automatically get a max length of 24 characters:

```prisma
// MongoDB schema
model User {
  id    String @id @default(auto()) @map("_id") @db.ObjectId
  email String @unique
}
```

Generated schema:

```ts
export const UserCreateInputSchema = z.object({
  id: z.string().max(24), // ObjectId is 24 hex chars
  email: z.string(),
});
```
