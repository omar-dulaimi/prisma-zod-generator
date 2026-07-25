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
# Install Pact.js & Jest helpers
pnpm add -D "@pact-foundation/pact@^15" jest jest-pact @prisma/client

# PZG Pro license required
```

## Generate

Add to your `schema.prisma`:

```prisma
generator pzgPro {
  provider = "node ./node_modules/prisma-zod-generator/lib/cli/pzg-pro.js"
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
      pact/
        WebApp-UserAPI.test.ts    # One Pact test per consumer/provider pair
      wiremock/
        mappings/
          mapping-1.json          # WireMock stub mappings
      mock-server.ts              # Express stub server for the interactions
      validation-helpers.ts       # Contract validation helpers
      client.ts                   # API client the Pact tests drive
      README.md                   # Usage documentation
```

Each Pact test file covers both sides of one consumer/provider pair — there is no separate
`consumer/` and `provider/` split.

## Run Tests

Add this script to your `package.json`:

```json
{
  "scripts": {
    "test:contract": "jest generated/pro/contracts/pact"
  }
}
```

Then run:

```bash
pnpm run test:contract
```

> **Note**: The generator creates test files but you need to manually add the npm script above to your package.json.

## Consumer Example

The generated tests drive the `Pact` class from `@pact-foundation/pact` directly against the
generated `client.ts`.

:::caution Pin the Pact major
The generated tests target the V2/V3 DSL (`new Pact({...})` plus
`InteractionObject`). From v16 onward `Pact` is an alias for the V4 DSL, which
takes a different constructor and interaction shape — installing the current
`@pact-foundation/pact` (17.x) makes the generated tests fail to compile. Pin
`^15` as shown above, or port the tests to the V4 builder API yourself.
:::

The `jest-pact` wrapper below is optional sugar for tests you write yourself:

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
