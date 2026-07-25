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

# PZG Pro license required
```

## Generate

Add to your `schema.prisma`:

```prisma
generator pzgPro {
  provider = "node ./node_modules/prisma-zod-generator/lib/cli/pzg-pro.js"
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

Per-model files are emitted only where the annotations call for them: `safe-crud/` for models with
`@policy` rules, `redaction/` for models with `@pii` fields. `dto/` is generated for every model that
carries either.

## Schema Annotations

Annotate fields in your Prisma schema:

```prisma
/// @policy read:where role in ["admin"]
model User {
  id       Int     @id @default(autoincrement())

  /// @pii email redact:logs
  email    String  @unique

  /// @pii phone redact:logs
  phone    String?

  /// @pii password redact:logs mask:full
  password String

  name     String?
}
```

Two annotations are recognized:

- `@pii <kind> [redact:logs] [mask:partial|mask:full|mask:hash]` — on a **field**. Marks it for
  redaction. `email`, `phone`, and `ssn` get kind-aware partial masks; any other kind falls back to a
  generic partial mask. `mask:partial` is the default when no `mask:` option is given.
- `@policy read:where <condition>` — on a **model**. Drives the `where` clause of the generated
  safe-CRUD operations.

### Conditions that are enforced

The generated `combinePolicyCondition` recognizes exactly three condition shapes. Write them with the
`read:where` prefix — the shorter `read:<condition>` form parses but loses the leading keyword, so
`read:role in [...]` reaches the generated code as `in [...]` and matches nothing:

| Condition | Effect on the query |
| --- | --- |
| `read:where userId == ctx.userId` | adds `where.userId = context.userId` |
| `read:where tenantId == ctx.tenantId` | adds `where.tenantId = context.tenantId` |
| `read:where role in ["admin", "owner"]` | if the role is not listed, adds an impossible `where.id` so nothing matches |

Any other condition text is carried into the generated file and then ignored, leaving the query
unfiltered. Verify each policy against a real query before relying on it.

:::caution Two limits of the role check
The role list is compared against the role given to the **constructor**
(`createSafeUserOperations(prisma, { role })`), not the one passed per call — a role supplied only to
`findMany(context)` is ignored for this check. And denial is expressed as `where.id = -1`, which
assumes an integer primary key; on a `String @id` model Prisma rejects it with a type error instead of
returning no rows.
:::

:::caution Only these two annotations are parsed
Anything else — `@sensitive`, for example — is ignored silently. A field you meant to protect with an
unrecognized annotation is emitted unredacted, so check that every sensitive field uses `@pii`.
:::

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

Redactors are generated **per model**, and only for models that carry at least one `@pii` field:

```ts
import { UserRedactor } from '@/generated/pro/policies/redaction/user'

const redactor = new UserRedactor({ redactLogs: true })

// Redact sensitive fields before logging
const safeUser = redactor.redact(user, 'logs')
// Result: { email: 's***@example.com', phone: '********4567', ... }
```

:::caution `redact()` only acts on the `logs` and `analytics` contexts
A field is redacted when it is annotated `redact:logs` **and** you pass `'logs'` or `'analytics'` as
the context. `redactor.redact(user, 'api')` returns the record unchanged, so do not rely on the
`'api'` context — or on the Express middleware below, which uses it — as your only barrier against
leaking PII in responses. Use the `dto/` `*PublicSchema` (which omits PII fields outright) for
response shaping.
:::

The same applies to error trackers — redact explicitly before you capture:

```ts
Sentry.captureException(err, {
  extra: new UserRedactor({ redactLogs: true }).redact(user, 'logs'),
})
```

## Integration Examples

### Express API

Middleware factories are generated per model, so mount them per route rather than globally:

```ts
import express from 'express'
import { createUserRedactionMiddleware } from '@/generated/pro/policies/redaction/user'
import { UserPublicSchema } from '@/generated/pro/policies/dto/user'

const app = express()

app.get('/users/:id', createUserRedactionMiddleware({ redactLogs: true }), async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: parseInt(req.params.id) }
  })

  // Strip PII fields from the response payload
  res.json(UserPublicSchema.parse(user))
})
```

:::caution DTO schemas do not round-trip a raw Prisma row
The generated DTO schemas describe an API payload, not a database row, so
`parse()` on the result of a Prisma query can throw:

- **Nullable columns** are emitted `.optional()` (accepting `undefined`) and never
  `.nullable()`, but Prisma returns `null` — so a `String?` column with no value
  fails with *expected string, received null*.
- **`Decimal` columns** are emitted `z.number()`, which rejects the
  `Prisma.Decimal` instance Prisma returns.

Use `.strip()`-style shaping, or normalize first —
`UserPublicSchema.parse({ ...user, name: user.name ?? undefined, amount: user.amount?.toNumber() })`
— until the schemas emit `.nullable()`.
:::

### Koa and NestJS

Call the per-model redactor directly rather than looking for a framework adapter — none is generated:

```ts
import { UserRedactor } from '@/generated/pro/policies/redaction/user'

const redactor = new UserRedactor({ redactLogs: true })

// Koa: redact before send
app.use(async (ctx, next) => {
  await next()
  ctx.body = redactor.redact(ctx.body, 'logs')
})
```

:::caution `redactPII()` is a stub
The policies index also exports a `redactPII(data, config?)` helper. In the current implementation it
returns its input unchanged — it is a placeholder, not a redactor. Use the per-model
`<Model>Redactor` class instead.
:::

## Hashing and Browser Support

The generated redactors are dependency-free — plain string masking, no Node `crypto` import — so they
run in the browser as-is.

:::caution `mask:hash` is not cryptographic
`hashValue()` uses a hand-rolled 32-bit string hash. It is a display-level obfuscation only; do not
treat hashed output as anonymized or pseudonymized for compliance purposes.
:::

## See Also

- [Multi-Tenant Kit](./multi-tenant.md) - Tenant isolation with policy enforcement
- [PostgreSQL RLS](./postgres-rls.md) - Database-level row security
