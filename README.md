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

<br>

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

<div align="center">
  
  ## 🚀 **Latest Stable Release** - Now with Schema Compilation Fixes!
  
  <table>
    <tr>
      <td align="center">
        <img src="https://img.shields.io/badge/🎉_STABLE_RELEASE-green?style=for-the-badge&logo=checkmark" alt="Stable Release">
      </td>
    </tr>
    <tr>
      <td align="center">
        <strong>🎉 Production Ready with New Prisma Client Generator Support!</strong>
      </td>
    </tr>
  </table>
  
</div>

### ✨ **Latest Features**

🐛 **Schema Compilation Fixes** - Resolved critical schema compilation errors:
- **SortOrderInput schemas** now use direct enum references instead of unnecessary lazy loading
- **Args schemas** (UserArgs, ProfileArgs, etc.) no longer cause TypeScript compilation errors  
- **All generated schemas** now compile cleanly without type constraint issues

🔧 **Test Infrastructure** - Enhanced test reliability with improved CI/CD pipeline

### ✨ **Core Features**

<div align="center">
  
  | 🚀 **Feature** | 📦 **Version** | 🎯 **Benefit** |
  |----------------|----------------|------------------|
  | **New Prisma Client** | `6.12.0+` | 🆕 ESM-compatible generator support |
  | **Prisma** | `6.12.0+` | 🏃‍♂️ Latest features & performance |
  | **Zod** | `4.0.5+` | 🛡️ Enhanced validation & type safety |
  | **TypeScript** | `5.8+` | ⚡ Cutting-edge language features |
  | **Testing** | `Vitest 3` | 🧪 Comprehensive coverage |
  | **Tooling** | `ESLint 9` | 🔧 Modern dev experience |
  | **Multi-DB** | `All Providers` | 🗄️ PostgreSQL, MySQL, MongoDB, SQLite+ |
  
</div>

<div align="center">
  
  ### 📦 **Installation**
  
</div>

```bash
# 🚀 Install the latest release
npm install prisma-zod-generator
```

### 🔄 Upgrading

The latest stable version maintains full API compatibility. Requirements:
- **Node.js 18+** 
- **Prisma 6.12.0+** 
- **Zod 4.0.5+** 

Simply update your dependencies and re-run `npx prisma generate` - no code changes needed!

```bash
npm update prisma-zod-generator
npx prisma generate
```

<div align="center">
  
  ## 📚 **Navigation**
  
  <table>
    <tr>
      <td><a href="#-features">✨ Features</a></td>
      <td><a href="#-quick-start">🚀 Quick Start</a></td>
      <td><a href="#-generated-output">📋 Output</a></td>
      <td><a href="#️-configuration-options">⚙️ Config</a></td>
    </tr>
    <tr>
      <td><a href="#-advanced-usage">🔧 Advanced</a></td>
      <td><a href="#-examples">📚 Examples</a></td>
      <td><a href="#-troubleshooting">🔍 Troubleshooting</a></td>
      <td><a href="#-contributing">🤝 Contributing</a></td>
    </tr>
  </table>
  
</div>

<div align="center">
  
  ## ✨ **Why Choose Prisma Zod Generator?**
  
</div>

<table>
  <tr>
    <td align="center" width="25%">
      <img src="https://img.shields.io/badge/🚀-Zero_Config-blue?style=for-the-badge" alt="Zero Config">
      <br><strong>Works instantly</strong><br><em>Sensible defaults included</em>
    </td>
    <td align="center" width="25%">
      <img src="https://img.shields.io/badge/🔄-Auto_Generated-green?style=for-the-badge" alt="Auto Generated">
      <br><strong>Always in sync</strong><br><em>Updates with schema changes</em>
    </td>
    <td align="center" width="25%">
      <img src="https://img.shields.io/badge/🛡️-Type_Safe-purple?style=for-the-badge" alt="Type Safe">
      <br><strong>100% TypeScript</strong><br><em>Catch errors at compile time</em>
    </td>
    <td align="center" width="25%">
      <img src="https://img.shields.io/badge/🎯-Comprehensive-orange?style=for-the-badge" alt="Comprehensive">
      <br><strong>Full CRUD coverage</strong><br><em>All Prisma operations included</em>
    </td>
  </tr>
  <tr>
    <td align="center">
      <img src="https://img.shields.io/badge/⚙️-Configurable-red?style=for-the-badge" alt="Configurable">
      <br><strong>Highly customizable</strong><br><em>Adapt to your needs</em>
    </td>
    <td align="center">
      <img src="https://img.shields.io/badge/📦-Lightweight-yellow?style=for-the-badge" alt="Lightweight">
      <br><strong>Minimal footprint</strong><br><em>Fast generation & runtime</em>
    </td>
    <td align="center">
      <img src="https://img.shields.io/badge/🗄️-Multi_DB-cyan?style=for-the-badge" alt="Multi Database">
      <br><strong>All databases</strong><br><em>PostgreSQL, MySQL, MongoDB+</em>
    </td>
    <td align="center">
      <img src="https://img.shields.io/badge/🎨-Flexible-pink?style=for-the-badge" alt="Flexible">
      <br><strong>Your way</strong><br><em>Custom paths & options</em>
    </td>
  </tr>
