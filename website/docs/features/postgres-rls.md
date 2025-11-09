---
title: PostgreSQL RLS
---

> **Available in:** Professional, Business, Enterprise tiers

Database-level row security with PostgreSQL Row-Level Security (RLS). Automatically enforce data isolation at the database layer with generated helpers, policies, and migrations.

## Why Use PostgreSQL RLS

**Problem**: Application-level security is fragile:
- Easy to forget WHERE clauses that filter by tenant/user
- Security bugs from missing filters in queries
- Complex authorization logic scattered across codebase
- No defense-in-depth at database level

**Solution**: Leverage PostgreSQL's built-in Row-Level Security to enforce data isolation at the database layer.

### Benefits

- **Database-Level Security**: Enforced at PostgreSQL layer, not application
- **Defense in Depth**: Additional security layer below Prisma
- **Auto Filtering**: Queries automatically scoped to user/tenant context
- **Developer Proof**: Impossible to bypass via code mistakes

## Prerequisites

```bash
# PostgreSQL database required
# Ensure your DATABASE_URL uses PostgreSQL

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
  enablePostgresRLS = true
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
    postgres-rls/
      rls-helper.ts       # RLS context management
      migration.sql       # Database setup migration
      policies.sql        # Example RLS policies
```

## Basic Usage

```ts
import { PrismaClient } from '@prisma/client'
import { createRLSHelper } from '@/generated/pro/postgres-rls/rls-helper'

const prisma = new PrismaClient()
const rls = createRLSHelper(prisma)

// Set context before queries
await rls.withContext(
  {
    userId: 'user-123',
    tenantId: 'tenant-456',
    roles: ['admin']
  },
  async () => {
    // All queries in this block automatically filtered by RLS
    const posts = await prisma.post.findMany()
    // Only returns posts where policies allow access
  }
)
```

### Prisma Middleware

```ts
prisma.$use(rls.createMiddleware())

// Now you can pass context via query params
await prisma.post.findMany({
  context: {
    userId: 'u1',
    tenantId: 't1'
  }
})
```

## Database Setup

Apply the generated migration to set up RLS helper functions:

```sql
-- From generated/postgres/rls/migration.sql
-- Helper functions:
-- - set_current_user_context(user_id, tenant_id, roles)
-- - clear_user_context()
-- - get_current_user_context()
```

See generated SQL files for:
- Example RLS policies
- Helper function definitions
- Migration scripts to adapt to your schema

## Integration

### Express Middleware

```ts
app.use(async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  await rls.setContext({
    userId: req.user.id,
    tenantId: req.user.tenantId,
    roles: req.user.roles
  })

  res.on('finish', async () => {
    await rls.clearContext()
  })

  next()
})
```

### Next.js API Routes

```ts
import { rls } from '@/lib/rls'

export default async function handler(req, res) {
  const session = await getSession(req, res)

  return rls.withContext(
    {
      userId: session.user.id,
      tenantId: session.user.tenantId,
      roles: session.user.roles
    },
    async () => {
      const posts = await prisma.post.findMany()
      res.json(posts)
    }
  )
}
```

## See Also

- [Multi-Tenant Kit](./multi-tenant.md) - Application-layer tenant isolation
- [Policies & Redaction](./policies.md) - Field-level access control
