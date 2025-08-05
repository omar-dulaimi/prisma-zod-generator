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
    <strong>🎯 Zero-config • 🛡️ Type-safe • ⚡ Fast • 🔧 Customizable</strong>
  </p>

</div>

---

<div align="center">
  <h3>💡 Transform your Prisma schema into type-safe validation schemas</h3>
  <p><em>Automatically generates Zod schemas for all Prisma operations with full TypeScript support</em></p>
</div>

<div align="center">
  
  ## 💖 **Support This Project**
  
  <p><em>If this tool accelerates your development, consider supporting its growth</em></p>
  
  <a href="https://github.com/sponsors/omar-dulaimi">
    <img src="https://img.shields.io/badge/💝_Sponsor_on_GitHub-ea4aaa?style=for-the-badge&logo=github&logoColor=white" alt="GitHub Sponsors" height="45">
  </a>
  
  <p><strong>✨ Your sponsorship drives innovation and keeps this project thriving ✨</strong></p>
  
</div>

---

## 📋 **Table of Contents**

<table>
  <tr>
    <td><a href="#-quick-start">🚀 Quick Start</a></td>
    <td><a href="#-generated-output">📋 Generated Output</a></td>
    <td><a href="#-version-compatibility">📦 Compatibility</a></td>
    <td><a href="#-core-examples">📚 Core Examples</a></td>
  </tr>
  <tr>
    <td><a href="#-advanced-features">🔧 Advanced Features</a></td>
    <td><a href="#-configuration">⚙️ Configuration</a></td>
    <td><a href="#-api-reference">📖 API Reference</a></td>
    <td><a href="#-framework-examples">🌐 Framework Examples</a></td>
  </tr>
  <tr>
    <td><a href="#-testing--development">🧪 Testing & Development</a></td>
    <td><a href="#-troubleshooting">🔍 Troubleshooting</a></td>
    <td><a href="#-contributing">🤝 Contributing</a></td>
    <td></td>
  </tr>
</table>

---

## 🚀 Quick Start

### Installation

```bash
# NPM
npm install prisma-zod-generator

# Yarn
yarn add prisma-zod-generator

# PNPM  
pnpm add prisma-zod-generator
```

<details>
<summary><strong>📝 Setup Instructions</strong></summary>

### 1. Add to your Prisma schema

```prisma
generator zod {
  provider          = "prisma-zod-generator"
  output            = "./generated/schemas"
  isGenerateSelect  = true
  isGenerateInclude = true
}
```

### 2. Configure TypeScript (required)

```json
{
  "compilerOptions": {
    "strict": true,
  }
}
```

### 3. Generate schemas

```bash
npx prisma generate
```

</details>

---

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

## 📦 Version Compatibility

<details>
<summary><strong>🔄 Supported Versions & Migration Guide</strong></summary>

### Current Requirements

| Component | Version | Status |
|-----------|---------|---------|
| **Node.js** | 18+ | ✅ Required |
| **Prisma** | 6.12.0+ | ✅ Recommended |
| **Zod** | 4.0.5+ | ✅ Required |
| **TypeScript** | 5.8+ | ✅ Recommended |

### Prisma Client Generator Support

Both legacy and new ESM-compatible generators are supported:

#### Legacy Generator (Existing Projects)
```prisma
generator client {
  provider = "prisma-client-js"
}
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

### Basic Configuration

| Option | Description | Type | Default |
|--------|-------------|------|---------|
| `output` | Output directory for generated files | `string` | `"./generated"` |
| `isGenerateSelect` | Generate Select-related schemas | `boolean` | `false` |
| `isGenerateInclude` | Generate Include-related schemas | `boolean` | `false` |

### Advanced Configuration

```prisma
generator zod {
  provider          = "prisma-zod-generator"
  output            = "./src/schemas"
  isGenerateSelect  = true
  isGenerateInclude = true
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
  "createInputTypes": true,
  "addIncludeType": true,
  "addSelectType": true,
  "validateWhereUniqueInput": true,
  "prismaClientPath": "@prisma/client"
}
```

</details>

---

## 📖 API Reference

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