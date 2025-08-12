<div align="center">
  
  # ⚡ Prisma Zod Generator

  ### 🚀 **Automatically generate Zod schemas from your Prisma schema**

  <p>
    <a href="https://www.npmjs.com/package/prisma-zod-generator">
      <img src="https://img.shields.io/npm/v/prisma-zod-generator/latest.svg?style=for-the-badge&logo=npm&color=blue" alt="Latest Version">
    </a>
  </p>

  <p>
    <a href="https://www.npmjs.com/package/prisma-zod-generator">
      <img src="https://img.shields.io/npm/dt/prisma-zod-generator.svg?style=for-the-badge&logo=npm&color=green" alt="Downloads">
    </a>
    <a href="https://github.com/omar-dulaimi/prisma-zod-generator/actions">
      <img src="https://img.shields.io/github/actions/workflow/status/omar-dulaimi/prisma-zod-generator/ci.yml?style=for-the-badge&logo=github" alt="CI Status">
    </a>
    <a href="LICENSE">
      <img src="https://img.shields.io/npm/l/prisma-zod-generator.svg?style=for-the-badge&color=purple" alt="License">
    </a>
  </p>

  <p>
    <strong>:dart: Zero-config • :shield: Type-safe • :zap: Fast • :wrench: Customizable</strong>
  </p>

</div>

---

<div align="center">
  <h3>:bulb: Transform your Prisma schema into type-safe validation schemas</h3>
  <p><em>Automatically generates Zod schemas for all Prisma operations with full TypeScript support</em></p>
</div>

<div align="center">
  
  <a id="sponsor"></a>
  ## :sparkling_heart: Sponsor to Keep This Project Active
  
  <p><strong>:rotating_light: Active maintenance depends on your sponsorship. If this generator saves you time, please consider sponsoring.</strong></p>
  
  <a href="https://github.com/sponsors/omar-dulaimi">
    <img src="https://img.shields.io/badge/💝_Sponsor_on_GitHub-ea4aaa?style=for-the-badge&logo=github&logoColor=white" alt="GitHub Sponsors" height="45">
  </a>
  
  <p><em>Your support funds maintenance, issue triage, new features, documentation, and community help.</em></p>
  
</div>

---



## :clipboard: **Table of Contents**

<table>
  <tr>
  <td><a href="#sponsor">:sparkling_heart: Sponsor</a></td>
  <td><a href="#-quick-start">:rocket: Quick Start</a></td>
  <td><a href="#-generated-output">:clipboard: Generated Output</a></td>
  <td><a href="#-version-compatibility">:package: Compatibility</a></td>
  <td><a href="#-core-examples">:books: Core Examples</a></td>
  </tr>
  <tr>
  <td><a href="#-advanced-features">:wrench: Advanced Features</a></td>
  <td><a href="#-configuration">:gear: Configuration</a></td>
  <td><a href="#-api-reference">:book: API Reference</a></td>
  <td><a href="#-framework-examples">:globe_with_meridians: Framework Examples</a></td>
  </tr>
  <td><a href="#-testing--development">:test_tube: Testing & Development</a></td>
  <td><a href="#-troubleshooting">:mag: Troubleshooting</a></td>
  <td><a href="#-contributing">:handshake: Contributing</a></td>
    <td></td>
  </tr>
</table>

---

## :rocket: Quick Start

### Installation

```bash
# NPM
npm install prisma-zod-generator

# Yarn
yarn add prisma-zod-generator

# PNPM  
pnpm add prisma-zod-generator
```

### 2. Add generator block to your Prisma schema

Add the Prisma Zod Generator to your `schema.prisma` with inline options. You can also supply a JSON config via `config` for advanced/nested settings.

```prisma
generator zod {
  provider = "prisma-zod-generator"        // required: package id
  output   = "./generated"                  // required: where to write output

  // File output mode
  useMultipleFiles       = true              // true: multi-file (default), false: single-file bundle
  singleFileName         = "schemas.ts"     // only when useMultipleFiles=false
  placeSingleFileAtRoot  = true              // single-file at output root (true) or under schemas/ (false)

  // Legacy select/include flags (override JSON config if both provided)
  isGenerateSelect       = false
  isGenerateInclude      = false

  // Optional: external JSON config for nested options (models, variants, exclusions, etc.)
  // When both sources specify the same simple option, this generator block wins.
  config                 = "./zod-generator.config.json"
}
```

Note on precedence: simple options declared in the Prisma generator block (like useMultipleFiles, singleFileName, placeSingleFileAtRoot, legacy isGenerateSelect/isGenerateInclude) override the same options from the JSON file. See the Precedence section for details.

### 3. Configure TypeScript (required)

```json
{
  "compilerOptions": {
    "strict": true
  }
}
```

### 4. Generate schemas

```bash
npx prisma generate
```

---

## 🐞 Logging and warnings

<details>
<summary><strong>Click to expand logging & warning details</strong></summary>

By default the generator prints minimal output. Critical warnings are surfaced as tagged info lines so you won’t miss important context, while detailed diagnostics stay hidden unless you opt in.

What you’ll see by default:

- [prisma-zod-generator] ⚠️  File layout conflicts detected. The Prisma generator block takes precedence over JSON config.
  - When generator block and JSON disagree on useMultipleFiles/singleFileName/placeSingleFileAtRoot, this header appears so you know why you got a bundle vs many files (or vice versa). Details are available in debug logs.
- [prisma-zod-generator] ⚠️  Minimal mode active: Select/Include schemas will be disabled even if enabled by legacy flags or config.
  - Minimal mode forces these helpers off to keep output lean. If you explicitly requested them, we’ll tell you they’re being ignored.
