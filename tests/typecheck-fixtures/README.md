# Typecheck fixtures

The Form UX, Server Actions and Contract Testing packs emit code that imports third-party
libraries — MUI, Chakra UI, Mantine, react-hook-form, Pact, Next. Type-checking that output
means having those libraries installed, and they are not otherwise needed to build or test this
generator.

Adding them to the root `devDependencies` costs **428 transitive packages and ~400 MB** on every
contributor's install and every CI run, to verify output for paid packs. So they live here
instead, in a package the root install does not touch — the same arrangement `website/` already
uses.

## Running the check

```bash
pnpm run test:typecheck-fixtures
```

That installs this package if needed, then runs `tests/pro-ui-output-compiles.test.ts`, which
generates each pack and compiles the result. Without the install the test skips rather than
fails, so `pnpm test` stays green on a plain checkout. CI runs it in `package-test`, the one job
that initialises the private submodule.

A Prisma client is generated from the fixture schema into `.out/client` and `@prisma/client` is
mapped to it, because Server Actions emits `prisma.member.create(...)` and imports
`Prisma.MemberCreateInput`. Resolving `@prisma/client` upward to this repo's own client instead
makes every model type look missing.

Emitted output goes to `.out/` here, so the libraries resolve by ordinary upward `node_modules`
lookup rather than through tsconfig path mapping.

## Why Pact is pinned to v15

The Contract Testing pack emits the Pact v15 API. v16 and v17 alias the `Pact` export to
`PactV4`, which changes the constructor and the `addInteraction` shape, so the emitted tests do
not type-check against them. Pinning here keeps this check honest about what the pack targets
rather than quietly passing against a version it does not support. The forward-compatibility gap
is recorded in the Pro backlog.
