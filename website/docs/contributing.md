---
id: contributing
title: Contributing
---

> ❤️ **Sustainability Matters** – Sponsorship directly funds maintenance, regression fixes, and new feature velocity.

<div style={{ margin: '.75rem 0 1.25rem' }}>
	<a href="https://github.com/sponsors/omar-dulaimi" className="button button--primary">Sponsor on GitHub</a>
</div>

Tests use Vitest; comprehensive generation tests cover multi-provider & feature flags. `pnpm test` runs the parallel feature suite (`test:features:parallel`), and a Vitest `globalSetup` builds `lib/` once before the workers spawn, so you don't need a separate build step first.

Always use **pnpm** — `npm` and `npx` are not supported in this repo.

Typical workflow:

```bash
pnpm install
pnpm build
pnpm test
```

`pnpm test` does **not** run lint or type checking. Run those separately:

```bash
pnpm format      # or format:check
pnpm lint
pnpm typecheck
```

All four (`format`, `lint`, `typecheck`, `test`) should pass before you open a PR. PRs target `master` and commits follow Conventional Commits (`type(scope): subject`).

Add new config surface:

1. Extend parser + defaults.
2. Write focused test (see `tests/config.test.ts`).
3. Update docs (this site) & add recipe if relevant.

Semantic release determines version bumps from conventional commits.

:::note
Pro features live in the private `src/pro` git submodule. Core contributors do not need it — building and testing the free generator works without it. Team members with access run `pnpm setup` to initialise the submodule and `pnpm sync:pro` to update it.
:::

Docs site preview: `pnpm docs:dev`, production build: `pnpm docs:build`.

See [CONTRIBUTING.md](https://github.com/omar-dulaimi/prisma-zod-generator/blob/master/CONTRIBUTING.md) for the full workflow, commit scopes, and release process.

---

### Support Roadmap & Impact

Sponsorship accelerates:

- Prisma release compatibility validation
- Performance profiling & optimization
- Advanced JSON / Bytes features & recipes
- Documentation polish & DX tooling

<a href="https://github.com/sponsors/omar-dulaimi" className="button button--secondary button--sm">Become a Sponsor</a>