- [prisma-zod-generator] ⚠️  Configuration loading failed, using defaults: …
  - If a config file can’t be loaded, we fall back to safe defaults and tell you why.

Enable detailed debug output:

- One-off run (Linux/macOS):
  - `DEBUG_PRISMA_ZOD=1 npx prisma generate`
  - or use a namespace: `DEBUG=prisma-zod npx prisma generate`
- Via npm script in this repo: `npm run gen-example:debug`

Unset the env var to return to quiet mode.

</details>

---

## ✨ Why Choose Prisma Zod Generator?

<table>
  <tr>
    <td align="center" width="25%">
      <img src="https://img.shields.io/badge/🚀-Zero_Config-blue?style=for-the-badge" alt="Zero Config"><br>
      <strong>Works instantly</strong><br><em>Sensible defaults included</em>
    </td>
    <td align="center" width="25%">
      <img src="https://img.shields.io/badge/🔄-Auto_Generated-green?style=for-the-badge" alt="Auto Generated"><br>
      <strong>Always in sync</strong><br><em>Updates with schema changes</em>
    </td>
    <td align="center" width="25%">
      <img src="https://img.shields.io/badge/🛡️-Type_Safe-purple?style=for-the-badge" alt="Type Safe"><br>
      <strong>100% TypeScript</strong><br><em>Catch errors at compile time</em>
    </td>
    <td align="center" width="25%">
      <img src="https://img.shields.io/badge/🎯-Comprehensive-orange?style=for-the-badge" alt="Comprehensive"><br>
      <strong>Full CRUD coverage</strong><br><em>All Prisma operations included</em>
    </td>
  </tr>
  <tr>
    <td align="center">
      <img src="https://img.shields.io/badge/⚙️-Configurable-red?style=for-the-badge" alt="Configurable"><br>
      <strong>Highly customizable</strong><br><em>Adapt to your needs</em>
    </td>
    <td align="center">
      <img src="https://img.shields.io/badge/📦-Lightweight-yellow?style=for-the-badge" alt="Lightweight"><br>
      <strong>Minimal footprint</strong><br><em>Fast generation & runtime</em>
    </td>
    <td align="center">
      <img src="https://img.shields.io/badge/🗄️-Multi_DB-cyan?style=for-the-badge" alt="Multi Database"><br>
      <strong>All databases</strong><br><em>PostgreSQL, MySQL, MongoDB+</em>
    </td>
    <td align="center">
      <img src="https://img.shields.io/badge/🎨-Flexible-pink?style=for-the-badge" alt="Flexible"><br>
      <strong>Your way</strong><br><em>Custom paths & options</em>
    </td>
  </tr>
</table>

### 🔄 Upgrading

The latest stable version maintains full API compatibility. Requirements:
- Node.js 18+
- Prisma 6.12.0+
- Zod 4.0.5+

Update and regenerate:

```bash
npm update prisma-zod-generator
npx prisma generate
```

## 📋 Generated Output

<details>
<summary><strong>📁 File Structure Overview</strong></summary>

For this Prisma schema:

```prisma
model User {
  id    Int     @id @default(autoincrement())
  email String  @unique
  name  String?
  posts Post[]
}

model Post {
  id        Int      @id @default(autoincrement())
  title     String
  content   String?
  author    User?    @relation(fields: [authorId], references: [id])
  authorId  Int?
}
```

The generator creates:

```
📁 generated/schemas/
├── 📁 enums/           # Enum validation schemas
├── 📁 objects/         # Input type schemas
├── 📄 findManyUser.schema.ts
├── 📄 findUniqueUser.schema.ts
├── 📄 createOneUser.schema.ts
├── 📄 updateOneUser.schema.ts
├── 📄 deleteOneUser.schema.ts
├── 📄 findManyPost.schema.ts
├── 📄 createOnePost.schema.ts
└── 📄 index.ts         # Barrel exports
```

</details>

---

## :rocket: Dual Schema Export Strategy - Breakthrough Feature!

### 🎯 Solving the Type Safety vs Method Availability Trade-off

This generator implements a dual export strategy that gives you both perfect Prisma typing and full Zod method support.

#### The Problem
With Zod schemas, you traditionally face a choice:
- Type-safe: `z.ZodType<Prisma.Type>` gives perfect inference but restricts Zod method chaining
- Method-friendly: Pure Zod schemas support all methods but lose perfect type binding

#### Our Solution: Export Both Versions

```ts
// Perfect type safety (no Zod method chaining)
export const PostFindManySchema: z.ZodType<Prisma.PostFindManyArgs> = schema;

// Full method availability (great inference)
export const PostFindManyZodSchema = schema;
```

Type-safe version (perfect Prisma integration):

```ts
import { PostFindManySchema } from './generated/schemas/findManyPost.schema';

type FindManyArgs = z.infer<typeof PostFindManySchema>; // Prisma.PostFindManyArgs

const validatedInput = PostFindManySchema.parse(queryParams);
const posts = await prisma.post.findMany(validatedInput);
```

Method-friendly version (full Zod capabilities):

```ts
import { PostFindManyZodSchema } from './generated/schemas/findManyPost.schema';

const customSchema = PostFindManyZodSchema
  .extend({ customField: z.string() })
  .omit({ take: true })
  .merge(otherSchema);

const partialSchema = PostFindManyZodSchema.partial();
```

#### Configuration Options

```prisma
generator zod {
  provider           = "prisma-zod-generator"
  output             = "./generated/schemas"
  exportTypedSchemas = true        // Export z.ZodType<Prisma.Type> versions
  exportZodSchemas   = true        // Export pure Zod versions
  typedSchemaSuffix  = "Schema"    // Suffix for typed versions
  zodSchemaSuffix    = "ZodSchema" // Suffix for method-friendly versions
}
```

