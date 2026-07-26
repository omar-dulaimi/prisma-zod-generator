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

## Which Pact major this pins

The current major, 17. The Contract Testing pack emits `PactV3`, which every version from 15 to 17
exports from the package root with the same fluent shape, so the emitted tests compile against all
of them — verified against 15 and 17 before this pin was moved forward.

It used to pin 15 because the pack emitted the root `Pact` export, which means the V2 server API in
15 and is an alias for V4 from 16 onward. Code written against it compiles on exactly one major, so
a customer installing current Pact got tests that would not build.