</table>

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

### Setup

1. **Star this repo** 😉

2. **Add the generator to your Prisma schema:**

```prisma
generator zod {
  provider          = "prisma-zod-generator"
  output            = "./generated/schemas"
  isGenerateSelect  = true
  isGenerateInclude = true
}
```

3. **Enable strict mode in `tsconfig.json`** (required by Zod):

```json
{
  "compilerOptions": {
    "strict": true,
    "exactOptionalPropertyTypes": true
  }
}
```

4. **Generate your Zod schemas:**

```bash
npx prisma generate
```

## 🆕 Prisma Client Generator Support

The latest stable version includes full support for both the legacy and new ESM-compatible `prisma-client` generator introduced in Prisma 6.12.0, plus important schema compilation fixes!

### Generator Compatibility

The Zod generator now supports both Prisma client generators:

#### Legacy Generator (Existing Projects)
```prisma
generator client {
  provider = "prisma-client-js"
}

generator zod {
  provider = "prisma-zod-generator"
  output   = "./generated/schemas"
}
```

#### New ESM-Compatible Generator (Prisma 6.12.0+)
```prisma
generator client {
  provider = "prisma-client"
  output = "./src/generated/client"
  runtime = "nodejs"
  moduleFormat = "esm"
  generatedFileExtension = "ts"
  importFileExtension = "ts"
}

generator zod {
  provider = "prisma-zod-generator"
  output   = "./generated/schemas"
}
```

### Key Benefits of the New Generator

- **🔗 ESM Compatibility** - Full ES Module support
- **📂 Custom Output Location** - Generate client outside `node_modules`
- **🔧 Runtime Flexibility** - Support for Bun, Deno, Cloudflare Workers
- **⚡ Better Performance** - Optimized code generation
- **🔮 Future-Ready** - Will become the default in Prisma v7

### Migration Guide

**Existing Projects**: No changes needed - continue using `prisma-client-js`

**New Projects**: Consider using the new `prisma-client` generator for modern features

**Gradual Migration**: Both generators are supported simultaneously during the transition

## 🧪 Preview Features Support

The Prisma Zod Generator supports various Prisma preview features, providing seamless compatibility with the latest Prisma capabilities.

### Implemented Preview Features

| Preview Feature | Support Status | Since Version | Description |
|----------------|----------------|---------------|-------------|
| **prisma-client** | ✅ Full Support | v1.1.0 | ESM-compatible Prisma Client generator with custom output paths and improved modularity |

### Usage with Preview Features

To use supported preview features, enable them in your Prisma schema:

```prisma
generator client {
  provider = "prisma-client"
  output   = "./src/generated/client"
  previewFeatures = ["driverAdapters", "queryCompiler"]
}

generator zod {
  provider = "prisma-zod-generator"
  output   = "./src/generated/zod"
}
```

The Zod generator automatically detects enabled preview features and adapts its behavior accordingly.

### Compatibility Notes

- **Backward Compatibility**: All preview feature support maintains full compatibility with existing schemas
- **Progressive Enhancement**: New features are additive and don't break existing functionality
- **Automatic Detection**: No additional configuration required - the generator detects enabled features automatically

## 📋 Generated Output

For the following schema:

```prisma
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

### Version Compatibility

| Version | Prisma | Zod | TypeScript | Node.js | Status |
|---------|--------|-----|------------|---------|--------|
| **Latest** | 6.12.0+ | 4.0.5+ | 5.8+ | 18+ | ✅ **Stable** - Full Features + Preview Support |
| **Legacy** | 4.8.0+ | 3.20+ | 4.9+ | 16+ | 📦 **Deprecated** - Limited Support |

> **Recommendation**: Use `npm install prisma-zod-generator` for the latest stable release with full features and important bug fixes.

## ⚙️ Configuration Options

| Option | Description | Type | Default |
|--------|-------------|------|---------|
| `output` | Output directory for generated files | `string` | `"./generated"` |
| `isGenerateSelect` | Generate Select-related schemas | `boolean` | `false` |
| `isGenerateInclude` | Generate Include-related schemas | `boolean` | `false` |

### Example Configuration

```prisma
generator zod {
  provider          = "prisma-zod-generator"
  output            = "./src/schemas"
  isGenerateSelect  = true
  isGenerateInclude = true
}
```

## 🔧 Advanced Usage

### Model Customizations

Hide specific models from generation:

```prisma
/// @@Gen.model(hide: true)
model InternalLog {
  id        Int      @id @default(autoincrement())
  message   String
  createdAt DateTime @default(now())
}
```

### Database Provider Support

The generator supports all Prisma database providers:

- **PostgreSQL** - Complete support including advanced types
- **MySQL** - Full compatibility with all MySQL features  
- **MongoDB** - Native MongoDB schema generation
- **SQLite** - Perfect for development and testing
- **SQL Server** - Enterprise-grade support
- **CockroachDB** - Distributed database support

## 📚 Examples

### Express.js API Validation

```typescript
import express from 'express';
import { PostCreateOneSchema, UserFindManySchema } from './generated/schemas';

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