#### Configuration Scenarios

Type-safe only:

```prisma
generator zod {
  provider           = "prisma-zod-generator"
  exportTypedSchemas = true
  exportZodSchemas   = false
}
```

Method-friendly only:

```prisma
generator zod {
  provider           = "prisma-zod-generator"
  exportTypedSchemas = false
  exportZodSchemas   = true
}
```

Both versions:

```prisma
generator zod {
  provider           = "prisma-zod-generator"
  exportTypedSchemas = true
  exportZodSchemas   = true
}
```

Custom naming:

```prisma
generator zod {
  provider           = "prisma-zod-generator"
  exportTypedSchemas = true
  exportZodSchemas   = true
  typedSchemaSuffix  = "Args"
  zodSchemaSuffix    = "Validator"
}
```

Pro tips:

- Smaller bundles: use a single export mode
- Team consistency: choose one naming convention and stick with it
- Gradual adoption: start with type-safe schemas, add method-friendly as needed
- IDE performance: fewer exports -> faster IntelliSense in huge projects

---

## :package: Version Compatibility

<details>
<summary><strong>🔄 Supported Versions & Migration Guide</strong></summary>

### Current Requirements
| **Prisma** | 6.12.0+ | ✅ Recommended |
| **Zod** | 4.0.5+ | ✅ Required |
| **TypeScript** | 5.8+ | ✅ Recommended |
### Prisma Client Generator Support

Both legacy and new ESM-compatible generators are supported:

#### Legacy Generator (Existing Projects)
```prisma
```

#### New ESM Generator (Prisma 6.12.0+)
```prisma
generator client {
  provider = "prisma-client"
  output = "./src/generated/client"
  runtime = "nodejs"
  moduleFormat = "esm"
  generatedFileExtension = "ts"
  importFileExtension = "ts"
}
```

### Migration Guide

**Existing Projects**: No changes needed - continue using `prisma-client-js`

**New Projects**: Consider the new `prisma-client` generator for ESM support

</details>

---

## 📚 Core Examples

<details>
<summary><strong>🎯 Essential Usage Patterns</strong></summary>

### API Validation

```typescript
// Validate input data
const createUser = UserCreateInputObjectSchema.parse(requestData);

// Validate query parameters
const findUsers = UserFindManySchema.parse(queryParams);

// Validate update operations
const updateUser = UserUpdateOneSchema.parse(updateData);
```

### Form Validation with React Hook Form

```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { UserCreateInputObjectSchema } from './generated/schemas';

function CreateUserForm() {
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(UserCreateInputObjectSchema)
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register('email')} type="email" />
      {errors.email && <span>{errors.email.message}</span>}
      <button type="submit">Create User</button>
    </form>
  );
}
```

### Database Operations

```typescript
// Safe database queries with validation
const searchUsers = async (params: unknown) => {
  const validatedParams = UserFindManySchema.parse(params);
  return await prisma.user.findMany(validatedParams);
};

// Validated mutations
const createPost = async (data: unknown) => {
  const validatedData = PostCreateOneSchema.parse(data);
  return await prisma.post.create(validatedData);
};
```

</details>

---

## 🔧 Advanced Features

<details>
<summary><strong>🎯 Configuration System</strong></summary>

Looking for ready-made configs? See the new Recipes catalog in `recipes/` for common setups (single file, models-only, minimal CRUD, tRPC, API result schemas, hide fields, and more).

### JSON-Based Configuration

Create `zod-generator.config.json`:

```json
{
  "mode": "custom",
  "output": "./src/generated/zod",
  "globalExclusions": {
    "input": ["id", "createdAt", "updatedAt"],
    "result": [],
    "pure": ["password", "hashedPassword"]
  },
  "variants": {
    "pure": {
      "enabled": true,
      "suffix": ".model",
      "excludeFields": []
    },
    "input": {
      "enabled": true,
      "suffix": ".input",
      "excludeFields": ["id"]
    },
    "result": {
      "enabled": true,
      "suffix": ".result",
      "excludeFields": ["password"]
    }
  },
  "models": {
    "User": {
      "enabled": true,
      "operations": ["findMany", "findUnique", "create", "update"],
      "variants": {
        "input": {
          "excludeFields": ["role", "permissions"]
        }
      }
    }
  }
}
```

### Configuration Modes

```typescript
// Minimal mode - essential operations only
const minimalConfig = {
  mode: "minimal",
  operations: ["findMany", "findUnique", "create", "update"]
};

// Full mode - all operations and features
const fullConfig = {
  mode: "full",
  includeAggregations: true,
  includeGroupBy: true
};
```

</details>

<details>
<summary><strong>🎨 Schema Variants</strong></summary>

### Multiple Schema Types

Generate different schema variants for various use cases:

```typescript
// Pure model schemas - exact Prisma model structure
import { UserModelSchema } from './schemas/User.model';

// Input schemas - for API endpoints and forms
import { UserInputSchema } from './schemas/User.input';

// Result schemas - for API responses
import { UserResultSchema } from './schemas/User.result';

// Usage examples
const createUser = UserInputSchema.parse(formData);
const userResponse = UserResultSchema.parse(dbResult);
const pureUser = UserModelSchema.parse(prismaModel);
```

### Variant Configuration

```json
{
  "variants": [
    {
      "name": "input",
      "suffix": "Input",
      "exclude": ["id", "createdAt", "updatedAt"]
    },
    {
      "name": "result",
      "suffix": "Result", 
      "exclude": ["password"]
    },
    {
      "name": "public",
      "suffix": "Public",
      "exclude": ["password", "email", "internalId"]
    }
  ]
}
```

