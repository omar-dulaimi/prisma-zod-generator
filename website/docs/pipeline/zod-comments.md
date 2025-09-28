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

## String Format Validations

The generator supports all Zod v4 string format validation methods. In Zod v4, these generate optimized base types (e.g., `z.email()` instead of `z.string().email()`).

### Network & URL Formats

```prisma
model WebData {
  id       String @id @default(cuid())
  /// @zod.email()
  email    String @unique
  /// @zod.url()
  website  String?
  /// @zod.httpUrl()
  apiUrl   String
  /// @zod.hostname()
  server   String
}
```

Generated schema (Zod v4):

```ts
export const WebDataCreateInputSchema = z.object({
  email: z.email(),      // Base type in v4
  website: z.url().optional(),
  apiUrl: z.httpUrl(),   // Base type in v4
  server: z.hostname(),  // Base type in v4
});
```

### Identifier Formats

```prisma
model Identifiers {
  id       String @id @default(cuid())
  /// @zod.uuid()
  uuid     String
  /// @zod.nanoid()
  nanoid   String
  /// @zod.cuid()
  cuid     String
  /// @zod.cuid2()
  cuid2    String
  /// @zod.ulid()
  ulid     String
}
```

Generated schema (Zod v4):

```ts
export const IdentifiersCreateInputSchema = z.object({
  uuid: z.uuid(),       // Base type in v4
  nanoid: z.nanoid(),   // Base type in v4
  cuid: z.cuid(),       // Base type in v4
  cuid2: z.cuid2(),     // Base type in v4
  ulid: z.ulid(),       // Base type in v4
});
```

### Encoding & Character Formats

```prisma
model EncodingData {
  id        String @id @default(cuid())
  /// @zod.base64()
  base64    String
  /// @zod.base64url()
  base64url String
  /// @zod.hex()
  hex       String
  /// @zod.emoji()
  reaction  String
}
```

Generated schema (Zod v4):

```ts
export const EncodingDataCreateInputSchema = z.object({
  base64: z.base64(),       // Base type in v4
  base64url: z.base64url(), // Base type in v4
  hex: z.hex(),             // Base type in v4
  reaction: z.emoji(),      // Base type in v4
});
```

### Security & Network Formats

```prisma
model SecurityData {
  id        String @id @default(cuid())
  /// @zod.jwt()
  token     String?
  /// @zod.hash("sha256")
  checksum  String
  /// @zod.ipv4()
  ipv4Addr  String
  /// @zod.ipv6()
  ipv6Addr  String?
  /// @zod.cidrv4()
  subnet    String
  /// @zod.datetime()
  timestamp String
}
```

Generated schema (Zod v4):

```ts
export const SecurityDataCreateInputSchema = z.object({
  token: z.jwt().optional(),        // Base type in v4
  checksum: z.hash("sha256"),       // Base type with parameter
  ipv4Addr: z.ipv4(),              // Base type in v4
  ipv6Addr: z.ipv6().optional(),   // Base type in v4
  subnet: z.cidrv4(),              // Base type in v4
  timestamp: z.datetime(),         // Base type in v4
});
```

### Chaining with String Format Methods

String format methods can be chained with other Zod validations:

```prisma
model ChainedValidations {
  id       String @id @default(cuid())
  /// @zod.email().max(100).toLowerCase()
  email    String @unique
  /// @zod.nanoid().min(21)
  publicId String
  /// @zod.httpUrl().max(200)
  website  String?
}
```

Generated schema (Zod v4):

```ts
export const ChainedValidationsCreateInputSchema = z.object({
  email: z.email().max(100).toLowerCase(),
  publicId: z.nanoid().min(21),
  website: z.httpUrl().max(200).optional(),
});
```

### Version Compatibility

The generator automatically detects your Zod version:

- **Zod v4**: Uses optimized base types like `z.email()`, `z.nanoid()`
- **Zod v3**: Falls back to chaining methods like `z.string().email()` where supported, or `z.string()` for unsupported methods

### Complete Reference

| Method | Parameter | Description | Zod v4 Output | Zod v3 Fallback |
|--------|-----------|-------------|---------------|-----------------|
| `@zod.email()` | None | Email validation | `z.email()` | `z.string().email()` |
| `@zod.url()` | None | URL validation | `z.url()` | `z.string().url()` |
| `@zod.httpUrl()` | None | HTTP/HTTPS URLs | `z.httpUrl()` | `z.string()` |
| `@zod.hostname()` | None | Hostname validation | `z.hostname()` | `z.string()` |
| `@zod.uuid()` | None | UUID validation | `z.uuid()` | `z.string().uuid()` |
| `@zod.datetime()` | None | ISO datetime validation | `z.datetime()` | `z.string().datetime()` |
| `@zod.nanoid()` | None | Nanoid validation | `z.nanoid()` | `z.string()` |
| `@zod.cuid()` | None | CUID validation | `z.cuid()` | `z.string()` |
| `@zod.cuid2()` | None | CUID v2 validation | `z.cuid2()` | `z.string()` |
| `@zod.ulid()` | None | ULID validation | `z.ulid()` | `z.string()` |
| `@zod.base64()` | None | Base64 validation | `z.base64()` | `z.string()` |
| `@zod.base64url()` | None | Base64URL validation | `z.base64url()` | `z.string()` |
| `@zod.hex()` | None | Hexadecimal validation | `z.hex()` | `z.string()` |
| `@zod.jwt()` | None | JWT validation | `z.jwt()` | `z.string()` |
| `@zod.hash("algo")` | Algorithm | Hash validation | `z.hash("sha256")` | `z.string()` |
| `@zod.ipv4()` | None | IPv4 validation | `z.ipv4()` | `z.string()` |
| `@zod.ipv6()` | None | IPv6 validation | `z.ipv6()` | `z.string()` |
| `@zod.cidrv4()` | None | CIDR v4 validation | `z.cidrv4()` | `z.string()` |
| `@zod.emoji()` | None | Single emoji validation | `z.emoji()` | `z.string()` |

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
