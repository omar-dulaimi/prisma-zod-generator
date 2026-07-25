---
title: Data Factories
---

> **Available in:** Business, Enterprise tiers

Type-safe builders for realistic mock data with optional Prisma persistence.

## Why Use Data Factories

**Problem**: Creating test data is tedious:
- Manually writing test data for every test
- Data doesn't match real schema structure
- Hard to create valid related data
- No easy way to persist to database

**Solution**: Generate factories that build type-safe test data with realistic values.

### Benefits

- **Type-Safe**: Follows your Prisma schema exactly
- **Realistic Data**: Sensible defaults for all fields
- **Relationships**: Handle nested data easily
- **Optional Persistence**: Build in-memory or save to database

## Prerequisites

```bash
# Core dependencies
pnpm add @prisma/client

# PZG Pro license required
```

## Generate

Add to your `schema.prisma`:

```prisma
generator pzgPro {
  provider = "node ./node_modules/prisma-zod-generator/lib/cli/pzg-pro.js"
  output = "./generated/pro"
  enableFactories = true
}
```

Then run:

```bash
prisma generate
```

### Generated Files

```
generated/
  pro/
    factories/
      factories.ts         # Factory builder per model + factory registry
      seeders.ts           # Database seeders
      providers.ts         # Fake-data providers
      fixtures/            # Static fixtures, one file per model
        user.ts
        post.ts
        index.ts
      test-helpers.ts      # Test setup/teardown helpers
      utils.ts             # Shared factory utilities
      types.ts             # TypeScript types
      USAGE.md             # Practical usage guide
      README.md            # Reference documentation
```

`factories.ts`, `fixtures/`, and `seeders.ts` are each gated behind an option
(`generateFactories`, `generateFixtures`, `generateSeeders`). The rest is always emitted.

## Basic Usage

```ts
import { userFactory, postFactory } from '@/generated/pro/factories/factories'

// Build in-memory (no database)
const user = userFactory.build({
  email: 'test@example.com'
})

// Build many
const users = userFactory.buildMany(10)

// With custom values
const admin = userFactory.build({
  email: 'admin@example.com',
  role: 'ADMIN'
})
```

### Typing

Each model gets a `<Model>Shape` interface derived from your schema, and the factory
is `Factory<<Model>Shape>` — so `build()` returns that shape and a typo in an
override is a compile error. Before **2.6.0** every factory was `Factory<any>` with
`Partial<any>` overrides, which meant nothing about a `build()` call was checked
despite the "follows your Prisma schema exactly" promise.

### Persistence (Optional)

Hand the factory a Prisma client first. Without it, `create()` and `createMany()`
throw and tell you to call `setPrismaClient()` — use `build()`/`buildMany()` when
you only want objects. (Before 2.4.1 they warned and returned unsaved objects with
a placeholder id, so a seeder could appear to succeed while writing nothing.)

```ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
userFactory.setPrismaClient(prisma); // required for create()/createMany()
```

```ts
// Create in database
const user = await userFactory.create({
  email: 'db@example.com'
})

// Create many
const users = await userFactory.createMany(5)

// With relationships
const userWithPosts = await userFactory.create({
  posts: {
    create: [
      postFactory.build({ title: 'First Post' }),
      postFactory.build({ title: 'Second Post' })
    ]
  }
})
```

## Testing Example

```ts
import { describe, it, expect } from 'vitest'
import { userFactory } from '@/generated/pro/factories/factories'

describe('User API', () => {
  it('creates a user', async () => {
    const userData = userFactory.build()
    
    const response = await fetch('/api/users', {
      method: 'POST',
      body: JSON.stringify(userData)
    })
    
    expect(response.ok).toBe(true)
  })
})
```

## See Also

- [Performance Pack](./performance.md) - Validate large datasets
- [Contract Testing](./contracts.md) - Test with factory data