</details>

<details>
<summary><strong>🔍 Field Exclusion System</strong></summary>

### Global and Model-Specific Exclusions

```typescript
// Configuration-based exclusion
const config = {
  globalExclusions: {
    input: ["id", "createdAt", "updatedAt"],
    result: ["password", "hashedPassword"],
    pure: []
  },
  models: {
    User: {
      variants: {
        input: { excludeFields: ["role", "permissions"] },
        result: { excludeFields: ["password", "sessionToken"] }
      }
    }
  }
};
```

### Prisma Schema Exclusions

```prisma
model User {
  id        Int     @id @default(autoincrement())
  email     String  @unique
  password  String  // Excluded from result schemas
  role      String  // Excluded from input schemas
  /// @@Gen.model(hide: true)  // Hide entire model
  posts     Post[]
}
```

</details>

<details>
<summary><strong>🧭 Create input strictness</strong></summary>

Control how Create-like inputs respect field exclusions.

- strictCreateInputs (boolean, default: true)
  - true: Create-like inputs (CreateInput, UncheckedCreateInput, CreateMany*, CreateWithout*, CreateOrConnectWithout*, CreateNested*Without*) match Prisma exactly; exclusions do not apply.
  - false: Apply exclusions to these Create-like inputs as well.
- preserveRequiredScalarsOnCreate (boolean, default: true)
  - When strictCreateInputs is false, keep truly required scalar fields even if excluded. Set to false to omit them too (advanced use only).

Type parity with filtered Create inputs:
- When exclusions apply to Create-like inputs, the typed export binds to Omit<Prisma.Type, 'excluded' | ...> so TypeScript matches the Zod shape.

JSON config example:

```json
{
  "globalExclusions": { "input": ["password", "internalId"] },
  "strictCreateInputs": false,
  "preserveRequiredScalarsOnCreate": true
}
```

</details>

<details>
<summary><strong>📝 @zod Comment Annotations</strong></summary>

### Inline Validation Rules

Add validation directly in your Prisma schema:

```prisma
model User {
  id       Int     @id @default(autoincrement())
  email    String  @unique /// @zod.email()
  name     String? /// @zod.min(2).max(50)
  age      Int?    /// @zod.min(0).max(120)
  username String  @unique /// @zod.regex(/^[a-zA-Z0-9_]+$/)
  website  String? /// @zod.url().optional()
}
```

Generated schema with validations:

```typescript
export const UserCreateInputSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2).max(50).optional(),
  age: z.number().int().min(0).max(120).optional(),
  username: z.string().regex(/^[a-zA-Z0-9_]+$/),
  website: z.string().url().optional()
});
```

### Supported @zod Annotations

```prisma
// String validations
field String /// @zod.email()
field String /// @zod.url()
field String /// @zod.regex(/pattern/)
field String /// @zod.min(2).max(50)

// Number validations  
field Int    /// @zod.min(0).max(100)
field Float  /// @zod.positive()

// Custom validations
field String /// @zod.custom(z.string().transform(s => s.toLowerCase()))
```

</details>

<details>
<summary><strong>🗄️ Multi-Database Provider Support</strong></summary>

### Database-Specific Optimizations

```typescript
// PostgreSQL - Advanced types supported
const pgUser = z.object({
  id: z.number().int(),
  metadata: z.record(z.unknown()), // JSON type
  tags: z.array(z.string()),       // Array type
  balance: z.number()              // Decimal type
});

// MongoDB - Document structure
const mongoUser = z.object({
  id: z.string(),                  // ObjectId as string
  embedded: z.object({             // Embedded documents
    profile: z.object({
      bio: z.string().optional()
    })
  }).optional()
});

// MySQL - Optimized for relational data
const mysqlUser = z.object({
  id: z.number().int(),
  createdAt: z.date(),
  updatedAt: z.date()
});
```

### Supported Providers

- **PostgreSQL** - Full advanced type support
- **MySQL** - Complete compatibility  
- **MongoDB** - Native document schemas
- **SQLite** - Development & testing optimized
- **SQL Server** - Enterprise features
- **CockroachDB** - Distributed database support

</details>

<details>
<summary><strong>🔧 ESM Import Handling</strong></summary>

### Modern ES Module Support

Full ESM compatibility with automatic file extension handling:

```prisma
generator client {
  provider = "prisma-client"
  output   = "./src/generated/client"
  moduleFormat = "esm"
  importFileExtension = "js"  # Auto-handled
}
```

Generated imports include proper extensions:

```typescript
import { User } from '../client/index.js';  // Auto-generated
import { z } from 'zod';
```

### Import Configuration

```json
{
  "esm": {
    "enabled": true,
    "fileExtension": ".js",
    "importExtension": ".js"
  }
}
```

</details>

<details>
<summary><strong>⚡ Performance Optimization</strong></summary>

### Built-in Optimizations

```typescript
// Lazy loading for circular references
const UserSchema = z.lazy(() => z.object({
  id: z.number().int(),
  posts: z.array(PostSchema).optional()
}));

// Selective generation
const config = {
  models: {
    AuditLog: { enabled: false },    // Skip audit tables
    Migration: { enabled: false },   // Skip migration tables
    User: {
      enabled: true,
      operations: ["findMany", "create", "update"] // Only needed operations
    }
  }
};
```

### Performance Tips

- Use `minimal` mode for faster generation
- Exclude unused models and operations
- Enable lazy loading for complex relationships
- Cache generated schemas in production

</details>

<details>
<summary><strong>🔐 API Security & Validation Patterns</strong></summary>

