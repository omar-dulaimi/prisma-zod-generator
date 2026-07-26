---
title: Multi-Tenant Kit
---

> **Available in:** Enterprise tier

Server-side Zod helpers, Prisma middleware, and client extensions that validate tenant context on every data operation in a SaaS application.

## Why Use Multi-Tenant Kit

**Problem**: Multi-tenant applications need strict data isolation:
- Tenant data must never leak across tenants
- Every request needs tenant validation
- Manual tenant checks are error-prone
- One missed `where` clause is a cross-tenant leak

**Solution**: Generate tenant-aware validators plus Prisma middleware and client extensions that inject and enforce the tenant filter for you.

### Benefits

- **Strict Isolation**: Validate tenant access before data operations
- **Type-Safe**: Full TypeScript validation
- **Configurable Modes**: Strict, warn, or log violations
- **Prisma-Level Enforcement**: Middleware and client extensions that scope every query

## Prerequisites

```bash
# Core dependencies
pnpm add zod @prisma/client

# PZG Pro license required
```

## Generate

Add to your `schema.prisma`:

```prisma
generator pzgPro {
  provider = "node ./node_modules/prisma-zod-generator/lib/cli/pzg-pro.js"
  output = "./generated/pro"
  enableMultiTenant = true
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
    multi-tenant/
      tenant-schemas.ts      # Tenant-aware Zod schemas
      tenant-middleware.ts   # Prisma middleware for tenant filtering
      tenant-extensions.ts   # Prisma client extension
      tenant-validation.ts   # validateTenantAccess + per-model validators
      tenant-context.ts      # Tenant context helpers
      tenant-types.ts        # TypeScript types
      README.md              # Usage documentation
```

The kit only covers models that carry a tenant field. A field counts as one if it uses a
conventional name (`tenantId`, `tenant_id`, `organizationId`, …) or is annotated `/// @tenant`.
Models without one are skipped.

## Basic Usage

`validateTenantAccess` is async, takes the model name and operation first, and **returns the
validated payload** (or throws) rather than a boolean:

```ts
import { validateTenantAccess } from '@/generated/pro/multi-tenant/tenant-validation'

// Throws if the payload does not belong to the tenant; returns the validated data
const data = await validateTenantAccess('Post', 'create', input, 't1')

await prisma.post.create({ data })
```

Operations are `'create' | 'update' | 'find'`. The same file exports a `TenantValidators` registry
keyed by model name, if you'd rather hold a validator instance than go through the string lookup on
every call.

### Scoping a client

`prisma.$use()` does not exist on Prisma 7 — verified against a generated v7 client, where the call is
a type error and the property is `undefined` at runtime. Client extensions replaced it, so scope a
client with `createTenantPrismaClient`:

```ts
import { createTenantPrismaClient } from '@/generated/pro/multi-tenant/tenant-middleware'

const scoped = createTenantPrismaClient(prisma, { tenantId: 't1' })

// Reads through `scoped` carry the tenant filter.
const rows = await scoped.invoice.findMany()
```

It returns `prisma.$extends(withEnhancedTenantGuard(context))`, so you can use the guard directly if
you prefer to compose extensions yourself. `validateTenantAccess(...)` remains available for validating
at the call site.

:::note The middleware factory
`createTenantMiddleware` is still exported for projects on Prisma 4, which is the last version with
`$use`. There is nothing to register it on in a current client.
:::

### Enforce Modes

`enforceMode` is a generator-level option, not an argument to `validateTenantAccess`. Set it on the
`pzgPro` block; it defaults to `strict`:

```prisma
generator pzgPro {
  provider = "node ./node_modules/prisma-zod-generator/lib/cli/pzg-pro.js"
  output = "./generated/pro"
  enableMultiTenant = true

  // Optional advanced config (stringified JSON)
  // multiTenant = "{ \"enforceMode\": \"warn\", \"tenantField\": \"orgId\" }"
}
```

:::note Naming the tenant column
Tenant models are detected from a set of common names (`tenantId`,
`organizationId`, `workspaceId`, `companyId`, …). If yours is named something
else — `orgId`, `accountId` — set `tenantField` and it will be used instead.

Requires **2.4.1+**: earlier versions ignored `tenantField`, so a schema scoping
rows by an unrecognised name produced no validators at all and
`validateTenantAccess()` threw `No tenant validator found for model: <Model>`.
:::

- **strict**: Validates query results and throws on a cross-tenant record
- **warn**: Logs a warning and continues
- **log**: Logs for debugging and continues

The value you configure becomes the middleware's default; individual call sites can override it by
passing `enforceMode` on the `TenantContext` given to `createTenantMiddleware`.

## Where the tenant id comes from

The kit is server-side only — it generates no React code. Hold the current tenant id in your own
session, request context, or React context, then pass it into `validateTenantAccess(...)` or into the
generated middleware/extension at the point where you build your Prisma client.

See the generated `README.md` in the pack for more integration patterns.

## See Also

- [PostgreSQL RLS](./postgres-rls.md) - Database-level tenant isolation
- [Policies & Redaction](./policies.md) - Field-level access control
