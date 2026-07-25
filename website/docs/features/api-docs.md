---
title: API Docs Pack
---

> **Available in:** Business, Enterprise tiers

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
# Install Express + CORS for the mock server
pnpm add express cors @prisma/client
pnpm add -D @types/express @types/cors

# PZG Pro license required
```

## Generate

Add to your `schema.prisma`:

```prisma
generator pzgPro {
  provider = "node ./node_modules/prisma-zod-generator/lib/cli/pzg-pro.js"
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

:::note ESM syntax
The generated `mock-server.js` uses ESM `import` syntax. Run it from a package whose `package.json`
has `"type": "module"`, or rename it to `mock-server.mjs`.
:::

The mock server seeds three sample records per model on startup, and exposes `GET /health` plus a
`GET /` endpoint that lists the available routes.

### Accessing Swagger UI

The Swagger UI lives in the generated `index.html` at the pack root — it is a static file, not a
route on the mock server. Open it directly, or serve the pack directory:

```bash
cd generated/pro/api-docs
npx serve . -p 8080
# then open http://localhost:8080
```

From there you can:
- Interactively explore your API
- Try out endpoints
- View request/response schemas

### Generated Endpoints

The mock server generates standard REST endpoints aligned with your Prisma models. Routes are mounted
at the root — there is no `/api` prefix — and the path segment is the model name lowercased with an
`s` appended:

```bash
# Users API (example)
GET /users         # List users
GET /users/:id     # Get single user
POST /users        # Create user
PUT /users/:id     # Update user
DELETE /users/:id  # Delete user

# Posts API (example)
GET /posts
GET /posts/:id
POST /posts
PUT /posts/:id
DELETE /posts/:id
```

:::note Options
From **2.6.0+**: `openApiVersion` accepts `3.0.3` (default) or `3.1.0`;
`responseFormats` offers each listed media type wherever the document describes a
body; `includeExamples` is honoured as an alias for `generateExamples`; and a field
whose `///` comment says `@deprecated` is marked `deprecated: true` in the spec.

`startMockServer`, `mockServer` and `includeChangelog` are deliberately not
implemented — starting a server during `prisma generate` would leave a
long-running process attached to the generator. Run the emitted `mock-server.js`
yourself. Passing one of them, or any unrecognised key, is reported on stdout
rather than discarded silently.
:::

:::note Pluralization
The default appends a bare `s`, so `Category` becomes `/categorys`. That stays the
default because it is what existing consumers are built against — changing routes
would break them. Set `pluralization: "english"` for conventional plurals
(`/categories`, `/addresses`):

```prisma
apiDocs = "{ \"pluralization\": \"english\" }"
```

From **2.6.0+** the spec, the mock server, the examples and the README all use the
same rule. Before that the spec appended a bare `s` while the examples applied
English rules, so the two disagreed.
:::

## Integration

### Frontend Development

```tsx
// Point to mock server during development
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

const users = await fetch(`${API_URL}/users`).then(r => r.json())
```

### Testing

```ts
// Use mock server in integration tests
beforeAll(async () => {
  // Start mock server
  mockServer = spawn('node', ['generated/pro/api-docs/mock-server.js'])
  await new Promise(resolve => setTimeout(resolve, 2000))
})

test('fetches users', async () => {
  const response = await fetch('http://localhost:3001/users')
  const users = await response.json()
  expect(Array.isArray(users)).toBe(true)
})
```

## See Also

- [SDK Publisher](./sdk.md) - Generate typed clients from OpenAPI
- [Contract Testing](./contracts.md) - Verify API contracts