### Input Sanitization

```typescript
export const sanitizeUserInput = (data: unknown) => {
  return UserCreateInputSchema
    .omit({ id: true })           // Remove ID from input
    .extend({
      email: z.string().email().toLowerCase() // Normalize email
    })
    .parse(data);
};
```

### Role-Based Field Filtering

```typescript
export const getUserForRole = (user: User, role: 'admin' | 'user') => {
  const baseSchema = UserResultSchema;
  
  if (role === 'user') {
    return baseSchema.omit({ 
      email: true, 
      role: true,
      permissions: true 
    }).parse(user);
  }
  
  return baseSchema.parse(user);
};
```

### Complete API Endpoint Validation

```typescript
app.post('/users', async (req, res) => {
  try {
    const userData = UserCreateInputSchema.parse(req.body);
    const user = await prisma.user.create({ data: userData });
    const response = UserResultSchema.parse(user);
    res.json(response);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        errors: error.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message
        }))
      });
    }
  }
});
```

</details>

---

## ⚙️ Configuration

<details>
<summary><strong>🔧 Configuration Options</strong></summary>

> Looking for a complete, exhaustively documented list of every flag? See **[Full Configuration Reference](./CONFIG_REFERENCE.md)**.

### Basic Configuration

| Option | Description | Type | Default |
|--------|-------------|------|---------|
| `output` | Output directory for generated files | `string` | `"./generated"` |
| `isGenerateSelect` | Generate Select-related schemas | `boolean` | `false` |
| `isGenerateInclude` | Generate Include-related schemas | `boolean` | `false` |
| `exportTypedSchemas` | Export z.ZodType versions (type-safe) | `boolean` | `true` |
| `exportZodSchemas` | Export pure Zod versions (method-friendly) | `boolean` | `true` |  
| `typedSchemaSuffix` | Suffix for typed schemas | `string` | `"Schema"` |
| `zodSchemaSuffix` | Suffix for Zod schemas | `string` | `"ZodSchema"` |
| `useMultipleFiles` | Output multiple files (true) or single bundle (false) | `boolean` | `true` |
| `singleFileName` | Name of the single-file bundle when `useMultipleFiles=false` | `string` | `"schemas.ts"` |
| `placeSingleFileAtRoot` | When `useMultipleFiles=false`, place the single file at the generator output root instead of a `schemas/` subfolder | `boolean` | `true` |
| `pureModels` | Emit plain model object schemas (no operation args wiring) | `boolean` | `false` (implicitly true in minimal mode) |
| `pureModelsLean` | When pure models are enabled, omit JSDoc/statistics & field doc blocks for minimal output | `boolean` | `true` |
| `pureModelsIncludeRelations` | When pureModels are enabled, include relation fields (lazy refs). Default excludes relations for slimmer objects | `boolean` | `false` |
| `dateTimeStrategy` | Mapping for Prisma `DateTime` ("date" | "coerce" | "isoString") | `string` | `"date"` |

### Advanced Configuration

```prisma
generator zod {
  provider          = "prisma-zod-generator"
  output            = "./src/schemas"
  // File output mode
  // true  -> multiple files (default)
  // false -> single file bundle (see singleFileName below)
  useMultipleFiles  = true
  // Optional: name of the single-file bundle when useMultipleFiles = false
  // Defaults to "schemas.ts"
  singleFileName    = "schemas.ts"
  // Optional: when useMultipleFiles = false, place the single file at the
  // generator output root (true) or inside a schemas/ subdir (false)
  placeSingleFileAtRoot = true
  isGenerateSelect  = true
  isGenerateInclude = true
  // Pure model + DateTime handling examples
  pureModels        = true              // enable pure model schemas (can also go in JSON)
  pureModelsLean    = true              // default: lean (no doc banners)
  pureModelsIncludeRelations = true     // opt-in to emit relation fields (default false)
  dateTimeStrategy  = "coerce"          // accept strings/numbers, coerce to Date
  config            = "./zod-config.json"
}
```

### Model Customizations

```prisma
/// @@Gen.model(hide: true)
model InternalLog {
  id        Int      @id @default(autoincrement())
  message   String
  createdAt DateTime @default(now())
}
```

### JSON Configuration File

```json
{
  "mode": "custom",
  "output": "./generated/schemas",
  "relationModel": true,
  "modelCase": "PascalCase", 
  "modelSuffix": "Schema",
  "useMultipleFiles": true,
  "placeSingleFileAtRoot": true,
  "createInputTypes": true,
  "addIncludeType": true,
  "addSelectType": true,
  "validateWhereUniqueInput": true,
  "prismaClientPath": "@prisma/client"
}
```

#### DateTime Strategy Examples

Choose how Prisma `DateTime` fields are represented at validation boundaries:

```jsonc
{ "dateTimeStrategy": "date" }      // -> z.date() (default)
{ "dateTimeStrategy": "coerce" }    // -> z.coerce.date() (flexible input)
{ "dateTimeStrategy": "isoString" } // -> z.string().regex(ISO).transform(v => new Date(v))
```

#### pureModelsLean

When `pureModels` are enabled, the default `pureModelsLean: true` suppresses large JSDoc header banners, schema statistics, and field documentation comments for ultra-small output. Set `pureModelsLean: false` to restore verbose docs:

```jsonc
{
  "pureModels": true,
  "pureModelsLean": false
}
```

Provides parity with popular “lean” generators while still allowing an opt-in to rich docs for teams that want them.

</details>

---

## 📖 API Reference

## ⚙️ Configuration sources, precedence, and availability

This generator accepts configuration from two sources. When the same option is provided in multiple places, the value is resolved using a simple precedence.

### Sources

