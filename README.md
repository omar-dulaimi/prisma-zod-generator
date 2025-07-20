# Prisma Zod Generator

[![npm version](https://badge.fury.io/js/prisma-zod-generator.svg)](https://badge.fury.io/js/prisma-zod-generator)
[![npm downloads](https://img.shields.io/npm/dt/prisma-zod-generator.svg)](https://www.npmjs.com/package/prisma-zod-generator)
[![CI/CD Pipeline](https://github.com/omar-dulaimi/prisma-zod-generator/actions/workflows/ci.yml/badge.svg)](https://github.com/omar-dulaimi/prisma-zod-generator/actions)
[![License: MIT](https://img.shields.io/npm/l/prisma-zod-generator.svg)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](http://makeapullrequest.com)

> **Automatically generate [Zod](https://github.com/colinhacks/zod) schemas from your [Prisma](https://github.com/prisma/prisma) Schema**

Transform your Prisma models into type-safe Zod validation schemas with full TypeScript support. Perfect for API validation, form handling, and ensuring data integrity across your application.

## 💖 Support This Project

If this tool helps you build better applications, please consider supporting its development:

<p align="center">
  <a href="https://github.com/sponsors/omar-dulaimi">
    <img src="https://img.shields.io/badge/Sponsor-GitHub-ea4aaa?style=for-the-badge&logo=github" alt="GitHub Sponsors" height="40">
  </a>
</p>

Your sponsorship helps maintain and improve this project. Thank you! 🙏

## 🧪 Beta Testing - v0.8.14-beta.0

**Try the latest beta with Prisma 6 & Zod 4 support!**

```bash
npm install prisma-zod-generator@beta
```

This beta includes **major upgrades to Prisma 6.12.0+ and Zod v4.0.5+** - bringing compatibility with the latest versions and their breaking changes. Please test in development and [report any issues](https://github.com/omar-dulaimi/prisma-zod-generator/issues). Your feedback helps us deliver a stable release!

## 🚀 Features

- ✅ **Full Prisma 6 Support** - Works with latest Prisma features
- ✅ **Zod 4 Compatible** - Updated for breaking changes in Zod v4
- ✅ **Multi-Database Support** - PostgreSQL, MySQL, MongoDB, SQLite, SQL Server, CockroachDB
- ✅ **Type Safety** - Full TypeScript support with Prisma type imports
- ✅ **CRUD Operations** - Generate schemas for all Prisma operations
- ✅ **Relations & Aggregations** - Handle complex relationships and aggregate functions
- ✅ **Customizable Output** - Configure output directory and generation options
- ✅ **Auto-Generated** - Updates automatically with `npx prisma generate`

## 📖 Table of Contents

- [Supported Versions](#-supported-versions)
- [Installation](#-installation)
- [Quick Start](#-quick-start)
- [Configuration](#-configuration)
- [Examples](#-examples)
- [API Reference](#-api-reference)
- [Troubleshooting](#-troubleshooting)
- [Contributing](#-contributing)
- [License](#-license)

## 🎯 Supported Versions

### ✅ Current Support
| Technology | Version | Notes |
|------------|---------|-------|
| **Prisma** | 6.12.0+ | Full support with all latest features |
| **Zod** | 4.0.5+ | Updated for v4 breaking changes |
| **Node.js** | 16+ | LTS versions recommended |
| **TypeScript** | 4.5+ | Required for type safety |

### 🗄️ Database Providers
All major database providers are fully supported:
- **PostgreSQL** - Complete support including advanced types
- **MySQL** - Full compatibility with all MySQL features  
- **MongoDB** - Native MongoDB schema generation
- **SQLite** - Perfect for development and testing
- **SQL Server** - Enterprise-grade support
- **CockroachDB** - Distributed database support

### 📦 Legacy Support
- **Prisma 4**: Use version `v0.3.0+`
- **Prisma 2/3**: Use version `v0.2.0` and lower

## 🔧 Installation

### NPM
```bash
npm install prisma-zod-generator
```

### Yarn
```bash
yarn add prisma-zod-generator
```

### PNPM
```bash
pnpm add prisma-zod-generator
```

## ⚡ Quick Start

### 1. ⭐ Star this repository
Show your support by starring this repo!

### 2. 📝 Add the generator to your Prisma schema
```prisma
generator zod {
  provider = "prisma-zod-generator"
}
```

### 3. ⚙️ Configure TypeScript (Required)
Enable strict mode in your `tsconfig.json` as required by Zod:

```json
{
  "compilerOptions": {
    "strict": true,
    "exactOptionalPropertyTypes": true
  }
}
```

### 4. 🏗️ Generate schemas from your Prisma schema

Given this Prisma schema:

```prisma
generator client {
  provider = "prisma-client-js"
}

generator zod {
  provider = "prisma-zod-generator"
}

model User {
  id    Int     @id @default(autoincrement())
  email String  @unique
  name  String?
  posts Post[]
}

model Post {
  id        Int      @id @default(autoincrement())
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  title     String
  content   String?
  published Boolean  @default(false)
  viewCount Int      @default(0)
  author    User?    @relation(fields: [authorId], references: [id])
  authorId  Int?
  likes     BigInt
}
```

Run the generator:
```bash
npx prisma generate
```

### 5. 🎉 Generated Schema Structure
The generator creates comprehensive Zod schemas:

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

### 6. 🚀 Use in your application

```typescript
import { PostCreateOneSchema, UserFindManySchema } from './generated/schemas';

// API Route validation
app.post('/api/posts', async (req, res) => {
  try {
    const validatedData = PostCreateOneSchema.parse(req.body);
    const post = await prisma.post.create(validatedData);
    res.json(post);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Query parameter validation
app.get('/api/users', async (req, res) => {
  const query = UserFindManySchema.parse(req.query);
  const users = await prisma.user.findMany(query);
  res.json(users);
});
```

## ⚙️ Configuration

### Generator Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `output` | `string` | `"./generated"` | Output directory for generated schemas |
| `isGenerateSelect` | `boolean` | `false` | Generate Select-related schemas |
| `isGenerateInclude` | `boolean` | `false` | Generate Include-related schemas |

#### Basic Configuration
```prisma
generator zod {
  provider = "prisma-zod-generator"
  output   = "./src/schemas"
}
```

#### Advanced Configuration
```prisma
generator zod {
  provider          = "prisma-zod-generator"
  output            = "./generated-zod-schemas"
  isGenerateSelect  = true
  isGenerateInclude = true
}
```

### Model Customizations

#### Hide Models from Generation
Use the `@@Gen.model(hide: true)` directive to exclude specific models:

```prisma
/// @@Gen.model(hide: true)
model InternalLog {
  id        Int      @id @default(autoincrement())
  message   String
  createdAt DateTime @default(now())
}
```

## 💡 Examples

### Framework Integration Examples

#### Express.js API Validation
```typescript
import express from 'express';
import { PostCreateOneSchema, PostUpdateOneSchema } from './generated/schemas';

const app = express();

// Create post with validation
app.post('/posts', async (req, res) => {
  try {
    const data = PostCreateOneSchema.parse(req.body);
    const post = await prisma.post.create(data);
    res.json(post);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ errors: error.errors });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update post with validation
app.put('/posts/:id', async (req, res) => {
  const data = PostUpdateOneSchema.parse({
    where: { id: parseInt(req.params.id) },
    data: req.body
  });
  const post = await prisma.post.update(data);
  res.json(post);
});
```

#### Next.js API Routes
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

#### tRPC Integration
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

### Advanced Use Cases

#### Form Validation with React Hook Form
```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { UserCreateInputObjectSchema } from './generated/schemas';

function CreateUserForm() {
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(UserCreateInputObjectSchema)
  });

  const onSubmit = async (data) => {
    const response = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data })
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register('email')} type="email" />
      {errors.email && <span>{errors.email.message}</span>}
      
      <input {...register('name')} />
      {errors.name && <span>{errors.name.message}</span>}
      
      <button type="submit">Create User</button>
    </form>
  );
}
```

## 🔧 API Reference

### Generated Schema Types

The generator creates the following types of schemas:

#### Operation Schemas
- **Create Operations**: `ModelCreateOneSchema`, `ModelCreateManySchema`
- **Read Operations**: `ModelFindManySchema`, `ModelFindUniqueSchema`, `ModelFindFirstSchema`
- **Update Operations**: `ModelUpdateOneSchema`, `ModelUpdateManySchema`, `ModelUpsertSchema`
- **Delete Operations**: `ModelDeleteOneSchema`, `ModelDeleteManySchema`
- **Aggregate Operations**: `ModelAggregateSchema`, `ModelGroupBySchema`

#### Input Object Schemas
- **Create Inputs**: `ModelCreateInputObjectSchema`, `ModelCreateNestedInputObjectSchema`
- **Update Inputs**: `ModelUpdateInputObjectSchema`, `ModelUpdateNestedInputObjectSchema`
- **Where Inputs**: `ModelWhereInputObjectSchema`, `ModelWhereUniqueInputObjectSchema`
- **Order Inputs**: `ModelOrderByInputObjectSchema`

#### Select & Include Schemas (Optional)
When enabled with `isGenerateSelect: true` and `isGenerateInclude: true`:
- **Select Schemas**: `ModelSelectObjectSchema`
- **Include Schemas**: `ModelIncludeObjectSchema`

### Schema Naming Convention

All generated schemas follow a consistent naming pattern:
```
{ModelName}{Operation}{Type}Schema
```

Examples:
- `UserCreateOneSchema` - Schema for creating a single user
- `PostFindManyArgsSchema` - Schema for finding multiple posts with arguments
- `UserWhereInputObjectSchema` - Schema for user where conditions

## 🐛 Troubleshooting

### Common Issues

#### ❌ "Cannot find module" errors
**Problem**: Import errors when using generated schemas
```
Error: Cannot find module './generated/schemas'
```

**Solution**: Ensure you've run `npx prisma generate` after adding the generator
```bash
npx prisma generate
```

#### ❌ TypeScript strict mode errors
**Problem**: TypeScript compilation errors related to strict mode
```
Error: Type 'undefined' is not assignable to type 'string'
```

**Solution**: Enable strict mode in your `tsconfig.json`:
```json
{
  "compilerOptions": {
    "strict": true,
    "exactOptionalPropertyTypes": true
  }
}
```

#### ❌ Zod validation errors
**Problem**: Unexpected validation failures
```
ZodError: Invalid input
```

**Solutions**:
1. Check that your input data matches the expected Prisma schema
2. Verify field types match your Prisma model definitions
3. Ensure required fields are provided
4. Check for typos in field names

#### ❌ Generator fails to run
**Problem**: Generator execution errors during `prisma generate`

**Solutions**:
1. Ensure you have the correct version installed
2. Check that your `schema.prisma` syntax is valid
3. Verify Node.js version compatibility (16+)
4. Clear node_modules and reinstall dependencies

### Performance Considerations

#### Large Schemas
For projects with many models (50+), consider:
- Using selective generation with model hiding
- Splitting schemas into multiple files
- Implementing lazy loading for schemas

#### Build Times
To optimize build performance:
- Add generated files to `.gitignore`
- Use parallel builds where possible
- Consider caching in CI/CD pipelines

### FAQ

**Q: Can I customize the generated schema validation rules?**
A: The schemas are generated based on your Prisma schema constraints. Modify your Prisma model definitions to change validation rules.

**Q: Does this work with Prisma Edge Runtime?**
A: Yes, the generated schemas are compatible with Prisma Edge Runtime.

**Q: Can I use this with databases other than the officially supported ones?**
A: The generator supports all Prisma-compatible databases. Custom databases should work if Prisma supports them.

**Q: How do I handle enum validation?**
A: Enums are automatically converted to Zod enum schemas and placed in the `enums/` directory.

**Q: Can I exclude certain fields from validation?**
A: Use Prisma's `@ignore` directive or model-level hiding with `@@Gen.model(hide: true)`.

## 🤝 Contributing

We welcome contributions! Here's how you can help:

### Development Setup

1. **Fork and clone the repository**
```bash
git clone https://github.com/your-username/prisma-zod-generator.git
cd prisma-zod-generator
```

2. **Install dependencies**
```bash
npm install
```

3. **Run the development build**
```bash
npm run gen-example
```

4. **Run tests**
```bash
npm test
```

### Testing

We have comprehensive tests covering:
- **Unit Tests**: Core transformation logic
- **Integration Tests**: End-to-end schema generation
- **Multi-Provider Tests**: All database providers
- **Performance Tests**: Large schema handling

Run specific test suites:
```bash
npm run test:basic           # Basic functionality
npm run test:multi           # Multi-provider testing  
npm run test:coverage        # Coverage reports
npm run test:comprehensive   # Full test suite
```

### Contribution Guidelines

1. **Create an issue** for bugs or feature requests
2. **Follow the existing code style** (ESLint + Prettier)
3. **Add tests** for new functionality
4. **Update documentation** as needed
5. **Submit a pull request** with a clear description

### Code Style

We use ESLint and Prettier for consistent code formatting:
```bash
npm run lint      # Check and fix linting issues
npm run format    # Format code with Prettier
```

### Release Process

This project uses semantic versioning and automated releases:
- **Patch**: Bug fixes and small improvements
- **Minor**: New features and enhancements  
- **Major**: Breaking changes

## 📄 License

This project is licensed under the [MIT License](LICENSE).

## 🙏 Acknowledgments

- [Prisma](https://github.com/prisma/prisma) - Modern database toolkit
- [Zod](https://github.com/colinhacks/zod) - TypeScript-first schema validation
- All our [contributors](https://github.com/omar-dulaimi/prisma-zod-generator/graphs/contributors)

---

**Made with ❤️ by [Omar Dulaimi](https://github.com/omar-dulaimi)**

⭐ **Star this repo if it helped you!**
