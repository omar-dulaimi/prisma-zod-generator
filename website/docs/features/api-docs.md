---
title: API Docs Pack
---

> **Available in:** Professional, Business, Enterprise tiers

Auto-generate OpenAPI v3 specifications and a fully-functional mock server from your Prisma schema. Perfect for frontend development, testing, and API documentation.

## Why Use API Docs Pack

**Problem**: API documentation gets out of sync with reality:
- Manually written OpenAPI specs drift from actual implementation
- Frontend teams blocked waiting for backend APIs
- No easy way to test UI against realistic API responses
- Documentation maintenance is time-consuming

**Solution**: Generate accurate OpenAPI specs and a working mock server directly from your Prisma schema.

### Benefits

- **Always Accurate**: Docs generated from source of truth (Prisma schema)
- **Instant Mock Server**: Test UIs without waiting for backend
- **Swagger UI Included**: Interactive API explorer out of the box
- **Zero Maintenance**: Regenerate when schema changes

## Prerequisites

```bash
# Install Express for mock server
pnpm add express @prisma/client
pnpm add -D @types/express

# PZG Pro license required
```

## Generate

Add to your `schema.prisma`:

```prisma
generator pzgPro {
  provider = "node ./lib/cli/pzg-pro.js"
  output = "./generated/pro"
  enableApiDocs = true
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
    api-docs/
      openapi.json          # OpenAPI v3 specification
      openapi.yaml          # OpenAPI v3 (YAML format)
      mock-server.js        # Express mock server
      index.html            # Swagger UI
      sdk.ts                # TypeScript SDK client
      examples/             # Example requests
      docs/                 # Static documentation
      USAGE.md              # Usage guide
```

## Basic Usage

### Running the Mock Server

```bash
# From project root
cd generated/pro/api-docs
node mock-server.js

# Server starts at http://localhost:3001
```

### Accessing Swagger UI

Open http://localhost:3001/docs in your browser to:
- Interactively explore your API
- Try out endpoints
- View request/response schemas

### Generated Endpoints

The mock server generates standard REST endpoints aligned with your Prisma models:

```bash
# Users API (example)
GET /api/users         # List users
GET /api/users/:id     # Get single user
POST /api/users        # Create user
PUT /api/users/:id     # Update user
DELETE /api/users/:id  # Delete user

# Posts API (example)
GET /api/posts
GET /api/posts/:id
POST /api/posts
PUT /api/posts/:id
DELETE /api/posts/:id
```

## Integration

### Frontend Development

```tsx
// Point to mock server during development
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

const users = await fetch(`${API_URL}/api/users`).then(r => r.json())
```

### Testing

```ts
// Use mock server in integration tests
beforeAll(async () => {
  // Start mock server
  mockServer = spawn('npx', ['tsx', 'generated/api-docs/mock-server.ts'])
  await new Promise(resolve => setTimeout(resolve, 2000))
})

test('fetches users', async () => {
  const response = await fetch('http://localhost:3001/api/users')
  const users = await response.json()
  expect(Array.isArray(users)).toBe(true)
})
```

## See Also

- [SDK Publisher](./sdk.md) - Generate typed clients from OpenAPI
- [Contract Testing](./contracts.md) - Verify API contracts