- Prisma generator block (schema.prisma)
  - Standard Prisma fields like `output`.
  - Simple override flags/strings (e.g., `useMultipleFiles`, `singleFileName`, etc.).
  - Optional `config = "./zod-generator.config.json"` to point to a JSON file.
- JSON config file (recommended for complex/nested settings)
  - Full configuration surface, including nested structures like `models` and `variants`.
  - Can be provided explicitly via `config = "./path.json"` or auto-discovered (e.g., `zod-generator.config.json`, `.zod-generator.json`).

### Precedence (highest → lowest)

1) Prisma generator block options (direct attributes in `generator zod { ... }`)
2) JSON config file (explicit or auto-discovered)
3) Built-in defaults (computed based on `mode`, etc.)

Notes and special cases:
- Output path: The Prisma generator’s `output` always decides where files go. Any `output` set in the JSON config is ignored.
- File layout: The Prisma generator’s `useMultipleFiles` and `singleFileName` override the JSON. Keep them aligned with any recipe you copy.
- Minimal mode: If `mode = "minimal"` (or legacy `minimal = true`), select/include schemas are forcibly disabled and many complex nested inputs are suppressed to speed up generation and shrink output.
- Legacy flags: `isGenerateSelect` / `isGenerateInclude` (Prisma block) override the newer `addSelectType` / `addIncludeType` (config JSON). Minimal mode will still force them off.

Visibility of conflicts and overrides:
- Critical cases (e.g., file layout conflicts; minimal mode overriding select/include) are surfaced as tagged info lines prefixed with `[prisma-zod-generator]`.
- Detailed context and tips are printed only when debug logging is enabled.

### Option availability matrix

| Option | Prisma generator block | JSON config file | Notes |
|---|---|---|---|
| `output` | Yes (authoritative) | Ignored if present | Use the Prisma generator `output` only |
| `useMultipleFiles` | Yes | Yes | `false` enables strict single-file mode |
| `singleFileName` | Yes | Yes | File name for the single bundle (default `schemas.ts`) |
| `placeSingleFileAtRoot` | Yes | Yes | Place single file at output root (true, default) or under `schemas/` (false) |
| `placeArrayVariantsAtRoot` | Yes | Yes | For array-based variants placement (root vs `variants/`) |
| `mode` (`full|minimal|custom`) | Yes | Yes | Minimal mode applies opinionated defaults |
| `pureModels` | Yes | Yes | Generates `models/` set when multi-file; N/A in single-file (content is bundled) |
| `globalExclusions` | — | Yes | Object keyed by variant (`input`, `result`, `pure`) |
| `variants` (object-based) | — | Yes | Nested structure; configure `pure/input/result` |
| `models.*` (per-model) | — | Yes | Nested per-model rules, operations, and variant overrides |
| `addSelectType` / `addIncludeType` | Yes (as legacy `isGenerateSelect` / `isGenerateInclude`) | Yes | Prisma block flags override the JSON values; minimal mode forces off |
| `formatGeneratedSchemas` | — | Yes | Formatting can be skipped for speed (default: false) |
| `config` (path to JSON) | Yes | — | Points to the JSON file; not a config value itself |

Example: Prisma block overrides JSON file

```prisma
generator zod {
  provider              = "prisma-zod-generator"
  output                = "./generated"
  // Overrides values from the JSON config below
  useMultipleFiles      = false
  singleFileName        = "bundle.ts"
  placeSingleFileAtRoot = true
  // Load additional (nested) settings from a JSON file
  config                = "./zod-generator.config.json"
}
```

When both sources specify the same simple option (e.g., `useMultipleFiles`), the Prisma block wins. Nested settings (like `models` and `variants`) should live in the JSON file.

Tip when using recipes: If you want models-only (multi-file) but your generator block still has `useMultipleFiles = false` from a previous setup, you'll see extra files or a bundle you didn't expect. Open the matching recipe folder under `recipes/<name>/` and copy the generator block from its `schema.prisma`.

### How @zod schema comments fit into precedence

Inline `@zod` comments in your Prisma schema are not a separate “config source,” but they do affect field-level validation and are always respected when that field is generated.

- Scope: Applies only to the field where the comment appears, and only in schemas that include that field (subject to filtering, variants, minimal mode).
- Merge behavior: Field validation is built by combining pieces. In practice, the chain is composed of the base Zod type plus any optional/nullable handling, any config-driven validations (e.g., variant `additionalValidation`), and your `@zod` comment directives. If multiple validations of the same kind are present, they’re appended in order; the latter call wins when there’s a conflict.
- Not a global override: `@zod` comments do not override global settings like `output`, `mode`, or file layout; they only enrich the field’s Zod chain.
- Filtering/minimal mode: If a field or schema is excluded by filters/variants/minimal mode, its comments simply won’t apply because that schema isn’t emitted.

See the “@zod Comment Annotations” section for syntax and examples.

<details>
<summary><strong>📚 Generated Schema Types</strong></summary>

### Operation Schemas

- **Create Operations**: `ModelCreateOneSchema`, `ModelCreateManySchema`
- **Read Operations**: `ModelFindManySchema`, `ModelFindUniqueSchema`, `ModelFindFirstSchema`
- **Update Operations**: `ModelUpdateOneSchema`, `ModelUpdateManySchema`, `ModelUpsertSchema`
- **Delete Operations**: `ModelDeleteOneSchema`, `ModelDeleteManySchema`
- **Aggregate Operations**: `ModelAggregateSchema`, `ModelGroupBySchema`

### Input Object Schemas

