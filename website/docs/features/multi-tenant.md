---
title: Multi-Tenant Kit
---

> **Available in:** Enterprise tier

Zod helpers to validate tenant context at API/UI boundaries for SaaS applications.

## Why Use Multi-Tenant Kit

**Problem**: Multi-tenant applications need strict data isolation:
- Tenant data must never leak across tenants
- Every request needs tenant validation
- UI needs tenant-aware components
- Manual tenant checks are error-prone

**Solution**: Generate Zod helpers that enforce tenant context validation at every API and UI boundary.

### Benefits

- **Strict Isolation**: Validate tenant access before data operations
- **Type-Safe**: Full TypeScript validation
- **Configurable Modes**: Strict, warn, or log violations
- **UI Integration**: React context provider for tenant state

## Prerequisites

```bash
# Core dependencies
pnpm add zod react @prisma/client

# PZG Pro license required
```

## Generate

Add to your `schema.prisma`:

```prisma
generator pzgPro {
  provider = "node ./lib/cli/pzg-pro.js"
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
      schemas/
        tenant-schemas.ts     # Tenant-aware Zod schemas
      middleware/
        prisma-middleware.ts  # Prisma middleware for tenant filtering
      extensions/
        prisma-extension.ts   # Prisma client extensions
      utils/
        validation.ts         # Validation utilities
        context.ts            # Tenant context helpers
      types/
        tenant-types.ts       # TypeScript types
      README.md               # Usage documentation
```

## Basic Usage

```ts
import { validateTenantAccess } from '@/generated/pro/multi-tenant/utils/validation'

// Modes: 'strict' | 'warn' | 'log'
const isValid = validateTenantAccess(
  { tenantId: 't1' },  // Request context
  't1',                 // Expected tenant
  'strict'              // Mode
)

if (!isValid) {
  throw new Error('Tenant mismatch')
}
```

### Validation Modes

- **strict**: Throws error on mismatch
- **warn**: Logs warning but continues
- **log**: Logs info for debugging

## UI Pattern

Provide a `TenantProvider` with the current tenant and refine schemas based on it:

```tsx
// Example tenant provider pattern
import { TenantProvider } from '@/generated/multi-tenant/tenant-schemas'

export default function App() {
  const tenant = getCurrentTenant() // From auth/session

  return (
    <TenantProvider value={{ tenantId: tenant.id }}>
      <YourApp />
    </TenantProvider>
  )
}
```

See generated comments in the file for more integration patterns.

## See Also

- [PostgreSQL RLS](./postgres-rls.md) - Database-level tenant isolation
- [Policies & Redaction](./policies.md) - Field-level access control
