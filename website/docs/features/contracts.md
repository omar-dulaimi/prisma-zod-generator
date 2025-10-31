---
title: Contract Testing Pack
---

> **Available in:** Business, Enterprise tiers

Consumer/provider contract tests and JSON definitions to verify API compatibility using Pact.js.

## Why Use Contract Testing

**Problem**: API changes break integrations:
- Backend changes break frontend without warning
- No way to verify API contracts are maintained
- Integration tests require full backend setup

**Solution**: Generate Pact.js consumer/provider tests from your schema to catch breaking changes early.

### Benefits

- **Catch Breaking Changes**: Before deployment
- **Independent Development**: Frontend/backend teams work in parallel
- **Contract as Documentation**: Living API contracts

## Prerequisites

```bash
# Install Pact.js
pnpm add -D @pact-foundation/pact jest @prisma/client

# PZG Pro license required
```

## Generate

Add to your `schema.prisma`:

```prisma
generator pzgPro {
  provider = "node ./lib/cli/pzg-pro.js"
  output = "./generated/pro"
  enableContracts = true
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
    contracts/
      consumer/           # Consumer tests
      provider/           # Provider tests
      definitions/        # JSON contract definitions
```

## Run Tests

Add these scripts to your `package.json`:

```json
{
  "scripts": {
    "test:contract:consumer": "jest generated/pro/contracts/consumer",
    "test:contract:provider": "jest generated/pro/contracts/provider"
  }
}
```

Then run:

```bash
# Run consumer tests
pnpm run test:contract:consumer

# Run provider tests
pnpm run test:contract:provider
```

> **Note**: The generator creates test files but you need to manually add the npm scripts above to your package.json.

## Consumer Example

```ts
// Consumer test expects specific API response format
import { pactWith } from 'jest-pact'

pactWith({ consumer: 'WebApp', provider: 'UserAPI' }, (interaction) => {
  describe('GET /users/:id', () => {
    beforeEach(() => {
      interaction
        .given('user 123 exists')
        .uponReceiving('a request for user 123')
        .withRequest({ method: 'GET', path: '/users/123' })
        .willRespondWith({
          status: 200,
          body: {
            id: '123',
            email: 'user@example.com',
            name: 'John Doe'
          }
        })
    })

    it('returns user data', async () => {
      const response = await fetch('http://localhost:8989/users/123')
      const user = await response.json()
      expect(user.id).toBe('123')
    })
  })
})
```

## See Also

- [SDK Publisher](./sdk.md) - Generate typed SDK
- [API Docs Pack](./api-docs.md) - OpenAPI specifications