- **Create Inputs**: `ModelCreateInputObjectSchema`, `ModelCreateNestedInputObjectSchema`
- **Update Inputs**: `ModelUpdateInputObjectSchema`, `ModelUpdateNestedInputObjectSchema`
- **Where Inputs**: `ModelWhereInputObjectSchema`, `ModelWhereUniqueInputObjectSchema`
- **Order Inputs**: `ModelOrderByInputObjectSchema`

### Select & Include Schemas

When enabled with `isGenerateSelect: true` and `isGenerateInclude: true`:
- **Select Schemas**: `ModelSelectObjectSchema`
- **Include Schemas**: `ModelIncludeObjectSchema`

### Schema Naming Convention

All generated schemas follow this pattern:
```
{ModelName}{Operation}{Type}Schema
```

Examples:
- `UserCreateOneSchema` - Schema for creating a single user
- `PostFindManyArgsSchema` - Schema for finding multiple posts with arguments
- `UserWhereInputObjectSchema` - Schema for user where conditions

</details>

---

## 🌐 Framework Examples

<details>
<summary><strong>🚀 Next.js Integration</strong></summary>

### API Routes

```typescript
// pages/api/users.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { UserCreateOneSchema } from '../../generated/schemas';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    try {
      const userData = UserCreateOneSchema.parse(req.body);
      const user = await prisma.user.create(userData);
      res.status(201).json(user);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
}
```

### App Router (Next.js 13+)

```typescript
// app/api/users/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { UserCreateOneSchema } from '@/generated/schemas';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const userData = UserCreateOneSchema.parse(body);
    const user = await prisma.user.create(userData);
    return NextResponse.json(user);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
```

</details>

<details>
<summary><strong>⚡ tRPC Integration</strong></summary>

```typescript
import { z } from 'zod';
import { PostCreateOneSchema, PostFindManySchema } from './generated/schemas';

export const postRouter = router({
  create: publicProcedure
    .input(PostCreateOneSchema)
    .mutation(({ input }) => {
      return prisma.post.create(input);
    }),
    
  list: publicProcedure
    .input(PostFindManySchema)
    .query(({ input }) => {
      return prisma.post.findMany(input);
    }),
});
```

</details>

<details>
<summary><strong>🛠️ Fastify Integration</strong></summary>

```typescript
import fastify from 'fastify';
import { UserCreateOneSchema } from './generated/schemas';

const server = fastify();

server.post('/users', {
  schema: {
    body: UserCreateOneSchema
  }
}, async (request, reply) => {
  const user = await prisma.user.create(request.body);
  return user;
});
```

</details>

<details>
<summary><strong>🌐 Express.js Integration</strong></summary>

```typescript
import express from 'express';
import { UserCreateOneSchema, UserFindManySchema } from './generated/schemas';

const app = express();

// Create user with validation
app.post('/users', async (req, res) => {
  try {
    const data = UserCreateOneSchema.parse(req.body);
    const user = await prisma.user.create(data);
    res.json(user);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ errors: error.errors });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Query with validation
app.get('/users', async (req, res) => {
  const query = UserFindManySchema.parse(req.query);
  const users = await prisma.user.findMany(query);
  res.json(users);
});
```

</details>

---

## 🧪 Testing & Development

<details>
<summary><strong>🔬 Testing Infrastructure</strong></summary>

### Test Suite Overview

We maintain **enterprise-grade testing standards** with comprehensive coverage:

#### 📊 **Test Statistics**
- **📊 80+ Tests Passing** - Comprehensive validation across all features
- **🔍 5,239 Schemas Validated** - Massive multi-provider testing
- **✅ 100% TypeScript Compilation** - Zero compilation errors guaranteed
- **🛡️ Zero ESLint Issues** - Clean, maintainable code quality

#### 📋 **Test Categories**

```bash
# Core infrastructure tests
npm run test:core                    # Configuration & integration tests
npm run test:esm                     # ESM import handling tests
npm run test:comprehensive           # Multi-provider schema validation

# Feature-specific tests
npm run test:config                  # Configuration system validation
npm run test:variants               # Schema variant generation
npm run test:filtering              # Model/field filtering logic
npm run test:pure-models            # Pure model schema generation
npm run test:result-schemas         # Result schema validation
npm run test:zod-comments           # @zod comment parsing
npm run test:field-exclusion        # Field exclusion system

# Advanced testing
npm run test:integration            # Full generation pipeline tests
npm run test:multi-provider         # All database provider validation
npm run test:performance            # Schema generation performance
npm run test:coverage               # Code coverage analysis
```

</details>

<details>
<summary><strong>🧪 Testing Integration</strong></summary>

### Schema Testing Utilities

```typescript
import { SchemaTestUtils } from './test-utils';

// Validate schema structure
SchemaTestUtils.testValidData(UserCreateInputSchema, {
  email: 'test@example.com',
  name: 'Test User'
});

// Test boundary conditions
SchemaTestUtils.testBoundaryValues(UserCreateInputSchema, [
  { value: { email: 'invalid-email' }, shouldPass: false },
  { value: { name: 'x'.repeat(51) }, shouldPass: false },
  { value: { name: 'Valid Name' }, shouldPass: true }
]);

// Performance testing
const performance = SchemaTestUtils.performanceTest(
  UserCreateInputSchema,
  validUserData,
  1000 // iterations
);
console.log(`Avg validation time: ${performance.avgTime}ms`);
```

### Development Setup

```bash
# Clone and setup
git clone https://github.com/your-username/prisma-zod-generator.git
cd prisma-zod-generator
npm install

# Development build
npm run gen-example

# Run tests
npm test

# Code quality
npm run lint      # Check and fix linting issues
npm run format    # Format code with Prettier
```

</details>

