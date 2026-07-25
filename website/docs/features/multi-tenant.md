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

### Prisma Middleware

For blanket enforcement, install the generated middleware instead of validating call by call. It
injects the tenant filter on reads and deletes, and validates results in `strict` mode:

```ts
import { createTenantMiddleware } from '@/generated/pro/multi-tenant/tenant-middleware'

prisma.$use(createTenantMiddleware({ tenantId: 't1' }))
```

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
