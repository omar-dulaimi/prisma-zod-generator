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
      factories.ts         # Factory functions for each model
```

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

### Persistence (Optional)

When Prisma client is available:

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