<details>
<summary><strong>📈 Multi-Database Provider Validation</strong></summary>

Our test suite validates schemas across **6 database providers**:

| Provider | Schemas Validated | Status |
|----------|------------------|---------|
| **PostgreSQL** | 1,020 schemas | ✅ |
| **MySQL** | 1,326 schemas | ✅ |
| **MongoDB** | 855 schemas | ✅ |
| **SQLite** | 1,409 schemas | ✅ |
| **SQL Server** | 622 schemas | ✅ |
| **Default** | Additional schemas | ✅ |

</details>

---

## 🔍 Troubleshooting

<details>
<summary><strong>🚨 Common Issues & Solutions</strong></summary>

### Generator Compatibility Errors

**Issue**: Cannot find compatible Prisma generator
```bash
Error: No compatible Prisma client generator found
```

**Solution**: Ensure you have a supported generator in your schema:
```prisma
generator client {
  provider = "prisma-client-js"  // or "prisma-client"
}

generator zod {
  provider = "prisma-zod-generator"
  output   = "./generated/schemas"
}
```

### Module Resolution Errors

**Issue**: `Cannot find module './generated/schemas'`

**Solutions**:
1. Run `npx prisma generate` after adding the generator
2. Check that your output path is correct
3. Verify the generator completed successfully

### TypeScript Compilation Errors

**Issue**: Generated schemas have TypeScript errors

**Solutions**:
1. Enable strict mode in `tsconfig.json`:
```json
{
  "compilerOptions": {
    "strict": true,
  }
}
```
2. Update dependencies: `npm update prisma-zod-generator prisma zod`
3. Clear build cache and regenerate

### Generation Performance Issues

**Issue**: Slow generation for large schemas

**Solutions**:
1. Use minimal mode:
```json
{
  "mode": "minimal",
  "models": {
    "AuditLog": { "enabled": false },
    "Migration": { "enabled": false }
  }
}
```
2. Exclude unnecessary operations
3. Enable selective model generation

</details>

<details>
<summary><strong>💡 Performance Optimization Tips</strong></summary>

### Large Schema Optimization

For projects with 50+ models:
- Use selective generation with model hiding
- Split schemas into multiple files  
- Implement lazy loading for schemas
- Consider minimal mode for faster builds

### Build Time Optimization

```json
{
  "mode": "minimal",
  "models": {
    "User": {
      "operations": ["findMany", "create", "update"]
    }
  }
}
```

### Production Deployment

```typescript
// Environment-specific configuration
const productionConfig = {
  mode: 'minimal',
  globalExclusions: {
    result: ['password', 'sessionToken', 'internalNotes']
  }
};
```

</details>

<details>
<summary><strong>❓ Frequently Asked Questions</strong></summary>

**Q: Can I customize the generated validation rules?**  
A: Modify your Prisma schema with `@zod` comments or use configuration options to customize validation.

**Q: Does this work with Prisma Edge Runtime?**  
A: Yes, generated schemas are compatible with Prisma Edge Runtime.

**Q: How do I handle circular references?**  
A: The generator automatically uses lazy loading for circular relationships.

**Q: Can I exclude certain fields from validation?**  
A: Yes, use the `globalExclusions` or model-specific `excludeFields` configuration.

**Q: How do I handle enum validation?**  
A: Enums are automatically converted to Zod enum schemas in the `enums/` directory.

</details>

---

## 🤝 Contributing

<details>
<summary><strong>🛠️ Development Guidelines</strong></summary>


<details>
<summary><strong>🚀 Release Process</strong></summary>

This project uses semantic versioning and automated releases:

- Patch: Bug fixes and small improvements
- Minor: New features and enhancements
- Major: Breaking changes

Helpful commands:

```bash
npm run prerelease   # Build, type-check, lint
npm run release:dry  # Preview the next release
```

</details>
### Contribution Process

1. **Create an issue** for bugs or feature requests
2. **Fork and clone** the repository  
3. **Follow existing code style** (ESLint + Prettier)
4. **Add comprehensive tests** for new functionality
5. **Update documentation** as needed
6. **Submit a pull request** with clear description

### Code Quality Standards

```bash
npm run lint      # Check and fix linting issues
npm run format    # Format code with Prettier
npm test          # Run comprehensive test suite
```

### Testing Requirements

When contributing new features:
1. **Write tests first** - TDD approach
2. **Test all edge cases** - Comprehensive scenarios  
3. **Validate across providers** - Multi-database compatibility
4. **Performance testing** - Ensure scalability
5. **Integration testing** - End-to-end validation

</details>

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).

---

## 🔗 Related Projects

- [prisma-trpc-generator](https://github.com/omar-dulaimi/prisma-trpc-generator) - Generate tRPC routers from Prisma schema
- [Prisma](https://github.com/prisma/prisma) - Database toolkit and ORM
- [Zod](https://github.com/colinhacks/zod) - TypeScript-first schema validation

---

<div align="center">
  
  <h3>🌟 **Show Your Support** 🌟</h3>
  
  <a href="https://github.com/omar-dulaimi/prisma-zod-generator">
    <img src="https://img.shields.io/github/stars/omar-dulaimi/prisma-zod-generator?style=for-the-badge&logo=github&color=yellow" alt="GitHub Stars">
  </a>
  
  <br><br>
  
  <p>
    <strong>Made with ❤️ by</strong>
    <a href="https://github.com/omar-dulaimi">
      <img src="https://img.shields.io/badge/Omar_Dulaimi-100000?style=for-the-badge&logo=github&logoColor=white" alt="Omar Dulaimi">
    </a>
  </p>
  
  <p><em>⚡ Accelerating Prisma development, one schema at a time</em></p>
  
</div>