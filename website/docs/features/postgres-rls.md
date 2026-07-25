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

  // Required: this pack does not inherit `output`
  postgresRls = "{ \"outputPath\": \"./generated/pro/postgres-rls\" }"
}
```

:::important Set `outputPath` explicitly
Unlike the other packs, PostgreSQL RLS does not read the generator's shared
`output` directory. Left unset, it writes to `postgres/rls/` relative to the
directory you ran `prisma generate` from, which is why the files can seem to be
missing. Set `postgresRls.outputPath` as above.
:::

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
      README.md           # Applying the policies
```

## Basic Usage

:::caution Set the context inside a transaction
`migration.sql` sets its GUCs with `set_config(..., true)`, which is
**transaction-local** — PostgreSQL discards the value when the surrounding
transaction ends. Because `setContext()` issues that call as a standalone
statement, Prisma wraps it in its own implicit transaction, so the context is
gone before the next query runs and your policies evaluate against an empty
`current_setting(...)`.

Use an interactive transaction and run both the context call and your queries on
the same transaction client:

```ts
import { PrismaClient } from '@prisma/client'
import { createRLSHelper } from '@/generated/pro/postgres-rls/rls-helper'

const prisma = new PrismaClient()

await prisma.$transaction(async (tx) => {
  const rls = createRLSHelper(tx)          // bind the helper to the transaction
  await rls.setContext({
    userId: 'user-123',
    tenantId: 'tenant-456',
    roles: ['admin'],
  })

  // These queries run in the same transaction, so the context still applies
  const posts = await tx.post.findMany()
})
```

Verify your wiring before relying on it — inside the transaction,
`SELECT current_setting('app.current_tenant_id', true)` should return your tenant
id, not an empty string.
:::

`withContext(context, fn)` is convenient but calls `setContext()` outside any
transaction you control, so it carries the same caveat unless the helper is bound
to a transaction client as above.

### Prisma Middleware

:::caution Requires Prisma 5 or earlier
`prisma.$use()` was removed in Prisma 6. On Prisma 6 or 7 this throws
`prisma.$use is not a function` — set the context per transaction instead.
:::

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
-- From generated/pro/postgres-rls/migration.sql
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
