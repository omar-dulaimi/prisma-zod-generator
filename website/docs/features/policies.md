---
title: Policies & Redaction
---

> **Available in:** Professional, Business, Enterprise tiers

PII-safe logging and response redaction driven by annotations in your Prisma schema. Automatically mask sensitive data in logs, API responses, and error tracking.

## Why Use Policies & Redaction

**Problem**: Sensitive data leaks everywhere:
- PII (emails, phone numbers, SSNs) exposed in application logs
- Passwords and tokens accidentally logged to monitoring services
- Sensitive fields returned in API responses to unauthorized users
- Manual redaction is error-prone and inconsistent

**Solution**: Annotate sensitive fields in your Prisma schema once, then automatically redact them everywhere.

### Benefits

- **Schema-Driven**: Define policies once in Prisma schema
- **Auto Redaction**: Works with all logging libraries
- **Compliance Ready**: GDPR, HIPAA, PCI-DSS compliant logging
- **Zero Leaks**: Redact before data leaves your application

## Prerequisites

```bash
# Core dependencies
pnpm add @prisma/client zod

# For error tracking integration (optional)
pnpm add @sentry/node

# PZG Pro license required
```

## Generate

Add to your `schema.prisma`:

```prisma
generator pzgPro {
  provider = "node ./lib/cli/pzg-pro.js"
  output = "./generated/pro"
  enablePolicies = true
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
    policies/
      safe-crud/
        user.ts            # User safe CRUD operations
        post.ts            # Post safe CRUD operations
      redaction/
        user.ts            # User PII redaction middleware
        post.ts            # Post PII redaction middleware
      dto/
        user.ts            # User DTO schemas
        post.ts            # Post DTO schemas
      index.ts             # Exports and factory functions
```

## Schema Annotations

Annotate fields in your Prisma schema:

```prisma
model User {
  id       Int     @id @default(autoincrement())
  
  /// @pii email redact:logs
  /// @policy read:role in ["admin"]
  email    String  @unique
  
  /// @pii phone redact:logs
  phone    String?
  
  /// @sensitive redact:logs
  password String
  
  name     String?
}
```

## Basic Usage

### Safe CRUD Operations

```ts
import { createSafeUserOperations } from '@/generated/pro/policies'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Create safe CRUD with policy context
const userOps = createSafeUserOperations(prisma, {
  userId: 'current-user-id',
  role: 'user'
})

// Automatically applies read policies
const users = await userOps.findMany()

// Automatically injects userId/tenantId on create
const newUser = await userOps.create({}, {
  data: { name: 'John', email: 'john@example.com' }
})
```

### PII Redaction

```ts
import { UserRedactor } from '@/generated/pro/policies/redaction/user'

const redactor = new UserRedactor({ redactLogs: true })

// Redact sensitive fields
const safeUser = redactor.redact(user, 'api')
// Result: { email: 's***@example.com', phone: '***-***-1234' }

// Express middleware
import { createUserRedactionMiddleware } from '@/generated/pro/policies/redaction/user'

app.use(createUserRedactionMiddleware())
const sentryTransport = createRedactedSentryTransport()
```

## Integration Examples

### Express API

```ts
import express from 'express'
import { redactionMiddleware } from '@/generated/pzg/policies/redaction'

const app = express()

// Apply redaction middleware
app.use(redactionMiddleware())

app.get('/users/:id', async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: parseInt(req.params.id) }
  })
  
  // Response automatically redacts PII fields
  res.json(user)
})
```

### Next.js API Routes

```ts
// Wrap ctx.body before send using redactPII(ctx.body) for Koa
// Custom interceptor calling redactPII(data) in map() for NestJS
```

## Browser Note

The generated helper uses Node `crypto`. In the browser, either polyfill (`crypto.subtle`) or use a minimal email-masking helper.

## See Also

- [Multi-Tenant Kit](./multi-tenant.md) - Tenant isolation with policy enforcement
- [PostgreSQL RLS](./postgres-rls.md) - Database-level row security
