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
pnpm add -D @pact-foundation/pact jest jest-pact @prisma/client

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

The generated tests drive `PactV3` from `@pact-foundation/pact` directly against the generated
`client.ts`, and both sides are emitted from **2.6.0+**:

- `pact/<consumer>-<provider>.test.ts` — the consumer side, recording the pacts
- `provider/<provider>.verify.test.ts` — replays those pacts against a running provider with Pact's
  `Verifier`. Point `PACT_PROVIDER_BASE_URL` at your provider and fill in the `stateHandlers` entry
  for `'default state'` with whatever seeding each interaction needs.

Bodies are asserted with matchers (`MatchersV3.like`, `MatchersV3.eachLike`) rather than literal values, so a contract test
passes on a differing id instead of failing on the fixture. `includeRequestValidation` and
`includeResponseValidation` control the request and response bodies independently; with both off you
still get the interactions, pinning methods, paths and status codes. Before 2.6.0 the two flags were
OR'd into a single gate deciding whether any test was written, and every body was a literal.

:::note Any current Pact major works
The generated tests use `PactV3`, which every version from 15 to 17 exports from the package root
with the same shape, so no version pin is needed. Compilation against both 15 and 17 is checked on
every run of the emitted-output type checks.

The root `Pact` export is deliberately avoided: it means the V2 server API in 15 and is an alias for
V4 from 16 onward, so anything written against it compiles on exactly one major. Before 2.9.0 these
tests did use it, which is why `^15` had to be pinned.
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