// Query with validation
app.get('/users', async (req, res) => {
  const query = UserFindManySchema.parse(req.query);
  const users = await prisma.user.findMany(query);
  res.json(users);
});
```

### Next.js API Routes

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

### tRPC Integration

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

### React Hook Form Integration

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

## 🔍 Troubleshooting

### Latest Version Information

**Recent Schema Compilation Fixes**
- **SortOrderInput schemas**: Fixed unnecessary lazy loading that caused validation issues
- **Args schemas**: Resolved TypeScript compilation errors for UserArgs, ProfileArgs, etc.
- **All schemas**: Now compile cleanly without type constraint issues
- **Full backward compatibility**: No code changes needed when upgrading

**Generator Support**
- Both `prisma-client-js` and `prisma-client` generators are fully supported
- If using the new generator, ensure Prisma 6.12.0+ is installed
- Clear error messages guide you if no compatible generator is found

**Current Requirements**
- Requires Node.js 18+
- Requires Prisma 6.12.0+ and Zod 4.0.5+
- All peer dependencies must be compatible

**Upgrading to Latest Version**
- Backup your project before upgrading
- Update all related dependencies (Prisma, Zod, TypeScript)
- Re-run `npx prisma generate` after upgrading
- Test thoroughly in development environment

### Common Issues

**Generator compatibility errors**
- Ensure you have either `prisma-client-js` or `prisma-client` generator in your schema
- The Zod generator provides clear error messages with examples if no compatible generator is found
- Both legacy and new generators are supported simultaneously

**Error: Cannot find module './generated/schemas'**
- Ensure you've run `npx prisma generate` after adding the generator
- Check that your output path is correct

**TypeScript errors in generated schemas**
- Make sure all dependencies are installed and up to date
- Ensure `strict: true` is enabled in `tsconfig.json`
- Verify exactOptionalPropertyTypes is enabled

**Generated schemas not updating**
- Run `npx prisma generate` after modifying your schema
- Check that the generator is properly configured in `schema.prisma`
- Clear your build cache and regenerate

**Zod validation errors**
- Ensure you have Zod 4.0.5+ installed for compatibility
- Check that your input schemas match your Prisma model types

**Generator fails to run**
- Ensure you have the correct version installed
- Check that your `schema.prisma` syntax is valid
- Verify Node.js version compatibility (18+)
- Clear node_modules and reinstall dependencies

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

### Getting Help

- 🐛 **Bug Reports**: [Create a bug report](https://github.com/omar-dulaimi/prisma-zod-generator/issues/new)
- 💡 **Feature Requests**: [Request a feature](https://github.com/omar-dulaimi/prisma-zod-generator/issues/new)
- 💬 **Discussions**: [Join the discussion](https://github.com/omar-dulaimi/prisma-zod-generator/discussions)

## 🤝 Contributing

Contributions are welcome! Here's how you can help:

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

## 🔗 Related Projects

- [prisma-trpc-generator](https://github.com/omar-dulaimi/prisma-trpc-generator) - Generate tRPC routers from Prisma schema
- [Prisma](https://github.com/prisma/prisma) - Database toolkit and ORM
- [Zod](https://github.com/colinhacks/zod) - TypeScript-first schema validation

## 🙏 Acknowledgments

- [Prisma](https://github.com/prisma/prisma) - Modern database toolkit
- [Zod](https://github.com/colinhacks/zod) - TypeScript-first schema validation
- All our [contributors](https://github.com/omar-dulaimi/prisma-zod-generator/graphs/contributors)

---

<br>

---

<div align="center">
  
  <h3>🌟 **Show Your Support** 🌟</h3>
  
  <a href="https://github.com/omar-dulaimi/prisma-zod-generator">
    <img src="https://img.shields.io/github/stars/omar-dulaimi/prisma-zod-generator?style=for-the-badge&logo=github&color=yellow" alt="GitHub Stars">
  </a>
  
  <br><br>
  
  <table>
    <tr>
      <td align="center">
        <img src="https://img.shields.io/badge/💎-Latest_Stable-success?style=for-the-badge&logo=npm" alt="Stable">
        <br>
        <code>v1.0.0</code>
      </td>
      <td align="center">
        <img src="https://img.shields.io/badge/📦-Legacy_Version-lightgrey?style=for-the-badge&logo=archive" alt="Legacy">
        <br>
        <code>v0.8.13</code>
      </td>
    </tr>
  </table>
  
  <br>
  
  <p>
    <strong>Made with ❤️ by</strong>
    <a href="https://github.com/omar-dulaimi">
      <img src="https://img.shields.io/badge/Omar_Dulaimi-100000?style=for-the-badge&logo=github&logoColor=white" alt="Omar Dulaimi">
    </a>
  </p>
  
  <p><em>⚡ Accelerating Prisma development, one schema at a time</em></p>
  
</div>
