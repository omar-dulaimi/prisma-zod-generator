---
id: zod-comments
title: '@zod Comment Annotations'
---

Use triple-slash Prisma doc comments with `@zod` to append validations.

```prisma
model User {
  id    String @id @default(cuid())
  /// @zod.email().min(5)
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

## Complete Feature Reference

### String Validations

#### Length & Content Validation
```prisma
model StringValidation {
  id       String @id @default(cuid())
  /// @zod.min(2, "Too short")
  name     String
  /// @zod.max(100)
  title    String
  /// @zod.length(10)
  code     String
  /// @zod.includes("@")
  email    String
  /// @zod.startsWith("https://")
  website  String
  /// @zod.endsWith(".com")
  domain   String
  /// @zod.regex(/^[A-Z]+$/, "Must be uppercase")
  acronym  String
}
```

#### String Transformation
```prisma
model StringTransform {
  id         String @id @default(cuid())
  /// @zod.trim()
  cleaned    String
  /// @zod.toLowerCase()
  slug       String
  /// @zod.toUpperCase()
  code       String
  /// @zod.uppercase()
  acronym    String
  /// @zod.lowercase()
  text       String
  /// @zod.normalize()
  normalized String
}
```

#### Standard Format Validation
```prisma
model StandardFormats {
  id        String @id @default(cuid())
  /// @zod.email("Invalid email format")
  email     String @unique
  /// @zod.url()
  website   String?
  /// @zod.uuid()
  reference String
  /// @zod.datetime()
  timestamp String
  /// @zod.ip()
  ipAddress String
  /// @zod.cidr()
  network   String
  /// @zod.date()
  dateStr   String
  /// @zod.time()
  timeStr   String
  /// @zod.duration()
  period    String
}
```

### Zod v4 String Format Methods

The generator automatically detects your Zod version and uses optimized base types in v4.

#### Network & URL Formats
```prisma
model NetworkFormats {
  id       String @id @default(cuid())
  /// @zod.httpUrl()
  apiUrl   String
  /// @zod.hostname()
  server   String
  /// @zod.ipv4()
  ipAddress String
  /// @zod.ipv6()
  ipv6Addr String?
  /// @zod.cidrv4()
  subnet   String
  /// @zod.cidrv6()
  subnet6  String?
}
```

Generated schema (Zod v4):
```ts
export const NetworkFormatsCreateInputSchema = z.object({
  apiUrl: z.httpUrl(),      // Base type in v4
  server: z.hostname(),     // Base type in v4
  ipAddress: z.ipv4(),      // Base type in v4
  ipv6Addr: z.ipv6().optional(),
  subnet: z.cidrv4(),
  subnet6: z.cidrv6().optional(),
});
```

#### Identifier Formats
```prisma
model Identifiers {
  id       String @id @default(cuid())
  /// @zod.guid()
  guid     String
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
  guid: z.guid(),       // Base type in v4
  nanoid: z.nanoid(),   // Base type in v4
  cuid: z.cuid(),       // Base type in v4
  cuid2: z.cuid2(),     // Base type in v4
  ulid: z.ulid(),       // Base type in v4
});
```

#### Encoding & Character Formats
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

#### Security & Crypto Formats
```prisma
model SecurityData {
  id        String @id @default(cuid())
  /// @zod.jwt()
  token     String?
  /// @zod.hash("sha256")
  checksum  String
}
```

Generated schema (Zod v4):
```ts
export const SecurityDataCreateInputSchema = z.object({
  token: z.jwt().optional(),        // Base type in v4
  checksum: z.hash("sha256"),       // Base type with parameter
});
```

#### ISO Date/Time Formats
```prisma
model ISOFormats {
  id         String @id @default(cuid())
  /// @zod.isoDate()
  date       String
  /// @zod.isoTime()
  time       String
  /// @zod.isoDatetime()
  datetime   String
  /// @zod.isoDuration()
  duration   String
}
```

Generated schema (Zod v4):
```ts
export const ISOFormatsCreateInputSchema = z.object({
  date: z.iso.date(),         // ISO methods use z.iso namespace
  time: z.iso.time(),
  datetime: z.iso.datetime(),
  duration: z.iso.duration(),
});
```

### Number Validations

```prisma
model NumberValidation {
  id       String @id @default(cuid())
  /// @zod.min(0, "Cannot be negative")
  score    Int
  /// @zod.max(100)
  percent  Int
  /// @zod.gt(0, "Must be greater than 0")
  revenue  Float
  /// @zod.gte(0, "Cannot be negative")
  assets   Float
  /// @zod.lt(100, "Must be less than 100")
  discount Float
  /// @zod.lte(100, "Cannot exceed 100")
  capacity Float
  /// @zod.step(0.01, "Must be in 0.01 increments")
  price    Float
  /// @zod.positive("Must be positive")
  amount   Float
  /// @zod.negative()
  debt     Float?
  /// @zod.nonnegative()
  balance  Float
  /// @zod.nonpositive()
  loss     Float?
  /// @zod.int()
  whole    Float
  /// @zod.finite()
  measured Float
  /// @zod.safe()
  counter  Int
  /// @zod.multipleOf(5, "Must be multiple of 5")
  rating   Int
}
```

Generated schema:
```ts
export const NumberValidationCreateInputSchema = z.object({
  score: z.number().int().min(0, "Cannot be negative"),
  percent: z.number().int().max(100),
  revenue: z.number().gt(0, "Must be greater than 0"),
  assets: z.number().gte(0, "Cannot be negative"),
  discount: z.number().lt(100, "Must be less than 100"),
  capacity: z.number().lte(100, "Cannot exceed 100"),
  price: z.number().multipleOf(0.01, "Must be in 0.01 increments"),
  amount: z.number().positive("Must be positive"),
  debt: z.number().negative().optional(),
  balance: z.number().nonnegative(),
  loss: z.number().nonpositive().optional(),
  whole: z.number().int(),
  measured: z.number().finite(),
  counter: z.number().int().safe(),
  rating: z.number().int().multipleOf(5, "Must be multiple of 5"),
});
```

### Array Validations

```prisma
model ArrayValidation {
  id      String   @id @default(cuid())
  /// @zod.min(1, "At least one item required")
  tags    String[]
  /// @zod.max(10)
  items   String[]
  /// @zod.length(3)
  coords  Float[]
  /// @zod.nonempty()
  colors  String[]
  /// @zod.nullable()
  options String[]?
}
```

Generated schema:
```ts
export const ArrayValidationCreateInputSchema = z.object({
  tags: z.string().array().min(1, "At least one item required"),
  items: z.string().array().max(10),
  coords: z.number().array().length(3),
  colors: z.string().array().nonempty(),
  options: z.string().array().nullable().optional(),
});
```

### Date Validations

```prisma
model DateValidation {
  id        String   @id @default(cuid())
  /// @zod.min(new Date('2020-01-01'))
  startDate DateTime
  /// @zod.max(new Date('2030-12-31'))
  endDate   DateTime
}
```

### Field Modifiers

```prisma
model FieldModifiers {
  id          String @id @default(cuid())
  /// @zod.optional()
  description String
  /// @zod.nullable()
  notes       String?
  /// @zod.nullish()
  metadata    String?
  /// @zod.default("active")
  status      String
}
```

### Advanced Modifiers

```prisma
model AdvancedModifiers {
  id         String @id @default(cuid())
  /// @zod.catch("fallback")
  safeData   String
  /// @zod.pipe(z.string().transform(s => s.toUpperCase()))
  processed  String
  /// @zod.brand<"UserId">()
  userId     String
  /// @zod.readonly()
  immutable  String
}
```

Generated schema:
```ts
export const AdvancedModifiersCreateInputSchema = z.object({
  safeData: z.string().catch("fallback"),
  processed: z.string().pipe(z.string().transform(s => s.toUpperCase())),
  userId: z.string().brand<"UserId">(),
  immutable: z.string().readonly(),
});
```

### Custom Validation & Transformation

```prisma
model CustomValidation {
  id       String @id @default(cuid())
  /// @zod.refine((val) => val.length > 0, { message: "Cannot be empty" })
  content  String
  /// @zod.transform((val) => val.trim().toLowerCase())
  slug     String
  /// @zod.enum(["admin", "user", "guest"])
  role     String
}
```

### Special Field Types

```prisma
model SpecialTypes {
  id       String @id @default(cuid())
  /// @zod.json()
  metadata Json
  /// @zod.custom({ "name": "John", "age": 30, "active": true })
  profile  Json
}
```

## External Validators with `@zod.import`

Bring in runtime helpers directly from doc comments when you need logic that lives outside the generated file.

```prisma
model User {
  id    String @id @default(cuid())
  /// @zod.import(["import { isEmail } from '../validators/email'"])
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

### Import Features
- Provide one or more complete import statements inside the array
- Relative paths are kept intact and rewritten per output directory
- Imports must produce runtime values. Type-only specifiers are detected and omitted
- Field-level imports are merged with model-level imports
- Duplicate statements are emitted once

### Model-level imports
Model-level imports can also supply chained refinements:

```prisma
/// @zod.import(["import { assertCompanyDomain } from '../validators/domain'"]).refine(assertCompanyDomain)
model Organisation {
  id    String @id @default(cuid())
  email String @unique
}
```

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

### Supported Value Types in @zod.custom()

- **Strings** → `z.string()`
- **Numbers** → `z.number().int()` or `z.number()`
- **Booleans** → `z.boolean()`
- **Arrays** → `z.array(T)` (inferred from first element)
- **Nested Objects** → `z.object({...})`
- **null** → `z.null()`

## Chaining Support

All methods can be chained together:

```prisma
model ChainedValidations {
  id       String @id @default(cuid())
  /// @zod.email().max(100).toLowerCase()
  email    String @unique
  /// @zod.nanoid().min(21)
  publicId String
  /// @zod.min(1).max(50).trim().regex(/^[A-Za-z\s]+$/)
  name     String
  /// @zod.positive().int().multipleOf(5)
  score    Int
}
```

Generated schema (Zod v4):

```ts
export const ChainedValidationsCreateInputSchema = z.object({
  email: z.email().max(100).toLowerCase(),
  publicId: z.nanoid().min(21),
  name: z.string().min(1).max(50).trim().regex(/^[A-Za-z\s]+$/),
  score: z.number().int().positive().multipleOf(5),
});
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

## Version Compatibility

The generator automatically detects your Zod version:

- **Zod v4**: Uses optimized base types like `z.email()`, `z.nanoid()`
- **Zod v3**: Falls back to chaining methods like `z.string().email()` where supported, or `z.string()` for unsupported methods

## Complete Method Reference

### String Methods

| Method | Parameters | Description |
|--------|------------|-------------|
| `@zod.min(n)` | number, optional error message | Minimum string length |
| `@zod.max(n)` | number, optional error message | Maximum string length |
| `@zod.length(n)` | number, optional error message | Exact string length |
| `@zod.email()` | optional error message/config | Email validation |
| `@zod.url()` | optional error message/config | URL validation |
| `@zod.uuid()` | optional error message/config | UUID validation |
| `@zod.regex()` | pattern, optional error message | Regular expression validation |
| `@zod.includes()` | substring | String must contain substring |
| `@zod.startsWith()` | prefix | String must start with prefix |
| `@zod.endsWith()` | suffix | String must end with suffix |
| `@zod.trim()` | none | Remove leading/trailing whitespace |
| `@zod.toLowerCase()` | none | Convert to lowercase |
| `@zod.toUpperCase()` | none | Convert to uppercase |
| `@zod.datetime()` | optional error message/config | ISO datetime validation |

### Zod v4 String Format Methods

| Method | Description | Zod v4 Output | Zod v3 Fallback |
|--------|-------------|---------------|-----------------|
| `@zod.httpUrl()` | HTTP/HTTPS URL validation | `z.httpUrl()` | `z.string()` |
| `@zod.hostname()` | Hostname validation | `z.hostname()` | `z.string()` |
| `@zod.nanoid()` | Nanoid validation | `z.nanoid()` | `z.string()` |
| `@zod.cuid()` | CUID validation | `z.cuid()` | `z.string()` |
| `@zod.cuid2()` | CUID v2 validation | `z.cuid2()` | `z.string()` |
| `@zod.ulid()` | ULID validation | `z.ulid()` | `z.string()` |
| `@zod.base64()` | Base64 validation | `z.base64()` | `z.string()` |
| `@zod.base64url()` | Base64URL validation | `z.base64url()` | `z.string()` |
| `@zod.hex()` | Hexadecimal validation | `z.hex()` | `z.string()` |
| `@zod.jwt()` | JWT token validation | `z.jwt()` | `z.string()` |
| `@zod.hash(algo)` | Hash validation | `z.hash("sha256")` | `z.string()` |
| `@zod.ipv4()` | IPv4 address validation | `z.ipv4()` | `z.string()` |
| `@zod.ipv6()` | IPv6 address validation | `z.ipv6()` | `z.string()` |
| `@zod.cidrv4()` | CIDR v4 validation | `z.cidrv4()` | `z.string()` |
| `@zod.cidrv6()` | CIDR v6 validation | `z.cidrv6()` | `z.string()` |
| `@zod.emoji()` | Single emoji validation | `z.emoji()` | `z.string()` |
| `@zod.isoDate()` | ISO date validation | `z.iso.date()` | `z.string()` |
| `@zod.isoTime()` | ISO time validation | `z.iso.time()` | `z.string()` |
| `@zod.isoDatetime()` | ISO datetime validation | `z.iso.datetime()` | `z.string()` |
| `@zod.isoDuration()` | ISO duration validation | `z.iso.duration()` | `z.string()` |

### Number Methods

| Method | Parameters | Field Types | Description |
|--------|------------|-------------|-------------|
| `@zod.min(n)` | number, optional error message | Int, Float, BigInt | Minimum value |
| `@zod.max(n)` | number, optional error message | Int, Float, BigInt | Maximum value |
| `@zod.int()` | none | Int, Float | Integer validation |
| `@zod.positive()` | optional error message | Int, Float, BigInt | Positive number (> 0) |
| `@zod.negative()` | none | Int, Float, BigInt | Negative number (< 0) |
| `@zod.nonnegative()` | none | Int, Float, BigInt | Non-negative number (>= 0) |
| `@zod.nonpositive()` | none | Int, Float, BigInt | Non-positive number (<= 0) |
| `@zod.finite()` | none | Float | Finite number |
| `@zod.safe()` | none | Int, Float | Safe integer |
| `@zod.multipleOf(n)` | number, optional error message | Int, Float | Multiple of validation |

### Array Methods

| Method | Parameters | Description |
|--------|------------|-------------|
| `@zod.min(n)` | number | Minimum array length |
| `@zod.max(n)` | number | Maximum array length |
| `@zod.length(n)` | number | Exact array length |
| `@zod.nonempty()` | none | Non-empty array |

### Date Methods

| Method | Parameters | Description |
|--------|------------|-------------|
| `@zod.min(date)` | Date | Minimum date |
| `@zod.max(date)` | Date | Maximum date |

### Field Modifiers

| Method | Parameters | Description |
|--------|------------|-------------|
| `@zod.optional()` | none | Make field optional |
| `@zod.nullable()` | none | Make field nullable |
| `@zod.nullish()` | none | Make field nullish (null or undefined) |
| `@zod.default(value)` | any value | Set default value |

### Custom Validation

| Method | Parameters | Description |
|--------|------------|-------------|
| `@zod.refine(fn)` | function | Custom validation function |
| `@zod.transform(fn)` | function | Value transformation |
| `@zod.enum(options)` | array | Enum validation |

### Special Types

| Method | Parameters | Field Types | Description |
|--------|------------|-------------|-------------|
| `@zod.json()` | none | Json | JSON validation |
| `@zod.object()` | none | Any | Object validation |
| `@zod.array()` | optional schema | Any | Array validation |
| `@zod.custom(schema)` | object literal | Json | Structured object schema |

## Parameter Types Supported

The generator preserves all JavaScript parameter types:

- **Strings**: `@zod.nanoid('Custom error')` → `z.nanoid('Custom error')`
- **Objects**: `@zod.nanoid({ abort: true })` → `z.nanoid({"abort":true})`
- **Numbers**: `@zod.min(10)` → `z.string().min(10)`
- **Booleans**: `@zod.optional()` → `z.string().optional()`
- **Arrays**: `@zod.custom([1, 2, 3])` → `z.custom([1,2,3])`
- **RegExp**: `@zod.regex(/pattern/)` → `z.regex(/pattern/)`
- **Function calls**: `@zod.custom(Date.now())` → `z.custom(Date.now())`
- **Nested expressions**: `@zod.custom(new RegExp('.'))` → `z.custom(new RegExp('.'))`
