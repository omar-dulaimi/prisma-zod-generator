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

## External Validators with `@zod.import`

Bring in runtime helpers directly from doc comments when you need logic that lives outside the generated file.

```prisma
model User {
  id    String @id @default(cuid())
  /// @zod.import(["import { isEmail } from '../validators/email'\"])
  /// @zod.custom.use(z.string().refine((val) => isEmail(val), { message: 'Invalid email' }))
  email String @unique
}
```

Generated schema (Pure Variant excerpt):

```ts
import { isEmail } from '../validators/email';

export const UserSchema = z
  .object({
    email: z.string().refine((val) => isEmail(val), {
      message: 'Invalid email',
    }),
    // ...
  })
  .strict();
```

- Provide one or more complete import statements inside the array. Relative paths are kept intact and rewritten per output directory.
- Imports must produce runtime values. Type-only specifiers (e.g. `import type { Validator } ...` or `type Foo as Bar`) are detected and omitted, ensuring we never emit imports that disappear after compilation.
- Field-level imports are merged with model-level imports. When the same statement appears multiple times it is emitted once.
- Model-level imports can also supply chained refinements:

  ```prisma
  /// @zod.import(["import { assertCompanyDomain } from '../validators/domain'\"]).refine(assertCompanyDomain)
  model Organisation {
    id    String @id @default(cuid())
    email String @unique
  }
  ```

When both `@zod.import()` and other `@zod.*` annotations are present, the generator keeps custom schemas from `@zod.custom.use()` as the base and only appends inline validations when they do not replace the base type.

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

### Regular Expression Validation

```prisma
model ValidationData {
  id          String @id @default(cuid())
  /// @zod.regex(/^[A-Z]+$/, "Must be uppercase letters only")
  upperCode   String
  /// @zod.regex(/^\d{4}-\d{2}-\d{2}$/)
  dateFormat  String
  /// @zod.regex(new RegExp('[0-9]+'))
  numberStr   String
}
```

Generated schema (Zod v4):

```ts
export const ValidationDataCreateInputSchema = z.object({
  upperCode: z.regex(/^[A-Z]+$/, 'Must be uppercase letters only'),
  dateFormat: z.regex(/^\d{4}-\d{2}-\d{2}$/),
  numberStr: z.regex(new RegExp('[0-9]+')),
});
```

### Advanced Parameter Support

The generator supports complex parameter expressions, including:

#### JavaScript Object Literals

```prisma
model AdvancedValidation {
  id       String @id @default(cuid())
  /// @zod.nanoid({ abort: true, error: 'Custom nanoid error' })
  customId String
  /// @zod.nanoid({ abort: true, pattern: new RegExp('.'), error: 'Complex validation' })
  complexId String
}
```

Generated schema:

```ts
export const AdvancedValidationCreateInputSchema = z.object({
  customId: z.nanoid({"abort":true,"error":"Custom nanoid error"}),
  complexId: z.nanoid({"abort":true,"pattern":new RegExp('.'),"error":"Complex validation"}),
});
```

### Parameter Types Supported

The generator preserves all JavaScript parameter types:

- **Strings**: `@zod.nanoid('Custom error')` → `z.nanoid('Custom error')`
- **Objects**: `@zod.nanoid({ abort: true })` → `z.nanoid({"abort":true})`
- **Numbers**: `@zod.min(10)` → `z.string().min(10)` (valid usage)
- **Booleans**: `@zod.optional()` → `z.string().optional()` (parameter-less)
- **Arrays**: `@zod.custom([1, 2, 3])` → `z.custom([1,2,3])`
- **RegExp**: `@zod.regex(/pattern/)` → `z.regex(/pattern/)`
- **Function calls**: `@zod.custom(Date.now())` → `z.custom(Date.now())`
- **Nested expressions**: `@zod.custom(new RegExp('.'))` → `z.custom(new RegExp('.'))`

### Complete Reference

