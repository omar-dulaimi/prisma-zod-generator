---
title: Upgrading to 3.0
sidebar_label: 3.0 Breaking Changes
---

# Upgrading to 3.0

Four changes alter behaviour you may depend on. Everything else in this release is a fix to output
that did not compile, did not run, or reported something untrue — those need no action.

Two of the four are security fixes that change what a query returns. Read those first even if you do
not use the packs in the API section.

## Queries that used to return every row now return none

**Affects:** the Policies pack, any model with `/// @policy read:where tenantId == ctx.tenantId` or
the `userId` equivalent.

The generated `SafeCRUD` wrapper folded the context value into the `where` clause unconditionally.
Prisma strips `undefined` from a `where` clause, so a call with no context — or with one whose
`tenantId` had not been populated — dropped the filter and read **every tenant's rows**. Nothing at
the call site suggested it: the query still looked scoped.

A missing context value now matches nothing.

```typescript
const documents = new DocumentSafeCRUD(prisma, {});

await documents.findMany(); // before: every row in the table
                            // now:    no rows
```

If your application was relying on that behaviour without knowing it, you will see empty results where
you previously saw data. That is the fix working. Populate the context:

```typescript
const documents = new DocumentSafeCRUD(prisma, { tenantId: currentTenantId });
```

## A policy the generator cannot enforce now fails loudly

**Affects:** the Policies pack, any `/// @policy` whose condition is not one of the three implemented
forms — `role in ["a", "b"]`, `userId == ctx.userId`, `tenantId == ctx.tenantId`.

Anything else — an arbitrary comparison like `status == "PUBLISHED"`, or a boolean combination with
`OR` — was parsed, emitted, iterated over at query time and then ignored, leaving the query completely
unscoped. It now throws, and `prisma generate` warns at build time naming the model and the condition.

If a query starts throwing `Policy on X cannot be enforced`, that policy was never doing anything.
Rewrite it using a supported form, one condition per annotation.

## The Performance Pack's validators follow Zod's contract

**Affects:** the Performance Pack, `<Model>Performance` and `createAdaptiveValidator()`.

`parse` returned a result object and never threw, which is not what `parse` means anywhere else.

```typescript
// Before
const result = UserPerformance.parse(input);
if (result.success) use(result.data);

// Now
const row = UserPerformance.parse(input);        // returns the row, throws ValidationError
// or
const result = UserPerformance.safeParse(input); // { success, data } | { success, error, field }
if (result.success) use(result.data);
```

`parse` also accepted an array, silently switching to the streaming path and returning a Promise from
a method typed as synchronous. Arrays now have their own asynchronous methods:

```typescript
const rows = await UserPerformance.parseMany(inputs);      // throws on the first failure
const result = await UserPerformance.safeParseMany(inputs); // { success, data } | { success, errors }
```

`ValidationError` carries `field` where the validator identified one, and `index` for the array forms.

## Server Actions take the Prisma client instead of constructing one

**Affects:** the Server Actions pack, `prisma-client.ts`.

It did `new PrismaClient()` with no arguments. Prisma 7 does not allow that — `url` was removed from
the datasource block, and the constructor needs an `adapter` (or `accelerateUrl`) — so on Prisma 7
every generated action failed at import with an internal `TypeError`. On Prisma 6 and earlier it
worked, which is why this is a breaking change rather than only a fix.

The pack cannot choose your adapter, so it now takes the client. Wire it up once at startup:

```typescript
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { setPrismaClient } from './generated/pro/server-actions/prisma-client';

setPrismaClient(
  new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) }),
);
```

The `prisma` export is unchanged, so your action bodies need no edits. Calling one before
`setPrismaClient` throws a message saying so.

## Smaller behaviour changes

None of these should need action, but they can turn previously-passing input into a validation
failure:

- **Form UX types an enum column as `z.enum([...])`** instead of `z.string()`, so a form no longer
  accepts an arbitrary string for a column the database constrains.
- **Form UX requires a DateTime field to parse as a date.** It was a bare `z.string()`, which accepted
  `"banana"`.
- **`defaultValues: false` is honoured.** It was accepted and ignored, so the schema's defaults were
  baked in either way.
- **Several options now warn instead of doing nothing**, among them `validation: 'yup'`,
  `migrationFormat: 'prisma'`, `enableAuditLogging`, `enableErrorBoundaries`, and a `platforms` value
  that is not an array. Each names what it will do instead.
