---
title: SDK Publisher
---

> **Available in:** Professional, Business, Enterprise tiers

Auto-generate a fully-typed, production-ready TypeScript SDK from your Prisma schema. Publish as npm package with ESM + CJS support, automatic retries, timeouts, and request/response validation.

## Why Use SDK Publisher

**Problem**: Building API clients is tedious and error-prone:
- Manually writing fetch calls for every endpoint
- Duplicating types between backend and frontend
- No automatic retry logic or timeout handling
- Type safety lost across the network boundary
- SDK maintenance when API changes
- Supporting both ESM and CommonJS consumers

**Solution**: Auto-generate a production-grade SDK package with full TypeScript support, automatic validation, error handling, and dual module formats ready to publish to npm.

### Benefits

- **Type Safety**: Full TypeScript from database to API client
- **Auto Validation**: Zod schemas validate all requests/responses
- **Dual Format**: ESM + CJS bundles with .d.ts files
- **Production Ready**: Built-in retries, timeouts, error handling
- **Auto Methods**: Generated methods for all CRUD operations
- **Publishable**: npm-ready package with package.json and exports

## Prerequisites

```bash
# Core dependencies for SDK generation
pnpm add @prisma/client zod

# PZG Pro license required
```

## Generate

Add to your `schema.prisma`:

```prisma
generator pzgPro {
  provider = "node ./lib/cli/pzg-pro.js"
  output = "./generated/pro"
  enableSDK = true
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
    sdk/
      typescript/
        index.ts           # TypeScript SDK with APIClient class
      python/
        api_client.py      # Python SDK (optional)
```

The generator creates SDK clients with methods per resource:
- Methods for all models (`listUsers`, `createUser`, `getUser`, etc.)
- TypeScript types and interfaces
- Built-in authentication support
- Ready for npm publishing

## Basic Usage

```ts
import APIClient from '@your-org/api-sdk'

const client = new APIClient({
  baseUrl: 'http://127.0.0.1:3001',
  authToken: process.env.TOKEN,
  timeout: 10_000,
  retryAttempts: 3,
})

// All methods return { success, data?, error?, issues? }
const res = await client.listUsers({ page: '1', limit: '10' })
if (!res.success) {
  console.error(res.error)
  if (res.issues) {
    // Zod validation errors
    console.error(res.issues)
  }
} else {
  console.log(res.data)
}
```

### CRUD Operations

```ts
// Create
const createRes = await client.createUser({
  email: 'user@example.com',
  name: 'John Doe'
})

// Read single
const userRes = await client.getUser({ id: '123' })

// Update
const updateRes = await client.updateUser({
  id: '123',
  name: 'Jane Doe'
})

// Delete
const deleteRes = await client.deleteUser({ id: '123' })
```

## Error Handling

All methods return a consistent response format:

```ts
type APIResponse<T> =
  | { success: true; data: T }
  | { success: false; error: string; issues?: ZodIssue[] }
```

Example error handling:

```ts
const res = await client.createUser(userData)

if (!res.success) {
  if (res.issues) {
    // Zod validation failed
    res.issues.forEach(issue => {
      console.error(`${issue.path.join('.')}: ${issue.message}`)
    })
  } else {
    // Network or server error
    console.error(res.error)
  }
  return
}

// Success
console.log('Created user:', res.data)
```

## Retry & Timeout Behavior

- **Timeouts**: Use `AbortSignal.timeout(timeout)` to abort long requests
- **Retries**: Exponential backoff on network errors (configurable via `retryAttempts`)
- **Non-retriable**: Client errors (4xx) and validation errors are not retried

## Routes

The generated SDK defaults align with the API Docs mock server routes:
- `/api/users` - User endpoints
- `/api/posts` - Post endpoints
- Custom routes can be configured

## Publishing Your SDK

The generated package includes:
- `package.json` with proper ESM/CJS exports
- TypeScript declaration files
- Build configuration for dual module output

To publish:

```bash
cd generated/sdk
pnpm install
pnpm run build
npm publish
```

## See Also

- [API Docs Pack](./api-docs.md) - Generate OpenAPI specs and mock server
- [Server Actions Pack](./server-actions.md) - Next.js server-side validation
- [Contract Testing](./contracts.md) - Verify SDK matches backend contracts