| Method | Parameters | Description | Zod v4 Output | Zod v3 Fallback |
|--------|------------|-------------|---------------|-----------------|
| `@zod.email()` | Optional error message/config | Email validation | `z.email()` | `z.string().email()` |
| `@zod.url()` | Optional error message/config | URL validation | `z.url()` | `z.string().url()` |
| `@zod.httpUrl()` | Optional error message/config | HTTP/HTTPS URLs | `z.httpUrl()` | `z.string()` |
| `@zod.hostname()` | Optional error message/config | Hostname validation | `z.hostname()` | `z.string()` |
| `@zod.uuid()` | Optional error message/config | UUID validation | `z.uuid()` | `z.string().uuid()` |
| `@zod.datetime()` | Optional error message/config | ISO datetime validation | `z.datetime()` | `z.string().datetime()` |
| `@zod.nanoid()` | Optional config object/error message | Nanoid validation | `z.nanoid()` | `z.string()` |
| `@zod.cuid()` | Optional error message/config | CUID validation | `z.cuid()` | `z.string()` |
| `@zod.cuid2()` | Optional error message/config | CUID v2 validation | `z.cuid2()` | `z.string()` |
| `@zod.ulid()` | Optional error message/config | ULID validation | `z.ulid()` | `z.string()` |
| `@zod.base64()` | Optional config object/error message | Base64 validation | `z.base64()` | `z.string()` |
| `@zod.base64url()` | Optional config object/error message | Base64URL validation | `z.base64url()` | `z.string()` |
| `@zod.hex()` | Optional error message/config | Hexadecimal validation | `z.hex()` | `z.string()` |
| `@zod.jwt()` | Optional config object/error message | JWT validation | `z.jwt()` | `z.string()` |
| `@zod.regex()` | Pattern, optional error message | Regular expression validation | `z.regex(/pattern/)` | `z.string().regex(/pattern/)` |
| `@zod.hash("algo")` | Algorithm, optional config | Hash validation | `z.hash("sha256")` | `z.string()` |
| `@zod.ipv4()` | Optional error message/config | IPv4 validation | `z.ipv4()` | `z.string()` |
| `@zod.ipv6()` | Optional error message/config | IPv6 validation | `z.ipv6()` | `z.string()` |
| `@zod.cidrv4()` | Optional error message/config | CIDR v4 validation | `z.cidrv4()` | `z.string()` |
| `@zod.emoji()` | Optional error message/config | Single emoji validation | `z.emoji()` | `z.string()` |

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

## Custom Object Schema (@zod.custom)

For JSON fields, use `@zod.custom()` to define structured object schemas using JavaScript object literals:

```prisma
model User {
  id String @id @default(cuid())

  /// @zod.custom({ "title": "User Profile", "description": "User details", "isActive": true })
  profile Json

  /// @zod.custom({ "settings": { "theme": "dark", "notifications": true }, "preferences": ["email", "sms"] })
  metadata Json
}
```

Result:

```ts
// Creates type-safe object schemas
profile: z.union([JsonNullValueInputSchema, z.object({
  title: z.string(),
  description: z.string(),
  isActive: z.boolean()
})]).optional(),

metadata: z.union([JsonNullValueInputSchema, z.object({
  settings: z.object({
    theme: z.string(),
    notifications: z.boolean()
  }),
  preferences: z.array(z.string())
})]).optional()
```

### Supported Value Types

- **Strings** → `z.string()`
- **Numbers** → `z.number().int()` or `z.number()`
- **Booleans** → `z.boolean()`
- **Arrays** → `z.array(T)` (inferred from first element)
- **Nested Objects** → `z.object({...})`
- **null** → `z.null()`

### Key Differences from @zod.custom.use()

| Feature | `@zod.custom()` | `@zod.custom.use()` |
|---------|-----------------|---------------------|
| **Use Case** | Structured object/array schemas | Complete schema replacement with custom logic |
| **Syntax** | JavaScript object literals | Raw Zod schema expressions |
| **Field Types** | JSON fields only | Any field type |
| **Complexity** | Simple structured data | Advanced validation (refine, transform) |
| **Auto-conversion** | ✅ Automatic type inference | ❌ Manual Zod syntax |

### Example Comparison

```prisma
// @zod.custom() - Simple structured schema
/// @zod.custom({ "name": "John", "age": 30, "active": true })
profile Json

// @zod.custom.use() - Advanced custom validation
/// @zod.custom.use(z.object({ name: z.string().min(2), age: z.number().positive() }).refine(data => data.age >= 18))
profile Json
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
